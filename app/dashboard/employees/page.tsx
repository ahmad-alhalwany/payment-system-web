"use client";

import React, { useState, useEffect } from "react";
import EmployeeFormModal from "@/components/employee/EmployeeFormModal";
import ModernButton from "@/components/ui/ModernButton";
import axiosInstance from "@/app/api/axios";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import ResetPasswordModal from '@/components/shared/ResetPasswordModal';
import { FiUser, FiUserCheck, FiUserX, FiEdit2, FiTrash2, FiKey } from "react-icons/fi";

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
    <div className="container mx-auto px-2 sm:px-4 py-6 sm:py-8">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
            <p className="mt-4 text-gray-700 font-semibold">جاري التحميل...</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center justify-between">
          <span>{errorMessage}</span>
          <button className="text-xl font-bold hover:text-red-900" onClick={() => setErrorMessage("")}>×</button>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center justify-between">
          <span>{successMessage}</span>
          <button className="text-xl font-bold hover:text-green-900" onClick={() => setSuccessMessage("")}>×</button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-primary-700">إدارة الموظفين</h1>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <ModernButton color="#2ecc71" onClick={handleAdd} className="min-w-[110px]">إضافة موظف</ModernButton>
            <ModernButton color="#3498db" onClick={handleEdit} disabled={!selectedId} className="min-w-[90px]">تعديل</ModernButton>
            <ModernButton color="#e74c3c" onClick={() => setDeleteConfirmOpen(true)} disabled={!selectedId} className="min-w-[80px]">حذف</ModernButton>
            <ModernButton color="#f59e42" onClick={handleRefresh} className="min-w-[80px]">تحديث</ModernButton>
          </div>
        </div>

        {/* فلاتر البحث */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 text-right"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 text-right"
          >
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        {/* جدول الموظفين */}
        <div className="hidden md:block overflow-x-auto rounded-2xl shadow-lg border border-primary-100">
          <table className="min-w-full bg-white rounded-2xl overflow-hidden">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-bold text-primary-700 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("username")}> 
                  <span className="flex items-center gap-1 justify-end">
                    <FiUser className="inline text-primary-400" /> اسم المستخدم {sortField === "username" && (sortOrder === "asc" ? "↑" : "↓")}
                  </span>
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-primary-700 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("role")}> 
                  <span className="flex items-center gap-1 justify-end">
                    <FiUserCheck className="inline text-primary-400" /> الدور {sortField === "role" && (sortOrder === "asc" ? "↑" : "↓")}
                  </span>
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-primary-700 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("branch_name")}>الفرع {sortField === "branch_name" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-primary-700 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("created_at")}>تاريخ الإنشاء {sortField === "created_at" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-primary-700 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-primary-700 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-primary-100">
              {Array.isArray(filteredEmployees) && filteredEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  onClick={() => setSelectedId(employee.id)}
                  className={`cursor-pointer transition-all duration-200 hover:bg-primary-50/80 ${selectedId === employee.id ? 'bg-primary-100 shadow-md scale-[1.01] border-r-4 border-primary-400' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900 font-medium flex items-center gap-2 justify-end">
                    <FiUser className="text-primary-300" /> {employee.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900 flex items-center gap-2 justify-end">
                    <FiUserCheck className="text-primary-300" /> {employee.role}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">{employee.branch_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">
                    {employee.created_at ? format(new Date(employee.created_at), "dd MMMM yyyy", { locale: ar }) : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full shadow-sm
                      ${employee.is_active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}
                    `}>
                      {employee.is_active ? <FiUserCheck className="text-green-400" /> : <FiUserX className="text-red-400" />}
                      {employee.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(); }}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-2 rounded-full shadow transition border border-blue-100"
                        title="تعديل"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleResetPassword(employee); }}
                        className="bg-green-50 hover:bg-green-100 text-green-700 p-2 rounded-full shadow transition border border-green-100"
                        title="تغيير كلمة المرور"
                      >
                        <FiKey size={18} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedId(employee.id); setDeleteConfirmOpen(true); }}
                        className="bg-red-50 hover:bg-red-100 text-red-700 p-2 rounded-full shadow transition border border-red-100"
                        title="حذف"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* عرض كروت في الشاشات الصغيرة */}
        <div className="md:hidden flex flex-col gap-4">
          {Array.isArray(filteredEmployees) && filteredEmployees.map((employee) => (
            <div
              key={employee.id}
              onClick={() => setSelectedId(employee.id)}
              className={`rounded-xl border border-primary-100 shadow-md p-4 transition-all duration-200 bg-white cursor-pointer hover:bg-primary-50/80 ${selectedId === employee.id ? 'bg-primary-100 border-primary-400 scale-[1.01]' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FiUser className="text-primary-400" />
                  <span className="font-bold text-primary-900">{employee.username}</span>
                </div>
                <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full shadow-sm
                  ${employee.is_active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}
                `}>
                  {employee.is_active ? <FiUserCheck className="text-green-400" /> : <FiUserX className="text-red-400" />}
                  {employee.is_active ? 'نشط' : 'غير نشط'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-2 text-sm text-primary-700">
                <div className="flex items-center gap-1"><FiUserCheck className="text-primary-300" />{employee.role}</div>
                <div className="flex items-center gap-1"><span className="font-bold">الفرع:</span> {employee.branch_name}</div>
                <div className="flex items-center gap-1"><span className="font-bold">تاريخ الإنشاء:</span> {employee.created_at ? format(new Date(employee.created_at), "dd MMMM yyyy", { locale: ar }) : "-"}</div>
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(); }}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-2 rounded-full shadow transition border border-blue-100"
                  title="تعديل"
                >
                  <FiEdit2 size={18} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleResetPassword(employee); }}
                  className="bg-green-50 hover:bg-green-100 text-green-700 p-2 rounded-full shadow transition border border-green-100"
                  title="تغيير كلمة المرور"
                >
                  <FiKey size={18} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedId(employee.id); setDeleteConfirmOpen(true); }}
                  className="bg-red-50 hover:bg-red-100 text-red-700 p-2 rounded-full shadow transition border border-red-100"
                  title="حذف"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
            </div>
          ))}
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
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-xs w-full text-center">
              <h3 className="text-lg font-bold mb-4 text-red-700">تأكيد الحذف</h3>
              <p className="mb-6 text-gray-700">هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex justify-center gap-4">
                <button
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold"
                  onClick={() => setDeleteConfirmOpen(false)}
                >
                  إلغاء
                </button>
                <button
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold shadow"
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