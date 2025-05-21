"use client";
import React, { useState, useMemo, useEffect } from "react";
import axiosInstance from "@/app/api/axios";

// أنواع TypeScript
interface Notification {
  id: number;
  transactionId: number;
  message: string;
  status: "sent" | "received" | "failed";
  date: string;
  read: boolean;
}

const statusOptions = [
  { label: "الكل", value: "all" },
  { label: "مرسل", value: "sent" },
  { label: "مستلم", value: "received" },
  { label: "فشل", value: "failed" },
];

function getStatusLabel(status: string) {
  switch (status) {
    case "sent": return "مرسل";
    case "received": return "مستلم";
    case "failed": return "فشل";
    default: return status;
  }
}

export default function NotificationsPanel() {
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState("");

  // جلب الإشعارات
  const fetchNotifications = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axiosInstance.get('/employee/notifications/', {
        params: {
          status: status !== "all" ? status : undefined
        }
      });
      setNotifications(response.data);
    } catch (e) {
      setError("فشل في تحميل الإشعارات");
      console.error('Error fetching notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  // جلب الإشعارات عند تحميل الصفحة وعند تغيير الفلتر
  useEffect(() => {
    fetchNotifications();
  }, [status]);

  const handleRefresh = () => {
    fetchNotifications();
  };

  return (
    <div className="bg-white/90 rounded-3xl shadow-2xl p-6 md:p-10 border border-primary-100 backdrop-blur-md max-w-4xl mx-auto" style={{ boxShadow: '0 8px 32px #1976d220' }}>
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
        <select
          className="border-2 border-primary-100 rounded-xl px-5 py-2 w-full md:w-56 bg-gray-50 text-primary-700 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-200 transition shadow-sm"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          className="bg-primary-500 text-white px-8 py-2 rounded-xl font-bold hover:bg-primary-600 transition text-lg shadow-md w-full md:w-auto"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? "...جاري التحديث" : "تحديث"}
        </button>
      </div>

      {/* رسالة الخطأ */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-xl text-center text-lg font-bold shadow-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-center border-separate border-spacing-y-2">
          <thead>
            <tr className="bg-gradient-to-l from-primary-100 to-blue-50 rounded-2xl">
              <th className="px-6 py-3 text-primary-700 text-lg font-extrabold rounded-s-2xl">رقم العملية</th>
              <th className="px-6 py-3 text-primary-700 text-lg font-extrabold">الرسالة</th>
              <th className="px-6 py-3 text-primary-700 text-lg font-extrabold">الحالة</th>
              <th className="px-6 py-3 text-primary-700 text-lg font-extrabold rounded-e-2xl">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-10 text-gray-400 text-xl font-bold">جاري التحميل...</td>
              </tr>
            ) : notifications.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-gray-400 text-xl font-bold">لا توجد إشعارات مطابقة</td>
              </tr>
            ) : (
              notifications.map(n => (
                <tr key={n.id} className={`transition-all duration-200 ${!n.read ? "bg-blue-50/70 shadow-md" : "bg-white"} rounded-2xl border border-primary-50 hover:scale-[1.01]`} style={{ boxShadow: !n.read ? '0 2px 12px #1976d220' : undefined }}>
                  <td className="px-6 py-3 font-bold text-primary-700 rounded-s-2xl">{n.transactionId}</td>
                  <td className="px-6 py-3 text-right text-primary-900">{n.message}</td>
                  <td className="px-6 py-3">
                    <span className={`px-4 py-1 rounded-full text-sm font-bold shadow-sm border-2 transition-all duration-200 ${
                      n.status === "sent" ? "bg-green-50 text-green-700 border-green-200" :
                      n.status === "received" ? "bg-blue-50 text-blue-700 border-blue-200" :
                      n.status === "failed" ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-100 text-gray-700 border-gray-200"
                    }`}>
                      {getStatusLabel(n.status)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-primary-600 rounded-e-2xl">{n.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 