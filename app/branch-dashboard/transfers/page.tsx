"use client";
import React, { useState, useEffect } from "react";
import {
  Box, Stack, Typography, Button, TextField, Select, MenuItem, InputLabel, FormControl, Table, TableHead, TableRow, TableCell, TableBody, Paper, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Check as CheckIcon, Close as CloseIcon } from "@mui/icons-material";
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
  notes?: string;
}

interface TransferFormData {
  type: string;
  sender: string;
  receiver: string;
  amount: number;
  currency: string;
  receiving_branch: string;
  notes?: string;
}

const statusOptions = ["قيد المعالجة", "مكتمل", "ملغي", "مرفوض", "معلق"];
const typeOptions = ["صادر", "وارد"];
const currencyOptions = ["ل.س", "$"];

export default function TransfersPage() {
  // حالة البيانات
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // حالة النموذج
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTransfer, setCurrentTransfer] = useState<Transfer | null>(null);
  const [formData, setFormData] = useState<TransferFormData>({
    type: "صادر",
    sender: "",
    receiver: "",
    amount: 0,
    currency: "ل.س",
    receiving_branch: "",
    notes: ""
  });

  // فلاتر
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // جلب البيانات
  const fetchTransfers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axiosInstance.get('/branch/transfers/', {
        params: {
          search: searchTerm,
          status: statusFilter !== "الكل" ? statusFilter : undefined,
          type: typeFilter !== "الكل" ? typeFilter : undefined,
          date_from: dateFrom,
          date_to: dateTo
        }
      });
      setTransfers(response.data);
    } catch (e) {
      setError("فشل في تحميل بيانات التحويلات");
      console.error('Error fetching transfers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  // معالجة النموذج
  const handleOpenDialog = (transfer?: Transfer) => {
    if (transfer) {
      setIsEditing(true);
      setCurrentTransfer(transfer);
      setFormData({
        type: transfer.type,
        sender: transfer.sender,
        receiver: transfer.receiver,
        amount: transfer.amount,
        currency: transfer.currency,
        receiving_branch: transfer.receiving_branch,
        notes: transfer.notes
      });
    } else {
      setIsEditing(false);
      setCurrentTransfer(null);
      setFormData({
        type: "صادر",
        sender: "",
        receiver: "",
        amount: 0,
        currency: "ل.س",
        receiving_branch: "",
        notes: ""
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentTransfer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isEditing && currentTransfer) {
        await axiosInstance.put(`/branch/transfers/${currentTransfer.id}/`, formData);
      } else {
        await axiosInstance.post('/branch/transfers/', formData);
      }
      handleCloseDialog();
      fetchTransfers();
    } catch (e) {
      setError(isEditing ? "فشل في تحديث التحويل" : "فشل في إنشاء التحويل");
      console.error('Error submitting transfer:', e);
    } finally {
      setLoading(false);
    }
  };

  // معالجة حالة التحويل
  const handleStatusChange = async (transferId: string, newStatus: string) => {
    setLoading(true);
    setError("");
    try {
      await axiosInstance.patch(`/branch/transfers/${transferId}/`, { status: newStatus });
      fetchTransfers();
    } catch (e) {
      setError("فشل في تحديث حالة التحويل");
      console.error('Error updating transfer status:', e);
    } finally {
      setLoading(false);
    }
  };

  // حذف التحويل
  const handleDelete = async (transferId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التحويل؟")) return;

    setLoading(true);
    setError("");
    try {
      await axiosInstance.delete(`/branch/transfers/${transferId}/`);
      fetchTransfers();
    } catch (e) {
      setError("فشل في حذف التحويل");
      console.error('Error deleting transfer:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={4}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h5">إدارة التحويلات</Typography>
        <Button variant="contained" color="primary" onClick={() => handleOpenDialog()}>
          إضافة تحويل جديد
        </Button>
      </Stack>

      {/* فلاتر */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={3}>
        <TextField
          label="بحث"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
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
          <InputLabel>الحالة</InputLabel>
          <Select
            value={statusFilter}
            label="الحالة"
            onChange={e => setStatusFilter(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="الكل">الكل</MenuItem>
            {statusOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl>
          <InputLabel>النوع</InputLabel>
          <Select
            value={typeFilter}
            label="النوع"
            onChange={e => setTypeFilter(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="الكل">الكل</MenuItem>
            {typeOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" color="success" onClick={fetchTransfers} disabled={loading}>
          {loading ? "جاري التحميل..." : "تطبيق"}
        </Button>
      </Stack>

      {/* رسالة الخطأ */}
      {error && (
        <Typography color="error" mb={2}>{error}</Typography>
      )}

      {/* جدول التحويلات */}
      <Paper className="overflow-x-auto rounded-xl shadow bg-white">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>النوع</TableCell>
              <TableCell>رقم التحويل</TableCell>
              <TableCell>المرسل</TableCell>
              <TableCell>المستلم</TableCell>
              <TableCell>المبلغ</TableCell>
              <TableCell>العملة</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الفرع المرسل</TableCell>
              <TableCell>الفرع المستلم</TableCell>
              <TableCell>الموظف</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={12} align="center">جاري التحميل...</TableCell>
              </TableRow>
            ) : transfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} align="center">لا يوجد بيانات</TableCell>
              </TableRow>
            ) : (
              transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>{transfer.type}</TableCell>
                  <TableCell>{transfer.id}</TableCell>
                  <TableCell>{transfer.sender}</TableCell>
                  <TableCell>{transfer.receiver}</TableCell>
                  <TableCell>{transfer.amount}</TableCell>
                  <TableCell>{transfer.currency}</TableCell>
                  <TableCell>{transfer.date}</TableCell>
                  <TableCell>{transfer.status}</TableCell>
                  <TableCell>{transfer.sending_branch}</TableCell>
                  <TableCell>{transfer.receiving_branch}</TableCell>
                  <TableCell>{transfer.employee}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => handleOpenDialog(transfer)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" onClick={() => handleDelete(transfer.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                      {transfer.status === "قيد المعالجة" && (
                        <>
                          <Tooltip title="موافقة">
                            <IconButton size="small" onClick={() => handleStatusChange(transfer.id, "مكتمل")}>
                              <CheckIcon color="success" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="رفض">
                            <IconButton size="small" onClick={() => handleStatusChange(transfer.id, "مرفوض")}>
                              <CloseIcon color="error" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* نافذة إضافة/تعديل التحويل */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? "تعديل التحويل" : "إضافة تحويل جديد"}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Stack spacing={2}>
              <FormControl>
                <InputLabel>نوع التحويل</InputLabel>
                <Select
                  value={formData.type}
                  label="نوع التحويل"
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  {typeOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                label="المرسل"
                value={formData.sender}
                onChange={e => setFormData({ ...formData, sender: e.target.value })}
                required
              />
              <TextField
                label="المستلم"
                value={formData.receiver}
                onChange={e => setFormData({ ...formData, receiver: e.target.value })}
                required
              />
              <TextField
                label="المبلغ"
                type="number"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                required
              />
              <FormControl>
                <InputLabel>العملة</InputLabel>
                <Select
                  value={formData.currency}
                  label="العملة"
                  onChange={e => setFormData({ ...formData, currency: e.target.value })}
                  required
                >
                  {currencyOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                label="الفرع المستلم"
                value={formData.receiving_branch}
                onChange={e => setFormData({ ...formData, receiving_branch: e.target.value })}
                required
              />
              <TextField
                label="ملاحظات"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={3}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>إلغاء</Button>
            <Button type="submit" variant="contained" color="primary" disabled={loading}>
              {loading ? "جاري الحفظ..." : (isEditing ? "تحديث" : "إضافة")}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
} 