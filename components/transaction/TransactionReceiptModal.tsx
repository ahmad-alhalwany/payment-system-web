import React, { useRef } from "react";
import BranchModal from "../branch/BranchModal";
import ModernButton from "../ui/ModernButton";

interface TransactionReceiptModalProps {
  open: boolean;
  onClose: () => void;
  transaction: any;
}

export default function TransactionReceiptModal({ open, onClose, transaction }: TransactionReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html dir='rtl'>
        <head>
          <title>إيصال التحويل</title>
          <style>
            body { font-family: Arial; direction: rtl; padding: 24px; }
            .receipt-title { font-size: 20px; font-weight: bold; margin-bottom: 16px; text-align: center; }
            .receipt-row { margin-bottom: 8px; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  if (!transaction) return null;
  return (
    <BranchModal open={open} onClose={onClose} title={`إيصال التحويل - ${transaction.id || ""}`}>
      <div className="space-y-4">
        <div ref={printRef} className="bg-white p-4 rounded shadow">
          <div className="receipt-title">إيصال تحويل مالي</div>
          <div className="receipt-row"><span className="label">رقم التحويل:</span> {transaction.id}</div>
          <div className="receipt-row"><span className="label">المرسل:</span> {transaction.sender}</div>
          <div className="receipt-row"><span className="label">المستلم:</span> {transaction.receiver}</div>
          <div className="receipt-row"><span className="label">المبلغ:</span> {transaction.amount} {transaction.currency}</div>
          <div className="receipt-row"><span className="label">التاريخ:</span> {transaction.date}</div>
          <div className="receipt-row"><span className="label">الحالة:</span> {transaction.status}</div>
          <div className="receipt-row"><span className="label">الفرع المرسل:</span> {transaction.sendingBranch}</div>
          <div className="receipt-row"><span className="label">الفرع المستلم:</span> {transaction.receivingBranch}</div>
          <div className="receipt-row"><span className="label">اسم الموظف:</span> {transaction.employee}</div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <ModernButton color="#e74c3c" onClick={onClose}>إغلاق</ModernButton>
          <ModernButton color="#2ecc71" onClick={handlePrint}>طباعة</ModernButton>
        </div>
      </div>
    </BranchModal>
  );
} 