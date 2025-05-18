import React from "react";
import BranchModal from "../branch/BranchModal";
import ModernButton from "../ui/ModernButton";

interface TransactionDetailsModalProps {
  open: boolean;
  onClose: () => void;
  transaction: any;
}

export default function TransactionDetailsModal({ open, onClose, transaction }: TransactionDetailsModalProps) {
  if (!transaction) return null;
  return (
    <BranchModal open={open} onClose={onClose} title={`تفاصيل التحويل - ${transaction.id || ""}`}>
      <div className="space-y-3 text-right">
        <div><span className="font-bold">رقم التحويل:</span> {transaction.id}</div>
        <div><span className="font-bold">المرسل:</span> {transaction.sender}</div>
        <div><span className="font-bold">المستلم:</span> {transaction.receiver}</div>
        <div><span className="font-bold">المبلغ:</span> {transaction.amount} {transaction.currency}</div>
        <div><span className="font-bold">التاريخ:</span> {transaction.date}</div>
        <div><span className="font-bold">الحالة:</span> {transaction.status}</div>
        <div><span className="font-bold">الفرع المرسل:</span> {transaction.sendingBranch}</div>
        <div><span className="font-bold">الفرع المستلم:</span> {transaction.receivingBranch}</div>
        <div><span className="font-bold">اسم الموظف:</span> {transaction.employee}</div>
        <div className="flex gap-2 justify-end mt-4">
          <ModernButton color="#e74c3c" onClick={onClose}>إغلاق</ModernButton>
        </div>
      </div>
    </BranchModal>
  );
} 