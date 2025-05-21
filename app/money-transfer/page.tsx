"use client";
import React, { useState, useEffect } from "react";
import NewTransferForm from "../money-transfer/employee-dashboard/NewTransferForm";
import OutgoingTransfersTable from "../money-transfer/employee-dashboard/OutgoingTransfersTable";
import IncomingTransfersTable from "../money-transfer/employee-dashboard/IncomingTransfersTable";
import UserSearchModal from "@/components/ui/UserSearchModal";
import { useTransactions } from '../hooks/useTransactions';
import { useBranches } from '../hooks/useBranches';
import { useAuth } from '../hooks/useAuth';
import axiosInstance from "../api/axios";
import PrintTransferView from "./employee-dashboard/PrintTransferView";
import { Transaction } from "../api/transactions";

const tabs = [
  { label: "الرئيسية", key: "dashboard" },
  { label: "تحويل جديد", key: "new" },
  { label: "التحويلات الصادرة", key: "outgoing" },
  { label: "التحويلات الواردة", key: "incoming" },
];

const TAX_RATE = 0.1;

export default function MoneyTransferPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [outgoingPage, setOutgoingPage] = useState(1);
  const [incomingPage, setIncomingPage] = useState(1);
  const [perPage] = useState(10);
  const [outgoingStats, setOutgoingStats] = useState(0);
  const [incomingStats, setIncomingStats] = useState(0);
  
  const { 
    loading: transactionsLoading,
    error: transactionsError,
    transactions,
    getTransactions,
    createTransaction,
    getTransaction,
    updateStatus,
    totalPages,
    totalItems
  } = useTransactions();

  const {
    loading: branchesLoading,
    error: branchesError,
    branches,
    getBranches,
    currentBranch,
    getBranch
  } = useBranches();

  const { user } = useAuth();

  // حالات التصفية
  const [searchId, setSearchId] = useState("");
  const [searchSender, setSearchSender] = useState("");
  const [searchReceiver, setSearchReceiver] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");

  const [printData, setPrintData] = useState<Transaction | null>(null);
  const [showPrint, setShowPrint] = useState(false);

  // دوال جلب التحويلات مع التصفية
  const fetchFilteredTransactions = (type: string, page = 1) => {
    const params: any = {
      page,
      per_page: perPage,
    };
    if (searchId) params.id = searchId;
    if (searchSender) params.sender = searchSender;
    if (searchReceiver) params.receiver = searchReceiver;
    if (searchStatus && searchStatus !== "all") params.status = searchStatus;
    if (searchStartDate) params.start_date = searchStartDate;
    if (searchEndDate) params.end_date = searchEndDate;
    if (user?.role !== "director" && currentBranch?.id) {
      if (type === "outgoing") params.branch_id = currentBranch.id;
      if (type === "incoming") params.destination_branch_id = currentBranch.id;
    }
    getTransactions(params);
  };

  // جلب التحويلات الصادرة مع التصفية
  useEffect(() => {
    if (activeTab === "outgoing") {
      fetchFilteredTransactions("outgoing", outgoingPage);
    }
    // eslint-disable-next-line
  }, [outgoingPage, searchId, searchSender, searchReceiver, searchStatus, searchStartDate, searchEndDate, currentBranch?.id, user?.role]);

  // جلب التحويلات الواردة مع التصفية
  useEffect(() => {
    if (activeTab === "incoming") {
      fetchFilteredTransactions("incoming", incomingPage);
    }
    // eslint-disable-next-line
  }, [incomingPage, searchId, searchSender, searchReceiver, searchStatus, searchStartDate, searchEndDate, currentBranch?.id, user?.role]);

  // Fetch initial data
  useEffect(() => {
    if (currentBranch?.id) {
      getTransactions({ 
        page: 1, 
        per_page: perPage,
        branch_id: currentBranch.id,
        destination_branch_id: currentBranch.id
      });
    }
    getBranches();
  }, [getTransactions, getBranches, currentBranch?.id, perPage]);

  // جلب بيانات الفرع الحالي تلقائيًا عند توفر user.branch_id
  useEffect(() => {
    if (user?.branch_id) {
      getBranch(user.branch_id);
    }
  }, [user?.branch_id, getBranch]);

  // Fetch stats for dashboard
  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.role === "director") {
          const outgoingRes = await axiosInstance.get('/transactions/', { params: { page: 1, per_page: 1 } });
          setOutgoingStats(outgoingRes.data.total || 0);
          const incomingRes = await axiosInstance.get('/transactions/', { params: { page: 1, per_page: 1 } });
          setIncomingStats(incomingRes.data.total || 0);
        } else if (currentBranch?.id) {
          const outgoingRes = await axiosInstance.get('/transactions/', { params: { branch_id: currentBranch.id, page: 1, per_page: 1 } });
          setOutgoingStats(outgoingRes.data.total || 0);
          const incomingRes = await axiosInstance.get('/transactions/', { params: { destination_branch_id: currentBranch.id, page: 1, per_page: 1 } });
          setIncomingStats(incomingRes.data.total || 0);
        }
      } catch (err) {
        setOutgoingStats(0);
        setIncomingStats(0);
      }
    };
    fetchStats();
  }, [currentBranch, user?.role]);

  // Calculate stats from real data
  const stats = [
    { 
      label: "عدد التحويلات الصادرة", 
      value: outgoingStats, 
      color: "bg-blue-100", 
      icon: "🔼" 
    },
    { 
      label: "عدد التحويلات الواردة", 
      value: incomingStats, 
      color: "bg-green-100", 
      icon: "🔽" 
    },
    { 
      label: "اسم الموظف", 
      value: user?.username || 'غير معروف', 
      color: "bg-primary-100", 
      icon: "👤" 
    },
    { 
      label: "الفرع التابع له", 
      value: currentBranch?.name || 'غير معروف', 
      color: "bg-primary-100", 
      icon: "🏢" 
    },
  ];

  // إضافة حوالة جديدة
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
      const newTransaction = await createTransaction({
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
        tax_rate: TAX_RATE,
        tax_amount: transfer.amount * TAX_RATE,
        currency: transfer.currency,
        message: transfer.message || '',
        employee_name: user?.username || '',
        branch_governorate: currentBranch?.governorate || '',
        destination_branch_id: parseInt(transfer.branch),
        branch_id: user?.role === "director" ? 0 : currentBranch?.id,
        date: new Date().toISOString(),
        status: 'pending',
        is_received: false
      });
      setSuccessMsg("تمت إضافة الحوالة بنجاح!");
      if (transfer.resetForm) transfer.resetForm();
      setActiveTab("outgoing");
      setOutgoingPage(1);
      // جلب بيانات التحويل الكاملة للطباعة
      if (newTransaction?.transaction_id) {
        const fullTransfer = await getTransaction(newTransaction.transaction_id);
        // Type guard for possible wrapped response
        const transactionData = (fullTransfer && typeof fullTransfer === 'object' && 'transaction' in fullTransfer)
          ? fullTransfer.transaction
          : fullTransfer;
        setPrintData(transactionData as Transaction);
        setShowPrint(true);
      }
      // جلب التحويلات الصادرة مباشرة بعد الإرسال
      if (user?.role === "director") {
        getTransactions({ page: 1, per_page: perPage });
      } else if (currentBranch?.id) {
        getTransactions({ page: 1, per_page: perPage, branch_id: currentBranch.id });
      }
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      setSuccessMsg("حدث خطأ أثناء إضافة الحوالة");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  // تغيير حالة حوالة
  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateStatus({ transaction_id: id, status });
      // تحديث التحويلات بعد تغيير الحالة
      if (activeTab === "outgoing") {
        setOutgoingPage(1);
        if (user?.role === "director") {
          getTransactions({ page: 1, per_page: perPage });
        } else if (currentBranch?.id) {
          getTransactions({ page: 1, per_page: perPage, branch_id: currentBranch.id });
        }
      } else if (activeTab === "incoming") {
        setIncomingPage(1);
        if (user?.role === "director") {
          getTransactions({ page: 1, per_page: perPage });
        } else if (currentBranch?.id) {
          getTransactions({ page: 1, per_page: perPage, destination_branch_id: currentBranch.id });
        }
      }
    } catch (error) {
      setSuccessMsg("حدث خطأ أثناء تحديث حالة الحوالة");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-primary-50 via-blue-50 to-white">
      <div className="container mx-auto p-4 md:p-10">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-10 text-primary-800 text-center drop-shadow-sm tracking-wide">نظام تحويل الأموال</h1>
        {transactionsError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-2xl relative mb-6 text-lg font-bold text-center shadow-sm" role="alert">
            <strong className="font-extrabold">خطأ!</strong>
            <span className="block sm:inline"> {transactionsError}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-2xl relative mb-6 text-lg font-bold text-center shadow-sm" role="alert">
            <span className="block sm:inline">{successMsg}</span>
          </div>
        )}
        {/* التبويبات */}
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`px-7 py-2 md:px-10 md:py-3 rounded-t-2xl font-bold text-lg transition border-b-4 focus:outline-none shadow-sm
                ${activeTab === tab.key
                  ? "bg-white border-primary-500 text-primary-800 shadow-lg scale-105 z-10"
                  : "bg-primary-100 border-transparent text-primary-500 hover:bg-primary-200 hover:scale-105"}
              `}
              onClick={() => setActiveTab(tab.key)}
              style={{ minWidth: 120 }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* محتوى التبويب */}
        <div className="bg-white/90 rounded-3xl shadow-2xl p-4 md:p-10 border border-primary-100 backdrop-blur-md min-h-[350px] md:min-h-[420px]" style={{ boxShadow: '0 8px 32px #1976d220' }}>
        {activeTab === "dashboard" && (
          <>
            {/* إحصائيات */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-10">
              {stats.map((stat, idx) => (
                <div key={idx} className={`rounded-2xl shadow-lg p-7 flex flex-col items-center ${stat.color} border border-primary-100 hover:scale-105 transition-all duration-200`}>
                  <span className="text-4xl mb-2">{stat.icon}</span>
                  <span className="text-3xl font-extrabold text-primary-900">{stat.value}</span>
                  <span className="text-gray-600 mt-2 text-lg font-bold">{stat.label}</span>
                </div>
              ))}
            </div>
            {/* إجراءات */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                className="bg-primary-500 text-white p-7 rounded-2xl shadow-lg hover:bg-primary-600 transition flex items-center justify-center gap-4 text-xl font-bold"
                onClick={() => setActiveTab("new")}
              >
                <span className="text-3xl">➕</span>
                <span>إضافة تحويل جديد</span>
              </button>
              <button
                className="bg-blue-500 text-white p-7 rounded-2xl shadow-lg hover:bg-blue-600 transition flex items-center justify-center gap-4 text-xl font-bold"
                onClick={() => setActiveTab("outgoing")}
              >
                <span className="text-3xl">📤</span>
                <span>عرض التحويلات الصادرة</span>
              </button>
              <button
                className="bg-green-500 text-white p-7 rounded-2xl shadow-lg hover:bg-green-600 transition flex items-center justify-center gap-4 text-xl font-bold"
                onClick={() => setActiveTab("incoming")}
              >
                <span className="text-3xl">📥</span>
                <span>عرض التحويلات الواردة</span>
              </button>
              <button
                className="bg-purple-500 text-white p-7 rounded-2xl shadow-lg hover:bg-purple-600 transition flex items-center justify-center gap-4 text-xl font-bold"
                onClick={() => setShowSearchModal(true)}
              >
                <span className="text-3xl">🔍</span>
                <span>بحث عن تحويل</span>
              </button>
            </div>
          </>
        )}
        {activeTab === "new" && (
          <NewTransferForm 
            onSubmit={handleAddTransfer} 
            branches={branches.filter(b => b.id !== currentBranch?.id)}
            currentBranch={currentBranch}
          />
        )}
        {activeTab === "outgoing" && (
          <>
            <div className="flex flex-wrap gap-4 mb-6 items-end bg-primary-50/60 p-4 rounded-2xl border border-primary-100 shadow-sm">
              <div>
                <label className="block text-sm mb-1 font-bold text-primary-700">رقم الحوالة</label>
                <input type="text" className="input-modern" value={searchId} onChange={e => setSearchId(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1 font-bold text-primary-700">اسم المرسل</label>
                <input type="text" className="input-modern" value={searchSender} onChange={e => setSearchSender(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1 font-bold text-primary-700">اسم المستلم</label>
                <input type="text" className="input-modern" value={searchReceiver} onChange={e => setSearchReceiver(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1 font-bold text-primary-700">الحالة</label>
                <select className="input-modern" value={searchStatus} onChange={e => setSearchStatus(e.target.value)}>
                  <option value="all">الكل</option>
                  <option value="pending">قيد الانتظار</option>
                  <option value="processing">قيد المعالجة</option>
                  <option value="completed">مكتمل</option>
                  <option value="cancelled">ملغي</option>
                  <option value="rejected">مرفوض</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 font-bold text-primary-700">من تاريخ</label>
                <input type="date" className="input-modern" value={searchStartDate} onChange={e => setSearchStartDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1 font-bold text-primary-700">إلى تاريخ</label>
                <input type="date" className="input-modern" value={searchEndDate} onChange={e => setSearchEndDate(e.target.value)} />
              </div>
              <button className="bg-gray-200 px-6 py-2 rounded-xl font-bold text-primary-700 hover:bg-gray-300 transition shadow" onClick={() => {
                setSearchId(""); setSearchSender(""); setSearchReceiver(""); setSearchStatus(""); setSearchStartDate(""); setSearchEndDate("");
              }}>مسح التصفية</button>
            </div>
            <div className="flex justify-end mb-4">
              <button
                className="bg-blue-500 text-white px-8 py-2 rounded-xl shadow-md hover:bg-blue-600 transition font-bold text-lg"
                onClick={() => fetchFilteredTransactions("outgoing", outgoingPage)}
                disabled={transactionsLoading}
              >
                {transactionsLoading ? "جاري التحديث..." : "تحديث"}
              </button>
            </div>
            <OutgoingTransfersTable 
              transfers={user?.role === "director" ? transactions : transactions.filter(t => t.branch_id === currentBranch?.id)} 
              onStatusChange={handleStatusChange}
              currentPage={outgoingPage}
              totalPages={totalPages}
              onPageChange={setOutgoingPage}
              loading={transactionsLoading}
            />
          </>
        )}
        {activeTab === "incoming" && (
          <>
            <div className="flex flex-wrap gap-4 mb-6 items-end bg-primary-50/60 p-4 rounded-2xl border border-primary-100 shadow-sm">
              <div>
                <label className="block text-sm mb-1 font-bold text-primary-700">رقم الحوالة</label>
                <input type="text" className="input-modern" value={searchId} onChange={e => setSearchId(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1 font-bold text-primary-700">اسم المرسل</label>
                <input type="text" className="input-modern" value={searchSender} onChange={e => setSearchSender(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1 font-bold text-primary-700">اسم المستلم</label>
                <input type="text" className="input-modern" value={searchReceiver} onChange={e => setSearchReceiver(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1 font-bold text-primary-700">الحالة</label>
                <select className="input-modern" value={searchStatus} onChange={e => setSearchStatus(e.target.value)}>
                  <option value="all">الكل</option>
                  <option value="pending">قيد الانتظار</option>
                  <option value="processing">قيد المعالجة</option>
                  <option value="completed">مكتمل</option>
                  <option value="cancelled">ملغي</option>
                  <option value="rejected">مرفوض</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 font-bold text-primary-700">من تاريخ</label>
                <input type="date" className="input-modern" value={searchStartDate} onChange={e => setSearchStartDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1 font-bold text-primary-700">إلى تاريخ</label>
                <input type="date" className="input-modern" value={searchEndDate} onChange={e => setSearchEndDate(e.target.value)} />
              </div>
              <button className="bg-gray-200 px-6 py-2 rounded-xl font-bold text-primary-700 hover:bg-gray-300 transition shadow" onClick={() => {
                setSearchId(""); setSearchSender(""); setSearchReceiver(""); setSearchStatus(""); setSearchStartDate(""); setSearchEndDate("");
              }}>مسح التصفية</button>
            </div>
            <div className="flex justify-end mb-4">
              <button
                className="bg-green-500 text-white px-8 py-2 rounded-xl shadow-md hover:bg-green-600 transition font-bold text-lg"
                onClick={() => fetchFilteredTransactions("incoming", incomingPage)}
                disabled={transactionsLoading}
              >
                {transactionsLoading ? "جاري التحديث..." : "تحديث"}
              </button>
            </div>
            <IncomingTransfersTable 
              transfers={user?.role === "director" ? transactions : transactions.filter(t => t.destination_branch_id === currentBranch?.id)} 
              onStatusChange={handleStatusChange}
              currentPage={incomingPage}
              totalPages={totalPages}
              onPageChange={setIncomingPage}
              loading={transactionsLoading}
            />
          </>
        )}
        {showSearchModal && (
          <UserSearchModal
            open={showSearchModal}
            onClose={() => setShowSearchModal(false)}
            onSelect={(user) => {
              console.log('Selected user:', user);
              setShowSearchModal(false);
            }}
          />
        )}
        {showPrint && printData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="relative w-full max-w-2xl mx-auto">
              <PrintTransferView transfer={printData} onClose={() => setShowPrint(false)} />
            </div>
          </div>
        )}
        <style jsx>{`
          .input-modern {
            border: 1.5px solid #e3f2fd;
            border-radius: 1rem;
            padding: 0.75rem 1.25rem;
            width: 100%;
            background: #f8fbff;
            font-size: 1.1rem;
            font-weight: 500;
            color: #222;
            transition: box-shadow 0.2s, border 0.2s;
            outline: none;
          }
          .input-modern:focus {
            border-color: #1976d2;
            box-shadow: 0 0 0 2px #1976d233;
            background: #fff;
          }
        `}</style>
        </div>
      </div>
    </div>
  );
} 