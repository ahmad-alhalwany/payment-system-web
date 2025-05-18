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
    <div>
      <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between">
        <select
          className="border rounded-lg px-4 py-2 w-full md:w-48"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          className="bg-primary-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-600 transition"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? "...جاري التحديث" : "تحديث"}
        </button>
      </div>

      {/* رسالة الخطأ */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-center border rounded-lg">
          <thead>
            <tr className="bg-primary-100">
              <th className="px-4 py-2">رقم العملية</th>
              <th className="px-4 py-2">الرسالة</th>
              <th className="px-4 py-2">الحالة</th>
              <th className="px-4 py-2">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-gray-400">جاري التحميل...</td>
              </tr>
            ) : notifications.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-gray-400">لا توجد إشعارات مطابقة</td>
              </tr>
            ) : (
              notifications.map(n => (
                <tr key={n.id} className={`border-b ${!n.read ? "bg-blue-50" : ""}`}>
                  <td className="px-4 py-2">{n.transactionId}</td>
                  <td className="px-4 py-2 text-right">{n.message}</td>
                  <td className="px-4 py-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      n.status === "sent" ? "bg-green-100 text-green-700" :
                      n.status === "received" ? "bg-blue-100 text-blue-700" :
                      n.status === "failed" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                    }`}>
                      {getStatusLabel(n.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2">{n.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 