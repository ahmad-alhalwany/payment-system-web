import React, { useState, useEffect } from "react";
import BranchModal from "../branch/BranchModal";
import ModernButton from "../ui/ModernButton";

interface TransactionStatusModalProps {
  open: boolean;
  onClose: () => void;
  transaction: any;
  onSubmit: (newStatus: string) => void;
  statusOptions?: { value: string; label: string }[];
}

export default function TransactionStatusModal({ open, onClose, transaction, onSubmit, statusOptions }: TransactionStatusModalProps) {
  const defaultStatus = statusOptions && statusOptions.length > 0 ? statusOptions[0].value : "processing";
  const getInitialStatus = () => {
    if (!transaction) return defaultStatus;
    // ابحث عن القيمة الإنجليزية بناءً على value أو label
    return statusOptions?.find(opt => opt.value === transaction.status || opt.label === transaction.status)?.value || defaultStatus;
  };
  const [status, setStatus] = useState(getInitialStatus());

  useEffect(() => {
    setStatus(getInitialStatus());
  }, [transaction, open]);

  const handleSave = () => {
    onSubmit(status);
  };

  if (!transaction) return null;
  return (
    <BranchModal open={open} onClose={onClose} title={`تحديث حالة التحويل - ${transaction.id || ""}`}>
      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">الحالة الحالية</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="input-field w-full"
          >
            {statusOptions && statusOptions.length > 0
              ? statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)
              : [<option key={status} value={status}>{status}</option>]
            }
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <ModernButton color="#e74c3c" onClick={onClose}>إلغاء</ModernButton>
          <ModernButton color="#2ecc71" onClick={handleSave}>حفظ</ModernButton>
        </div>
      </div>
    </BranchModal>
  );
} 