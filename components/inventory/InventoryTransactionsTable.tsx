import React from "react";

interface TransactionRow {
  id: string;
  date: string;
  amount: number;
  benefitedAmount: number;
  taxRate: number;
  taxAmount: number;
  currency: string;
  sendingBranch: string;
  receivingBranch: string;
  status: string;
  profit: number;
}

interface InventoryTransactionsTableProps {
  data: TransactionRow[];
}

export default function InventoryTransactionsTable({ data }: InventoryTransactionsTableProps) {
  return (
    <div className="bg-white rounded shadow p-4 mb-6 overflow-x-auto">
      <div className="font-bold mb-2 text-primary-700">تفاصيل التحويلات</div>
      <table className="min-w-full text-center">
        <thead className="bg-primary-50">
          <tr>
            <th className="px-4 py-2">رقم التحويل</th>
            <th className="px-4 py-2">التاريخ</th>
            <th className="px-4 py-2">المبلغ</th>
            <th className="px-4 py-2">المبلغ المستفاد</th>
            <th className="px-4 py-2">نسبة الضريبة</th>
            <th className="px-4 py-2">مبلغ الضريبة</th>
            <th className="px-4 py-2">العملة</th>
            <th className="px-4 py-2">الفرع المرسل</th>
            <th className="px-4 py-2">الفرع المستلم</th>
            <th className="px-4 py-2">الحالة</th>
            <th className="px-4 py-2">الربح</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={11} className="py-6 text-gray-500">لا توجد بيانات</td></tr>
          ) : (
            data.map((row, idx) => (
              <tr key={idx} className="border-b hover:bg-primary-50">
                <td>{row.id}</td>
                <td>{row.date}</td>
                <td>{row.amount.toLocaleString()}</td>
                <td>{row.benefitedAmount.toLocaleString()}</td>
                <td>{row.taxRate.toFixed(2)}%</td>
                <td>{row.taxAmount.toLocaleString()}</td>
                <td>{row.currency}</td>
                <td>{row.sendingBranch}</td>
                <td>{row.receivingBranch}</td>
                <td>{row.status}</td>
                <td>{row.profit.toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
} 