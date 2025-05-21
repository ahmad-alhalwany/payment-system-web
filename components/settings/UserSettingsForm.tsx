import React, { useState } from 'react';
import { useAuth } from '@/app/hooks/useAuth';
import toast from 'react-hot-toast';

interface UserSettingsFormProps {
  username: string;
}

export default function UserSettingsForm({ username }: UserSettingsFormProps) {
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const { changePassword, loading } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords
    if (!passwords.oldPassword || !passwords.newPassword || !passwords.confirmPassword) {
      setError('جميع الحقول مطلوبة');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }

    if (passwords.newPassword.length < 6) {
      setError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      await changePassword({
        old_password: passwords.oldPassword,
        new_password: passwords.newPassword
      });
      
      // Clear form
      setPasswords({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      toast.success('تم تغيير كلمة المرور بنجاح');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تغيير كلمة المرور');
      toast.error('فشل في تغيير كلمة المرور');
    }
  };

  return (
    <div className="bg-white/90 rounded-2xl shadow-xl p-6 mb-8 border border-primary-100">
      <h2 className="text-2xl font-bold mb-6 text-primary-700 drop-shadow">إعدادات المستخدم</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
          <input type="text" value={username} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الحالية</label>
          <input type="password" name="oldPassword" value={passwords.oldPassword} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الجديدة</label>
          <input type="password" name="newPassword" value={passwords.newPassword} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تأكيد كلمة المرور الجديدة</label>
          <input type="password" name="confirmPassword" value={passwords.confirmPassword} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200" required />
        </div>
        {error && (
          <div className="text-red-600 text-base font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2 animate-fade-in">{error}</div>
        )}
        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition font-bold shadow focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <span>🔒</span> {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
          </button>
        </div>
      </form>
    </div>
  );
} 