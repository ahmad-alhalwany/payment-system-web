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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/api/axios";
import ResetPasswordModal from '@/components/shared/ResetPasswordModal';

// تعريف نوع بيانات الموظف
interface Employee {
  id: number;
  username: string;
  role: string;
  active: boolean;
  created_at: string;
  branch_id: number;
  branch_name?: string;
}

interface Branch {
  id: number;
  name: string;
}

// المستخدم الحالي (يمكنك ربطه مع auth لاحقًا)
const currentUserId = 1;

export default function BranchEmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "employee",
    branch_id: user?.branch_id?.toString() || "",
  });
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);

  // جلب البيانات من API
  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user?.branch_id) throw new Error("لا يوجد فرع محدد");
      const response = await axiosInstance.get(`/branches/${user.branch_id}/employees/`);
      setEmployees(response.data);
    } catch (e) {
      setError("فشل تحميل بيانات الموظفين");
      console.error('Error fetching employees:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await axiosInstance.get("/branches");
      setBranches(response.data.branches);
    } catch (err) {
      console.error("Error fetching branches:", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchBranches();
  }, []);

  const handleAddEmployee = async () => {
    try {
      // تأكد من أن البيانات المرسلة تتوافق مع صلاحيات المستخدم
      const employeeData = {
        username: formData.username,
        password: formData.password,
        role: "employee", // دائماً موظف
        branch_id: user?.branch_id, // دائماً فرع المدير
      };
      
      const response = await axiosInstance.post("/users", employeeData);
      setEmployees([...employees, response.data]);
      setOpenAdd(false);
      resetForm();
    } catch (err) {
      setError("فشل في إضافة الموظف");
      console.error("Error adding employee:", err);
    }
  };

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return;
    try {
      const employeeData = {
        username: formData.username,
        password: formData.password || undefined,
        role: "employee", // دائماً موظف
        branch_id: user?.branch_id, // دائماً فرع المدير
      };
      
      const response = await axiosInstance.put(`/users/${selectedEmployee.id}`, employeeData);
      setEmployees(employees.map(emp => emp.id === selectedEmployee.id ? response.data : emp));
      setOpenEdit(false);
      resetForm();
    } catch (err) {
      setError("فشل في تحديث بيانات الموظف");
      console.error("Error updating employee:", err);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;
    try {
      await axiosInstance.delete(`/branch/employees/${selectedEmployee.id}`);
      setEmployees(employees.filter(emp => emp.id !== selectedEmployee.id));
      setOpenDelete(false);
    } catch (err) {
      setError("فشل في حذف الموظف");
      console.error("Error deleting employee:", err);
    }
  };

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      role: "employee",
      branch_id: user?.branch_id?.toString() || "",
    });
    setSelectedEmployee(null);
  };

  const handleOpenEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      username: employee.username,
      password: "",
      role: "employee",
      branch_id: user?.branch_id?.toString() || "",
    });
    setOpenEdit(true);
  };

  const handleOpenDelete = (employee: Employee) => {
    setSelectedEmployee(employee);
    setOpenDelete(true);
  };

  const handleOpenResetPassword = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsResetPasswordModalOpen(true);
  };

  const handlePasswordResetSuccess = () => {
    fetchEmployees();
  };

  return (
    <div className="p-4">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          إدارة الموظفين
      </Typography>
        <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenAdd(true)}
        >
            إضافة موظف
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchEmployees}
        >
            تحديث
        </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>اسم المستخدم</TableCell>
                <TableCell>الدور</TableCell>
              <TableCell>الفرع</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>تاريخ الإنشاء</TableCell>
              <TableCell>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  لا يوجد موظفين
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>{employee.username}</TableCell>
                  <TableCell>{employee.role === "branch_manager" ? "مدير فرع" : "موظف"}</TableCell>
                  <TableCell>{employee.branch_name || "غير محدد"}</TableCell>
                    <TableCell>
                    <Typography
                      color={employee.active ? "success.main" : "error.main"}
                    >
                      {employee.active ? "نشط" : "غير نشط"}
                    </Typography>
                    </TableCell>
                  <TableCell>{new Date(employee.created_at).toLocaleDateString("ar-SA")}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="تعديل">
                            <Button
                              size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleOpenEdit(employee)}
                            >
                              تعديل
                            </Button>
                        </Tooltip>
                      <Tooltip title="تغيير كلمة المرور">
                            <Button
                          size="small"
                              color="success"
                          onClick={() => handleOpenResetPassword(employee)}
                            >
                              تغيير كلمة المرور
                            </Button>
                        </Tooltip>
                      <Tooltip title="حذف">
                            <Button
                          size="small"
                              color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleOpenDelete(employee)}
                            >
                              حذف
                            </Button>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
              ))
            )}
            </TableBody>
          </Table>
        </TableContainer>

      {/* Add Employee Dialog */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)}>
        <DialogTitle>إضافة موظف جديد</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            label="اسم المستخدم"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            fullWidth
          />
          <TextField
            label="كلمة المرور"
            type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>الدور</InputLabel>
              <Select
                value="employee"
            label="الدور"
            disabled
              >
                <MenuItem value="employee">موظف تحويلات</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>الفرع</InputLabel>
              <Select
                value={user?.branch_id?.toString() || ""}
            label="الفرع"
            disabled
              >
                <MenuItem value={user?.branch_id?.toString() || ""}>
                  {branches.find(b => b.id === user?.branch_id)?.name || "الفرع الحالي"}
                </MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>إلغاء</Button>
          <Button onClick={handleAddEmployee} variant="contained">
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)}>
        <DialogTitle>تعديل بيانات الموظف</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            label="اسم المستخدم"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            fullWidth
          />
          <TextField
              label="كلمة المرور الجديدة (اختياري)"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>الدور</InputLabel>
              <Select
                value="employee"
            label="الدور"
            disabled
              >
                <MenuItem value="employee">موظف تحويلات</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>الفرع</InputLabel>
              <Select
                value={user?.branch_id?.toString() || ""}
            label="الفرع"
            disabled
              >
                <MenuItem value={user?.branch_id?.toString() || ""}>
                  {branches.find(b => b.id === user?.branch_id)?.name || "الفرع الحالي"}
                </MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>إلغاء</Button>
          <Button onClick={handleEditEmployee} variant="contained">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف الموظف {selectedEmployee?.username}؟
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>إلغاء</Button>
          <Button onClick={handleDeleteEmployee} color="error" variant="contained">
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {selectedEmployee && (
        <ResetPasswordModal
          isOpen={isResetPasswordModalOpen}
          onClose={() => {
            setIsResetPasswordModalOpen(false);
            setSelectedEmployee(null);
          }}
          username={selectedEmployee.username}
          onSuccess={handlePasswordResetSuccess}
        />
      )}
    </div>
  );
} 