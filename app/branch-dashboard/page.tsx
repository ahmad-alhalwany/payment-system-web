"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import UserSearchModal from "@/components/ui/UserSearchModal";
import AddEmployeeModal from "@/components/ui/AddEmployeeModal";
import { useRouter } from "next/navigation";
import OutgoingTransfersTable from "../money-transfer/employee-dashboard/OutgoingTransfersTable";
import IncomingTransfersTable from "../money-transfer/employee-dashboard/IncomingTransfersTable";
import { useAuth } from "@/app/hooks/useAuth";
import axiosInstance from "@/app/api/axios";
import { Transaction } from "@/app/api/transactions";
import { useTransactions } from "../hooks/useTransactions";

interface BranchInfo {
  id: number;
  name: string;
  location: string;
  governorate: string;
  allocated_amount_syp: number;
  allocated_amount_usd: number;
}

interface BranchStats {
  total_transactions: number;
  total_amount: number;
  profit: number;
}

interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
}

interface TransactionStats {
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
}

const quickActions = [
  { label: "إضافة موظف", href: "/branch-dashboard/employees/add", color: "bg-green-500", icon: "➕" },
  { label: "تحويل جديد", href: "/money-transfer", color: "bg-blue-500", icon: "🔄" },
  { label: "بحث عن مستخدم", href: "/branch-dashboard/employees/search", color: "bg-orange-500", icon: "🔍" },
];

const links = [
  { label: "إدارة الموظفين", href: "/branch-dashboard/employees" },
  { label: "التحويلات", href: "/money-transfer" },
  { label: "التقارير", href: "/branch-dashboard/reports" },
  { label: "الأرباح", href: "/branch-dashboard/profit" },
  { label: "الإعدادات", href: "/branch-dashboard/settings" },
];

