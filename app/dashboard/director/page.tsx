"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import EmployeeFormModal from "@/components/employee/EmployeeFormModal";
import BranchModal from "@/components/branch/BranchModal";
import BranchForm from "@/components/branch/BranchForm";
import BranchBalanceModal from "@/components/branch/BranchBalanceModal";
import axiosInstance from "@/app/api/axios";

interface Activity {
  id: number;
  time: string;
  type: string;
  details: string;
  status: string;
}

interface Branch {
  id: number;
  name: string;
  governorate: string;
  balance_syp: number;
  balance_usd: number;
  balance: {
    SYP: number;
    USD: number;
  };
}

interface DashboardStats {
  branches: number;
  employees: number;
  totalBalanceSYP: number;
  totalBalanceUSD: number;
}

const quickActions = [
  { label: "إضافة موظف", type: "addEmployee", color: "bg-green-500", icon: "➕" },
  { label: "إضافة فرع", type: "addBranch", color: "bg-yellow-500", icon: "🏢" },
  { label: "إضافة رصيد لفرع", type: "addBranchBalance", color: "bg-purple-500", icon: "💳" },
  { label: "تحويل جديد", href: "/money-transfer?role=director", color: "bg-blue-500", icon: "🔄" },
  { label: "التقارير", href: "/dashboard/reports", color: "bg-red-500", icon: "📊" },
];

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute left-4 top-4 text-gray-500 hover:text-red-600 text-2xl">×</button>
        <h2 className="text-xl font-bold mb-4 text-primary-700">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export default function DirectorDashboard() {
  const [modal, setModal] = useState<null | 'addEmployee' | 'addBranch' | 'addBranchBalance'>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(undefined);
  const [stats, setStats] = useState<DashboardStats>({
    branches: 0,
    employees: 0,
    totalBalanceSYP: 0,
    totalBalanceUSD: 0
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [branchesResponse, employeesResponse, financialResponse, activitiesResponse] = await Promise.all([
        axiosInstance.get('/branches/'),
        axiosInstance.get('/users/'),
        axiosInstance.get('/financial/total/'),
        axiosInstance.get('/activity/')
      ]);
      setStats({
        branches: branchesResponse.data.branches ? branchesResponse.data.branches.length : branchesResponse.data.length,
        employees: employeesResponse.data.items ? employeesResponse.data.items.length : employeesResponse.data.length,
        totalBalanceSYP: financialResponse.data.total_balance_syp,
        totalBalanceUSD: financialResponse.data.total_balance_usd
      });
      setBranches(branchesResponse.data.branches || branchesResponse.data);
      setActivities(activitiesResponse.data.activities || activitiesResponse.data);
      setError("");
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError("فشل في تحميل بيانات لوحة التحكم");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEmployeeModal = () => {
    setShowEmployeeModal(true);
    setModal(null);
  };

  const handleCloseEmployeeModal = () => {
    setShowEmployeeModal(false);
  };

  const handleEmployeeSubmit = async (data: any) => {
    try {
      setLoading(true);
      await axiosInstance.post('/users/', data);
      setShowEmployeeModal(false);
      setSuccess("تم إضافة الموظف بنجاح");
      setTimeout(() => setSuccess(""), 3000);
      await fetchDashboardData();
    } catch (error) {
      console.error('Error adding employee:', error);
      setError("فشل في إضافة الموظف");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddBranchModal = () => {
    setShowAddBranchModal(true);
    setModal(null);
  };

  const handleCloseAddBranchModal = () => {
    setShowAddBranchModal(false);
  };

  const handleAddBranchSubmit = async (data: any) => {
    try {
      setLoading(true);
      await axiosInstance.post('/branches/', data);
      setShowAddBranchModal(false);
      setSuccess("تم إضافة الفرع بنجاح");
      setTimeout(() => setSuccess(""), 3000);
      await fetchDashboardData();
    } catch (error) {
      console.error('Error adding branch:', error);
      setError("فشل في إضافة الفرع");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBalanceModal = () => {
    setShowBalanceModal(true);
    setModal(null);
    setSelectedBranchId(undefined);
  };

  const handleCloseBalanceModal = () => {
    setShowBalanceModal(false);
    setSelectedBranchId(undefined);
  };

  const handleBalanceSubmit = async (data: any) => {
    try {
      setLoading(true);
      if (!selectedBranchId) throw new Error("لم يتم اختيار فرع");
      await axiosInstance.post(`/branches/${selectedBranchId}/allocate-funds/`, data);
      setShowBalanceModal(false);
      setSelectedBranchId(undefined);
      setSuccess("تم إضافة الرصيد بنجاح");
      setTimeout(() => setSuccess(""), 3000);
      await fetchDashboardData();
    } catch (error) {
      console.error('Error adding balance:', error);
      setError("فشل في إضافة الرصيد");
    } finally {
      setLoading(false);
    }
  };

  const selectedBranch = branches.find((b: Branch) => b.id === Number(selectedBranchId));

  const statsData = [
    { label: "عدد الفروع", value: stats.branches, color: "bg-primary-100", icon: "🏢" },
    { label: "عدد الموظفين", value: stats.employees, color: "bg-primary-100", icon: "👥" },
    { label: "الرصيد الكلي (ل.س)", value: stats.totalBalanceSYP.toLocaleString(), color: "bg-primary-100", icon: "💵" },
    { label: "الرصيد الكلي ($)", value: stats.totalBalanceUSD.toLocaleString(), color: "bg-primary-100", icon: "💰" },
  ];

  if (loading && !stats.branches) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <div className="flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-white shadow-md p-6 flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-primary-700 mb-8 text-center">لوحة المدير</h2>
          <nav className="flex flex-col gap-4">
            <Link href="/dashboard/director" className="text-primary-700 font-semibold hover:underline">الرئيسية</Link>
            <Link href="/dashboard/branches" className="hover:text-primary-700">إدارة الفروع</Link>
            <Link href="/dashboard/employees" className="hover:text-primary-700">إدارة الموظفين</Link>
            <Link href="/dashboard/transactions" className="hover:text-primary-700">التحويلات</Link>
            <Link href="/dashboard/reports" className="hover:text-primary-700">التقارير</Link>
            <Link href="/dashboard/inventory" className="hover:text-primary-700">المخزون</Link>
            <Link href="/dashboard/settings" className="hover:text-primary-700">الإعدادات</Link>
          </nav>
        </aside>
        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* إحصائيات */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {statsData.map((stat, idx) => (
              <div key={idx} className={`rounded-xl shadow p-6 flex flex-col items-center ${stat.color}`}>
                <span className="text-3xl mb-2">{stat.icon}</span>
                <span className="text-2xl font-bold text-primary-900">{stat.value}</span>
                <span className="text-gray-600 mt-2">{stat.label}</span>
              </div>
            ))}
          </div>
          {/* إجراءات سريعة */}
          <div className="flex flex-wrap gap-4 mb-10 justify-center">
            {quickActions.map((action, idx) => (
              action.href ? (
                <Link key={idx} href={action.href} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold shadow transition hover:scale-105 ${action.color}`}>
                  <span className="text-xl">{action.icon}</span>
                  {action.label}
                </Link>
              ) : (
                <button
                  key={idx}
                  onClick={() => {
                    if (action.type === 'addEmployee') handleOpenEmployeeModal();
                    else if (action.type === 'addBranch') handleOpenAddBranchModal();
                    else if (action.type === 'addBranchBalance') handleOpenBalanceModal();
                    else setModal(action.type as any);
                  }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold shadow transition hover:scale-105 ${action.color} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={loading}
                >
                  <span className="text-xl">{action.icon}</span>
                  {action.label}
                </button>
              )
            ))}
          </div>

          {/* Employee Add Modal */}
          <EmployeeFormModal
            open={showEmployeeModal}
            onClose={handleCloseEmployeeModal}
            onSubmit={handleEmployeeSubmit}
            initialData={undefined}
            branches={Array.from(branches, b => b.name)}
          />

          {/* Branch Add Modal */}
          <BranchModal open={showAddBranchModal} onClose={handleCloseAddBranchModal} title="إضافة فرع جديد">
            <BranchForm onSubmit={handleAddBranchSubmit} onCancel={handleCloseAddBranchModal} />
          </BranchModal>

          {/* Branch Balance Modal with branch select */}
          <BranchModal open={showBalanceModal} onClose={handleCloseBalanceModal} title="إضافة رصيد لفرع">
            {!selectedBranchId ? (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">اختر الفرع</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={selectedBranchId || ""}
                  onChange={e => setSelectedBranchId(e.target.value)}
                  disabled={loading}
                >
                  <option value="" disabled>اختر الفرع</option>
                  {branches.map((branch: Branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
            ) : selectedBranch && (
              <BranchBalanceModal
                open={true}
                onClose={handleCloseBalanceModal}
                branch={selectedBranch}
                onSubmit={handleBalanceSubmit}
                onDelete={handleCloseBalanceModal}
              />
            )}
          </BranchModal>

          {/* النشاطات الحديثة */}
          <div className="bg-white rounded-xl shadow p-6 mt-8">
            <h3 className="text-xl font-bold mb-4 text-primary-800">النشاطات الحديثة</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-right">
                <thead>
                  <tr className="bg-primary-100">
                    <th className="py-2 px-4">الوقت</th>
                    <th className="py-2 px-4">النوع</th>
                    <th className="py-2 px-4">التفاصيل</th>
                    <th className="py-2 px-4">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-500">جاري تحميل النشاطات...</td>
                    </tr>
                  ) : activities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-500">لا توجد نشاطات حديثة</td>
                    </tr>
                  ) : (
                    activities.map((activity: Activity) => (
                      <tr key={activity.id} className="border-b">
                        <td className="py-2 px-4">{activity.time}</td>
                        <td className="py-2 px-4">{activity.type}</td>
                        <td className="py-2 px-4">{activity.details}</td>
                        <td className="py-2 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs ${
                            activity.status === "مكتمل" || activity.status === "ناجح" 
                              ? "bg-green-100 text-green-700" 
                              : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {activity.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* قسم تحويل جديد */}
          <div className="bg-white rounded-xl shadow p-6 mt-8 flex flex-col items-center">
            <h3 className="text-xl font-bold mb-4 text-primary-800">تحويل جديد</h3>
            <Link href="/money-transfer?role=director">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg shadow transition">
                تحويل جديد
              </button>
            </Link>
          </div>
        </main>
      </div>
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}
    </div>
  );
} 