"use client";

import React from "react";
import ModernButton from "@/components/ui/ModernButton";

const REPORT_TYPES = [
  { value: "transactions", label: "تقرير التحويلات" },
  { value: "branches", label: "تقرير الفروع" },
  { value: "employees", label: "تقرير الموظفين" },
  { value: "daily", label: "تقرير يومي" },
  { value: "analytics", label: "تقرير تحليلي" },
];

const STATUSES = [
  { value: "all", label: "الكل" },
  { value: "pending", label: "قيد الانتظار" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغي" },
];

interface ReportFilterFormProps {
  reportType: string;
  setReportType: (type: string) => void;
  fromDate: string;
  setFromDate: (date: string) => void;
  toDate: string;
  setToDate: (date: string) => void;
  branch: string;
  setBranch: (branch: string) => void;
  status: string;
  setStatus: (status: string) => void;
  minAmount: string;
  setMinAmount: (amount: string) => void;
  maxAmount: string;
  setMaxAmount: (amount: string) => void;
  branches: Array<{ id: string; name: string }>;
  onGenerate: () => void;
  loading: boolean;
}

export default function ReportFilterForm({
  reportType,
  setReportType,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  branch,
  setBranch,
  status,
  setStatus,
  minAmount,
  setMinAmount,
  maxAmount,
  setMaxAmount,
  branches,
  onGenerate,
  loading,
}: ReportFilterFormProps) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* نوع التقرير */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            نوع التقرير
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            {REPORT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* التاريخ من */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            من تاريخ
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        {/* التاريخ إلى */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            إلى تاريخ
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        {/* الفرع */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            الفرع
          </label>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="all">الكل</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* الحالة (للتقرير المالي فقط) */}
        {reportType === "transactions" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الحالة
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* المبلغ من (للتقرير المالي فقط) */}
        {reportType === "transactions" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المبلغ من
            </label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        )}

        {/* المبلغ إلى (للتقرير المالي فقط) */}
        {reportType === "transactions" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المبلغ إلى
            </label>
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        )}
      </div>

      {/* زر التوليد */}
      <div className="mt-6 flex justify-end">
        <ModernButton
          color="#2ecc71"
          onClick={onGenerate}
          disabled={loading}
        >
          {loading ? "جاري التوليد..." : "توليد التقرير"}
        </ModernButton>
      </div>
    </div>
  );
} 