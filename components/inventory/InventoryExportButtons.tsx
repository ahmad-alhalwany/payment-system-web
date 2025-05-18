import React from "react";

interface InventoryExportButtonsProps {
  onPdf?: () => void;
  onExcel?: () => void;
  onPrint?: () => void;
  disabled?: boolean;
}

export default function InventoryExportButtons({ onPdf, onExcel, onPrint, disabled }: InventoryExportButtonsProps) {
  return (
    <div className="flex gap-2 justify-end mb-2">
      <button className="bg-green-600 text-white px-4 py-1 rounded" onClick={onPdf} disabled={disabled}>تصدير PDF</button>
      <button className="bg-yellow-500 text-white px-4 py-1 rounded" onClick={onExcel} disabled={disabled}>تصدير Excel</button>
      <button className="bg-blue-600 text-white px-4 py-1 rounded" onClick={onPrint} disabled={disabled}>طباعة</button>
    </div>
  );
} 