import React from "react";
import { Transaction } from "../../api/transactions";
import { numberToArabicWords } from "../../../lib/utils/arabicAmount";

interface PrintTransferViewProps {
  transfer: Transaction;
  onClose: () => void;
}

export default function PrintTransferView({ transfer, onClose }: PrintTransferViewProps) {
  // تحديد نوع العملية (إرسال أو استلام)
  const isReceived = transfer.status === "completed";
  const operationType = isReceived ? "استلام" : "إرسال";
  // رقم هاتف المرسل والمستلم
  const senderMobile = transfer.sender_mobile || "-";
  const receiverMobile = transfer.receiver_mobile || "-";
  // التاريخ والوقت
  const date = transfer.date?.split("T")[0] || "-";
  const time = transfer.date?.split("T")[1]?.slice(0,5) || "--:--";
  // المبلغ المستفاد
  const benefit = transfer.benefited_amount ? transfer.benefited_amount.toLocaleString() : "-";
  const amount = transfer.amount ? transfer.amount.toLocaleString() : "-";
  return (
    <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 relative animate-fadeIn print:p-2">
      <button
        className="absolute left-4 top-4 text-gray-500 hover:text-red-500 text-2xl font-bold print:hidden"
        onClick={onClose}
        aria-label="إغلاق"
      >
        ×
      </button>
      <div className="flex flex-col md:flex-row gap-6 items-start justify-center">
        {/* إيصال النظام */}
        <div className="flex-1 border rounded-lg p-4 min-w-[260px] max-w-xs mx-auto">
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold text-primary-800">إيصال النظام</h2>
            <p className="text-xs text-gray-600">رقم التحويل: {transfer.id}</p>
          </div>
          <div className="grid grid-cols-1 gap-1 text-sm">
            <div><b>المرسل:</b> {transfer.sender}</div>
            <div><b>المستلم:</b> {transfer.receiver}</div>
            <div><b>رقم هاتف المرسل:</b> {senderMobile}</div>
            <div><b>رقم هاتف المستلم:</b> {receiverMobile}</div>
            <div><b>المبلغ:</b> {amount} {transfer.currency}</div>
            <div className="text-xs text-gray-600">({numberToArabicWords(transfer.amount)} {transfer.currency})</div>
            <div><b>المبلغ المستفاد:</b> {benefit} {transfer.currency}</div>
            <div><b>التاريخ:</b> {date}</div>
            <div><b>الوقت:</b> {time}</div>
            <div><b>الفرع المرسل:</b> {transfer.sending_branch_name || "-"}</div>
            <div><b>الفرع المستلم:</b> {transfer.destination_branch_name || "-"}</div>
            <div><b>اسم الموظف:</b> {transfer.employee_name}</div>
            <div><b>الحالة:</b> {transfer.status}</div>
          </div>
          <div className="text-center text-xs text-gray-500 mt-2">
            <p>تم طباعة هذا الإيصال بتاريخ {new Date().toLocaleDateString('ar-SA')}</p>
            <p>وقت الطباعة: {new Date().toLocaleTimeString('ar-SA')}</p>
      </div>
        </div>
        {/* خط فاصل */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-full border-t-2 border-dashed border-gray-400 my-2 md:my-0 md:w-0 md:h-32 md:border-l-2 md:border-t-0"></div>
        </div>
        {/* إيصال العميل */}
        <div className="flex-1 border rounded-lg p-4 min-w-[260px] max-w-xs mx-auto">
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold text-primary-700">إيصال العميل</h2>
        </div>
          <div className="grid grid-cols-1 gap-1 text-sm">
            <div><b>نوع العملية:</b> {operationType}</div>
            <div><b>المرسل:</b> {transfer.sender}</div>
            <div><b>رقم هاتف المرسل:</b> {senderMobile}</div>
            <div><b>المستلم:</b> {transfer.receiver}</div>
            <div><b>رقم هاتف المستلم:</b> {receiverMobile}</div>
            <div><b>من الفرع:</b> {transfer.sending_branch_name || "-"}</div>
            <div><b>إلى الفرع:</b> {transfer.destination_branch_name || "-"}</div>
            <div><b>التاريخ:</b> {date}</div>
            <div><b>الوقت:</b> {time}</div>
            <div><b>المبلغ:</b> {amount} {transfer.currency}</div>
            <div className="text-xs text-gray-600">({numberToArabicWords(transfer.amount)} {transfer.currency})</div>
            <div><b>المبلغ المستفاد:</b> {benefit} {transfer.currency}</div>
        </div>
          <div className="text-center text-xs text-gray-500 mt-2">
            <p>تم طباعة هذا الإيصال بتاريخ {new Date().toLocaleDateString('ar-SA')}</p>
            <p>وقت الطباعة: {new Date().toLocaleTimeString('ar-SA')}</p>
        </div>
        </div>
      </div>
      <div className="flex justify-center gap-4 mt-8 print:hidden">
        <button
          className="bg-gray-400 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-500 transition"
          onClick={onClose}
        >
          إغلاق
        </button>
        <button
          className="bg-primary-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-primary-700 transition"
          onClick={() => window.print()}
        >
          طباعة
        </button>
      </div>
    </div>
  );
} 