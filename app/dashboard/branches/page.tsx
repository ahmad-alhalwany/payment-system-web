"use client";
import React, { useState, useEffect } from "react";
import ModernButton from "@/components/ui/ModernButton";
import BranchModal from "@/components/branch/BranchModal";
import BranchForm from "@/components/branch/BranchForm";
import BranchBalanceModal from "@/components/branch/BranchBalanceModal";
import BranchFundHistoryModal from "@/components/branch/BranchFundHistoryModal";
import BranchTaxModal from "@/components/branch/BranchTaxModal";
import axiosInstance from "@/app/api/axios";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { FiCheckCircle, FiXCircle } from "react-icons/fi";

interface Branch {
  id: number;
  branch_id: string;
  name: string;
  location: string;
  governorate: string;
  employee_count: number;
  allocated_amount_syp: number;
  allocated_amount_usd: number;
  tax_rate: number;
  status: string;
  created_at: string;
  updated_at: string;
  balance: {
    SYP: number;
    USD: number;
  };
}

type SortField = "name" | "location" | "governorate" | "employee_count" | "allocated_amount_syp" | "allocated_amount_usd" | "tax_rate";
type SortOrder = "asc" | "desc";

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showFundHistoryModal, setShowFundHistoryModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [successMsg, setSuccessMsg] = useState("");

  // جلب بيانات الفروع
  const fetchBranches = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axiosInstance.get('/branches/?include_employee_count=true');
      setBranches(Array.isArray(response.data.branches)
        ? response.data.branches
        : Array.isArray(response.data)
          ? response.data
          : []);
      setFilteredBranches(Array.isArray(response.data.branches)
        ? response.data.branches
        : Array.isArray(response.data)
          ? response.data
          : []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      setError("فشل في تحميل بيانات الفروع");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  // تصفية وترتيب الفروع
  useEffect(() => {
    let result = [...branches];

    // تطبيق البحث
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(branch => 
        branch.name.toLowerCase().includes(searchLower) ||
        branch.location.toLowerCase().includes(searchLower) ||
        branch.governorate.toLowerCase().includes(searchLower) ||
        branch.branch_id.toLowerCase().includes(searchLower)
      );
    }

    // تطبيق فلتر الحالة
    if (statusFilter !== "all") {
      result = result.filter(branch => branch.status === statusFilter);
    }

    // تطبيق الترتيب
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
        case "location":
        case "governorate":
          comparison = (a[sortField] ?? '').localeCompare(b[sortField] ?? '');
          break;
        case "employee_count":
        case "allocated_amount_syp":
        case "allocated_amount_usd":
        case "tax_rate":
          comparison = a[sortField] - b[sortField];
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredBranches(result);
  }, [branches, searchTerm, statusFilter, sortField, sortOrder]);

  // إضافة فرع جديد
  const handleAddBranch = async (data: any) => {
    try {
      const response = await axiosInstance.post('/branches/', data);
      setSuccessMsg("تمت إضافة الفرع بنجاح!");
      await fetchBranches();
      setShowAddModal(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error('Error adding branch:', error);
      setError("فشل في إضافة الفرع");
    }
  };

  // تعديل فرع
  const handleEditBranch = async (data: any) => {
    if (!selectedBranchId) return;
    try {
      await axiosInstance.put(`/branches/${selectedBranchId}`, data);
      setSuccessMsg("تم تعديل بيانات الفرع بنجاح!");
      await fetchBranches();
      setShowEditModal(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error('Error updating branch:', error);
      setError("فشل في تحديث بيانات الفرع");
    }
  };

  // حذف فرع
  const handleDeleteBranch = async () => {
    if (!selectedBranchId) return;
    try {
      await axiosInstance.delete(`/branches/${selectedBranchId}/`);
      setSuccessMsg("تم حذف الفرع بنجاح!");
      await fetchBranches();
      setShowDeleteModal(false);
      setSelectedBranchId(null);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error('Error deleting branch:', error);
      setError("فشل في حذف الفرع");
    }
  };

  // تحديث رصيد الفرع
  const handleUpdateBalance = async (data: any) => {
    if (!selectedBranchId) return;
    try {
      await axiosInstance.post(`/branches/${selectedBranchId}/allocate-funds/`, data);
      await fetchBranches();
      setShowBalanceModal(false);
    } catch (error) {
      console.error('Error updating branch balance:', error);
      setError("فشل في تحديث رصيد الفرع");
    }
  };

  // تحديث نسبة الضريبة
  const handleUpdateTaxRate = async (taxRate: number) => {
    if (!selectedBranchId) return;
    try {
      const response = await axiosInstance.put(`/api/branches/${selectedBranchId}/tax_rate/`, { tax_rate: taxRate });
      await fetchBranches();
      setShowTaxModal(false);
    } catch (error) {
      console.error('Error updating tax rate:', error);
      setError("فشل في تحديث نسبة الضريبة");
    }
  };

  // اختيار فرع من الجدول
  const handleRowClick = (id: number) => {
    setSelectedBranchId(id);
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

  const selectedBranch = Array.isArray(branches) ? branches.find((b) => b.id === selectedBranchId) : undefined;

  return (
    <div className="container mx-auto px-4 py-8">
      {successMsg && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">إدارة الفروع</h1>
          <div className="flex gap-4 flex-wrap">
        <ModernButton color="#2ecc71" onClick={() => setShowAddModal(true)}>
          إضافة فرع
        </ModernButton>
            <ModernButton color="#3498db" onClick={() => setShowEditModal(true)} disabled={!selectedBranchId}>
              تعديل
        </ModernButton>
            <ModernButton color="#e74c3c" onClick={() => setShowDeleteModal(true)} disabled={!selectedBranchId}>
              حذف
        </ModernButton>
            <ModernButton color="#f59e42" onClick={() => setShowBalanceModal(true)} disabled={!selectedBranchId}>
              تحديث الرصيد
        </ModernButton>
            <ModernButton color="#9b59b6" onClick={() => setShowTaxModal(true)} disabled={!selectedBranchId}>
              تحديث الضريبة
        </ModernButton>
          </div>
        </div>

        {/* أدوات البحث والتصفية */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <input
              type="text"
              placeholder="بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-primary-700 focus:ring-2 focus:ring-primary-300 shadow-sm"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-primary-700 focus:ring-2 focus:ring-primary-300 shadow-sm"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>
      </div>

      {/* جدول الفروع */}
        <div className="overflow-x-auto rounded-2xl shadow-lg border border-primary-100 bg-white">
          <table className="min-w-full rounded-2xl overflow-hidden">
            <thead className="bg-primary-50">
            <tr>
                <th className="px-6 py-3 text-right text-xs font-bold text-primary-700 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("name")}>رقم الفرع {sortField === "name" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-primary-700 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("name")}>اسم الفرع {sortField === "name" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-primary-700 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("location")}>الموقع {sortField === "location" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-primary-700 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("governorate")}>المحافظة {sortField === "governorate" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-primary-700 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("employee_count")}>عدد الموظفين {sortField === "employee_count" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-primary-700 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("allocated_amount_syp")}>الرصيد (ل.س) {sortField === "allocated_amount_syp" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-primary-700 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("allocated_amount_usd")}>الرصيد ($) {sortField === "allocated_amount_usd" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-primary-700 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("tax_rate")}>نسبة الضريبة {sortField === "tax_rate" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-primary-700 uppercase tracking-wider">الحالة</th>
            </tr>
          </thead>
            <tbody className="bg-white divide-y divide-primary-100">
              {Array.isArray(filteredBranches) && filteredBranches.map((branch) => (
              <tr
                key={branch.id}
                onClick={() => handleRowClick(branch.id)}
                  className={`cursor-pointer transition-all duration-200 hover:bg-primary-50/80 ${selectedBranchId === branch.id ? 'bg-primary-100 shadow-md scale-[1.01] border-r-4 border-primary-400' : ''}`}
              >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900 font-bold">{branch.branch_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">{branch.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">{branch.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">{branch.governorate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">{branch.employee_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">{(branch.allocated_amount_syp ?? 0).toLocaleString()} ل.س</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">{(branch.allocated_amount_usd ?? 0).toLocaleString()} $</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">{branch.tax_rate}%</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full shadow-sm
                      ${branch.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}
                    `}>
                      {branch.status === 'active' ? <FiCheckCircle className="text-green-400" /> : <FiXCircle className="text-red-400" />}
                      {branch.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

        {/* النوافذ المنبثقة */}
        {showAddModal && (
      <BranchModal open={showAddModal} onClose={() => setShowAddModal(false)} title="إضافة فرع جديد">
            <BranchForm 
              onSubmit={handleAddBranch} 
              onCancel={() => setShowAddModal(false)}
            />
      </BranchModal>
        )}

        {showEditModal && selectedBranch && (
          <BranchModal open={showEditModal} onClose={() => setShowEditModal(false)} title="تعديل الفرع">
          <BranchForm
              onSubmit={handleEditBranch} 
            initialData={selectedBranch}
            onCancel={() => setShowEditModal(false)}
          />
          </BranchModal>
        )}

        {showDeleteModal && selectedBranch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <h3 className="text-lg font-bold mb-4">تأكيد الحذف</h3>
              <div className="mb-4">
                <p className="text-gray-600 mb-2">هل أنت متأكد من حذف الفرع التالي؟</p>
                <div className="bg-gray-50 p-4 rounded">
                  <p><span className="font-semibold">رقم الفرع:</span> {selectedBranch.branch_id}</p>
                  <p><span className="font-semibold">اسم الفرع:</span> {selectedBranch.name}</p>
                  <p><span className="font-semibold">الموقع:</span> {selectedBranch.location}</p>
                  <p><span className="font-semibold">المحافظة:</span> {selectedBranch.governorate}</p>
            </div>
          </div>
              <div className="flex justify-end gap-4">
                <ModernButton color="#e74c3c" onClick={() => setShowDeleteModal(false)}>
                  إلغاء
                </ModernButton>
                <ModernButton color="#2ecc71" onClick={handleDeleteBranch}>
                  حذف
                </ModernButton>
              </div>
            </div>
          </div>
        )}

        {showBalanceModal && selectedBranch && (
      <BranchBalanceModal
        open={showBalanceModal}
        onClose={() => setShowBalanceModal(false)}
        branch={selectedBranch}
            onSubmit={handleUpdateBalance}
          />
        )}

        {showTaxModal && selectedBranch && (
          <BranchTaxModal
            open={showTaxModal}
            onClose={() => setShowTaxModal(false)}
            branch={selectedBranch}
            onSubmit={handleUpdateTaxRate}
          />
        )}

        {showFundHistoryModal && selectedBranch && (
      <BranchFundHistoryModal
        open={showFundHistoryModal}
        onClose={() => setShowFundHistoryModal(false)}
        branch={{ id: selectedBranch.id.toString(), name: selectedBranch.name }}
      />
        )}
      </div>
    </div>
  );
} 