import React from "react";

interface TaxRow {
  branchName: string;
  taxRate: number;
  transactionCount: number;
  totalAmount: number;
  benefitedAmount: number;
  taxAmount: number;
  profit: number;
  currency: string;
}

interface InventoryTaxTableProps {
  data: TaxRow[];
}

export default function InventoryTaxTable({ data }: InventoryTaxTableProps) {
  return (
    <div className="bg-white rounded shadow p-4 mb-6 overflow-x-auto">
      <div className="font-bold mb-2 text-primary-700">تفاصيل الضرائب حسب الفروع</div>
      <table className="min-w-full text-center">
        <thead className="bg-primary-50">
          <tr>
            <th className="px-4 py-2">الفرع</th>
            <th className="px-4 py-2">نسبة الضريبة</th>
            <th className="px-4 py-2">عدد التحويلات</th>
            <th className="px-4 py-2">إجمالي المبلغ</th>
            <th className="px-4 py-2">المبلغ المستفاد</th>
            <th className="px-4 py-2">مبلغ الضريبة</th>
            <th className="px-4 py-2">الربح</th>
            <th className="px-4 py-2">العملة</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={8} className="py-6 text-gray-500">لا توجد بيانات</td></tr>
          ) : (
            data.map((row, idx) => (
              <tr key={idx} className="border-b hover:bg-primary-50">
                <td>{row.branchName}</td>
                <td>{row.taxRate.toFixed(2)}%</td>
                <td>{row.transactionCount}</td>
                <td>{row.totalAmount.toLocaleString()}</td>
                <td>{row.benefitedAmount.toLocaleString()}</td>
                <td>{row.taxAmount.toLocaleString()}</td>
                <td>{row.profit.toLocaleString()}</td>
                <td>{row.currency}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
} 