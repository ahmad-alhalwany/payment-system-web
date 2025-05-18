"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import ModernButton from "@/components/ui/ModernButton";
import axiosInstance from "@/app/api/axios";

interface TransferFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function TransferFormModal({ open, onClose, onSubmit }: TransferFormModalProps) {
  const [formData, setFormData] = useState({
    sender_name: "",
    sender_phone: "",
    recipient_name: "",
    recipient_phone: "",
    amount: "",
    currency: "SYP",
    branch: "",
    notes: "",
  });

  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // جلب قائمة الفروع
  React.useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await axiosInstance.get('/branches/');
        setBranches(response.data.map((branch: any) => ({
          id: branch.id,
          name: branch.name
        })));
      } catch (error) {
        console.error('Error fetching branches:', error);
        setError("فشل في تحميل قائمة الفروع");
      }
    };

    if (open) {
      fetchBranches();
    }
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount)
      };
      onSubmit(data);
    } catch (error) {
      console.error('Error submitting form:', error);
      setError("فشل في إرسال النموذج");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="تحويل جديد">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* بيانات المرسل */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-700">بيانات المرسل</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">اسم المرسل</label>
              <input
                type="text"
                name="sender_name"
                value={formData.sender_name}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">رقم هاتف المرسل</label>
              <input
                type="tel"
                name="sender_phone"
                value={formData.sender_phone}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* بيانات المستلم */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-700">بيانات المستلم</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">اسم المستلم</label>
              <input
                type="text"
                name="recipient_name"
                value={formData.recipient_name}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">رقم هاتف المستلم</label>
              <input
                type="tel"
                name="recipient_phone"
                value={formData.recipient_phone}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* بيانات التحويل */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-700">بيانات التحويل</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">المبلغ</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">العملة</label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="SYP">ليرة سورية</option>
                <option value="USD">دولار أمريكي</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">الفرع</label>
              <select
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">اختر الفرع</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ملاحظات */}
        <div>
          <label className="block text-sm font-medium text-gray-700">ملاحظات</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        {/* رسالة الخطأ */}
        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        {/* أزرار التحكم */}
        <div className="flex justify-end gap-4 mt-6">
          <ModernButton color="#e74c3c" onClick={onClose}>
            إلغاء
          </ModernButton>
          <ModernButton
            color="#2ecc71"
            type="submit"
            disabled={loading}
          >
            {loading ? "جاري الحفظ..." : "حفظ"}
          </ModernButton>
        </div>
      </form>
    </Modal>
  );
} 