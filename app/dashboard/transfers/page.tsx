"use client";

import React, { useState, useEffect } from "react";
import ModernButton from "@/components/ui/ModernButton";
import TransferFormModal from "@/components/transfer/TransferFormModal";
import TransferDetailsModal from "@/components/transfer/TransferDetailsModal";
import axiosInstance from "@/app/api/axios";

interface Transfer {
  id: string;
  transfer_id: string;
  sender_name: string;
  sender_phone: string;
  recipient_name: string;
  recipient_phone: string;
  amount: number;
  currency: "SYP" | "USD";
  status: "pending" | "completed" | "cancelled";
  branch: string;
  created_at: string;
  completed_at?: string;
  tax_amount?: number;
  notes?: string;
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels = {
  pending: "قيد الانتظار",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("الكل");

  // جلب بيانات التحويلات
  const fetchTransfers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axiosInstance.get('/transfers/', {
        params: {
          status: statusFilter !== 'الكل' ? statusFilter : undefined,
          search: search || undefined
        }
      });
      setTransfers(response.data);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      setError("فشل في تحميل بيانات التحويلات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [statusFilter, search]);

  // إضافة تحويل جديد
  const handleAddTransfer = async (data: any) => {
    try {
      const response = await axiosInstance.post('/transfers/', data);
      setTransfers([...transfers, response.data]);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding transfer:', error);
      setError("فشل في إضافة التحويل");
    }
  };

  // تحديث حالة التحويل
  const handleUpdateStatus = async (status: string) => {
    if (!selectedTransferId) return;
    try {
      const response = await axiosInstance.put(`/transfers/${selectedTransferId}/status`, { status });
      setTransfers(transfers.map(t => t.id === selectedTransferId ? response.data : t));
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error updating transfer status:', error);
      setError("فشل في تحديث حالة التحويل");
    }
  };

  // اختيار تحويل من الجدول
  const handleRowClick = (id: string) => {
    setSelectedTransferId(id);
    setShowDetailsModal(true);
  };

  const selectedTransfer = transfers.find(t => t.id === selectedTransferId);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary-800">إدارة التحويلات</h1>
        <div className="flex gap-4">
          <ModernButton color="#2ecc71" onClick={() => setShowAddModal(true)}>
            تحويل جديد
          </ModernButton>
          <ModernButton color="#f59e42" onClick={fetchTransfers}>
            تحديث
          </ModernButton>
        </div>
      </div>

      {/* فلاتر البحث */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="بحث..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-4 py-2 w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-4 py-2 w-48"
        >
          <option value="الكل">الكل</option>
          <option value="pending">قيد الانتظار</option>
          <option value="completed">مكتمل</option>
          <option value="cancelled">ملغي</option>
        </select>
      </div>

      {/* جدول التحويلات */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                رقم التحويل
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                المرسل
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                المستلم
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                المبلغ
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الفرع
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                التاريخ
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الحالة
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transfers.map((transfer) => (
              <tr
                key={transfer.id}
                onClick={() => handleRowClick(transfer.id)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <td className="px-6 py-4 whitespace-nowrap">{transfer.transfer_id}</td>
                <td className="px-6 py-4 whitespace-nowrap">{transfer.sender_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{transfer.recipient_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {transfer.amount.toLocaleString()} {transfer.currency}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{transfer.branch}</td>
                <td className="px-6 py-4 whitespace-nowrap">{transfer.created_at}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[transfer.status]}`}>
                    {statusLabels[transfer.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* النوافذ المنبثقة */}
      {showAddModal && (
        <TransferFormModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddTransfer}
        />
      )}

      {showDetailsModal && selectedTransfer && (
        <TransferDetailsModal
          open={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          transfer={selectedTransfer}
          onStatusUpdate={handleUpdateStatus}
        />
      )}

      {/* رسالة الخطأ */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
} 