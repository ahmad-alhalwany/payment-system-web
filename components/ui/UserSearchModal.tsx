import React, { useState, useEffect } from "react";
import axiosInstance from "@/app/api/axios";
import ModernButton from "./ModernButton";

interface User {
  id: number;
  name: string;
  mobile: string;
  governorate: string;
  location: string;
  idNumber: string;
  type: "sender" | "receiver";
}

interface Transfer {
  id: string;
  sender: string;
  receiver: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
}

interface UserSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (user: User) => void;
}

export default function UserSearchModal({ open, onClose, onSelect }: UserSearchModalProps) {
  const [tab, setTab] = useState<'users' | 'transfers'>('users');
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // جلب المستخدمين
  const searchUsers = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      setLoading(true);
      setError("");
      const response = await axiosInstance.get('/users/search', {
        params: { query: searchTerm }
      });
      setUsers(response.data);
    } catch (err) {
      setError("فشل في البحث عن المستخدمين");
      console.error('Error searching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // جلب التحويلات
  const searchTransfers = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      setLoading(true);
      setError("");
      const response = await axiosInstance.get('/transfers/search', {
        params: { query: searchTerm }
      });
      setTransfers(response.data);
    } catch (err) {
      setError("فشل في البحث عن التحويلات");
      console.error('Error searching transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  // إعادة تعيين البحث عند تغيير التبويب
  useEffect(() => {
    setSearchTerm("");
    setUsers([]);
    setTransfers([]);
    setError("");
  }, [tab]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-6 relative animate-fadeIn">
        {/* زر الإغلاق */}
        <button
          className="absolute left-4 top-4 text-gray-500 hover:text-red-500 text-2xl font-bold"
          onClick={onClose}
          aria-label="إغلاق"
        >
          ×
        </button>

        {/* العنوان والتبويبات */}
        <div className="mb-6 flex flex-col items-center">
          <h2 className="text-2xl font-bold text-primary-800 mb-4">بحث المستخدمين والتحويلات</h2>
          <div className="flex gap-4 mb-2">
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                tab === 'users' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-primary-800'
              }`}
              onClick={() => setTab('users')}
            >
              المستخدمين
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                tab === 'transfers' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-primary-800'
              }`}
              onClick={() => setTab('transfers')}
            >
              الحوالات
            </button>
          </div>
        </div>

        {/* محتوى التبويب */}
        {tab === 'users' ? (
          <div>
            {/* حقول البحث عن المستخدمين */}
            <div className="mb-4 flex flex-col md:flex-row gap-4 items-center justify-center">
              <input
                className="border rounded-lg px-4 py-2 w-64"
                placeholder="بحث بالاسم أو رقم الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                disabled={loading}
              />
              <ModernButton
                color="#3498db"
                onClick={searchUsers}
                disabled={loading}
              >
                {loading ? "جاري البحث..." : "بحث"}
              </ModernButton>
            </div>

            {/* جدول النتائج */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-center border rounded-lg">
                <thead>
                  <tr className="bg-primary-100">
                    <th className="px-4 py-2">الاسم</th>
                    <th className="px-4 py-2">رقم الهاتف</th>
                    <th className="px-4 py-2">المحافظة</th>
                    <th className="px-4 py-2">الموقع</th>
                    <th className="px-4 py-2">رقم الهوية</th>
                    <th className="px-4 py-2">النوع</th>
                    <th className="px-4 py-2">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-4">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                          <span className="mr-2">جاري البحث...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 text-red-600">{error}</td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 text-gray-500">
                        {searchTerm ? "لا توجد نتائج" : "أدخل كلمة البحث"}
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{user.name}</td>
                        <td className="px-4 py-2">{user.mobile}</td>
                        <td className="px-4 py-2">{user.governorate}</td>
                        <td className="px-4 py-2">{user.location}</td>
                        <td className="px-4 py-2">{user.idNumber}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.type === "sender" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                          }`}>
                            {user.type === "sender" ? "مرسل" : "مستلم"}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <ModernButton
                            color="#2ecc71"
                            onClick={() => onSelect(user)}
                          >
                            اختيار
                          </ModernButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            {/* حقول البحث عن الحوالات */}
            <div className="mb-4 flex flex-col md:flex-row gap-4 items-center justify-center">
              <input
                className="border rounded-lg px-4 py-2 w-64"
                placeholder="بحث برقم التحويل أو اسم المرسل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchTransfers()}
                disabled={loading}
              />
              <ModernButton
                color="#3498db"
                onClick={searchTransfers}
                disabled={loading}
              >
                {loading ? "جاري البحث..." : "بحث"}
              </ModernButton>
            </div>

            {/* جدول النتائج */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-center border rounded-lg">
                <thead>
                  <tr className="bg-primary-100">
                    <th className="px-4 py-2">رقم التحويل</th>
                    <th className="px-4 py-2">المرسل</th>
                    <th className="px-4 py-2">المستلم</th>
                    <th className="px-4 py-2">المبلغ</th>
                    <th className="px-4 py-2">العملة</th>
                    <th className="px-4 py-2">الحالة</th>
                    <th className="px-4 py-2">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-4">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                          <span className="mr-2">جاري البحث...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 text-red-600">{error}</td>
                    </tr>
                  ) : transfers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 text-gray-500">
                        {searchTerm ? "لا توجد نتائج" : "أدخل كلمة البحث"}
                      </td>
                    </tr>
                  ) : (
                    transfers.map(transfer => (
                      <tr key={transfer.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{transfer.id}</td>
                        <td className="px-4 py-2">{transfer.sender}</td>
                        <td className="px-4 py-2">{transfer.receiver}</td>
                        <td className="px-4 py-2">{transfer.amount.toLocaleString()}</td>
                        <td className="px-4 py-2">{transfer.currency}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            transfer.status === "completed" ? "bg-green-100 text-green-800" :
                            transfer.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {transfer.status === "completed" ? "مكتمل" :
                             transfer.status === "pending" ? "قيد الانتظار" : "ملغي"}
                          </span>
                        </td>
                        <td className="px-4 py-2">{transfer.date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 