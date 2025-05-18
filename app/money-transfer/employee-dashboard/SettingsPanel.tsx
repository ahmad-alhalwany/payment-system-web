import React, { useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import toast from "react-hot-toast";

const getUserInfo = () => {
  return {
    username: typeof window !== 'undefined' ? localStorage.getItem('username') || 'employee' : 'employee',
    role: typeof window !== 'undefined' ? localStorage.getItem('userRole') || 'employee' : 'employee',
    branch: typeof window !== 'undefined' ? localStorage.getItem('branchId') || 'b1' : 'b1',
  };
};

function getRoleLabel(role: string) {
  switch (role) {
    case 'director': return 'مدير النظام';
    case 'branch_manager': return 'مدير فرع';
    case 'employee': return 'موظف تحويلات';
    default: return role;
  }
}

export default function SettingsPanel() {
  const [showChangePass, setShowChangePass] = useState(false);
  const { changePassword, loading, logout } = useAuth();
  const userInfo = getUserInfo();

  const handleLogout = () => {
    try {
      logout();
      toast.success('تم تسجيل الخروج بنجاح');
      setTimeout(() => window.location.href = "/(auth)/login", 1000);
    } catch (error) {
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="bg-white rounded-xl shadow p-6 mb-4">
        <h2 className="text-xl font-bold mb-4 text-primary-800">معلومات الحساب</h2>
        <div className="space-y-2 text-right">
          <div><span className="font-semibold">اسم المستخدم:</span> {userInfo.username}</div>
          <div><span className="font-semibold">الدور:</span> {getRoleLabel(userInfo.role)}</div>
          <div><span className="font-semibold">رمز الفرع:</span> {userInfo.branch}</div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <button
          className="bg-primary-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-600 transition"
          onClick={() => setShowChangePass(true)}
        >
          تغيير كلمة المرور
        </button>
        <button
          className="bg-red-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-600 transition"
          onClick={handleLogout}
        >
          تسجيل الخروج
        </button>
      </div>
      {/* نافذة تغيير كلمة المرور */}
      {showChangePass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative animate-fadeIn">
            <button
              className="absolute left-4 top-4 text-gray-500 hover:text-red-500 text-2xl font-bold"
              onClick={() => setShowChangePass(false)}
              aria-label="إغلاق"
            >
              ×
            </button>
            <h2 className="text-xl font-bold text-primary-800 mb-4 text-center">تغيير كلمة المرور</h2>
            <ChangePasswordForm onClose={() => setShowChangePass(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function ChangePasswordForm({ onClose }: { onClose: () => void }) {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error, setError] = useState("");
  const { changePassword, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!oldPass || !newPass || !confirmPass) {
      setError("جميع الحقول مطلوبة");
      return;
    }

    if (newPass !== confirmPass) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    if (newPass.length < 6) {
      setError("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    try {
      await changePassword({
        old_password: oldPass,
        new_password: newPass
      });
      
      toast.success("تم تغيير كلمة المرور بنجاح");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء تغيير كلمة المرور");
      toast.error("فشل في تغيير كلمة المرور");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          كلمة المرور الحالية
        </label>
        <input
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          type="password"
          value={oldPass}
          onChange={e => setOldPass(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          كلمة المرور الجديدة
        </label>
        <input
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          type="password"
          value={newPass}
          onChange={e => setNewPass(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          تأكيد كلمة المرور الجديدة
        </label>
        <input
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          type="password"
          value={confirmPass}
          onChange={e => setConfirmPass(e.target.value)}
          required
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <div className="flex justify-center gap-4 mt-4">
        <button
          className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          onClick={onClose}
          type="button"
          disabled={loading}
        >
          إلغاء
        </button>
        <button
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={loading}
        >
          {loading ? "جاري الحفظ..." : "حفظ"}
        </button>
      </div>
    </form>
  );
} 