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
import { Pagination } from '@mui/material';

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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e3f0ff 0%, #fceabb 100%)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 8px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 32, color: '#1976d2', textAlign: 'center', letterSpacing: 1, textShadow: '0 1px 2px #0001' }}>
          لوحة تحكم مدير الفرع
        </h1>
        {/* معلومات الفرع */}
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 24, boxShadow: '0 4px 24px #0001', padding: 32, marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1976d2', marginBottom: 8 }}>{branchInfo?.name}</div>
            <div style={{ color: '#555', marginBottom: 4 }}>الموقع: {branchInfo?.location}</div>
            <div style={{ color: '#555' }}>المحافظة: {branchInfo?.governorate}</div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {/* زر إضافة موظف */}
            <button
              type="button"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px', borderRadius: 99, color: '#fff', fontWeight: 700, fontSize: 17, boxShadow: '0 2px 8px #43a04722', background: '#43a047', border: 'none', cursor: 'pointer', transition: 'transform 0.15s', outline: 'none' }}
              onClick={() => setOpenAdd(true)}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ fontSize: 22 }}>➕</span>
              إضافة موظف
            </button>
            {/* زر تحويل جديد */}
            <Link href="/money-transfer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px', borderRadius: 99, color: '#fff', fontWeight: 700, fontSize: 17, boxShadow: '0 2px 8px #1976d220', background: '#1976d2', border: 'none', textDecoration: 'none', transition: 'transform 0.15s' }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ fontSize: 22 }}>🔄</span>
              تحويل جديد
            </Link>
            {/* زر بحث عن مستخدم */}
            <button
              type="button"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px', borderRadius: 99, color: '#fff', fontWeight: 700, fontSize: 17, boxShadow: '0 2px 8px #ffa72622', background: '#ffa726', border: 'none', cursor: 'pointer', transition: 'transform 0.15s', outline: 'none' }}
              onClick={() => setShowUserSearch(true)}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ fontSize: 22 }}>🔍</span>
              بحث عن مستخدم
            </button>
          </div>
        </div>
        {/* إحصائيات */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, marginBottom: 40 }}>
          {stats.map((stat, idx) => (
            <div key={idx} style={{ borderRadius: 20, boxShadow: '0 2px 12px #1976d210', background: '#f5faff', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 32, marginBottom: 8 }}>{stat.icon}</span>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#1976d2' }}>{stat.value}</span>
              <span style={{ color: '#555', marginTop: 8 }}>{stat.label}</span>
            </div>
          ))}
        </div>
        {/* روابط الصفحات الفرعية */}
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 20, boxShadow: '0 2px 12px #1976d210', padding: 32, marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 18, color: '#1976d2' }}>الصفحات الفرعية</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {links.map((link, idx) => (
              <Link key={idx} href={link.href} style={{ padding: '12px 32px', borderRadius: 99, background: '#e3f2fd', color: '#1976d2', fontWeight: 700, fontSize: 16, boxShadow: '0 2px 8px #1976d210', textDecoration: 'none', transition: 'background 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = '#b2ebf2'}
                onMouseOut={e => e.currentTarget.style.background = '#e3f2fd'}
              >
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
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 20, boxShadow: '0 2px 12px #1976d210', padding: 32, marginTop: 40 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            <button
              style={{ padding: '10px 28px', borderRadius: 99, fontWeight: 700, fontSize: 16, background: activeTab === 'transfers' ? '#1976d2' : '#f5faff', color: activeTab === 'transfers' ? '#fff' : '#1976d2', border: 'none', boxShadow: activeTab === 'transfers' ? '0 2px 8px #1976d220' : 'none', transition: 'all 0.15s', cursor: 'pointer' }}
              onClick={() => setActiveTab('transfers')}
            >
              التحويلات
            </button>
            <button
              style={{ padding: '10px 28px', borderRadius: 99, fontWeight: 700, fontSize: 16, background: activeTab === 'reports' ? '#1976d2' : '#f5faff', color: activeTab === 'reports' ? '#fff' : '#1976d2', border: 'none', boxShadow: activeTab === 'reports' ? '0 2px 8px #1976d220' : 'none', transition: 'all 0.15s', cursor: 'pointer' }}
              onClick={() => setActiveTab('reports')}
            >
              التقارير
            </button>
          </div>

          {activeTab === "transfers" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: '#1976d2' }}>التحويلات الصادرة</h2>
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
                {outgoingTotalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                    <Pagination
                      count={outgoingTotalPages}
                      page={outgoingPage}
                      onChange={(_, value) => setOutgoingPage(value)}
                      color="primary"
                      shape="rounded"
                      size="large"
                      showFirstButton
                      showLastButton
                      sx={{ direction: 'ltr' }}
                    />
                  </div>
                )}
              </div>

              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: '#1976d2' }}>التحويلات الواردة</h2>
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
                {incomingTotalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                    <Pagination
                      count={incomingTotalPages}
                      page={incomingPage}
                      onChange={(_, value) => setIncomingPage(value)}
                      color="primary"
                      shape="rounded"
                      size="large"
                      showFirstButton
                      showLastButton
                      sx={{ direction: 'ltr' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: '#1976d2' }}>التقارير</h2>
              {/* جلب وعرض تقارير حقيقية من الـ API */}
              {/* مثال: عرض إحصائيات التحويلات */}
              {transactionStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, marginBottom: 40 }}>
                  <div style={{ borderRadius: 20, boxShadow: '0 2px 12px #1976d210', background: '#e3f2fd', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#1976d2' }}>{transactionStats.total}</span>
                    <span style={{ color: '#555', marginTop: 8 }}>إجمالي التحويلات</span>
                  </div>
                  <div style={{ borderRadius: 20, boxShadow: '0 2px 12px #43a04722', background: '#e8f5e9', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#388e3c' }}>{transactionStats.completed}</span>
                    <span style={{ color: '#555', marginTop: 8 }}>المكتملة</span>
                  </div>
                  <div style={{ borderRadius: 20, boxShadow: '0 2px 12px #fbc02d22', background: '#fffde7', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#fbc02d' }}>{transactionStats.pending}</span>
                    <span style={{ color: '#555', marginTop: 8 }}>قيد الانتظار</span>
                  </div>
                  <div style={{ borderRadius: 20, boxShadow: '0 2px 12px #e5737322', background: '#ffebee', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#d32f2f' }}>{transactionStats.cancelled}</span>
                    <span style={{ color: '#555', marginTop: 8 }}>الملغاة</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {successMsg && (
          <div style={{ position: 'fixed', bottom: 32, right: 32, background: '#43a047', color: '#fff', padding: '18px 36px', borderRadius: 99, fontWeight: 700, fontSize: 18, boxShadow: '0 2px 12px #43a04744', zIndex: 9999, transition: 'all 0.3s' }}>
            {successMsg}
          </div>
        )}
      </div>
    </div>
  );
} 