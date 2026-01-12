import React, { useEffect, useState } from "react";
import { Transaction } from "../../api/transactions";
import { numberToArabicWords } from "../../../lib/utils/arabicAmount";
import Image from "next/image";
import { branchesApi } from '@/app/api/branches';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

  // دالة لإنشاء PDF من HTML ومشاركته
  const generateAndSharePDF = async (service: 'whatsapp' | 'telegram') => {
    try {
      const receiptElement = document.getElementById('receipt');
      if (!receiptElement) {
        alert('لم يتم العثور على عنصر الإيصال');
        return;
      }

      // إخفاء الأزرار قبل التقاط الصورة
      const buttons = receiptElement.querySelectorAll('.print\\:hidden');
      const originalDisplays: string[] = [];
      buttons.forEach((btn: any) => {
        if (btn.style) {
          originalDisplays.push(btn.style.display || '');
          btn.style.display = 'none';
        }
      });

      // الانتظار قليلاً للتأكد من إخفاء الأزرار
      await new Promise(resolve => setTimeout(resolve, 100));

      // تحويل HTML إلى canvas مع إعدادات محسّنة (تقليل scale لتقليل الحجم)
      const canvas = await html2canvas(receiptElement, {
        scale: 1.5, // تقليل من 2 إلى 1.5 لتقليل الحجم
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        width: receiptElement.scrollWidth,
        height: receiptElement.scrollHeight,
        windowWidth: receiptElement.scrollWidth,
        windowHeight: receiptElement.scrollHeight,
      });

      // إظهار الأزرار مرة أخرى
      buttons.forEach((btn: any, index: number) => {
        if (btn.style) {
          btn.style.display = originalDisplays[index] || '';
        }
      });

      // إنشاء PDF من canvas باستخدام JPEG مع ضغط لتقليل الحجم
      const imgData = canvas.toDataURL('image/jpeg', 0.85); // استخدام JPEG بجودة 85% بدلاً من PNG
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // حساب الأبعاد بشكل صحيح
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const mmWidth = (imgWidth * 0.264583); // تحويل من بكسل إلى ملم
      const mmHeight = (imgHeight * 0.264583);
      
      // حساب النسبة المناسبة لتناسب الصفحة
      const widthRatio = pdfWidth / mmWidth;
      const heightRatio = pdfHeight / mmHeight;
      const ratio = Math.min(widthRatio, heightRatio);
      
      const finalWidth = mmWidth * ratio;
      const finalHeight = mmHeight * ratio;
      const xOffset = (pdfWidth - finalWidth) / 2;
      const yOffset = 0;

      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
      const pdfBlob = pdf.output('blob');

      // استخدام Web Share API لمشاركة الملف مباشرة
      const fileName = `receipt-${transfer.id}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      // محاولة استخدام Web Share API (يعمل بشكل جيد على الموبايل)
      if (navigator.share && navigator.canShare) {
        try {
          // التحقق من إمكانية مشاركة الملف
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `إيصال حوالة - ${transfer.id}`,
              text: `إيصال حوالة - مكتب الجاسم للحوالات\nرقم الإشعار: ${transfer.id}`,
            });
            return; // نجحت المشاركة
          }
        } catch (shareError: any) {
          // إذا كان المستخدم ألغى المشاركة، لا نفعل شيء
          if (shareError.name === 'AbortError') {
            return;
          }
          console.log('Web Share API failed:', shareError);
        }
      }

      // Fallback: على سطح المكتب، نحتاج لتحميل الملف أولاً
      // لأن واتساب وتليغرام لا يدعمان مشاركة الملفات مباشرة عبر رابط
      if (service === 'whatsapp') {
        alert('عذراً، مشاركة الملفات مباشرة متاحة فقط على الأجهزة المحمولة.\nسيتم تحميل الملف، يمكنك إرساله يدوياً عبر واتساب.');
      } else {
        alert('عذراً، مشاركة الملفات مباشرة متاحة فقط على الأجهزة المحمولة.\nسيتم تحميل الملف، يمكنك إرساله يدوياً عبر تليغرام.');
      }
      
      // تحميل الملف كبديل
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // تنظيف blob URL بعد التحميل
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert(`حدث خطأ أثناء إنشاء PDF: ${error?.message || 'خطأ غير معروف'}\nيرجى المحاولة مرة أخرى.`);
    }
  };

  return (
    <div
      id="receipt"
      className="relative w-[1400px] max-w-full mx-auto p-0 bg-white border border-gray-400 rounded-2xl print:rounded-none print:border-none print:shadow-none shadow-xl overflow-hidden"
      style={{
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
          <div className="text-2xl font-extrabold text-yellow-700 drop-shadow-sm">مكتب الجاسم للحوالات</div>
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
      <div className={`grid gap-3 px-8 pt-2 pb-2 text-center text-base ${
        transfer.sender && transfer.receiver_mobile ? 'grid-cols-3' :
        transfer.sender || transfer.receiver_mobile ? 'grid-cols-2' :
        'grid-cols-1'
      }`}>
        {transfer.sender && (
          <div className="text-black font-bold text-base py-1">
            <span className="font-bold text-gray-700 block mb-1">المرسل</span>
            <span className="block text-lg">{transfer.sender}</span>
          </div>
        )}
        <div className="text-black font-bold text-base py-1">
          <span className="font-bold text-gray-700 block mb-1">المستفيد</span>
          <span className="block text-lg break-words leading-relaxed">{transfer.receiver}</span>
        </div>
        {transfer.receiver_mobile && (
          <div className="text-black font-bold text-base py-1">
            <span className="font-bold text-gray-700 block mb-1">الجوال</span>
            <span className="block text-lg">{transfer.receiver_mobile}</span>
          </div>
        )}
      </div>
      {/* المبلغ */}
      <div className="px-8 py-3 text-center bg-gradient-to-l from-yellow-50 to-white border-y-2 border-yellow-300 my-2">
        <div className="text-2xl font-extrabold text-green-700 mb-1">{amount} {transfer.currency === 'USD' ? 'دولار' : transfer.currency}</div>
        <div className="text-base font-bold text-gray-700">{numberToArabicWords(transfer.amount)} {transfer.currency === 'USD' ? 'دولار' : transfer.currency}</div>
      </div>
      {/* عنوان التسليم */}
      <div className="px-8 pt-3 pb-2">
        <div className="font-bold text-lg text-right text-gray-800 mb-2">عنوان التسليم</div>
        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-3 min-h-[50px] text-right text-gray-700 text-sm leading-relaxed" style={{whiteSpace:'pre-line'}}>
          {deliveryAddress}
        </div>
      </div>
      {/* ملاحظات هامة */}
      <div className="px-8 pt-2 pb-2">
        <div className="font-bold text-lg text-right text-gray-800 mb-2">ملاحظات هامة</div>
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 text-right text-gray-800 text-sm leading-relaxed">
          - يتم تسليم الحوالة بيد المستلم حصراً بعد التأكد من الهوية الأصلية ولا تقبل الصورة<br />
          - لا تشارك هذا الإيصال إلا مع المستلم حرصاً على سلامة أموالك
        </div>
      </div>
      {/* زر الإغلاق والطباعة/التنزيل */}
      <div className="flex justify-center gap-3 mt-2 mb-2 print:hidden sticky bottom-0 bg-white/90 z-20 py-2 border-t border-gray-200 flex-wrap">
        <button
          className="bg-gray-400 text-white px-5 py-1.5 rounded-lg font-bold hover:bg-gray-500 transition text-sm"
          onClick={onClose}
        >
          إغلاق
        </button>
        <button
          className="bg-green-600 text-white px-5 py-1.5 rounded-lg font-bold hover:bg-green-700 transition text-sm"
          onClick={() => generateAndSharePDF('whatsapp')}
          title="مشاركة PDF عبر واتساب"
        >
          واتساب
        </button>
        <button
          className="bg-sky-600 text-white px-5 py-1.5 rounded-lg font-bold hover:bg-sky-700 transition text-sm"
          onClick={() => generateAndSharePDF('telegram')}
          title="مشاركة PDF عبر تليغرام"
        >
          تليغرام
        </button>
        <button
          className="bg-emerald-600 text-white px-7 py-1.5 rounded-lg font-bold hover:bg-emerald-700 transition shadow text-sm"
          onClick={() => window.print()}
          title="تنزيل/مشاركة الإيصال كـ PDF (اختر حفظ كـ PDF)"
        >
          تنزيل PDF
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