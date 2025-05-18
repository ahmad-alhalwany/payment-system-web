import React, { useState, useMemo } from "react";
import TransferDetailsModal from "./TransferDetailsModal";
import PrintTransferView from "./PrintTransferView";
import { Transaction } from "../../api/transactions";

interface OutgoingTransfersTableProps {
  transfers: Transaction[];
  onStatusChange: (id: string, status: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}

const statusOptions = [
  { label: "الكل", value: "all" },
  { label: "قيد الانتظار", value: "pending" },
  { label: "تم الاستلام", value: "completed" },
  { label: "ملغي", value: "cancelled" },
];

function getStatusLabel(status: string) {
  switch (status) {
    case "pending": return "قيد الانتظار";
    case "processing": return "قيد التنفيذ";
    case "completed": return "تم الاستلام";
    case "cancelled": return "ملغي";
    default: return status;
  }
}

function getTimeFromDate(date: string) {
  if (date.includes("T")) return date.split("T")[1]?.slice(0,5) || "";
  return "";
}

export default function OutgoingTransfersTable({ 
  transfers, 
  onStatusChange,
  currentPage,
  totalPages,
  onPageChange,
  loading
}: OutgoingTransfersTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Transaction | null>(null);

  // تصفية وفلترة البيانات
  const filtered = useMemo(() => {
    return transfers.filter(t => {
      const matchesSearch =
        search === "" ||
        t.sender.includes(search) ||
        t.receiver.includes(search) ||
        String(t.id).includes(search);
      const matchesStatus = status === "all" || t.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [search, status, transfers]);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between">
        <input
          className="border rounded-lg px-4 py-2 w-full md:w-64"
          placeholder="بحث بالاسم أو رقم التحويل..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border rounded-lg px-4 py-2 w-full md:w-48"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-center border rounded-lg">
          <thead>
            <tr className="bg-primary-100">
              <th className="px-4 py-2">رقم التحويل</th>
              <th className="px-4 py-2">التاريخ</th>
              <th className="px-4 py-2">الوقت</th>
              <th className="px-4 py-2">المرسل</th>
              <th className="px-4 py-2">المستلم</th>
              <th className="px-4 py-2">اسم الموظف</th>
              <th className="px-4 py-2">الفرع المستلم</th>
              <th className="px-4 py-2">المبلغ</th>
              <th className="px-4 py-2">المبلغ المستفاد</th>
              <th className="px-4 py-2">العملة</th>
              <th className="px-4 py-2">الحالة</th>
              <th className="px-4 py-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-gray-400">لا توجد تحويلات مطابقة</td>
              </tr>
            ) : (
              filtered.map(t => (
                <tr key={t.id} className="border-b">
                  <td className="px-4 py-2">{t.id}</td>
                  <td className="px-4 py-2">{t.date?.split("T")[0] || "-"}</td>
                  <td className="px-4 py-2">{getTimeFromDate(t.date || "") || "--:--"}</td>
                  <td className="px-4 py-2">{t.sender}</td>
                  <td className="px-4 py-2">{t.receiver}</td>
                  <td className="px-4 py-2">{t.employee_name || "-"}</td>
                  <td className="px-4 py-2">{t.destination_branch_name || "-"}</td>
                  <td className="px-4 py-2">{t.amount.toLocaleString()}</td>
                  <td className="px-4 py-2">{t.benefited_amount?.toLocaleString() || "-"}</td>
                  <td className="px-4 py-2">{t.currency}</td>
                  <td className="px-4 py-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      t.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      t.status === "completed" ? "bg-green-100 text-green-700" :
                      t.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                    }`}>
                      {getStatusLabel(t.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2 justify-center">
                    <button
                        className="flex items-center gap-1 bg-primary-500 text-white px-2 py-1 rounded shadow hover:bg-primary-600 transition text-xs font-bold"
                      onClick={() => { setSelected(t); setShowDetails(true); }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0A9 9 0 11 3 12a9 9 0 0118 0z" /></svg>
                      تفاصيل
                    </button>
                    <button
                        className="flex items-center gap-1 bg-blue-500 text-white px-2 py-1 rounded shadow hover:bg-blue-600 transition text-xs font-bold"
                      onClick={() => { setSelected(t); setShowPrint(true); }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18h12v4H6z" /></svg>
                      طباعة
                    </button>
                    <button
                        className="flex items-center gap-1 bg-yellow-500 text-white px-2 py-1 rounded shadow hover:bg-yellow-600 transition text-xs font-bold"
                      onClick={() => { setStatusTarget(t); setShowStatusModal(true); }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      تغيير الحالة
                    </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <TransferDetailsModal open={showDetails} onClose={() => setShowDetails(false)} transfer={selected} />
      {showPrint && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="relative w-full max-w-2xl mx-auto">
            <PrintTransferView transfer={selected} onClose={() => setShowPrint(false)} />
          </div>
        </div>
      )}
      {showStatusModal && statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative animate-fadeIn">
            <button
              className="absolute left-4 top-4 text-gray-500 hover:text-red-500 text-2xl font-bold"
              onClick={() => setShowStatusModal(false)}
              aria-label="إغلاق"
            >
              ×
            </button>
            <h2 className="text-xl font-bold text-primary-800 mb-4 text-center">تغيير حالة الحوالة</h2>
            <select
              className="input w-full mb-4"
              value={statusTarget.status}
              onChange={e => setStatusTarget({ ...statusTarget, status: e.target.value })}
            >
              <option value="pending">قيد الانتظار</option>
              <option value="completed">مكتمل</option>
              <option value="cancelled">ملغي</option>
            </select>
            <div className="flex justify-center gap-4 mt-4">
              <button
                className="bg-gray-400 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-500 transition"
                onClick={() => setShowStatusModal(false)}
                type="button"
              >
                إلغاء
              </button>
              <button
                className="bg-primary-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-primary-700 transition"
                onClick={() => {
                  if (onStatusChange) onStatusChange(statusTarget.id, statusTarget.status);
                  setShowStatusModal(false);
                }}
                type="button"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Pagination */}
      <div className="flex justify-between items-center p-4 border-t">
        <div className="text-sm text-gray-700">
          الصفحة {currentPage} من {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded bg-primary-100 text-primary-700 disabled:opacity-50"
          >
            السابق
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded bg-primary-100 text-primary-700 disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      </div>
    </div>
  );
} 