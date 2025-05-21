"use client";

import React, { useState, useEffect } from "react";
import InventorySummary from "@/components/inventory/InventorySummary";
import InventoryFilters from "@/components/inventory/InventoryFilters";
import InventoryTaxTable from "@/components/inventory/InventoryTaxTable";
import InventoryTransactionsTable from "@/components/inventory/InventoryTransactionsTable";
import InventoryExportButtons from "@/components/inventory/InventoryExportButtons";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from "recharts";
import axiosInstance from '@/app/api/axios';
import ModernGroupBox from "@/components/ui/ModernGroupBox";

const BRANCHES = [
  { value: "all", label: "جميع الفروع" },
  { value: "damascus", label: "دمشق" },
  { value: "aleppo", label: "حلب" },
];

const CURRENCIES = [
  { value: "all", label: "الكل" },
  { value: "SYP", label: "ليرة سورية (SYP)" },
  { value: "USD", label: "دولار أمريكي (USD)" },
];

const STATUSES = [
  { value: "all", label: "الكل" },
  { value: "قيد المعالجة", label: "قيد المعالجة" },
  { value: "مكتمل", label: "مكتمل" },
  { value: "ملغي", label: "ملغي" },
];

// تعريف الواجهات محلياً (نفس تعريفات الجداول)
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

// دوال تحويل البيانات
function mapTaxTableData(apiData: any[]): any[] {
  if (!Array.isArray(apiData)) return [];
  return apiData.map((row) => ({
    branchName: row.branch_name || row.branchName || 'غير معروف',
    taxRate: typeof row.tax_rate === 'number' ? row.tax_rate : (row.taxRate || 0),
    transactionCount: row.transaction_count || row.transactionCount || 0,
    totalAmount: row.total_amount || row.totalAmount || 0,
    benefitedAmount: row.benefited_amount || row.benefitedAmount || 0,
    taxAmount: row.tax_amount || row.taxAmount || 0,
    profit: row.profit || 0,
    currency: row.currency || 'SYP',
  }));
}

function mapTransactionsData(apiData: any[]): any[] {
  if (!Array.isArray(apiData)) return [];
  return apiData.map((row) => ({
    id: row.id,
    date: row.date ? (typeof row.date === 'string' ? row.date.split('T')[0] : row.date) : '',
    amount: row.amount || 0,
    benefitedAmount: row.benefited_amount || row.benefitedAmount || 0,
    taxRate: typeof row.tax_rate === 'number' ? row.tax_rate : (row.taxRate || 0),
    taxAmount: row.tax_amount || row.taxAmount || 0,
    currency: row.currency || 'SYP',
    sendingBranch: (!row.sending_branch_name && !row.sendingBranch && !row.source_branch) || row.sending_branch_name === 'غير معروف' || row.sendingBranch === 'غير معروف' || row.source_branch === 'غير معروف' ? 'الفرع الرئيسي' : (row.sending_branch_name || row.sendingBranch || row.source_branch || 'غير معروف'),
    receivingBranch: row.destination_branch_name || row.receivingBranch || row.destination_branch || 'غير معروف',
    status: row.status || '',
    profit: typeof row.profit === 'number' ? row.profit : ((row.benefited_amount || 0) - (row.tax_amount || 0)),
  }));
}

