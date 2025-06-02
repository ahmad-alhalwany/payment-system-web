"use client";
import React, { useState, useEffect } from "react";
import { Box, Stack, Typography, Paper, TextField, Button, Switch, FormControlLabel, Divider, Snackbar, Alert } from "@mui/material";
import { useAuth } from "@/app/hooks/useAuth";
import UserSettingsForm from "@/components/settings/UserSettingsForm";
import axiosInstance from "@/app/api/axios";

export default function BranchSettingsPage() {
  const { user } = useAuth();
  const [branchInfo, setBranchInfo] = useState({
    id: "",
    name: "",
    location: "",
    governorate: "",
    phone_number: ""
  });
  const [darkMode, setDarkMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // جلب بيانات الفرع عند تحميل الصفحة
  useEffect(() => {
    const fetchBranch = async () => {
      try {
        setLoading(true);
        // جلب بيانات الفرع حسب branchId من localStorage أو user
        const branchId = user?.branch_id || localStorage.getItem('branchId');
        if (!branchId) return;
        const response = await axiosInstance.get(`/branches/${branchId}`);
        setBranchInfo({
          id: response.data.id,
          name: response.data.name,
          location: response.data.location,
          governorate: response.data.governorate,
          phone_number: response.data.phone_number || ""
        });
      } catch (e) {
        // معالجة الخطأ
      } finally {
        setLoading(false);
      }
    };
    fetchBranch();
  }, [user]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const branchId = branchInfo.id;
      await axiosInstance.put(`/branches/${branchId}`, {
        phone_number: branchInfo.phone_number,
        location: branchInfo.location
      });
      setSaveSuccess(true);
      // إعادة جلب البيانات بعد الحفظ
      const response = await axiosInstance.get(`/branches/${branchId}`);
      setBranchInfo({
        id: response.data.id,
        name: response.data.name,
        location: response.data.location,
        governorate: response.data.governorate,
        phone_number: response.data.phone_number || ""
      });
    } catch (e) {
      // معالجة الخطأ
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e3f0ff 0%, #fceabb 100%)', py: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 600, mx: 'auto', borderRadius: 6, boxShadow: '0 6px 32px #0002', background: 'rgba(255,255,255,0.97)', p: { xs: 2, md: 4 } }}>
        <Stack spacing={3}>
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, boxShadow: '0 2px 12px #1976d210', background: 'linear-gradient(120deg, #e3f2fd 60%, #fff 100%)' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 800, color: '#1976d2' }}>
              معلومات الفرع
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="اسم الفرع"
                value={branchInfo.name}
                fullWidth
                disabled
                sx={{ borderRadius: 2, background: '#f5faff' }}
              />
              <TextField
                label="الموقع"
                value={branchInfo.location}
                fullWidth
                disabled
                sx={{ borderRadius: 2, background: '#f5faff' }}
              />
              <TextField
                label="المحافظة"
                value={branchInfo.governorate}
                fullWidth
                disabled
                sx={{ borderRadius: 2, background: '#f5faff' }}
              />
              <TextField
                label="رقم هاتف الفرع"
                value={branchInfo.phone_number}
                onChange={e => setBranchInfo({ ...branchInfo, phone_number: e.target.value })}
                fullWidth
                sx={{ borderRadius: 2, background: '#f5faff' }}
              />
            </Stack>
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, boxShadow: '0 2px 12px #43a04722', background: 'linear-gradient(120deg, #e0f7fa 60%, #fff 100%)' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 800, color: '#388e3c' }}>
              إعدادات المستخدم
            </Typography>
            <UserSettingsForm username={user?.username || ''} />
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, boxShadow: '0 2px 12px #fbc02d22', background: 'linear-gradient(120deg, #fffde7 60%, #fff 100%)' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 800, color: '#fbc02d' }}>
              المظهر
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                  sx={{ '& .MuiSwitch-thumb': { background: darkMode ? '#1976d2' : undefined } }}
                />
              }
              label="الوضع الليلي"
              sx={{ fontWeight: 700 }}
            />
          </Paper>

          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            sx={{ mt: 2, borderRadius: 99, fontWeight: 700, fontSize: 17, px: 4, py: 1.5, boxShadow: '0 2px 8px #1976d220' }}
          >
            حفظ التغييرات
          </Button>
        </Stack>

        <Snackbar
          open={saveSuccess}
          autoHideDuration={3000}
          onClose={() => setSaveSuccess(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="success" onClose={() => setSaveSuccess(false)} sx={{ fontWeight: 700, fontSize: 16, borderRadius: 2, boxShadow: '0 2px 8px #43a04722' }}>
            تم حفظ التغييرات بنجاح
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
} 