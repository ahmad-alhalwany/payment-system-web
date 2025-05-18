"use client";

import React, { useState, useEffect } from "react";
import { Box, Stack, Typography, Button, TextField, Select, MenuItem, InputLabel, FormControl, Table, TableHead, TableRow, TableCell, TableBody, Paper, Tabs, Tab } from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import axiosInstance from "@/app/api/axios";
import { useAuth } from "@/app/hooks/useAuth";

// أنواع TypeScript
interface Profit {
  id: string;
  date: string;
  benefited_amount: number;
  tax_rate: number;
  tax_amount: number;
  benefited_profit: number;
  tax_profit: number;
  currency: string;
  status: string;
}

interface ProfitColumn {
  key: keyof Profit;
  label: string;
}

function exportToCSV(data: Profit[], columns: ProfitColumn[], filename: string) {
  const header = columns.map(col => col.label).join(",");
  const rows = data.map(row => columns.map(col => row[col.key]).join(","));
  const csvContent = [header, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const profitColumns: ProfitColumn[] = [
  { key: "id", label: "رقم التحويل" },
  { key: "date", label: "التاريخ" },
  { key: "benefited_amount", label: "المبلغ المستفاد" },
  { key: "tax_rate", label: "نسبة الضريبة" },
  { key: "tax_amount", label: "مبلغ الضريبة" },
  { key: "benefited_profit", label: "ربح المبلغ المستفاد" },
  { key: "tax_profit", label: "ربح الضريبة" },
  { key: "currency", label: "العملة" },
  { key: "status", label: "الحالة" },
] as const;

export default function BranchProfitPage() {
  const { user } = useAuth();
  // فلاتر
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currency, setCurrency] = useState("الكل");
  const [profitSearch, setProfitSearch] = useState("");
  const [profits, setProfits] = useState<Profit[]>([]);
  const [filteredProfits, setFilteredProfits] = useState<Profit[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // ملخص الأرباح
  const [totalSYP, setTotalSYP] = useState(0);
  const [totalUSD, setTotalUSD] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // جلب البيانات من API
  const fetchProfits = async () => {
    setLoading(true);
    setError("");
    try {
      if (!user?.branch_id) throw new Error("لا يوجد فرع محدد");
      const params: any = {
        start_date: dateFrom || undefined,
        end_date: dateTo || undefined,
      };
      if (currency !== "الكل") {
        params.currency = currency === "ل.س" ? "SYP" : "USD";
      }
      const response = await axiosInstance.get(`/api/branches/${user.branch_id}/profits/`, { params });
      setProfits(response.data.transactions || []);
      setFilteredProfits(response.data.transactions || []);
      // استخدم الحقول التالية للملخص
      setTotalSYP(response.data.total_profits_syp || 0);
      setTotalUSD(response.data.total_profits_usd || 0);
      setTotalCount(response.data.total_transactions || 0);
    } catch (e) {
      setError("فشل تحميل بيانات الأرباح");
      console.error('Error fetching profits:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfits();
  }, []);

  // بيانات الرسم البياني
  const chartData = [
    { currency: "ل.س", profit: totalSYP },
    { currency: "$", profit: totalUSD },
  ];

  const handleGenerateReport = () => {
    fetchProfits();
    setShowReport(true);
  };

  return (
    <Box p={4}>
      {/* التبويبات */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="جدول الأرباح" />
        <Tab label="رسم بياني" />
      </Tabs>
      {/* محتوى التبويب الأول: الجدول */}
      {tab === 0 && (
        <>
          {/* ملخص الأرباح */}
          <Stack direction={{ xs: "column", md: "row" }} spacing={4} mb={4} alignItems="center" justifyContent="center">
            <Paper elevation={2} sx={{ p: 3, minWidth: 200, textAlign: "center" }}>
              <Typography variant="h6" color="success.main">إجمالي الأرباح (ل.س)</Typography>
              <Typography variant="h5" fontWeight="bold">{totalSYP.toLocaleString()} ل.س</Typography>
            </Paper>
            <Paper elevation={2} sx={{ p: 3, minWidth: 200, textAlign: "center" }}>
              <Typography variant="h6" color="primary.main">إجمالي الأرباح ($)</Typography>
              <Typography variant="h5" fontWeight="bold">{totalUSD.toLocaleString()} $</Typography>
            </Paper>
            <Paper elevation={2} sx={{ p: 3, minWidth: 200, textAlign: "center" }}>
              <Typography variant="h6" color="secondary.main">عدد التحويلات</Typography>
              <Typography variant="h5" fontWeight="bold">{totalCount}</Typography>
            </Paper>
          </Stack>
          {/* فلاتر الأرباح */}
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={3}>
            <TextField
              label="بحث برقم التحويل أو العملة أو الحالة"
              value={profitSearch}
              onChange={e => setProfitSearch(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <TextField
              label="من تاريخ"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
            <TextField
              label="إلى تاريخ"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
            <FormControl>
              <InputLabel>العملة</InputLabel>
              <Select
                value={currency}
                label="العملة"
                onChange={e => setCurrency(e.target.value)}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="الكل">الكل</MenuItem>
                <MenuItem value="ل.س">ليرة سورية</MenuItem>
                <MenuItem value="$">دولار أمريكي</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" color="success" onClick={handleGenerateReport} disabled={loading}>
              {loading ? "جاري التحميل..." : "تطبيق"}
            </Button>
            <Button variant="outlined" color="primary" onClick={() => setShowReport(false)}>تحديث</Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={() => exportToCSV(filteredProfits, profitColumns, "profits_report.csv")}
              disabled={!showReport || filteredProfits.length === 0}
            >
              تصدير CSV
            </Button>
          </Stack>
          {/* رسالة الخطأ */}
          {error && (
            <Typography color="error" mb={2}>{error}</Typography>
          )}
          {/* جدول الأرباح */}
          {showReport && (
            <Box className="overflow-x-auto rounded-xl shadow bg-white">
              <Table>
                <TableHead>
                  <TableRow>
                    {profitColumns.map(col => (
                      <TableCell key={col.key}>{col.label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={profitColumns.length} align="center">جاري التحميل...</TableCell>
                    </TableRow>
                  ) : filteredProfits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={profitColumns.length} align="center">لا يوجد بيانات</TableCell>
                    </TableRow>
                  ) : (
                    filteredProfits.map((p, idx) => (
                      <TableRow key={idx}>
                        {profitColumns.map(col => (
                          <TableCell key={col.key}>{p[col.key as keyof Profit]}</TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </>
      )}
      {/* محتوى التبويب الثاني: الرسم البياني */}
      {tab === 1 && (
        <Box p={4}>
          <Typography variant="h6" mb={2}>رسم بياني لإجمالي الأرباح حسب العملة</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <XAxis dataKey="currency" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="profit" fill="#1976d2" name="إجمالي الأرباح" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
} 