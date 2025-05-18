import React, { useState, useEffect } from "react";
import ModernButton from "../ui/ModernButton";
import BranchModal from "./BranchModal";
import axiosInstance from "@/app/api/axios";

interface Branch {
  id: number;
  name: string;
  governorate: string;
  balance: {
    SYP: number;
    USD: number;
  };
  allocated_amount_syp?: number;
  allocated_amount_usd?: number;
}

interface BalanceOperation {
  amount: number;
  type: "allocation" | "deduction";
  currency: "SYP" | "USD";
  description?: string;
}

interface BranchBalanceModalProps {
  open: boolean;
  onClose: () => void;
  branch: Branch;
  onSubmit: (data: BalanceOperation) => void;
  onDelete?: () => void;
}

export default function BranchBalanceModal({ open, onClose, branch, onSubmit, onDelete }: BranchBalanceModalProps) {
  const [operation, setOperation] = useState<"allocation" | "deduction">("allocation");
  const [currency, setCurrency] = useState<"SYP" | "USD">("SYP");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<Branch["balance"]>({ SYP: 0, USD: 0 });

  // جلب الرصيد الحالي للفرع
  useEffect(() => {
    if (branch) {
      setCurrentBalance({
        SYP: branch.allocated_amount_syp ?? 0,
        USD: branch.allocated_amount_usd ?? 0,
      });
    }
  }, [branch]);

  const handleSave = async () => {
    if (!amount || amount <= 0) {
      setError("يرجى إدخال مبلغ صحيح");
      return;
    }

    // التحقق من كفاية الرصيد في حالة الخصم
    if (operation === "deduction" && amount > currentBalance[currency]) {
      setError("الرصيد غير كافي للخصم");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await onSubmit({
        amount,
        type: operation,
        currency,
        description,
      });
      onClose();
    } catch (err) {
      setError("فشل في تحديث الرصيد");
      console.error('Error updating balance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setLoading(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError("فشل في حذف الرصيد");
      console.error('Error deleting balance:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BranchModal open={open} onClose={onClose} title={`تعيين/خصم رصيد - ${branch?.name || "فرع"}`}>
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">الرصيد الحالي</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-600">ليرة سورية:</span>
              <span className="font-medium mr-2">{currentBalance.SYP.toLocaleString()} ل.س</span>
            </div>
            <div>
              <span className="text-gray-600">دولار أمريكي:</span>
              <span className="font-medium mr-2">${currentBalance.USD.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <ModernButton
              color="#e67e22"
              onClick={() => {
                setOperation("deduction");
                setCurrency("SYP");
                setAmount(currentBalance.SYP);
                setDescription("خصم كامل الرصيد");
              }}
              disabled={loading || currentBalance.SYP === 0}
            >
              خصم كامل الرصيد (ل.س)
            </ModernButton>
            <ModernButton
              color="#e67e22"
              onClick={() => {
                setOperation("deduction");
                setCurrency("USD");
                setAmount(currentBalance.USD);
                setDescription("خصم كامل الرصيد");
              }}
              disabled={loading || currentBalance.USD === 0}
            >
              خصم كامل الرصيد ($)
            </ModernButton>
          </div>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              checked={operation === "allocation"}
              onChange={() => setOperation("allocation")}
              disabled={loading}
              className="ml-1"
            />
            <span>إضافة رصيد</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              checked={operation === "deduction"}
              onChange={() => setOperation("deduction")}
              disabled={loading}
              className="ml-1"
            />
            <span>خصم رصيد</span>
          </label>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              checked={currency === "SYP"}
              onChange={() => setCurrency("SYP")}
              disabled={loading}
              className="ml-1"
            />
            <span>ليرة سورية (ل.س)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              checked={currency === "USD"}
              onChange={() => setCurrency("USD")}
              disabled={loading}
              className="ml-1"
            />
            <span>دولار أمريكي ($)</span>
          </label>
        </div>

        <div>
          <label className="block mb-1 font-medium">المبلغ</label>
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            className="input-field w-full"
            placeholder="أدخل المبلغ"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">الوصف (اختياري)</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="input-field w-full"
            placeholder="مثال: إيداع نقدي بتاريخ ..."
            disabled={loading}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded text-center">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end mt-4">
          {onDelete && (
            <ModernButton 
              color="#e67e22" 
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "جاري الحذف..." : "حذف الرصيد بالكامل"}
            </ModernButton>
          )}
          <ModernButton 
            color="#e74c3c" 
            onClick={onClose}
            disabled={loading}
          >
            إلغاء
          </ModernButton>
          <ModernButton 
            color="#2ecc71" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "جاري الحفظ..." : "حفظ"}
          </ModernButton>
        </div>
      </div>
    </BranchModal>
  );
} 