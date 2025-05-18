'use client';

import React, { useState, useEffect } from 'react';
import SystemSettingsForm, { SystemSettings } from '@/components/settings/SystemSettingsForm';
import UserSettingsForm from '@/components/settings/UserSettingsForm';
import BackupRestoreSection from '@/components/settings/BackupRestoreSection';
import { useAuth } from '@/app/hooks/useAuth';
import axiosInstance from '@/app/api/axios';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    systemName: '',
    companyName: '',
    adminEmail: '',
    defaultCurrency: '',
    mainPhone: ''
  });
  const [username, setUsername] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      setUsername(user.username);
    }
    fetchSystemSettings();
  }, [user]);

  const fetchSystemSettings = async () => {
    try {
      const response = await axiosInstance.get('/settings/system/');
      setSystemSettings(response.data);
    } catch (error) {
      console.error('Error fetching system settings:', error);
      setError('فشل في تحميل إعدادات النظام');
    } finally {
      setLoading(false);
    }
  };

  const handleSystemSettingsChange = async (newSettings: SystemSettings) => {
    try {
      await axiosInstance.put('/settings/system/', newSettings);
      setSystemSettings(newSettings);
    } catch (error) {
      console.error('Error updating system settings:', error);
      setError('فشل في تحديث إعدادات النظام');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }
    setLoading(true);
    try {
      await axiosInstance.post('/change-password/', {
        old_password: oldPassword,
        new_password: newPassword
      });
      toast.success('تم تغيير كلمة المرور بنجاح');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/backup/', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'system_backup.sqlite');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('تم إنشاء النسخة الاحتياطية بنجاح');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'حدث خطأ أثناء إنشاء النسخة الاحتياطية');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
      const formData = new FormData();
    formData.append('file', file);
      
    try {
      await axiosInstance.post('/restore/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('تم استعادة النسخة الاحتياطية بنجاح');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'حدث خطأ أثناء استعادة النسخة الاحتياطية');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-primary-700">الإعدادات</h1>
      
      <div className="space-y-6">
        <SystemSettingsForm
          initialData={systemSettings}
          onSave={handleSystemSettingsChange}
        />

        <UserSettingsForm username={username} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* تغيير كلمة المرور */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">تغيير كلمة المرور</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  كلمة المرور الحالية
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-500 text-white py-2 px-4 rounded-md hover:bg-primary-600 disabled:opacity-50"
              >
                {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
              </button>
            </form>
          </div>

          {/* النسخ الاحتياطي */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">النسخ الاحتياطي</h2>
            <div className="space-y-4">
              <button
                onClick={handleBackup}
                disabled={loading}
                className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'جاري النسخ...' : 'إنشاء نسخة احتياطية'}
              </button>

              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-2">استعادة نسخة احتياطية</h3>
                <input
                  type="file"
                  accept=".sqlite"
                  onChange={handleRestore}
                  disabled={loading}
                  className="w-full"
                />
                <p className="text-sm text-gray-500 mt-2">
                  اختر ملف النسخة الاحتياطية (.sqlite) للاستعادة
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
} 