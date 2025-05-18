import React from "react";

interface InventorySummaryProps {
  taxCollected: number;
  transactionsCount: number;
  totalProfit: number;
  avgTaxRate: number;
}

export default function InventorySummary({ taxCollected, transactionsCount, totalProfit, avgTaxRate }: InventorySummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded shadow p-4 flex flex-col items-center">
        <div className="text-gray-600">إجمالي الضرائب المحصلة</div>
        <div className="font-bold text-2xl text-primary-700">{taxCollected.toLocaleString()}</div>
      </div>
      <div className="bg-white rounded shadow p-4 flex flex-col items-center">
        <div className="text-gray-600">عدد التحويلات</div>
        <div className="font-bold text-2xl text-primary-700">{transactionsCount.toLocaleString()}</div>
      </div>
      <div className="bg-white rounded shadow p-4 flex flex-col items-center">
        <div className="text-gray-600">إجمالي الأرباح</div>
        <div className="font-bold text-2xl text-green-700">{totalProfit.toLocaleString()}</div>
      </div>
      <div className="bg-white rounded shadow p-4 flex flex-col items-center">
        <div className="text-gray-600">متوسط نسبة الضريبة</div>
        <div className="font-bold text-2xl text-yellow-600">{avgTaxRate.toFixed(2)}%</div>
      </div>
    </div>
  );
} 