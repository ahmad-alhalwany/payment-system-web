'use client'

import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (username: string, password: string) => void;
  branchName?: string;
}

export default function AddEmployeeModal({ open, onClose, onAdd, branchName = "دمشق" }: AddEmployeeModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    if (!username.trim() || !password.trim()) return;
    onAdd(username, password);
    setUsername("");
    setPassword("");
  };

  const handleClose = () => {
    setUsername("");
    setPassword("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>إضافة موظف جديد</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="اسم المستخدم"
          fullWidth
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <TextField
          margin="dense"
          label="كلمة المرور"
          type="password"
          fullWidth
          value={password}
          onChange={e => setPassword(e.target.value)}
          sx={{ mt: 2 }}
        />
        <TextField
          margin="dense"
          label="الدور"
          fullWidth
          value="موظف تحويلات"
          disabled
          sx={{ mt: 2 }}
        />
        <TextField
          margin="dense"
          label="الفرع"
          fullWidth
          value={branchName}
          disabled
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="error">إلغاء</Button>
        <Button onClick={handleSubmit} color="success" variant="contained">حفظ</Button>
      </DialogActions>
    </Dialog>
  );
} 