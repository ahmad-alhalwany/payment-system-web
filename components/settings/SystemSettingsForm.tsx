import React, { useState } from 'react';

interface SystemSettingsFormProps {
  initialData: SystemSettings;
  onSave: (settings: SystemSettings) => void;
}

export interface SystemSettings {
  systemName: string;
  companyName: string;
  adminEmail: string;
  defaultCurrency: string;
  mainPhone: string;
}

const CURRENCIES = [
  { value: "SYP", label: "ليرة سورية" },
  { value: "USD", label: "دولار أمريكي" },
  { value: "EUR", label: "يورو" },
];

export default function SystemSettingsForm({ initialData, onSave }: SystemSettingsFormProps) {
  const [settings, setSettings] = useState<SystemSettings>(initialData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };

  return (
    <div className="bg-white/90 rounded-2xl shadow-xl p-6 mb-8 border border-primary-100">
      <h2 className="text-2xl font-bold mb-6 text-primary-700 drop-shadow">إعدادات النظام</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم النظام</label>
            <input type="text" name="systemName" value={settings.systemName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الشركة</label>
            <input type="text" name="companyName" value={settings.companyName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني للمسؤول</label>
            <input type="email" name="adminEmail" value={settings.adminEmail} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العملة الافتراضية</label>
            <select name="defaultCurrency" value={settings.defaultCurrency} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200">
              {CURRENCIES.map(currency => (
                <option key={currency.value} value={currency.value}>{currency.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف الرئيسي للشركة</label>
            <input type="tel" name="mainPhone" value={settings.mainPhone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200" required placeholder="مثال: 09xxxxxxxx" />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition font-bold shadow focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2">
            حفظ الإعدادات
          </button>
        </div>
      </form>
    </div>
  );
} 