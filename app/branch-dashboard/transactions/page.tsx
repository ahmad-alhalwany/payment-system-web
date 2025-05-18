"use client";
import React, { useEffect, useState } from "react";
import {
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Typography,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axiosInstance from "@/app/api/axios";

// تعريف نوع بيانات المعاملة
interface Transaction {
  id: number;
  transaction_number: string;
  sender_name: string;
  sender_phone: string;
  recipient_name: string;
  recipient_phone: string;
  amount: number;
  status: string;
  created_at: string;
  employee: string;
  branch: string;
}

export default function BranchTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  // جلب البيانات من API
  const fetchTransactions = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axiosInstance.get('/branch/transactions/');
      setTransactions(response.data);
    } catch (e) {
      setError("فشل تحميل بيانات المعاملات");
      console.error('Error fetching transactions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setOpenDetails(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#27ae60";
      case "pending":
        return "#f39c12";
      case "cancelled":
        return "#e74c3c";
      default:
        return "#7f8c8d";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "مكتملة";
      case "pending":
        return "قيد الانتظار";
      case "cancelled":
        return "ملغاة";
      default:
        return status;
    }
  };

  return (
    <div className="p-8">
      <Typography variant="h4" className="mb-4" color="primary.dark" gutterBottom>
        معاملات الفرع
      </Typography>
      <Stack direction="row" spacing={1} className="mb-4">
        <Button
          variant="outlined"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={fetchTransactions}
          disabled={loading}
        >
          تحديث البيانات
        </Button>
      </Stack>
      {loading ? (
        <Stack alignItems="center" mt={4}>
          <CircularProgress color="primary" />
          <Typography mt={2}>جاري تحميل المعاملات ...</Typography>
        </Stack>
      ) : error ? (
        <Typography color="error" mt={2}>{error}</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>رقم المعاملة</TableCell>
                <TableCell>اسم المرسل</TableCell>
                <TableCell>اسم المستلم</TableCell>
                <TableCell>المبلغ</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>تاريخ الإنشاء</TableCell>
                <TableCell align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.transaction_number}</TableCell>
                  <TableCell>{transaction.sender_name}</TableCell>
                  <TableCell>{transaction.recipient_name}</TableCell>
                  <TableCell>{transaction.amount}</TableCell>
                  <TableCell>
                    <span style={{ color: getStatusColor(transaction.status) }}>
                      {getStatusText(transaction.status)}
                    </span>
                  </TableCell>
                  <TableCell>{transaction.created_at}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="عرض التفاصيل">
                      <IconButton
                        color="primary"
                        onClick={() => handleViewDetails(transaction)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog لعرض تفاصيل المعاملة */}
      {selectedTransaction && (
        <Dialog
          open={openDetails}
          onClose={() => {
            setOpenDetails(false);
            setSelectedTransaction(null);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>تفاصيل المعاملة</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={2}>
              <Typography>
                <strong>رقم المعاملة:</strong> {selectedTransaction.transaction_number}
              </Typography>
              <Typography>
                <strong>اسم المرسل:</strong> {selectedTransaction.sender_name}
              </Typography>
              <Typography>
                <strong>رقم هاتف المرسل:</strong> {selectedTransaction.sender_phone}
              </Typography>
              <Typography>
                <strong>اسم المستلم:</strong> {selectedTransaction.recipient_name}
              </Typography>
              <Typography>
                <strong>رقم هاتف المستلم:</strong> {selectedTransaction.recipient_phone}
              </Typography>
              <Typography>
                <strong>المبلغ:</strong> {selectedTransaction.amount}
              </Typography>
              <Typography>
                <strong>الحالة:</strong>{" "}
                <span style={{ color: getStatusColor(selectedTransaction.status) }}>
                  {getStatusText(selectedTransaction.status)}
                </span>
              </Typography>
              <Typography>
                <strong>تاريخ الإنشاء:</strong> {selectedTransaction.created_at}
              </Typography>
              <Typography>
                <strong>الموظف:</strong> {selectedTransaction.employee}
              </Typography>
              <Typography>
                <strong>الفرع:</strong> {selectedTransaction.branch}
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setOpenDetails(false);
                setSelectedTransaction(null);
              }}
              color="primary"
            >
              إغلاق
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
} 