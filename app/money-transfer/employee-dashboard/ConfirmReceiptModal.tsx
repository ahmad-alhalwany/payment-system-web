import React, { useState } from "react";
import { Transaction } from "../../api/transactions";

interface ConfirmReceiptModalProps {
  open: boolean;
  onClose: () => void;
  transfer: Transaction | null;
  onConfirm: () => void;
  loading?: boolean;
}

export default function ConfirmReceiptModal({ open, onClose, transfer, onConfirm, loading = false }: ConfirmReceiptModalProps) {
  const [receiver, setReceiver] = useState({
    name: "",
    mobile: "",
    id: "",
    address: "",
    governorate: "",
  });
  const [errors, setErrors] = useState<string[]>([]);

  if (!open || !transfer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = [];
    if (!receiver.name) errs.push("اسم المستلم مطلوب");
    if (!receiver.mobile || !/^\d{10}$/.test(receiver.mobile)) errs.push("رقم هاتف المستلم يجب أن يكون 10 أرقام");
    if (!receiver.id) errs.push("رقم هوية المستلم مطلوب");
    if (!receiver.address) errs.push("عنوان المستلم مطلوب");
    if (!receiver.governorate) errs.push("محافظة المستلم مطلوبة");

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative animate-fadeIn">
        <button
          className="absolute left-4 top-4 text-gray-500 hover:text-red-500 text-2xl font-bold"
          onClick={onClose}
          aria-label="إغلاق"
          disabled={loading}
        >
          ×
        </button>
        <h2 className="text-xl font-bold text-primary-800 mb-4 text-center">تأكيد استلام التحويل</h2>
        <form onSubmit={handleSubmit}>
          {errors.length > 0 && (
            <div className="bg-red-100 text-red-700 rounded p-3 text-sm mb-4 border border-red-300">
              {errors.map((err, i) => <div key={i}>• {err}</div>)}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">اسم المستلم <span className="text-red-500">*</span></label>
              <input
                className="input w-full"
                value={receiver.name}
                onChange={e => setReceiver({ ...receiver, name: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">رقم الهاتف <span className="text-red-500">*</span></label>
              <input
                className="input w-full"
                value={receiver.mobile}
                onChange={e => setReceiver({ ...receiver, mobile: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">رقم الهوية <span className="text-red-500">*</span></label>
              <input
                className="input w-full"
                value={receiver.id}
                onChange={e => setReceiver({ ...receiver, id: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">العنوان <span className="text-red-500">*</span></label>
              <input
                className="input w-full"
                value={receiver.address}
                onChange={e => setReceiver({ ...receiver, address: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">المحافظة <span className="text-red-500">*</span></label>
              <select
                className="input w-full"
                value={receiver.governorate}
                onChange={e => setReceiver({ ...receiver, governorate: e.target.value })}
                required
                disabled={loading}
              >
                <option value="">اختر المحافظة</option>
                <option value="دمشق">دمشق</option>
                <option value="ريف دمشق">ريف دمشق</option>
                <option value="حلب">حلب</option>
                <option value="حمص">حمص</option>
                <option value="حماة">حماة</option>
                <option value="اللاذقية">اللاذقية</option>
                <option value="طرطوس">طرطوس</option>
                <option value="إدلب">إدلب</option>
                <option value="دير الزور">دير الزور</option>
                <option value="الرقة">الرقة</option>
                <option value="الحسكة">الحسكة</option>
                <option value="السويداء">السويداء</option>
                <option value="درعا">درعا</option>
                <option value="القنيطرة">القنيطرة</option>
              </select>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-6">
            <button
              className="bg-gray-400 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onClose}
              type="button"
              disabled={loading}
            >
              إلغاء
            </button>
            <button
              className="bg-primary-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              {loading ? "جاري التأكيد..." : "تأكيد الاستلام"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 