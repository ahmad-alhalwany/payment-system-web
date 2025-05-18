"use client";

import React, { useState } from "react";
import {
  Box, Tabs, Tab, Button, TextField, Select, MenuItem, InputLabel, FormControl, Table, TableHead, TableRow, TableCell, TableBody, Stack
} from "@mui/material";
import axiosInstance from '@/app/api/axios';
import { SaveAlt } from '@mui/icons-material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

const statusOptions = ["الكل", "مكتمل", "قيد المعالجة", "ملغي", "مرفوض", "معلق"];
const typeOptions = ["الكل", "صادر", "وارد"];
const employeeStatusOptions = ["الكل", "نشط", "غير نشط"];
const employeeRoleOptions = ["الكل", "موظف", "مدير فرع"];

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState(0);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("الكل");
  const [type, setType] = useState("الكل");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [showTable, setShowTable] = useState(false);
  const [employeeStatus, setEmployeeStatus] = useState("الكل");
  const [employeeRole, setEmployeeRole] = useState("الكل");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [chartTab, setChartTab] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      let endpoint = '';
      switch (tab) {
        case 0: // تقارير التحويلات
          endpoint = '/reports/transactions';
          break;
        case 1: // تقارير الفروع
          endpoint = '/branches/stats/';
          break;
        case 2: // تقارير الموظفين
          endpoint = '/reports/employees';
          break;
        case 3: // التقارير اليومية
          endpoint = '/reports/daily';
          break;
      }

      let params: any = {
          from_date: fromDate,
          to_date: toDate,
          status: status !== 'الكل' ? status : undefined,
          type: type !== 'الكل' ? type : undefined,
          employee_status: employeeStatus !== 'الكل' ? employeeStatus : undefined,
          employee_role: employeeRole !== 'الكل' ? employeeRole : undefined,
          search: employeeSearch || undefined
      };
      if (tab === 3) {
        if (!fromDate) params.from_date = today;
        if (!toDate) params.to_date = today;
      }

      const response = await axiosInstance.get(endpoint, {
        params
      });

      if (tab === 1) {
        setData(response.data.branch_stats || []);
      } else if (tab === 3) {
        setData(response.data);
      } else {
        setData(response.data.items || []);
      }
      if (response.data.stats) {
        setStats(response.data.stats);
      }
      setShowTable(true);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setError("فشل في تحميل بيانات التقرير");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    fetchData();
  };

  const fetchChartData = async () => {
    setLoading(true);
    setError("");
    try {
      const params: any = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      const response = await axiosInstance.get('/reports/transactions', { params });
      setData(response.data.items || []);
      setShowTable(true);
    } catch (error) {
      setError("فشل في تحميل بيانات الرسم البياني");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    setShowTable(false);
    setData(null);
    setStats(null);
    if (newValue === 3) {
      setFromDate(today);
      setToDate(today);
    }
    if (newValue === 4) {
      fetchChartData();
    }
  };

  const exportToCSV = () => {
    if (!Array.isArray(data) && data !== null) return;
    const replacer = (key: string, value: any) => value === null ? '' : value;
    const header = Object.keys(data);
    const csv = [
      header.join(','),
      ...Object.values(data).map((row: any) => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
    ].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">التقارير</h1>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={tab} onChange={handleTabChange} aria-label="report tabs">
          <Tab label="تقارير التحويلات" />
          <Tab label="تقارير الفروع" />
          <Tab label="تقارير الموظفين" />
          <Tab label="التقارير اليومية" />
          <Tab label="الرسوم البيانية" />
        </Tabs>
      </Box>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <Stack spacing={3}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="من تاريخ"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="إلى تاريخ"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </div>

          {tab === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  label="الحالة"
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>نوع التحويل</InputLabel>
                <Select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  label="نوع التحويل"
                >
                  {typeOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          )}

          {tab === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormControl fullWidth>
                <InputLabel>حالة الموظف</InputLabel>
                <Select
                  value={employeeStatus}
                  onChange={(e) => setEmployeeStatus(e.target.value)}
                  label="حالة الموظف"
                >
                  {employeeStatusOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>دور الموظف</InputLabel>
                <Select
                  value={employeeRole}
                  onChange={(e) => setEmployeeRole(e.target.value)}
                  label="دور الموظف"
                >
                  {employeeRoleOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="بحث"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                fullWidth
              />
            </div>
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full md:w-auto"
          >
            {loading ? "جاري التحميل..." : "توليد التقرير"}
          </Button>
        </Stack>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {tab !== 4 && showTable && Array.isArray(data) && data.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-end mb-2">
            <Button variant="outlined" color="success" startIcon={<SaveAlt />} onClick={exportToCSV}>
              تصدير إلى CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                {Object.keys(data[0]).map((key) => (
                    <TableCell key={key} className="font-bold">
                      {(() => {
                        if (tab === 1) {
                          switch (key) {
                            case 'branch_id': return 'رقم الفرع';
                            case 'name': return 'اسم الفرع';
                            case 'transaction_count': return 'عدد العمليات';
                            case 'total_amount': return 'إجمالي المبالغ';
                            case 'total_tax': return 'إجمالي الضرائب';
                            case 'employee_count': return 'عدد الموظفين';
                            default: return key;
                          }
                        } else if (tab === 2) {
                          switch (key) {
                            case 'id': return 'رقم الموظف';
                            case 'username': return 'اسم المستخدم';
                            case 'role': return 'الدور';
                            case 'branch_id': return 'رقم الفرع';
                            case 'branch_name': return 'اسم الفرع';
                            case 'created_at': return 'تاريخ الإضافة';
                            case 'is_active': return 'نشط';
                            default: return key;
                          }
                        } else {
                          switch (key) {
                            case 'id': return 'رقم العملية';
                            case 'sender': return 'المرسل';
                            case 'receiver': return 'المستلم';
                            case 'amount': return 'المبلغ';
                            case 'currency': return 'العملة';
                            case 'date': return 'التاريخ';
                            case 'status': return 'الحالة';
                            case 'sending_branch_name': return 'الفرع المرسل';
                            case 'destination_branch_name': return 'الفرع المستلم';
                            case 'employee_name': return 'اسم الموظف';
                            case 'tax_amount': return 'الضريبة';
                            case 'tax_rate': return 'نسبة الضريبة';
                            case 'benefited_amount': return 'المبلغ المستفاد';
                            case 'is_received': return 'تم الاستلام';
                            case 'branch_governorate': return 'المحافظة';
                            default: return key;
                          }
                        }
                      })()}
                    </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
                {data
                  .filter(row =>
                    tab !== 2 || (
                      (employeeStatus === 'الكل' || (employeeStatus === 'نشط' && row.is_active) || (employeeStatus === 'غير نشط' && !row.is_active)) &&
                      (employeeRole === 'الكل' || row.role === (employeeRole === 'موظف' ? 'employee' : employeeRole === 'مدير فرع' ? 'branch_manager' : row.role)) &&
                      (employeeSearch.trim() === '' || (row.username && row.username.includes(employeeSearch.trim())) || (row.branch_name && row.branch_name.includes(employeeSearch.trim())))
                    )
                  )
                  .map((row, index) => (
                <TableRow key={index}>
                  {Object.values(row).map((value: any, i) => (
                        <TableCell key={i}>{value === true ? 'نعم' : value === false ? 'لا' : value}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      {tab === 4 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">الرسوم البيانية</h2>
          <Tabs value={chartTab} onChange={(_, v) => setChartTab(v)} aria-label="chart tabs">
            <Tab label="مبالغ التحويلات" />
            <Tab label="عدد العمليات حسب الحالة" />
          </Tabs>
          {chartTab === 0 && Array.isArray(data) && data.length > 0 && (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="amount" fill="#8884d8" name="المبلغ" />
              </BarChart>
            </ResponsiveContainer>
          )}
          {chartTab === 1 && Array.isArray(data) && data.length > 0 && (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={Object.entries(data.reduce((acc, cur) => {
                    acc[cur.status] = (acc[cur.status] || 0) + 1;
                    return acc;
                  }, {})).map(([status, count]) => ({ name: status, value: count }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  fill="#82ca9d"
                  label
                >
                  {Object.entries(data.reduce((acc, cur) => {
                    acc[cur.status] = (acc[cur.status] || 0) + 1;
                    return acc;
                  }, {})).map(([status], idx) => (
                    <Cell key={status} fill={["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#a4de6c"][idx % 5]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
          {(!Array.isArray(data) || data.length === 0) && (
            <div className="text-center text-gray-500 py-4">لا توجد بيانات لعرض الرسم البياني</div>
          )}
        </div>
      )}

      {tab === 3 && showTable && data && data.summary && (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-xl mx-auto mt-8">
          <h2 className="text-xl font-bold mb-4 text-center">ملخص العمليات اليومية</h2>
          <ul className="space-y-3 text-lg">
            <li><b>إجمالي عدد العمليات:</b> {data.summary.total_count}</li>
            <li><b>إجمالي المبالغ:</b> {data.summary.total_amount.toLocaleString()} ل.س</li>
            <li><b>إجمالي الضرائب:</b> {data.summary.total_tax.toLocaleString()} ل.س</li>
            <li><b>عدد العمليات المكتملة:</b> {data.summary.completed_count}</li>
            <li><b>عدد العمليات قيد التنفيذ:</b> {data.summary.processing_count}</li>
            <li><b>عدد العمليات الملغاة:</b> {data.summary.cancelled_count}</li>
            <li><b>عدد العمليات المرفوضة:</b> {data.summary.rejected_count}</li>
            <li><b>عدد العمليات قيد الانتظار:</b> {data.summary.pending_count}</li>
          </ul>
        </div>
      )}

      {tab === 3 && showTable && (!data || !data.summary || data.summary.total_count === 0) && (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-xl mx-auto mt-8 text-center text-gray-500 text-lg">
          لا يوجد تقارير لليوم
        </div>
      )}
    </div>
  );
} 