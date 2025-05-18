"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import ModernButton from "@/components/ui/ModernButton";

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

interface TransferDetailsModalProps {
  open: boolean;
  onClose: () => void;
  transfer: Transfer;
  onStatusUpdate: (status: string) => void;
}

const statusLabels = {
  pending: "قيد الانتظار",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export default function TransferDetailsModal({
  open,
  onClose,
  transfer,
  onStatusUpdate,
}: TransferDetailsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={`تفاصيل التحويل ${transfer.transfer_id}`}>
      <div className="space-y-6">
        {/* معلومات التحويل */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">بيانات المرسل</h3>
            <div className="space-y-1">
              <p><span className="text-gray-600">الاسم:</span> {transfer.sender_name}</p>
              <p><span className="text-gray-600">رقم الهاتف:</span> {transfer.sender_phone}</p>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">بيانات المستلم</h3>
            <div className="space-y-1">
              <p><span className="text-gray-600">الاسم:</span> {transfer.recipient_name}</p>
              <p><span className="text-gray-600">رقم الهاتف:</span> {transfer.recipient_phone}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">تفاصيل التحويل</h3>
            <div className="space-y-1">
              <p><span className="text-gray-600">المبلغ:</span> {transfer.amount.toLocaleString()} {transfer.currency}</p>
              <p><span className="text-gray-600">الفرع:</span> {transfer.branch}</p>
              <p><span className="text-gray-600">تاريخ الإنشاء:</span> {transfer.created_at}</p>
              {transfer.completed_at && (
                <p><span className="text-gray-600">تاريخ الإكمال:</span> {transfer.completed_at}</p>
              )}
              {transfer.tax_amount && (
                <p><span className="text-gray-600">الضريبة:</span> {transfer.tax_amount.toLocaleString()} {transfer.currency}</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">الحالة</h3>
            <div className="space-y-1">
              <p>
                <span className="text-gray-600">الحالة الحالية:</span>{" "}
                <span className={`px-2 py-1 rounded-full text-sm ${
                  transfer.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : transfer.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}>
                  {statusLabels[transfer.status]}
                </span>
              </p>
            </div>
          </div>
        </div>

        {transfer.notes && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">ملاحظات</h3>
            <p className="text-gray-600">{transfer.notes}</p>
          </div>
        )}

        {/* أزرار تحديث الحالة */}
        {transfer.status === "pending" && (
          <div className="flex justify-end gap-4 mt-6">
            <ModernButton
              color="#e74c3c"
              onClick={() => onStatusUpdate("cancelled")}
            >
              إلغاء التحويل
            </ModernButton>
            <ModernButton
              color="#2ecc71"
              onClick={() => onStatusUpdate("completed")}
            >
              إكمال التحويل
            </ModernButton>
          </div>
        )}
      </div>
    </Modal>
  );
} 