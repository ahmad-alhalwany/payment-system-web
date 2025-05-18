"use client";
import React, { useState } from "react";
import {
  Button,
  TextField,
  Paper,
  Typography,
  Stack,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useRouter } from "next/navigation";
import axiosInstance from "@/app/api/axios";

interface TransactionFormData {
  sender_name: string;
  sender_phone: string;
  recipient_name: string;
  recipient_phone: string;
  amount: string;
}

export default function NewTransactionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<TransactionFormData>({
    sender_name: "",
    sender_phone: "",
    recipient_name: "",
    recipient_phone: "",
    amount: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // التحقق من صحة البيانات
      if (!formData.sender_name || !formData.sender_phone || !formData.recipient_name || !formData.recipient_phone || !formData.amount) {
        throw new Error("جميع الحقول مطلوبة");
      }

      // تحويل المبلغ إلى رقم
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("المبلغ يجب أن يكون رقماً موجباً");
      }

      // إرسال البيانات إلى API
      const response = await axiosInstance.post("/branch/transactions/", {
        ...formData,
        amount: amount,
      });

      // إعادة التوجيه إلى صفحة المعاملات
      router.push("/branch-dashboard/transactions");
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء إنشاء المعاملة");
      console.error("Error creating transaction:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <Typography variant="h4" className="mb-6" color="primary.dark" gutterBottom>
        إنشاء معاملة جديدة
      </Typography>

      <Paper className="p-6">
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Typography variant="h6" color="primary">
              بيانات المرسل
            </Typography>
            <TextField
              label="اسم المرسل"
              name="sender_name"
              value={formData.sender_name}
              onChange={handleInputChange}
              required
              fullWidth
            />
            <TextField
              label="رقم هاتف المرسل"
              name="sender_phone"
              value={formData.sender_phone}
              onChange={handleInputChange}
              required
              fullWidth
            />

            <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
              بيانات المستلم
            </Typography>
            <TextField
              label="اسم المستلم"
              name="recipient_name"
              value={formData.recipient_name}
              onChange={handleInputChange}
              required
              fullWidth
            />
            <TextField
              label="رقم هاتف المستلم"
              name="recipient_phone"
              value={formData.recipient_phone}
              onChange={handleInputChange}
              required
              fullWidth
            />

            <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
              بيانات المعاملة
            </Typography>
            <TextField
              label="المبلغ"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleInputChange}
              required
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                sx={{ minWidth: 120 }}
              >
                {loading ? <CircularProgress size={24} /> : "إنشاء المعاملة"}
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => router.back()}
                disabled={loading}
              >
                إلغاء
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </div>
  );
} 