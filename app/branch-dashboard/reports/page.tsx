"use client";
import React, { useState } from "react";
import {
  Box, Tabs, Tab, Button, TextField, Select, MenuItem, InputLabel, FormControl, Table, TableHead, TableRow, TableCell, TableBody, Stack, Typography
} from "@mui/material";
import axiosInstance from "@/app/api/axios";

// أنواع TypeScript
interface Transfer {
  id: string;
  type: string;
  sender: string;
  receiver: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
  sending_branch: string;
  receiving_branch: string;
  employee: string;
}

interface Employee {
  username: string;
  role: string;
  status: string;
  created_at: string;
  last_active: string;
}

const statusOptions = ["الكل", "مكتمل", "قيد المعالجة", "ملغي", "مرفوض", "معلق"];
const typeOptions = ["الكل", "صادر", "وارد"];
const employeeStatusOptions = ["الكل", "نشط", "غير نشط"];
const employeeRoleOptions = ["الكل", "موظف", "مدير فرع"];

const employeeColumns = [
  { key: "username", label: "اسم المستخدم" },
  { key: "role", label: "الدور" },
  { key: "status", label: "الحالة" },
  { key: "created_at", label: "تاريخ الإنشاء" },
  { key: "last_active", label: "آخر نشاط" },
];

const transferColumns = [
  { key: "type", label: "النوع" },
  { key: "id", label: "رقم التحويل" },
  { key: "sender", label: "المرسل" },
  { key: "receiver", label: "المستلم" },
  { key: "amount", label: "المبلغ" },
  { key: "currency", label: "العملة" },
  { key: "date", label: "التاريخ" },
  { key: "status", label: "الحالة" },
  { key: "sending_branch", label: "الفرع المرسل" },
  { key: "receiving_branch", label: "الفرع المستلم" },
  { key: "employee", label: "الموظف" },
];

// خرائط التحويل للحالة والدور
const statusMap: Record<string, string> = {
  "مكتمل": "completed",
  "قيد المعالجة": "processing",
  "ملغي": "cancelled",
  "مرفوض": "rejected",
  "معلق": "on_hold",
};
const employeeStatusMap: Record<string, string> = {
  "نشط": "active",
  "غير نشط": "inactive",
};
const employeeRoleMap: Record<string, string> = {
  "موظف": "employee",
  "مدير فرع": "branch_manager",
};