function getTodayStr() {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

export default function InventoryPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [branch, setBranch] = useState("all");
  const [currency, setCurrency] = useState("all");
  const [status, setStatus] = useState("all");
  const [taxTable, setTaxTable] = useState<TaxRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [summary, setSummary] = useState({
    taxCollected: 0,
    transactionsCount: 0,
    totalProfit: 0,
    avgTaxRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const taxTableRef = React.useRef<HTMLDivElement>(null);
  const transTableRef = React.useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'tables' | 'charts'>('tables');

  useEffect(() => {
    if (!fromDate) setFromDate(getTodayStr());
    if (!toDate) setToDate(getTodayStr());
  }, []);

  function isValidDate(dateStr: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  }

  const fetchInventoryData = async () => {
    setError("");
    setInfo("");
    if (!isValidDate(fromDate) || !isValidDate(toDate)) {
      setError("رجاءً أدخل تاريخ صحيح في كلا الحقلين.");
      return;
    }
    setLoading(true);
    try {
      const taxSummaryParams: any = {};
      if (fromDate) taxSummaryParams.start_date = fromDate;
      if (toDate) taxSummaryParams.end_date = toDate;
      if (branch !== 'all') taxSummaryParams.branch_id = branch;
      const taxSummaryRes = await axiosInstance.get('/api/transactions/tax_summary/', { params: taxSummaryParams });
      const txParams: any = {};
      if (fromDate) txParams.from_date = fromDate;
      if (toDate) txParams.to_date = toDate;
      if (branch !== 'all') txParams.branch_id = branch;
      if (currency !== 'all') txParams.currency = currency;
      if (status !== 'all') txParams.status = status;
      const txRes = await axiosInstance.get('/reports/transactions/', { params: txParams });
      setSummary({
        taxCollected: taxSummaryRes.data.total_tax_amount || 0,
        transactionsCount: taxSummaryRes.data.total_transactions || 0,
        totalProfit: taxSummaryRes.data.total_profit || 0,
        avgTaxRate: taxSummaryRes.data.branch_summary && taxSummaryRes.data.branch_summary.length > 0
          ? (taxSummaryRes.data.branch_summary.reduce((acc: number, cur: any) => acc + (cur.tax_rate || 0), 0) / taxSummaryRes.data.branch_summary.length)
          : 0
      });
      const mappedTax = mapTaxTableData(taxSummaryRes.data.branch_summary || []);
      const mappedTx = mapTransactionsData(txRes.data.items || []);
      setTaxTable(mappedTax);
      setTransactions(mappedTx);
      if (mappedTax.length === 0 && mappedTx.length === 0) {
        setInfo("لا توجد بيانات للفترة أو الفلاتر المحددة.");
      }
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      setError("فشل في تحميل بيانات المخزون");
      setSummary({ taxCollected: 0, transactionsCount: 0, totalProfit: 0, avgTaxRate: 0 });
      setTaxTable([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      const response = await axiosInstance.get('/inventory/export/pdf/', {
        params: {
          from_date: fromDate,
          to_date: toDate,
          branch: branch !== 'all' ? branch : undefined,
          currency: currency !== 'all' ? currency : undefined,
          status: status !== 'all' ? status : undefined
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
    link.href = url;
      link.setAttribute('download', `inventory-report-${new Date().toISOString()}.pdf`);
    document.body.appendChild(link);
    link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setError("فشل في تصدير التقرير بصيغة PDF");
    }
  };

  const handleExportCsv = async () => {
    try {
      const response = await axiosInstance.get('/inventory/export/csv/', {
        params: {
          from_date: fromDate,
          to_date: toDate,
          branch: branch !== 'all' ? branch : undefined,
          currency: currency !== 'all' ? currency : undefined,
          status: status !== 'all' ? status : undefined
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
    link.href = url;
      link.setAttribute('download', `inventory-report-${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting CSV:', error);
      setError("فشل في تصدير التقرير بصيغة CSV");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-6 sm:py-10">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-primary-800 text-center">المخزون</h1>

      {(error || info) && (
        <div className={`mb-4 p-4 rounded-lg text-center font-bold flex items-center justify-center gap-2 ${error ? 'bg-red-100 text-red-700 border border-red-400' : 'bg-blue-100 text-blue-700 border border-blue-400'}`}>
          {error || info}
        </div>
      )}

      <ModernGroupBox color="#fff">
        <InventorySummary
          taxCollected={summary.taxCollected}
          transactionsCount={summary.transactionsCount}
          totalProfit={summary.totalProfit}
          avgTaxRate={summary.avgTaxRate}
        />
      </ModernGroupBox>

      <ModernGroupBox color="#fff">
        <InventoryFilters
          fromDate={fromDate}
          setFromDate={setFromDate}
          toDate={toDate}
          setToDate={setToDate}
          branch={branch}
          setBranch={setBranch}
          currency={currency}
          setCurrency={setCurrency}
          status={status}
          setStatus={setStatus}
          onApply={fetchInventoryData}
          onRefresh={fetchInventoryData}
          branches={BRANCHES}
          currencies={CURRENCIES}
          statuses={STATUSES}
        />
      </ModernGroupBox>

      <div className="flex flex-col sm:flex-row justify-end gap-2 mb-4">
        <InventoryExportButtons
          onPdf={handleExportPdf}
          onExcel={handleExportCsv}
          disabled={loading}
        />
      </div>

      <ModernGroupBox color="#fff">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
          <div className="flex gap-2 w-full sm:w-auto justify-center">
            <button
              className={`px-4 py-2 rounded font-bold transition w-full sm:w-auto ${activeTab === 'tables' ? 'bg-primary-600 text-white shadow' : 'bg-gray-200 text-primary-800 hover:bg-primary-100'}`}
              onClick={() => setActiveTab('tables')}
            >
              الجداول
            </button>
            <button
              className={`px-4 py-2 rounded font-bold transition w-full sm:w-auto ${activeTab === 'charts' ? 'bg-primary-600 text-white shadow' : 'bg-gray-200 text-primary-800 hover:bg-primary-100'}`}
              onClick={() => setActiveTab('charts')}
            >
              الرسوم البيانية
            </button>
          </div>
        </div>

        {activeTab === 'tables' ? (
          <>
            <div ref={taxTableRef}>
              {taxTable.length === 0 ? (
                <div className="text-center text-gray-500 py-8">لا توجد بيانات للجدول</div>
              ) : (
                <InventoryTaxTable data={taxTable} />
              )}
            </div>
            <div ref={transTableRef} className="mt-6">
              {transactions.length === 0 ? (
                <div className="text-center text-gray-500 py-8">لا توجد بيانات للجدول</div>
              ) : (
                <InventoryTransactionsTable data={transactions} />
              )}
            </div>
          </>
        ) : (
          <div className="h-96 w-full flex items-center justify-center">
            {taxTable.length === 0 ? (
              <div className="text-center text-gray-500 py-8">لا توجد بيانات للرسوم البيانية</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taxTable}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="branchName" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="taxAmount" name="الضريبة" fill="#8884d8" />
                  <Bar dataKey="profit" name="الربح" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </ModernGroupBox>
    </div>
  );
} 