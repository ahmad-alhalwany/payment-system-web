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
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e3f0ff 0%, #fceabb 100%)', py: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', borderRadius: 6, boxShadow: '0 6px 32px #0002', background: 'rgba(255,255,255,0.97)', p: { xs: 2, md: 4 } }}>
        {/* التبويبات */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{
            mb: 3,
            borderRadius: 3,
            background: 'linear-gradient(90deg, #e3f2fd 60%, #b2ebf2 100%)',
            boxShadow: '0 2px 12px #1976d210',
            minHeight: 48,
            '& .MuiTabs-indicator': { height: 4, borderRadius: 2, background: '#1976d2' },
          }}
        >
          <Tab label="جدول الأرباح" sx={{ fontWeight: 800, fontSize: { xs: 15, md: 17 } }} />
          <Tab label="رسم بياني" sx={{ fontWeight: 800, fontSize: { xs: 15, md: 17 } }} />
        </Tabs>
        {/* محتوى التبويب الأول: الجدول */}
        {tab === 0 && (
          <>
            {/* ملخص الأرباح */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} mb={4} alignItems="center" justifyContent="center">
              <Paper elevation={3} sx={{ p: 3, minWidth: 200, textAlign: 'center', borderRadius: 4, boxShadow: '0 2px 12px #43a04722', background: 'linear-gradient(120deg, #e0f7fa 60%, #fff 100%)' }}>
                <Typography variant="h6" color="success.main" sx={{ fontWeight: 800 }}>إجمالي الأرباح (ل.س)</Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ color: '#388e3c', letterSpacing: 1 }}>{totalSYP.toLocaleString()} ل.س</Typography>
              </Paper>
              <Paper elevation={3} sx={{ p: 3, minWidth: 200, textAlign: 'center', borderRadius: 4, boxShadow: '0 2px 12px #1976d220', background: 'linear-gradient(120deg, #e3f2fd 60%, #fff 100%)' }}>
                <Typography variant="h6" color="primary.main" sx={{ fontWeight: 800 }}>إجمالي الأرباح ($)</Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ color: '#1976d2', letterSpacing: 1 }}>{totalUSD.toLocaleString()} $</Typography>
              </Paper>
              <Paper elevation={3} sx={{ p: 3, minWidth: 200, textAlign: 'center', borderRadius: 4, boxShadow: '0 2px 12px #fbc02d22', background: 'linear-gradient(120deg, #fffde7 60%, #fff 100%)' }}>
                <Typography variant="h6" color="secondary.main" sx={{ fontWeight: 800 }}>عدد التحويلات</Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ color: '#fbc02d', letterSpacing: 1 }}>{totalCount}</Typography>
              </Paper>
            </Stack>
            {/* فلاتر الأرباح */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3} alignItems="center">
              <TextField
                label="بحث برقم التحويل أو العملة أو الحالة"
                value={profitSearch}
                onChange={e => setProfitSearch(e.target.value)}
                sx={{ minWidth: 200, borderRadius: 3, background: '#f5faff' }}
                size="small"
              />
              <TextField
                label="من تاريخ"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                sx={{ borderRadius: 3, background: '#f5faff' }}
                size="small"
              />
              <TextField
                label="إلى تاريخ"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                sx={{ borderRadius: 3, background: '#f5faff' }}
                size="small"
              />
              <FormControl sx={{ minWidth: 120, borderRadius: 3, background: '#f5faff' }} size="small">
                <InputLabel>العملة</InputLabel>
                <Select value={currency} label="العملة" onChange={e => setCurrency(e.target.value)}>
                  <MenuItem value="الكل">الكل</MenuItem>
                  <MenuItem value="ل.س">ليرة سورية</MenuItem>
                  <MenuItem value="$">دولار أمريكي</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" color="success" onClick={handleGenerateReport} disabled={loading} sx={{ borderRadius: 99, fontWeight: 700, px: 3, boxShadow: '0 2px 8px #43a04722' }}>
                {loading ? "جاري التحميل..." : "تطبيق"}
              </Button>
              <Button variant="outlined" color="primary" onClick={() => setShowReport(false)} sx={{ borderRadius: 99, fontWeight: 700, px: 3 }}>
                تحديث
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => exportToCSV(filteredProfits, profitColumns, "profits_report.csv")}
                disabled={!showReport || filteredProfits.length === 0}
                sx={{ borderRadius: 99, fontWeight: 700, px: 3 }}
              >
                تصدير CSV
              </Button>
            </Stack>
            {/* رسالة الخطأ */}
            {error && (
              <Typography color="error" mb={2} sx={{ fontWeight: 700, fontSize: 16, borderRadius: 2, background: '#ffebee', px: 2, py: 1, boxShadow: '0 2px 8px #f4433620' }}>{error}</Typography>
            )}
            {/* جدول الأرباح */}
            {showReport && (
              <Box className="overflow-x-auto" sx={{ borderRadius: 4, boxShadow: '0 2px 16px #1976d210', background: '#fff', mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ background: 'linear-gradient(90deg, #e3f2fd 60%, #b2ebf2 100%)' }}>
                      {profitColumns.map(col => (
                        <TableCell key={col.key} sx={{ fontWeight: 800, fontSize: 16 }}>{col.label}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={profitColumns.length} align="center"><span style={{ display: 'flex', justifyContent: 'center' }}><span className="loader"></span></span></TableCell>
                      </TableRow>
                    ) : filteredProfits.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={profitColumns.length} align="center">لا يوجد بيانات</TableCell>
                      </TableRow>
                    ) : (
                      filteredProfits.map((p, idx) => (
                        <TableRow key={idx} sx={{ transition: 'background 0.2s', '&:hover': { background: '#e3f2fd55' } }}>
                          {profitColumns.map(col => (
                            <TableCell key={col.key} sx={{ fontSize: 15 }}>{p[col.key as keyof Profit]}</TableCell>
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
          <Box p={2}>
            <Typography variant="h6" mb={2} sx={{ fontWeight: 800, color: '#1976d2' }}>رسم بياني لإجمالي الأرباح حسب العملة</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="currency" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="profit" fill="#1976d2" name="إجمالي الأرباح" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Box>
    </Box>
  );
} 