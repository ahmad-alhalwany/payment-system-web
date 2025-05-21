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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-black/60 via-blue-100/40 to-white/60 backdrop-blur-[2px]">
      <div className="bg-white/95 rounded-3xl shadow-2xl w-full max-w-2xl p-4 md:p-10 relative animate-fadeIn border border-primary-100" style={{ boxShadow: '0 8px 32px #1976d220' }}>
        <button
          className="absolute left-6 top-6 text-gray-400 hover:text-red-500 text-3xl font-extrabold transition-all duration-150"
          onClick={onClose}
          aria-label="إغلاق"
        >
          ×
        </button>
        <h2 className="text-2xl font-extrabold text-primary-800 mb-8 text-center tracking-wide drop-shadow-sm">تفاصيل التحويل</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="font-semibold mb-1 text-primary-700">رقم التحويل:</div>
            <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{transfer.id}</div>
          </div>
          <div>
            <div className="font-semibold mb-1 text-primary-700">التاريخ:</div>
            <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{transfer.date?.split("T")[0] || "-"}</div>
          </div>
          <div>
            <div className="font-semibold mb-1 text-primary-700">المرسل:</div>
            <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{transfer.sender}</div>
          </div>
          <div>
            <div className="font-semibold mb-1 text-primary-700">المستلم:</div>
            <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{transfer.receiver}</div>
          </div>
          <div>
            <div className="font-semibold mb-1 text-primary-700">المبلغ:</div>
            <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{transfer.amount.toLocaleString()} {transfer.currency}</div>
          </div>
          <div>
            <div className="font-semibold mb-1 text-primary-700">المبلغ الأساسي:</div>
            <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{transfer.base_amount.toLocaleString()} {transfer.currency}</div>
          </div>
          <div>
            <div className="font-semibold mb-1 text-primary-700">المبلغ المستفاد:</div>
            <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{transfer.benefited_amount.toLocaleString()} {transfer.currency}</div>
          </div>
          <div>
            <div className="font-semibold mb-1 text-primary-700">نسبة الضريبة:</div>
            <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{transfer.tax_rate * 100}%</div>
          </div>
          <div>
            <div className="font-semibold mb-1 text-primary-700">قيمة الضريبة:</div>
            <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{transfer.tax_amount.toLocaleString()} {transfer.currency}</div>
          </div>
          <div>
            <div className="font-semibold mb-1 text-primary-700">الفرع:</div>
            <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{transfer.branch_governorate}</div>
          </div>
          <div>
            <div className="font-semibold mb-1 text-primary-700">الموظف:</div>
            <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{transfer.employee_name}</div>
          </div>
          <div>
            <div className="font-semibold mb-1 text-primary-700">الحالة:</div>
            <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm">
              <span className={`px-3 py-1 rounded-full text-base font-bold shadow-sm border-2 transition-all duration-200 ${
                transfer.status === 'completed' ? 'bg-green-50 text-green-800 border-green-200' :
                transfer.status === 'pending' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                'bg-red-50 text-red-800 border-red-200'
              }`}>
                {transfer.status === 'completed' ? 'مكتمل' :
                 transfer.status === 'pending' ? 'قيد الانتظار' :
                 'ملغي'}
              </span>
            </div>
          </div>
          <div>
            <div className="font-semibold mb-1 text-primary-700">تم الاستلام:</div>
            <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm">
              <span className={`px-3 py-1 rounded-full text-base font-bold shadow-sm border-2 transition-all duration-200 ${
                transfer.is_received ? 'bg-green-50 text-green-800 border-green-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'
              }`}>
                {transfer.is_received ? 'نعم' : 'لا'}
              </span>
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="font-semibold mb-1 text-primary-700">الرسالة:</div>
            <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{transfer.message || <span className="text-gray-400">لا يوجد</span>}</div>
          </div>
        </div>
      </div>
    </div>
  );
} 