import React, { useState } from "react";
import BranchModal from "./BranchModal";
import ModernButton from "../ui/ModernButton";

interface BranchTaxModalProps {
  open: boolean;
  onClose: () => void;
  branch: any;
  onSubmit: (taxRate: number) => void;
}

export default function BranchTaxModal({ open, onClose, branch, onSubmit }: BranchTaxModalProps) {
  const [taxRate, setTaxRate] = useState<number>(branch?.tax_rate ?? 0);
  const [error, setError] = useState("");

  const handleSave = () => {
    if (taxRate < 0 || taxRate > 100) {
      setError("النسبة يجب أن تكون بين 0 و 100");
      return;
    }
    setError("");
    onSubmit(taxRate);
  };

  return (
    <BranchModal open={open} onClose={onClose} title={`تعديل نسبة الضريبة - ${branch?.name || "فرع"}`}>
      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">نسبة الضريبة (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={taxRate}
            onChange={e => setTaxRate(Number(e.target.value))}
            className="input-field w-full"
            placeholder="أدخل نسبة الضريبة"
          />
        </div>
        {error && <div className="text-red-600 text-center">{error}</div>}
        <div className="flex justify-end gap-2 mt-4">
          <ModernButton color="#e74c3c" onClick={onClose}>إلغاء</ModernButton>
          <ModernButton color="#2ecc71" onClick={handleSave}>حفظ</ModernButton>
        </div>
      </div>
    </BranchModal>
  );
} 