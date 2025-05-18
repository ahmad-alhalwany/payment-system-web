import React, { useState, useEffect } from "react";
import BranchModal from "../branch/BranchModal";
import ModernButton from "../ui/ModernButton";
import axiosInstance from "@/app/api/axios";
import { useAuth } from '@/app/hooks/useAuth';

interface Branch {
  id: number;
  name: string;
  governorate: string;
}

interface Employee {
  id?: number;
  username: string;
  password?: string;
  role: string;
  branchId?: number;
  branch_id?: number;
}

interface EmployeeFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Employee) => void;
  initialData?: Employee;
  branches?: string[];
}

const roles = ["مدير فرع", "موظف تحويلات"];

export default function EmployeeFormModal({ open, onClose, onSubmit, initialData }: EmployeeFormModalProps) {
  const isEdit = !!initialData;
  const [username, setUsername] = useState(initialData?.username || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(initialData?.role || roles[0]);
  const [branchId, setBranchId] = useState<number>(initialData?.branchId || initialData?.branch_id || 0);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const userRole = user?.role || "";
  const userBranchId = user?.branch_id || null;

  // جلب الفروع من API
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('/branches/');
        let branchesData = Array.isArray(response.data.branches)
          ? response.data.branches
          : Array.isArray(response.data)
            ? response.data
            : [];
        // إذا كان المستخدم مدير فرع، أظهر فقط فرعه
        if (userRole === "branch_manager" && userBranchId) {
          branchesData = branchesData.filter((b: Branch) => Number(b.id) === Number(userBranchId));
        }
        setBranches(branchesData);
        if (!branchId && branchesData.length > 0) {
          setBranchId(branchesData[0].id);
        }
      } catch (err) {
        setError("فشل في تحميل الفروع");
        console.error('Error fetching branches:', err);
      } finally {
        setLoading(false);
      }
    };
    if (open) {
      fetchBranches();
    }
  }, [open, branchId, userRole, userBranchId]);

  // تحديث الحالة عند تغيير البيانات الأولية
  useEffect(() => {
    if (open) {
      setUsername(initialData?.username || "");
      setRole(initialData?.role || roles[0]);
      setBranchId(initialData?.branchId || initialData?.branch_id || 0);
      setPassword("");
      setError("");
    }
  }, [open, initialData]);

  const handleSave = () => {
    if (!username || (!isEdit && !password) || !role || !branchId) {
      setError("جميع الحقول مطلوبة");
      return;
    }
    setError("");
    const roleMap: Record<string, string> = {
      "مدير فرع": "branch_manager",
      "موظف تحويلات": "employee",
      "مدير النظام": "director"
    };
    onSubmit({
      id: initialData?.id,
      username,
      password: isEdit ? undefined : password,
      role: roleMap[role] || role,
      branch_id: Number(branchId)
    });
  };

  return (
    <BranchModal open={open} onClose={onClose} title={isEdit ? "تعديل موظف" : "إضافة موظف جديد"}>
      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">اسم الموظف</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="input-field w-full"
            placeholder="أدخل اسم الموظف"
            disabled={loading}
          />
        </div>
        {!isEdit && (
          <div>
            <label className="block mb-1 font-medium">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field w-full"
              placeholder="أدخل كلمة المرور"
              disabled={loading}
            />
          </div>
        )}
        <div>
          <label className="block mb-1 font-medium">الوظيفة</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="input-field w-full"
            disabled={loading}
          >
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium">الفرع</label>
          <select
            value={branchId}
            onChange={e => setBranchId(Number(e.target.value))}
            className="input-field w-full"
            disabled={loading || userRole === "branch_manager"}
          >
            <option value="">اختر الفرع</option>
            {Array.isArray(branches) && branches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name} - {b.governorate}
              </option>
            ))}
          </select>
        </div>
        {error && <div className="text-red-600 text-center">{error}</div>}
        <div className="flex justify-end gap-2 mt-4">
          <ModernButton 
            color="#e74c3c" 
            onClick={onClose}
            disabled={loading}
          >
            إلغاء
          </ModernButton>
          <ModernButton 
            color="#2ecc71" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "جاري الحفظ..." : "حفظ"}
          </ModernButton>
        </div>
      </div>
    </BranchModal>
  );
} 