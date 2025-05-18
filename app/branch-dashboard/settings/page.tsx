"use client";
import React, { useState } from "react";
import { Box, Stack, Typography, Paper, TextField, Button, Switch, FormControlLabel, Divider, Snackbar, Alert } from "@mui/material";
import { useAuth } from "@/app/hooks/useAuth";
import UserSettingsForm from "@/components/settings/UserSettingsForm";

export default function BranchSettingsPage() {
  // بيانات وهمية للعرض فقط
  const branchInfo = {
    id: "BR001",
    name: "فرع دمشق الرئيسي",
    location: "دمشق - شارع الثورة",
    governorate: "دمشق"
  };
  const [darkMode, setDarkMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { user } = useAuth();

  const handleSave = () => {
    setSaveSuccess(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            معلومات الفرع
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="اسم الفرع"
              value={branchInfo.name}
              fullWidth
              disabled
            />
            <TextField
              label="الموقع"
              value={branchInfo.location}
              fullWidth
              disabled
            />
            <TextField
              label="المحافظة"
              value={branchInfo.governorate}
              fullWidth
              disabled
            />
          </Stack>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            إعدادات المستخدم
          </Typography>
          <UserSettingsForm username={user?.username || ''} />
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            المظهر
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
            }
            label="الوضع الليلي"
          />
        </Paper>

        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          sx={{ mt: 2 }}
        >
          حفظ التغييرات
        </Button>
      </Stack>

      <Snackbar
        open={saveSuccess}
        autoHideDuration={3000}
        onClose={() => setSaveSuccess(false)}
      >
        <Alert severity="success" onClose={() => setSaveSuccess(false)}>
          تم حفظ التغييرات بنجاح
        </Alert>
      </Snackbar>
    </Box>
  );
} 