export default function BranchManagerDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [activeTab, setActiveTab] = useState("transfers");
  const [successMsg, setSuccessMsg] = useState("");
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
  const [branchStats, setBranchStats] = useState<BranchStats | null>(null);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
  const [transactionStats, setTransactionStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outgoingPage, setOutgoingPage] = useState(1);
  const [incomingPage, setIncomingPage] = useState(1);
  const [perPage] = useState(10);
  const [openAdd, setOpenAdd] = useState(false);

  // استخدم هوك التحويلات
  const {
    transactions: outgoingTransfers,
    getTransactions: getOutgoingTransfers,
    createTransaction: createOutgoingTransfer,
    updateStatus: updateOutgoingStatus,
    totalPages: outgoingTotalPages,
    loading: outgoingLoading
  } = useTransactions();
  const {
    transactions: incomingTransfers,
    getTransactions: getIncomingTransfers,
    updateStatus: updateIncomingStatus,
    totalPages: incomingTotalPages,
    loading: incomingLoading
  } = useTransactions();

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.branch_id) return;
      try {
        setLoading(true);
        const [info, empStats, transStats] = await Promise.all([
          axiosInstance.get(`/branches/${user.branch_id}`),
          axiosInstance.get(`/branches/${user.branch_id}/employees/stats/`),
          axiosInstance.get(`/branches/${user.branch_id}/transactions/stats/`)
        ]);
        setBranchInfo(info.data);
        setEmployeeStats(empStats.data);
        setTransactionStats(transStats.data);
      } catch (err) {
        setError('حدث خطأ أثناء تحميل البيانات');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.branch_id]);

  // جلب التحويلات الصادرة
  useEffect(() => {
    if (user?.branch_id && activeTab === "transfers") {
      getOutgoingTransfers({
        page: outgoingPage,
        per_page: perPage,
        branch_id: user.branch_id
      });
    }
  }, [user?.branch_id, outgoingPage, perPage, activeTab, getOutgoingTransfers]);

  // جلب التحويلات الواردة
  useEffect(() => {
    if (user?.branch_id && activeTab === "transfers") {
      getIncomingTransfers({
        page: incomingPage,
        per_page: perPage,
        destination_branch_id: user.branch_id
      });
    }
  }, [user?.branch_id, incomingPage, perPage, activeTab, getIncomingTransfers]);

  const handleAddEmployee = async (username: string, password: string) => {
    try {
      await axiosInstance.post('/branch/employees/', {
        username,
        password
      });
      setSuccessMsg("تمت إضافة الموظف بنجاح");
      setShowAddEmployee(false);
      // تحديث إحصائيات الموظفين
      const empStatsRes = await axiosInstance.get(`/branches/${user?.branch_id}/employees/stats/`);
      setEmployeeStats(empStatsRes.data);
    } catch (err) {
      setError("فشل في إضافة الموظف");
      console.error('Error adding employee:', err);
    }
  };

  const handleAddTransfer = async (transfer: {
    sender: any;
    receiver: any;
    amount: number;
    benefitAmount?: number;
    currency: string;
    branch: string;
    message?: string;
    resetForm?: () => void;
  }) => {
    try {
      // إرسال الحوالة عبر API
      await createOutgoingTransfer({
        sender: transfer.sender.name,
        sender_mobile: transfer.sender.mobile || '',
        sender_governorate: transfer.sender.governorate || '',
        sender_location: transfer.sender.location || '',
        sender_id: transfer.sender.id || '',
        sender_address: transfer.sender.address || '',
        receiver: transfer.receiver.name,
        receiver_mobile: transfer.receiver.mobile || '',
        receiver_governorate: transfer.receiver.governorate || '',
        receiver_location: transfer.receiver.location || '',
        receiver_id: transfer.receiver.id || '',
        receiver_address: transfer.receiver.address || '',
        amount: transfer.amount,
        base_amount: transfer.amount,
        benefited_amount: transfer.benefitAmount || transfer.amount,
        tax_rate: 0,
        tax_amount: 0,
        currency: transfer.currency,
        message: transfer.message || '',
        employee_name: user?.username || '',
        branch_governorate: branchInfo?.governorate || '',
        destination_branch_id: parseInt(transfer.branch),
        branch_id: user?.branch_id,
        date: new Date().toISOString(),
        status: 'pending',
        is_received: false
      });
      setSuccessMsg("تمت إضافة الحوالة بنجاح!");
      if (transfer.resetForm) transfer.resetForm();
      setOutgoingPage(1);
      getOutgoingTransfers({ page: 1, per_page: perPage, branch_id: user?.branch_id });
    } catch (err) {
      setError("حدث خطأ أثناء إضافة الحوالة");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center">
        <div className="text-2xl text-primary-800">جاري التحميل...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center">
        <div className="text-2xl text-red-600">{error}</div>
      </div>
    );
  }

  const stats = [
    { 
      label: "الرصيد المتاح (ل.س)", 
      value: branchInfo?.allocated_amount_syp.toLocaleString() || "0", 
      color: "bg-green-100", 
      icon: "💵" 
    },
    { 
      label: "الرصيد المتاح ($)", 
      value: branchInfo?.allocated_amount_usd.toLocaleString() || "0", 
      color: "bg-blue-100", 
      icon: "💰" 
    },
    { 
      label: "عدد الموظفين", 
      value: employeeStats?.total || 0, 
      color: "bg-primary-100", 
      icon: "👥" 
    },
  ];

  return (
    <div className="min-h-screen bg-primary-50">
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8 text-primary-800 text-center">لوحة تحكم مدير الفرع</h1>
        {/* معلومات الفرع */}
        <div className="bg-white rounded-xl shadow p-6 mb-8 flex flex-col md:flex-row gap-8 items-center justify-between">
          <div>
            <div className="text-xl font-bold text-primary-900 mb-2">{branchInfo?.name}</div>
            <div className="text-gray-600 mb-1">الموقع: {branchInfo?.location}</div>
            <div className="text-gray-600">المحافظة: {branchInfo?.governorate}</div>
          </div>
          <div className="flex gap-4">
            {/* زر إضافة موظف */}
            <button
              type="button"
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-white font-semibold shadow transition hover:scale-105 bg-green-500"
              onClick={() => setOpenAdd(true)}
            >
              <span className="text-xl">➕</span>
              إضافة موظف
            </button>
            {/* زر تحويل جديد */}
            <Link href="/money-transfer" className="flex items-center gap-2 px-5 py-2 rounded-lg text-white font-semibold shadow transition hover:scale-105 bg-blue-500">
              <span className="text-xl">🔄</span>
              تحويل جديد
            </Link>
            {/* زر بحث عن مستخدم */}
            <button
              type="button"
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-white font-semibold shadow transition hover:scale-105 bg-orange-500"
              onClick={() => setShowUserSearch(true)}
            >
              <span className="text-xl">🔍</span>
              بحث عن مستخدم
            </button>
          </div>
        </div>
        {/* إحصائيات */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {stats.map((stat, idx) => (
            <div key={idx} className={`rounded-xl shadow p-6 flex flex-col items-center ${stat.color}`}>
              <span className="text-3xl mb-2">{stat.icon}</span>
              <span className="text-2xl font-bold text-primary-900">{stat.value}</span>
              <span className="text-gray-600 mt-2">{stat.label}</span>
            </div>
          ))}
        </div>
        {/* روابط الصفحات الفرعية */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-primary-800">الصفحات الفرعية</h2>
          <div className="flex flex-wrap gap-4">
            {links.map((link, idx) => (
              <Link key={idx} href={link.href} className="px-6 py-3 rounded-lg bg-primary-100 text-primary-800 font-semibold shadow hover:bg-primary-200 transition">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        {/* نافذة البحث المنبثقة */}
        <UserSearchModal 
          open={showUserSearch} 
          onClose={() => setShowUserSearch(false)} 
          onSelect={(user) => {
            console.log('Selected user:', user);
            setShowUserSearch(false);
          }}
        />
        {/* نافذة إضافة موظف */}
        <AddEmployeeModal 
          open={openAdd} 
          onClose={() => setOpenAdd(false)} 
          onAdd={handleAddEmployee} 
          branchName={branchInfo?.name || ""}
        />
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <div className="flex gap-4 mb-6">
            <button
              className={`px-4 py-2 rounded-lg ${
                activeTab === "transfers" ? "bg-primary-600 text-white" : "bg-gray-100"
              }`}
              onClick={() => setActiveTab("transfers")}
            >
              التحويلات
            </button>
            <button
              className={`px-4 py-2 rounded-lg ${
                activeTab === "reports" ? "bg-primary-600 text-white" : "bg-gray-100"
              }`}
              onClick={() => setActiveTab("reports")}
            >
              التقارير
            </button>
          </div>

          {activeTab === "transfers" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold mb-4">التحويلات الصادرة</h2>
                <OutgoingTransfersTable
                  transfers={outgoingTransfers}
                  onStatusChange={async (id, status) => {
                    await updateOutgoingStatus({ transaction_id: id, status });
                    setOutgoingPage(1);
                    getOutgoingTransfers({ page: 1, per_page: perPage, branch_id: user?.branch_id });
                  }}
                  currentPage={outgoingPage}
                  totalPages={outgoingTotalPages}
                  onPageChange={setOutgoingPage}
                  loading={outgoingLoading}
                />
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">التحويلات الواردة</h2>
                <IncomingTransfersTable
                  transfers={incomingTransfers}
                  onStatusChange={async (id, status) => {
                    await updateIncomingStatus({ transaction_id: id, status });
                    setIncomingPage(1);
                    getIncomingTransfers({ page: 1, per_page: perPage, destination_branch_id: user?.branch_id });
                  }}
                  currentPage={incomingPage}
                  totalPages={incomingTotalPages}
                  onPageChange={setIncomingPage}
                  loading={incomingLoading}
                />
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div>
              <h2 className="text-xl font-bold mb-4">التقارير</h2>
              {/* جلب وعرض تقارير حقيقية من الـ API */}
              {/* مثال: عرض إحصائيات التحويلات */}
              {transactionStats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                  <div className="rounded-xl shadow p-6 flex flex-col items-center bg-blue-100">
                    <span className="text-2xl font-bold text-primary-900">{transactionStats.total}</span>
                    <span className="text-gray-600 mt-2">إجمالي التحويلات</span>
                  </div>
                  <div className="rounded-xl shadow p-6 flex flex-col items-center bg-green-100">
                    <span className="text-2xl font-bold text-primary-900">{transactionStats.completed}</span>
                    <span className="text-gray-600 mt-2">المكتملة</span>
                  </div>
                  <div className="rounded-xl shadow p-6 flex flex-col items-center bg-yellow-100">
                    <span className="text-2xl font-bold text-primary-900">{transactionStats.pending}</span>
                    <span className="text-gray-600 mt-2">قيد الانتظار</span>
                  </div>
                  <div className="rounded-xl shadow p-6 flex flex-col items-center bg-red-100">
                    <span className="text-2xl font-bold text-primary-900">{transactionStats.cancelled}</span>
                    <span className="text-gray-600 mt-2">الملغاة</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {successMsg && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg">
            {successMsg}
          </div>
        )}
      </div>
    </div>
  );
} 