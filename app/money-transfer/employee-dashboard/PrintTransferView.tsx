import React, { useEffect, useState } from "react";
import { Transaction } from "../../api/transactions";
import { numberToArabicWords } from "../../../lib/utils/arabicAmount";
import Image from "next/image";
import { branchesApi } from '@/app/api/branches';

interface PrintTransferViewProps {
  transfer: Transaction;
  onClose: () => void;
}

export default function PrintTransferView({ transfer, onClose }: PrintTransferViewProps) {
  // تحديد نوع العملية (إرسال أو استلام)
  const isReceived = transfer.status === "completed";
  const operationType = isReceived ? "استلام" : "إرسال";
  // التاريخ والوقت
  const date = transfer.date?.split("T")[0] || "-";
  const time = transfer.date?.split("T")[1]?.slice(0, 8) || "--:--";
  // المبلغ المستفاد
  const benefit = transfer.benefited_amount ? transfer.benefited_amount.toLocaleString() : "-";
  const amount = transfer.amount ? transfer.amount.toLocaleString() : "-";

  // Helper to display branch name
  const displayBranch = (name: string | null | undefined) => !name || name === '-' ? 'الفرع الرئيسي' : name;
  // Helper to display governorate
  const displayGovernorate = (gov: string | null | undefined) => gov && gov !== '-' ? gov : '';

  const [branchInfo, setBranchInfo] = useState<any>(null);

  useEffect(() => {
    async function fetchBranch() {
      if (transfer.destination_branch_id) {
        try {
          const data = await branchesApi.getBranch(Number(transfer.destination_branch_id));
          setBranchInfo(data);
        } catch {}
      }
    }
    fetchBranch();
  }, [transfer.destination_branch_id]);

  // ساعات الدوام الافتراضية (يمكنك تعديلها لاحقاً لكل فرع)
  const defaultWorkingHours =
    'الأوقات: الدوام يومياً ماعدا الجمعة من الساعة 10 صباحاً حتى 4:30 عصراً\nللاستعلام واتس اب حصراً';

  // نص عنوان التسليم
  let deliveryAddress = '';
  if (branchInfo) {
    deliveryAddress =
      `${branchInfo.governorate || ''} - ${branchInfo.name || ''} (رمز الفرع: ${branchInfo.branch_id || branchInfo.id})\n` +
      `رقم الفرع المستلم: ${transfer.destination_branch_id || '-'}\n` +
      `${branchInfo.location ? branchInfo.location + '\n' : ''}` +
      `${branchInfo.phone_number ? 'هاتف: ' + branchInfo.phone_number + '\n' : ''}` +
      defaultWorkingHours;
  }

  return (
    <div
      id="receipt"
      className="relative w-[1400px] max-w-full mx-auto p-0 bg-white border border-gray-400 rounded-2xl print:rounded-none print:border-none print:shadow-none shadow-xl overflow-hidden"
      style={{
        backgroundImage: "url('/payment-system.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: 480,
        maxHeight: 700,
        minWidth: 900,
        paddingBottom: 16,
        boxSizing: 'border-box',
      }}
    >
      {/* رأس الإيصال: شعار الشركة واسمها ورقم الإشعار في الزاويتين */}
      <div className="flex items-center justify-between px-8 pt-2 pb-0.5">
        {/* شعار واسم الشركة */}
        <div className="flex items-center gap-4">
          <Image src="/payment-system.jpg" alt="شعار الشركة" width={56} height={56} className="rounded-full border border-yellow-600 bg-white" />
          <div className="text-2xl font-extrabold text-yellow-700 drop-shadow-sm">مكتب جاسم للحوالات</div>
        </div>
        {/* رقم الإشعار */}
        <div className="text-right flex flex-col items-end max-w-[220px]">
          <span className="font-bold text-xs text-gray-700">رقم الإشعار</span>
          <span className="text-blue-700 font-bold text-sm select-all break-words whitespace-pre-line leading-tight text-left w-full" style={{wordBreak:'break-word'}}>{transfer.id}</span>
        </div>
      </div>
      {/* خط فاصل */}
      <div className="border-b-2 border-gray-300 mx-6" />
      {/* معلومات الصفوف الرئيسية */}
      {/* الصف الأول: المصدر - الوجهة - التاريخ */}
      <div className="grid grid-cols-3 gap-2 px-8 pt-1 pb-0.5 text-center text-base">
        <div className="text-black font-bold text-base">
          <span className="font-bold text-gray-700">المصدر</span><br />
          {displayBranch(transfer.sending_branch_name)}
        </div>
        <div className="text-black font-bold text-base">
          <span className="font-bold text-gray-700">الوجهة</span><br />
          {transfer.destination_branch_id || "-"} - {displayBranch(transfer.destination_branch_name)}
          {transfer.receiver_governorate && (
            <span className="ml-2 text-gray-700">[{displayGovernorate(transfer.receiver_governorate)}]</span>
          )}
        </div>
        <div className="text-black font-bold text-base">
          <span className="font-bold text-gray-700">التاريخ</span><br />
          {date} {time}
        </div>
      </div>
      {/* الصف الثاني: المرسل - المستفيد - الجوال */}
      <div className={`grid gap-2 px-8 pt-0 pb-0.5 text-center text-base ${
        transfer.sender && transfer.receiver_mobile ? 'grid-cols-3' :
        transfer.sender || transfer.receiver_mobile ? 'grid-cols-2' :
        'grid-cols-1'
      }`}>
        {transfer.sender && (
          <div className="text-black font-bold text-base">
            <span className="font-bold text-gray-700">المرسل</span><br />
            {transfer.sender}
          </div>
        )}
        <div className="text-black font-bold text-base">
          <span className="font-bold text-gray-700">المستفيد</span><br />
          {transfer.receiver}
        </div>
        {transfer.receiver_mobile && (
          <div className="text-black font-bold text-base">
            <span className="font-bold text-gray-700">الجوال</span><br />
            {transfer.receiver_mobile}
          </div>
        )}
      </div>
      {/* المبلغ */}
      <div className="px-8 py-0.5 text-center bg-gradient-to-l from-yellow-50 to-white border-y border-yellow-200">
        <div className="text-xl font-extrabold text-green-700">{amount} {transfer.currency === 'USD' ? 'دولار' : transfer.currency}</div>
        <div className="text-base font-bold text-gray-700">{numberToArabicWords(transfer.amount)} {transfer.currency === 'USD' ? 'دولار' : transfer.currency}</div>
      </div>
      {/* عنوان التسليم */}
      <div className="px-8 pt-1 pb-0.5">
        <div className="font-bold text-base text-right text-gray-800 mb-1">عنوان التسليم</div>
        <div className="bg-gray-50 border border-gray-200 rounded p-2 min-h-[40px] text-right text-gray-700 text-sm" style={{whiteSpace:'pre-line'}}>
          {deliveryAddress}
        </div>
      </div>
      {/* ملاحظات هامة */}
      <div className="px-8 pt-0.5 pb-1">
        <div className="font-bold text-base text-right text-gray-800 mb-1">ملاحظات هامة</div>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-right text-gray-800 text-sm leading-relaxed">
          - يتم تسليم الحوالة بيد المستلم حصراً بعد التأكد من الهوية الأصلية ولا تقبل الصورة<br />
          - لا تشارك هذا الإيصال إلا مع المستلم حرصاً على سلامة أموالك
        </div>
      </div>
      {/* زر الإغلاق والطباعة */}
      <div className="flex justify-center gap-4 mt-2 mb-2 print:hidden sticky bottom-0 bg-white/90 z-20 py-2 border-t border-gray-200">
        <button
          className="bg-gray-400 text-white px-5 py-1.5 rounded-lg font-bold hover:bg-gray-500 transition text-sm"
          onClick={onClose}
        >
          إغلاق
        </button>
        <button
          className="bg-yellow-600 text-white px-7 py-1.5 rounded-lg font-bold hover:bg-yellow-700 transition shadow text-sm"
          onClick={() => window.print()}
        >
          طباعة
        </button>
      </div>
      {/* طابع التاريخ */}
      <div className="text-center text-xs text-gray-500 mb-0.5 print:mb-0">
        <p>تم طباعة هذا الإيصال بتاريخ {new Date().toLocaleDateString('ar-SA')}</p>
        <p>وقت الطباعة: {new Date().toLocaleTimeString('ar-SA')}</p>
      </div>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #receipt, #receipt * { visibility: visible !important; }
          #receipt {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 18cm !important;
            min-width: 0 !important;
            max-width: 18cm !important;
            margin: 1.5cm auto !important;
            background: white !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
          }
          .print\:hidden { display: none !important; }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
} 