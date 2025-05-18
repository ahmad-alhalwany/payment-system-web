import React from "react";
import { Transaction } from "../../api/transactions";

interface TransferDetailsModalProps {
  open: boolean;
  onClose: () => void;
  transfer: Transaction | null;
}

export default function TransferDetailsModal({ open, onClose, transfer }: TransferDetailsModalProps) {
  if (!open || !transfer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 relative animate-fadeIn">
        <button
          className="absolute left-4 top-4 text-gray-500 hover:text-red-500 text-2xl font-bold"
          onClick={onClose}
          aria-label="إغلاق"
        >
          ×
        </button>
        <h2 className="text-xl font-bold text-primary-800 mb-4 text-center">تفاصيل التحويل</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="font-semibold mb-1">رقم التحويل:</div>
            <div className="bg-gray-50 rounded p-2 border">{transfer.id}</div>
          </div>
          <div>
            <div className="font-semibold mb-1">التاريخ:</div>
            <div className="bg-gray-50 rounded p-2 border">{transfer.date?.split("T")[0] || "-"}</div>
          </div>
          <div>
            <div className="font-semibold mb-1">المرسل:</div>
            <div className="bg-gray-50 rounded p-2 border">{transfer.sender}</div>
          </div>
          <div>
            <div className="font-semibold mb-1">المستلم:</div>
            <div className="bg-gray-50 rounded p-2 border">{transfer.receiver}</div>
          </div>
          <div>
            <div className="font-semibold mb-1">المبلغ:</div>
            <div className="bg-gray-50 rounded p-2 border">{transfer.amount.toLocaleString()} {transfer.currency}</div>
          </div>
          <div>
            <div className="font-semibold mb-1">المبلغ الأساسي:</div>
            <div className="bg-gray-50 rounded p-2 border">{transfer.base_amount.toLocaleString()} {transfer.currency}</div>
          </div>
          <div>
            <div className="font-semibold mb-1">المبلغ المستفاد:</div>
            <div className="bg-gray-50 rounded p-2 border">{transfer.benefited_amount.toLocaleString()} {transfer.currency}</div>
          </div>
          <div>
            <div className="font-semibold mb-1">نسبة الضريبة:</div>
            <div className="bg-gray-50 rounded p-2 border">{transfer.tax_rate * 100}%</div>
          </div>
          <div>
            <div className="font-semibold mb-1">قيمة الضريبة:</div>
            <div className="bg-gray-50 rounded p-2 border">{transfer.tax_amount.toLocaleString()} {transfer.currency}</div>
          </div>
          <div>
            <div className="font-semibold mb-1">الفرع:</div>
            <div className="bg-gray-50 rounded p-2 border">{transfer.branch_governorate}</div>
          </div>
          <div>
            <div className="font-semibold mb-1">الموظف:</div>
            <div className="bg-gray-50 rounded p-2 border">{transfer.employee_name}</div>
          </div>
          <div>
            <div className="font-semibold mb-1">الحالة:</div>
            <div className="bg-gray-50 rounded p-2 border">
              <span className={`px-2 py-1 rounded-full text-sm ${
                transfer.status === 'completed' ? 'bg-green-100 text-green-800' :
                transfer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {transfer.status === 'completed' ? 'مكتمل' :
                 transfer.status === 'pending' ? 'قيد الانتظار' :
                 'ملغي'}
              </span>
            </div>
          </div>
          <div>
            <div className="font-semibold mb-1">تم الاستلام:</div>
            <div className="bg-gray-50 rounded p-2 border">
              <span className={`px-2 py-1 rounded-full text-sm ${
                transfer.is_received ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {transfer.is_received ? 'نعم' : 'لا'}
              </span>
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="font-semibold mb-1">الرسالة:</div>
            <div className="bg-gray-50 rounded p-2 border">{transfer.message || <span className="text-gray-400">لا يوجد</span>}</div>
          </div>
        </div>
      </div>
    </div>
  );
} 