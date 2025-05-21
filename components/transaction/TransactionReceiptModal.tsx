import React from "react";
import { Transaction } from "@/app/api/transactions";
import { numberToArabicWords } from "@/lib/utils/arabicAmount";

interface TransactionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | undefined;
  onPrint: () => void;
}

export default function TransactionReceiptModal({
  isOpen,
  onClose,
  transaction,
  onPrint
}: TransactionReceiptModalProps) {
  if (!isOpen || !transaction) return null;

  // تحديد نوع العملية (إرسال أو استلام)
  const isReceived = transaction.status === "completed";
  const operationType = isReceived ? "استلام" : "إرسال";
  // رقم هاتف المرسل والمستلم
  const senderMobile = transaction.sender_mobile || "-";
  const receiverMobile = transaction.receiver_mobile || "-";
  // التاريخ والوقت
  const date = transaction.date?.split("T")[0] || "-";
  const time = transaction.date?.split("T")[1]?.slice(0,5) || "--:--";
  // المبلغ المستفاد
  const benefit = transaction.benefited_amount ? transaction.benefited_amount.toLocaleString() : "-";
  const amount = transaction.amount ? transaction.amount.toLocaleString() : "-";

  // Helper to display branch name
  const displayBranch = (name: string | null | undefined) => !name || name === '-' ? 'الفرع الرئيسي' : name;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-gradient-to-br from-primary-50 to-white rounded-2xl shadow-2xl w-full max-w-2xl p-4 relative animate-fadeIn print:p-2 border-2 border-primary-200">
        <button
          className="absolute left-4 top-4 text-gray-500 hover:text-red-500 text-2xl font-bold print:hidden"
          onClick={onClose}
          aria-label="إغلاق"
        >
          ×
        </button>
        <div className="flex flex-col items-center gap-1 mb-4">
          <div className="text-3xl font-extrabold text-primary-700 tracking-tight mb-1">
            {operationType}
          </div>
          <h2 className="text-2xl font-extrabold text-primary-700 tracking-tight">إيصال العميل</h2>
          <span className="text-xs text-gray-400">يرجى الاحتفاظ بهذا الإيصال</span>
        </div>
        <div className="bg-white rounded-xl shadow p-2 w-full mb-2 border border-primary-100">
          {/* Horizontal info row */}
          <div className="grid grid-cols-3 gap-2 text-center mb-2">
            <div className="font-semibold text-primary-700">رقم التحويل</div>
            <div className="font-semibold text-primary-700">الفرع المرسل</div>
            <div className="font-semibold text-primary-700">الفرع المستلم</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mb-2">
            <div className="break-all">{transaction.id}</div>
            <div>{displayBranch(transaction.sending_branch_name)}</div>
            <div>{displayBranch(transaction.destination_branch_name)}</div>
          </div>
          <hr className="my-2 border-primary-100" />
          {/* Sender info row */}
          <div className="grid grid-cols-2 gap-2 text-center mb-2">
            <div><span className="font-semibold">اسم المرسل</span><br />{transaction.sender}</div>
            <div><span className="font-semibold">رقم هاتف المرسل</span><br />{senderMobile}</div>
          </div>
          {/* Receiver info row */}
          <div className="grid grid-cols-2 gap-2 text-center mb-2">
            <div><span className="font-semibold">اسم المستلم</span><br />{transaction.receiver}</div>
            <div><span className="font-semibold">رقم هاتف المستلم</span><br />{receiverMobile}</div>
          </div>
          {/* Date and time row */}
          <div className="grid grid-cols-2 gap-2 text-center mb-2">
            <div><span className="font-semibold">التاريخ</span><br />{date}</div>
            <div><span className="font-semibold">الوقت</span><br />{time}</div>
          </div>
          <hr className="my-2 border-primary-100" />
          {/* Amounts */}
          <div className="text-center my-2">
            <div className="font-bold text-primary-700 text-lg">المبلغ</div>
            <div className="text-lg font-bold text-primary-800">{amount} {transaction.currency}</div>
            <div className="text-xs text-gray-600">({numberToArabicWords(transaction.amount)} {transaction.currency})</div>
          </div>
          <div className="text-center my-2">
            <div className="font-bold">المبلغ المستفاد</div>
            <div>{benefit} {transaction.currency}</div>
          </div>
        </div>
        <div className="text-center text-xs text-gray-500 mt-1 mb-3">
          <p>تم طباعة هذا الإيصال بتاريخ {new Date().toLocaleDateString('ar-SA')}</p>
          <p>وقت الطباعة: {new Date().toLocaleTimeString('ar-SA')}</p>
        </div>
        <div className="flex justify-center gap-4 mt-2 print:hidden">
          <button
            className="bg-gray-400 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-500 transition"
            onClick={onClose}
          >
            إغلاق
          </button>
          <button
            className="bg-primary-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-primary-700 transition shadow"
            onClick={onPrint}
          >
            طباعة
          </button>
        </div>
      </div>
    </div>
  );
} 