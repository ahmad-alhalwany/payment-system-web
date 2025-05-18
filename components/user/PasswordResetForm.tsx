import React, { useState } from "react";
import ModernButton from "../ui/ModernButton";
import { useAuth } from "@/app/hooks/useAuth";
import toast from "react-hot-toast";

export default function PasswordResetForm() {
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const { resetPassword, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate inputs
    if (!username || !newPassword || !confirmPassword) {
      setError("جميع الحقول مطلوبة");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("كلمة المرور الجديدة وتأكيدها غير متطابقين");
      return;
    }

    if (newPassword.length < 6) {
      setError("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    try {
      await resetPassword({
        username,
        new_password: newPassword
      });
      
      // Clear form
      setUsername("");
      setNewPassword("");
      setConfirmPassword("");
      
      toast.success("تم إعادة تعيين كلمة المرور بنجاح");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء إعادة تعيين كلمة المرور");
      toast.error("فشل في إعادة تعيين كلمة المرور");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white rounded-xl shadow p-6 flex flex-col gap-4">
      <h2 className="text-xl font-bold mb-2 text-primary-800">إعادة تعيين كلمة المرور</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          اسم المستخدم
        </label>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          كلمة المرور الجديدة
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          تأكيد كلمة المرور الجديدة
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <ModernButton type="submit" disabled={loading}>
        {loading ? "جاري إعادة التعيين..." : "إعادة تعيين"}
      </ModernButton>
    </form>
  );
} 