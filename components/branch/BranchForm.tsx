import React, { useState } from "react";
import ModernButton from "../ui/ModernButton";
import ModernGroupBox from "../ui/ModernGroupBox";
import { Branch, BranchFormData, SYRIAN_GOVERNORATES } from "@/lib/api/branches";

interface BranchFormProps {
  initialData?: {
    branch_id?: string;
    name?: string;
    location?: string;
    governorate?: string;
    status?: string;
    tax_rate?: number;
    phone_number?: string;
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const governorates = [
  "دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس", "الرقة", "دير الزور",
  "الحسكة", "إدلب", "درعا", "السويداء", "القنيطرة", "ريف دمشق"
];

export default function BranchForm({ initialData = {}, onSubmit, onCancel }: BranchFormProps) {
  const [form, setForm] = useState({
    branch_id: initialData.branch_id || "",
    name: initialData.name || "",
    location: initialData.location || "",
    governorate: initialData.governorate || "دمشق",
    status: initialData.status || "active",
    tax_rate: initialData.tax_rate || 0,
    phone_number: initialData.phone_number || "",
  });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.branch_id || !form.name || !form.location) {
      setError("جميع الحقول مطلوبة");
      return;
    }
    setError("");
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-1 font-medium">رمز الفرع</label>
        <input
          name="branch_id"
          type="text"
          value={form.branch_id}
          onChange={handleChange}
          className="input-field"
          required
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">اسم الفرع</label>
        <input
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          className="input-field"
          required
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">موقع الفرع</label>
        <input
          name="location"
          type="text"
          value={form.location}
          onChange={handleChange}
          className="input-field"
          required
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">المحافظة</label>
        <select
          name="governorate"
          value={form.governorate}
          onChange={handleChange}
          className="input-field"
        >
          {governorates.map((gov) => (
            <option key={gov} value={gov}>{gov}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block mb-1 font-medium">حالة الفرع</label>
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className="input-field"
        >
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>
      </div>
      <div>
        <label className="block mb-1 font-medium">نسبة الضريبة (%)</label>
        <input
          name="tax_rate"
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={form.tax_rate}
          onChange={handleChange}
          className="input-field"
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">رقم هاتف الفرع</label>
        <input
          name="phone_number"
          type="text"
          value={form.phone_number}
          onChange={handleChange}
          className="input-field"
          required
        />
      </div>
      {error && <div className="text-red-600 text-center">{error}</div>}
      <div className="flex gap-2 justify-end mt-4">
        <button type="button" onClick={onCancel} className="btn-secondary">إلغاء</button>
        <button type="submit" className="btn-primary">حفظ</button>
      </div>
    </form>
  );
} 