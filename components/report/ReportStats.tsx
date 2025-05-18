import React from "react";

interface ReportStatsProps {
  stats: {
    total_count: number;
    total_amount: number;
    avg_amount?: number;
    max_amount: number;
    min_amount: number;
    status_distribution: Record<string, number>;
  };
}

export default function ReportStats({ stats }: ReportStatsProps) {
  return (
    <div className="bg-primary-50 rounded shadow p-4 mb-4">
      <h2 className="text-lg font-bold mb-2">تحليل إحصائي</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        <div>
          <div className="text-gray-600">عدد التحويلات</div>
          <div className="font-bold text-xl">{stats.total_count}</div>
        </div>
        <div>
          <div className="text-gray-600">إجمالي المبلغ</div>
          <div className="font-bold text-xl">{stats.total_amount}</div>
        </div>
        {typeof stats.avg_amount !== 'undefined' && (
          <div>
            <div className="text-gray-600">متوسط المبلغ</div>
            <div className="font-bold text-xl">{stats.avg_amount.toFixed(2)}</div>
          </div>
        )}
        <div>
          <div className="text-gray-600">أعلى مبلغ</div>
          <div className="font-bold text-xl">{stats.max_amount}</div>
        </div>
        <div>
          <div className="text-gray-600">أقل مبلغ</div>
          <div className="font-bold text-xl">{stats.min_amount}</div>
        </div>
      </div>
      <div>
        <div className="font-bold mb-1">توزيع الحالات:</div>
        <ul className="list-disc pr-6">
          {(Object.entries(stats.status_distribution) as [string, number][]).map(([status, count]) => (
            <li key={status}>{status}: {count}</li>
          ))}
        </ul>
      </div>
    </div>
  );
} 