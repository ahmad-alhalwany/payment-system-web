"use client";

import React, { useState, useEffect } from "react";
import EmployeeFormModal from "@/components/employee/EmployeeFormModal";
import ModernButton from "@/components/ui/ModernButton";
import axiosInstance from "@/app/api/axios";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import ResetPasswordModal from '@/components/shared/ResetPasswordModal';

interface Employee {
  id: number;
  username: string;
  role: string;
  branch_id: number;
  branch_name: string;
  created_at?: string;
  is_active?: boolean;
  full_name: string;
}

type SortField = "username" | "role" | "branch_name" | "created_at";
type SortOrder = "asc" | "desc";

const roles = ["الكل", "مدير فرع", "موظف تحويلات"];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("الكل");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState<Employee | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortField, setSortField] = useState<SortField>("username");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [branches, setBranches] = useState<{id: number, name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);

  // جلب بيانات الموظفين
  const fetchEmployees = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await axiosInstance.get('/users/', {
        params: {
          role: roleFilter !== 'الكل' ? roleFilter : undefined,
          search: search || undefined
        }
      });
      
      const employeesData = (Array.isArray(response.data.items) ? response.data.items : [])
        .map((emp: any) => ({
          ...emp,
          branch_name: emp.branch_name || branches.find(b => b.id === emp.branch_id)?.name || "غير محدد"
        }));
      
      setEmployees(employeesData);
      setFilteredEmployees(employeesData);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      setErrorMessage(error.response?.data?.detail || "فشل في تحميل بيانات الموظفين");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [roleFilter, search]);

  // جلب الفروع عند تحميل الصفحة
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await axiosInstance.get('/branches/');
        setBranches(Array.isArray(response.data.branches) ? response.data.branches : []);
      } catch (e) {
        // تجاهل الخطأ أو أضف رسالة
      }
    };
    fetchBranches();
  }, []);

  // تصفية وترتيب الموظفين
  useEffect(() => {
    let result = [...employees];

    // تطبيق البحث
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(emp => 
        emp.username.toLowerCase().includes(searchLower) ||
        emp.branch_name.toLowerCase().includes(searchLower)
      );
    }

    // تطبيق فلتر الدور
    const roleMap: Record<string, string> = {
      "مدير فرع": "branch_manager",
      "موظف تحويلات": "employee"
    };
    if (roleFilter !== "الكل") {
      result = result.filter(emp => emp.role === roleMap[roleFilter]);
    }

    // تطبيق الترتيب
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "username":
          comparison = (a.username || "").localeCompare(b.username || "");
          break;
        case "role":
          comparison = (a.role || "").localeCompare(b.role || "");
          break;
        case "branch_name":
          comparison = (a.branch_name || "").localeCompare(b.branch_name || "");
          break;
        case "created_at":
          comparison = new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredEmployees(result);
  }, [employees, search, roleFilter, sortField, sortOrder]);

  // عمليات الأزرار
  const handleAdd = () => {
    setEditData(null);
    setShowModal(true);
  };

  const handleEdit = () => {
    if (!selectedId) return;
    const emp = employees.find(e => e.id === selectedId);
    setEditData(emp || null);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setIsLoading(true);
    setError("");
    try {
      await axiosInstance.delete(`/users/${selectedId}`);
      setSuccessMessage("تم حذف الموظف بنجاح");
      setEmployees(employees.filter(emp => emp.id !== selectedId));
      setDeleteConfirmOpen(false);
      setSelectedId(null);
      fetchEmployees(); // تحديث القائمة
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      setErrorMessage(error.response?.data?.detail || "فشل في حذف الموظف");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchEmployees();
    setSelectedId(null);
  };

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    setError("");
    try {
      let response;
      if (editData) {
        response = await axiosInstance.put(`/users/${editData.id}`, data);
        setSuccessMessage("تم تحديث بيانات الموظف بنجاح");
      } else {
        response = await axiosInstance.post('/users/', data);
        setSuccessMessage("تم إضافة الموظف بنجاح");
      }

      const branchName = response.data.branch_name ||
        branches.find(b => Number(b.id) === Number(response.data.branch_id))?.name || "غير محدد";
      
      const updatedEmployee = { ...response.data, branch_name: branchName };
      
      if (editData) {
        setEmployees(employees.map(emp => emp.id === editData.id ? updatedEmployee : emp));
      } else {
        setEmployees([...employees, updatedEmployee]);
      }
      
      setShowModal(false);
      fetchEmployees(); // تحديث القائمة
    } catch (error: any) {
      console.error('Error saving employee:', error);
      setErrorMessage(error.response?.data?.detail || "فشل في حفظ بيانات الموظف");
    } finally {
      setIsLoading(false);
    }
  };

  // تغيير الترتيب
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleResetPassword = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsResetPasswordModalOpen(true);
  };

  const handlePasswordResetSuccess = () => {
    // تحديث قائمة الموظفين بعد تغيير كلمة المرور
    fetchEmployees();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <p className="mt-2 text-gray-600">جاري التحميل...</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {errorMessage}
          <button className="float-left" onClick={() => setErrorMessage("")}>×</button>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
          <button className="float-left" onClick={() => setSuccessMessage("")}>×</button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">إدارة الموظفين</h1>
          <div className="flex gap-4">
            <ModernButton color="#2ecc71" onClick={handleAdd}>
              إضافة موظف
            </ModernButton>
            <ModernButton color="#3498db" onClick={handleEdit} disabled={!selectedId}>
              تعديل
            </ModernButton>
            <ModernButton color="#e74c3c" onClick={() => setDeleteConfirmOpen(true)} disabled={!selectedId}>
              حذف
            </ModernButton>
            <ModernButton color="#f59e42" onClick={handleRefresh}>
              تحديث
            </ModernButton>
          </div>
        </div>

        {/* فلاتر البحث */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
        <input
          type="text"
              placeholder="بحث..."
          value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
          </div>
          <div>
        <select
          value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        >
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
        </select>
          </div>
        </div>

        {/* جدول الموظفين */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("username")}>
                  اسم المستخدم {sortField === "username" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("role")}>
                  الدور {sortField === "role" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("branch_name")}>
                  الفرع {sortField === "branch_name" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("created_at")}>
                  تاريخ الإنشاء {sortField === "created_at" && (sortOrder === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
            </tr>
          </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(filteredEmployees) && filteredEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  onClick={() => setSelectedId(employee.id)}
                  className={`cursor-pointer hover:bg-gray-50 ${selectedId === employee.id ? 'bg-primary-50' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.branch_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.created_at ? format(new Date(employee.created_at), "dd MMMM yyyy", { locale: ar }) : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      employee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit();
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetPassword(employee);
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        تغيير كلمة المرور
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(employee.id);
                          setDeleteConfirmOpen(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

        {/* النوافذ المنبثقة */}
        {showModal && (
      <EmployeeFormModal
        open={showModal}
            onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
            initialData={editData ? {
              id: editData.id,
              username: editData.username,
              role: editData.role,
              branchId: parseInt(editData.branch_id.toString())
            } : undefined}
          />
        )}

        {deleteConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-bold mb-4">تأكيد الحذف</h3>
              <p className="mb-4">هل أنت متأكد من حذف هذا الموظف؟</p>
              <div className="flex justify-end gap-4">
                <button
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  onClick={() => setDeleteConfirmOpen(false)}
                >
                  إلغاء
                </button>
                <button
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  onClick={handleDelete}
                >
                  حذف
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedEmployee && (
          <ResetPasswordModal
            isOpen={isResetPasswordModalOpen}
            onClose={() => {
              setIsResetPasswordModalOpen(false);
              setSelectedEmployee(null);
            }}
            username={selectedEmployee.username}
            onSuccess={handlePasswordResetSuccess}
          />
        )}
        </div>
    </div>
  );
} 