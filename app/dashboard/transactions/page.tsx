"use client";

import React, { useState, useEffect } from "react";
import TransactionDetailsModal from "@/components/transaction/TransactionDetailsModal";
import ModernButton from "@/components/ui/ModernButton";
import TransactionStatusModal from "@/components/transaction/TransactionStatusModal";
import TransactionReceiptModal from "@/components/transaction/TransactionReceiptModal";
import axiosInstance from "@/app/api/axios";

interface Transaction {
  id: string;
  sender: string;
  receiver: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
  sendingBranch: string;
  receivingBranch: string;
  employee: string;
}

interface Branch {
  id: number;
  name: string;
  governorate: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [branchFilter, setBranchFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 10;

  const statuses = [
    "الكل",
    "قيد التنفيذ",
    "مكتمل",
    "ملغي",
    "مرفوض",
    "قيد الانتظار"
  ];

  // قاموس تعريب الحالات
  const statusMap: Record<string, string> = {
    "processing": "قيد التنفيذ",
    "completed": "مكتمل",
    "cancelled": "ملغي",
    "rejected": "مرفوض",
    "pending": "قيد الانتظار"
  };

  const statusOptions = [
    { value: "processing", label: "قيد التنفيذ" },
    { value: "completed", label: "مكتمل" },
    { value: "cancelled", label: "ملغي" },
    { value: "rejected", label: "مرفوض" },
    { value: "pending", label: "قيد الانتظار" }
  ];

  // جلب البيانات من API مع الترقيم
  const fetchData = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const [transactionsRes, branchesRes] = await Promise.all([
        axiosInstance.get(`/transactions/?page=${page}&per_page=${perPage}`),
        axiosInstance.get('/branches/')
      ]);
      setTransactions(
        Array.isArray(transactionsRes.data.items)
          ? transactionsRes.data.items.map((tr: any) => ({
              ...tr,
              sendingBranch: tr.sending_branch_name || tr.sendingBranch || "",
              receivingBranch: tr.destination_branch_name || tr.receivingBranch || "",
              employee: tr.employee_name || tr.employee || ""
            }))
          : []
      );
      setBranches(Array.isArray(branchesRes.data.branches) ? branchesRes.data.branches : []);
      setCurrentPage(transactionsRes.data.page || 1);
      setTotalPages(transactionsRes.data.total_pages || 1);
    } catch (e) {
      setError("فشل تحميل البيانات");
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentPage);
    // eslint-disable-next-line
  }, [currentPage]);

  // تصفية التحويلات
  const getStatusEn = (label: string) => {
    const found = statusOptions.find(opt => opt.label === label);
    return found ? found.value : label;
  };
  const filtered = transactions.filter(tr => {
    const matchesBranch = branchFilter === "الكل" || tr.sendingBranch === branchFilter || tr.receivingBranch === branchFilter;
    // إذا كان الفلتر "الكل"، اعرض الكل، وإلا حول الفلتر للقيمة الإنجليزية
    const matchesStatus = statusFilter === "الكل" || tr.status === getStatusEn(statusFilter);
    return matchesBranch && matchesStatus;
  });

  // عمليات الأزرار
  const handleDetails = () => {
    if (selectedId) setShowDetailsModal(true);
  };

  const handleUpdateStatus = () => {
    if (selectedId) setShowStatusModal(true);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedId) return;
    setStatusUpdating(true);
    setStatusError("");
    try {
      // إذا تم تمرير الحالة معربة، حولها إلى القيمة الإنجليزية
      const statusEn = statusOptions.find(opt => opt.label === newStatus)?.value || newStatus;
      await axiosInstance.post('/update-transaction-status/', {
        transaction_id: selectedId,
        status: statusEn
      });
      setTransactions(transactions =>
        transactions.map(tr =>
          tr.id === selectedId ? { ...tr, status: statusEn } : tr
        )
      );
      setShowStatusModal(false);
    } catch (e) {
      setStatusError("فشل في تحديث حالة التحويل");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handlePrint = () => {
    if (selectedId) setShowReceiptModal(true);
  };

  const handleRefresh = () => {
    fetchData(currentPage);
    setSelectedId(null);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4 text-primary-800">إدارة التحويلات</h1>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <select
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value)}
          className="input-field md:w-48"
          disabled={loading}
        >
          <option value="الكل">الكل</option>
          {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input-field md:w-48"
          disabled={loading}
        >
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex gap-2">
          <ModernButton 
            color="#2ecc71" 
            onClick={handleDetails} 
            disabled={!selectedId || loading}
          >
            تفاصيل
          </ModernButton>
          <ModernButton 
            color="#3498db" 
            onClick={handleUpdateStatus} 
            disabled={!selectedId || loading}
          >
            تحديث الحالة
          </ModernButton>
          <ModernButton 
            color="#e74c3c" 
            onClick={handlePrint} 
            disabled={!selectedId || loading}
          >
            طباعة الإيصال
          </ModernButton>
          <ModernButton 
            color="#f59e42" 
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? "جاري التحديث..." : "تحديث"}
          </ModernButton>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل البيانات...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-center">
          {error}
        </div>
      ) : (
        <>
        <div className="overflow-x-auto rounded-xl shadow bg-white">
          <table className="min-w-full text-center">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-4 py-3">رقم التحويل</th>
                <th className="px-4 py-3">المرسل</th>
                <th className="px-4 py-3">المستلم</th>
                <th className="px-4 py-3">المبلغ</th>
                <th className="px-4 py-3">العملة</th>
                <th className="px-4 py-3">التاريخ</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">الفرع المرسل</th>
                <th className="px-4 py-3">الفرع المستلم</th>
                <th className="px-4 py-3">اسم الموظف</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="py-6 text-gray-500">لا يوجد تحويلات</td></tr>
              ) : (
                filtered.map(tr => (
                  <tr
                    key={tr.id}
                    className={`border-b hover:bg-primary-50 cursor-pointer transition-colors ${
                      selectedId === tr.id ? "bg-primary-100" : ""
                    }`}
                    onClick={() => setSelectedId(tr.id)}
                  >
                    <td className="px-4 py-2">{tr.id}</td>
                    <td className="px-4 py-2">{tr.sender}</td>
                    <td className="px-4 py-2">{tr.receiver}</td>
                    <td className="px-4 py-2">{tr.amount.toLocaleString()}</td>
                    <td className="px-4 py-2">{tr.currency}</td>
                    <td className="px-4 py-2">{tr.date}</td>
                    <td className="px-4 py-2">
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        tr.status === "completed" ? "bg-green-100 text-green-700" :
                        tr.status === "cancelled" || tr.status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {statusMap[tr.status] || tr.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">{tr.sendingBranch}</td>
                    <td className="px-4 py-2">{tr.receivingBranch}</td>
                    <td className="px-4 py-2">{tr.employee}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-700">
            الصفحة {currentPage} من {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded bg-primary-100 text-primary-700 disabled:opacity-50"
            >
              السابق
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded ${page === currentPage ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-700'} font-bold`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded bg-primary-100 text-primary-700 disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        </div>
        </>
      )}
      <TransactionDetailsModal
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        transaction={transactions.find(tr => tr.id === selectedId)}
      />
      <TransactionStatusModal
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        transaction={transactions.find(tr => tr.id === selectedId)}
        onSubmit={handleStatusUpdate}
        statusOptions={statusOptions}
      />
      <TransactionReceiptModal
        open={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        transaction={transactions.find(tr => tr.id === selectedId)}
      />
      {success && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}
    </div>
  );
} 