function exportToCSV(data: any[], columns: any[], filename: string) {
  const header = columns.map(col => col.label).join(",");
  const rows = data.map(row =>
    columns.map(col => row[col.key]).join(",")
  );
  const csvContent = [header, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// دالة تحويل بيانات التحويلات لتوافق أعمدة الجدول
const mapTransferRow = (tr: any) => {
  let sendingBranch = tr.sending_branch_name || tr.source_branch || tr.branch_name || "";
  if (!sendingBranch || sendingBranch === "غير معروف") {
    sendingBranch = "الفرع الرئيسي";
  }
  return {
    ...tr,
    sending_branch: sendingBranch,
    receiving_branch: tr.destination_branch_name || tr.destination_branch || "",
    employee: tr.employee_name || "",
  };
};

// دالة تحويل بيانات الموظفين لتوافق أعمدة الجدول وتعرض النصوص بالعربي
const mapEmployeeRow = (emp: any) => ({
  ...emp,
  role: emp.role === "branch_manager" ? "مدير فرع" : "موظف",
  status: emp.is_active !== undefined
    ? (emp.is_active ? "نشط" : "غير نشط")
    : (emp.active !== undefined ? (emp.active ? "نشط" : "غير نشط") : "غير محدد"),
  last_active: emp.last_active || emp.last_login || emp.last_activity || "",
});

export default function ReportsPage() {
  const [tab, setTab] = useState(0);
  // فلاتر التحويلات
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [type, setType] = useState("الكل");
  const [status, setStatus] = useState("الكل");
  const [transferSearch, setTransferSearch] = useState("");
  // حالة عرض النتائج
  const [showReport, setShowReport] = useState(false);
  const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // فلاتر الموظفين
  const [employeeStatus, setEmployeeStatus] = useState("الكل");
  const [employeeRole, setEmployeeRole] = useState("الكل");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showEmployeeReport, setShowEmployeeReport] = useState(false);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [errorEmployees, setErrorEmployees] = useState("");

  // دالة توليد تقرير التحويلات
  const handleGenerateReport = async () => {
    setLoading(true);
    setError("");
    try {
      let allTransfers: Transfer[] = [];
      // نوع التحويل: صادر
      if (type === "صادر" || type === "الكل") {
        const res = await axiosInstance.get('/reports/transactions/', {
          params: {
            start_date: dateFrom || undefined,
            end_date: dateTo || undefined,
            branch_id: (typeof window !== 'undefined' && window.localStorage.getItem('branch_id')) || undefined,
            status: status !== "الكل" ? statusMap[status] : undefined,
            search: transferSearch || undefined,
          }
        });
        allTransfers = allTransfers.concat(res.data.items || []);
      }
      // نوع التحويل: وارد
      if (type === "وارد" || type === "الكل") {
        const res = await axiosInstance.get('/reports/transactions/', {
        params: {
            start_date: dateFrom || undefined,
            end_date: dateTo || undefined,
            destination_branch_id: (typeof window !== 'undefined' && window.localStorage.getItem('branch_id')) || undefined,
            status: status !== "الكل" ? statusMap[status] : undefined,
            search: transferSearch || undefined,
        }
      });
        allTransfers = allTransfers.concat(res.data.items || []);
      }
      setFilteredTransfers(allTransfers.map(mapTransferRow));
      setShowReport(true);
    } catch (e) {
      setError("فشل في تحميل تقرير التحويلات");
      console.error('Error fetching transfers report:', e);
    } finally {
      setLoading(false);
    }
  };

  // دالة توليد تقرير الموظفين
  const handleGenerateEmployeeReport = async () => {
    setLoadingEmployees(true);
    setErrorEmployees("");
    try {
      const res = await axiosInstance.get('/reports/employees/', {
        params: {
          branch_id: (typeof window !== 'undefined' && window.localStorage.getItem('branch_id')) || undefined,
          status: employeeStatus !== "الكل" ? employeeStatusMap[employeeStatus] : undefined,
          role: employeeRole !== "الكل" ? employeeRoleMap[employeeRole] : undefined,
          search: employeeSearch || undefined,
        }
      });
      setFilteredEmployees((res.data.items || []).map(mapEmployeeRow));
      setShowEmployeeReport(true);
    } catch (e) {
      setErrorEmployees("فشل في تحميل تقرير الموظفين");
      console.error('Error fetching employees report:', e);
    } finally {
      setLoadingEmployees(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e3f0ff 0%, #fceabb 100%)', py: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto', borderRadius: 6, boxShadow: '0 6px 32px #0002', background: 'rgba(255,255,255,0.97)', p: { xs: 2, md: 4 } }}>
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
          <Tab label="تقارير التحويلات" sx={{ fontWeight: 800, fontSize: { xs: 15, md: 17 } }} />
          <Tab label="تقارير الموظفين" sx={{ fontWeight: 800, fontSize: { xs: 15, md: 17 } }} />
        </Tabs>
        <Box mt={2}>
          {tab === 0 && (
            <>
              {/* فلاتر التحويلات */}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3} alignItems="center">
                <TextField
                  label="بحث برقم التحويل أو اسم المرسل/المستلم"
                  value={transferSearch}
                  onChange={e => setTransferSearch(e.target.value)}
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
                  <InputLabel>نوع التحويل</InputLabel>
                  <Select value={type} label="نوع التحويل" onChange={e => setType(e.target.value)}>
                    {typeOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 120, borderRadius: 3, background: '#f5faff' }} size="small">
                  <InputLabel>الحالة</InputLabel>
                  <Select value={status} label="الحالة" onChange={e => setStatus(e.target.value)}>
                    {statusOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleGenerateReport}
                  disabled={loading}
                  sx={{ borderRadius: 99, fontWeight: 700, px: 3, boxShadow: '0 2px 8px #43a04722' }}
                >
                  {loading ? "جاري التحميل..." : "توليد التقرير"}
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => exportToCSV(filteredTransfers, transferColumns, "transfers_report.csv")}
                  disabled={!showReport || filteredTransfers.length === 0}
                  sx={{ borderRadius: 99, fontWeight: 700, px: 3 }}
                >
                  تصدير CSV
                </Button>
              </Stack>
              {/* رسالة الخطأ */}
              {error && (
                <Typography color="error" mb={2} sx={{ fontWeight: 700, fontSize: 16, borderRadius: 2, background: '#ffebee', px: 2, py: 1, boxShadow: '0 2px 8px #f4433620' }}>{error}</Typography>
              )}
              {/* جدول التحويلات */}
              {showReport && (
                <Box className="overflow-x-auto" sx={{ borderRadius: 4, boxShadow: '0 2px 16px #1976d210', background: '#fff', mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ background: 'linear-gradient(90deg, #e3f2fd 60%, #b2ebf2 100%)' }}>
                        {transferColumns.map(col => (
                          <TableCell key={col.key} sx={{ fontWeight: 800, fontSize: 16 }}>{col.label}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={transferColumns.length} align="center"><span style={{ display: 'flex', justifyContent: 'center' }}><span className="loader"></span></span></TableCell>
                        </TableRow>
                      ) : filteredTransfers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={transferColumns.length} align="center">لا يوجد بيانات</TableCell>
                        </TableRow>
                      ) : (
                        filteredTransfers.map((tr, idx) => (
                          <TableRow key={idx} sx={{ transition: 'background 0.2s', '&:hover': { background: '#e3f2fd55' } }}>
                            {transferColumns.map(col => (
                              <TableCell key={col.key} sx={{ fontSize: 15, fontWeight: col.key === 'sending_branch' || col.key === 'receiving_branch' ? 700 : 500 }}>{tr[col.key as keyof Transfer]}</TableCell>
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
          {tab === 1 && (
            <>
              {/* فلاتر الموظفين */}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3} alignItems="center">
                <TextField
                  label="بحث بالاسم أو اسم المستخدم"
                  value={employeeSearch}
                  onChange={e => setEmployeeSearch(e.target.value)}
                  sx={{ minWidth: 200, borderRadius: 3, background: '#f5faff' }}
                  size="small"
                />
                <FormControl sx={{ minWidth: 120, borderRadius: 3, background: '#f5faff' }} size="small">
                  <InputLabel>الحالة</InputLabel>
                  <Select value={employeeStatus} label="الحالة" onChange={e => setEmployeeStatus(e.target.value)}>
                    {employeeStatusOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 120, borderRadius: 3, background: '#f5faff' }} size="small">
                  <InputLabel>الدور</InputLabel>
                  <Select value={employeeRole} label="الدور" onChange={e => setEmployeeRole(e.target.value)}>
                    {employeeRoleOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleGenerateEmployeeReport}
                  disabled={loadingEmployees}
                  sx={{ borderRadius: 99, fontWeight: 700, px: 3, boxShadow: '0 2px 8px #43a04722' }}
                >
                  {loadingEmployees ? "جاري التحميل..." : "توليد التقرير"}
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => exportToCSV(filteredEmployees, employeeColumns, "employees_report.csv")}
                  disabled={!showEmployeeReport || filteredEmployees.length === 0}
                  sx={{ borderRadius: 99, fontWeight: 700, px: 3 }}
                >
                  تصدير CSV
                </Button>
              </Stack>
              {/* رسالة الخطأ */}
              {errorEmployees && (
                <Typography color="error" mb={2} sx={{ fontWeight: 700, fontSize: 16, borderRadius: 2, background: '#ffebee', px: 2, py: 1, boxShadow: '0 2px 8px #f4433620' }}>{errorEmployees}</Typography>
              )}
              {/* جدول الموظفين */}
              {showEmployeeReport && (
                <Box className="overflow-x-auto" sx={{ borderRadius: 4, boxShadow: '0 2px 16px #1976d210', background: '#fff', mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ background: 'linear-gradient(90deg, #e3f2fd 60%, #b2ebf2 100%)' }}>
                        {employeeColumns.map(col => (
                          <TableCell key={col.key} sx={{ fontWeight: 800, fontSize: 16 }}>{col.label}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loadingEmployees ? (
                        <TableRow>
                          <TableCell colSpan={employeeColumns.length} align="center"><span style={{ display: 'flex', justifyContent: 'center' }}><span className="loader"></span></span></TableCell>
                        </TableRow>
                      ) : filteredEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={employeeColumns.length} align="center">لا يوجد بيانات</TableCell>
                        </TableRow>
                      ) : (
                        filteredEmployees.map((emp, idx) => (
                          <TableRow key={idx} sx={{ transition: 'background 0.2s', '&:hover': { background: '#e3f2fd55' } }}>
                            {employeeColumns.map(col => (
                              <TableCell key={col.key} sx={{ fontSize: 15 }}>{emp[col.key as keyof Employee]}</TableCell>
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
        </Box>
      </Box>
    </Box>
  );
} 