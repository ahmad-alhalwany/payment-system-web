"use client";
import React, { useState, useEffect } from "react";
import axiosInstance from "@/app/api/axios";
import { branchesApi } from "@/app/api/branches";
import Modal from "@/components/Modal";

interface Branch {
  id: number;
  name: string;
  governorate: string;
}

interface Governorate {
  id: number;
  name: string;
}

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}

const TAX_RATE = 0.1; // نسبة الضريبة 10%

interface NewTransferFormProps {
  onSubmit: (transfer: {
    sender: any;
    receiver: any;
    amount: number;
    benefitAmount?: number;
    currency: string;
    branch: string;
    message?: string;
    resetForm?: () => void;
  }) => void;
  branches: Branch[];
  currentBranch: Branch | null;
}

// أضف القوائم الثابتة للمحافظات والعملات
const GOVERNORATES = [
  "دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس",
  "إدلب", "دير الزور", "الرقة", "الحسكة", "السويداء", "درعا", "القنيطرة"
];
const CURRENCIES = [
  { code: "SYP", name: "ليرة سورية" },
  { code: "USD", name: "دولار أمريكي" }
];

export default function NewTransferForm({ onSubmit, branches, currentBranch }: NewTransferFormProps) {
  // حالة الحقول
  const [sender, setSender] = useState({
    name: "",
    mobile: "",
    governorate: "",
    address: "",
    location: "",
  });
  const [receiver, setReceiver] = useState({
    name: "",
    mobile: "",
    governorate: "",
  });
  const [amount, setAmount] = useState("");
  const [benefitAmount, setBenefitAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [branch, setBranch] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // عند تهيئة النموذج، عيّن القيم الافتراضية:
  useEffect(() => {
    setCurrency(CURRENCIES[0].code);
    setSender(prev => ({ ...prev, governorate: GOVERNORATES[0] }));
    setReceiver(prev => ({ ...prev, governorate: GOVERNORATES[0] }));
  }, []);

  // جلب رصيد الفرع عند تغيير العملة أو عند تحميل النموذج
  useEffect(() => {
    async function fetchBalance() {
      if (!currentBranch?.id) return;
      setBalanceLoading(true);
      try {
        const branch = await branchesApi.getBranch(currentBranch.id);
        if (currency === "USD") {
          setAvailableBalance(branch.allocated_amount_usd ?? null);
        } else {
          setAvailableBalance(branch.allocated_amount_syp ?? null);
        }
      } catch (e) {
        setAvailableBalance(null);
      } finally {
        setBalanceLoading(false);
      }
    }
    fetchBalance();
  }, [currentBranch?.id, currency]);

  // حساب الضريبة والربح
  const benefit = parseFloat(benefitAmount) || 0;
  const tax = benefit > 0 ? benefit * TAX_RATE : 0;
  const branchProfit = benefit > 0 ? benefit - tax : 0;

  // تحقق مبدئي من صحة البيانات مع الرصيد
  const validate = () => {
    const errs = [];
    if (!sender.name) errs.push("اسم المرسل مطلوب");
    if (sender.mobile && !/^\d{9,10}$/.test(sender.mobile)) errs.push("رقم هاتف المرسل يجب أن يكون 9-10 أرقام");
    if (!receiver.name) errs.push("اسم المستلم مطلوب");
    if (receiver.mobile && !/^\d{9,10}$/.test(receiver.mobile)) errs.push("رقم هاتف المستلم يجب أن يكون 9-10 أرقام");
    if (!amount || isNaN(Number(amount))) errs.push("المبلغ غير صالح");
    if (!currency) errs.push("العملة مطلوبة");
    if (!branch) errs.push("يجب اختيار الفرع المستلم");
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccess("");
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      setShowErrorModal(true);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setLoading(true);
    onSubmit({
      sender,
      receiver,
      amount: Number(amount),
      benefitAmount: benefitAmount ? Number(benefitAmount) : undefined,
      currency,
      branch,
      message,
      resetForm: () => {
        setSender({
          name: "",
          mobile: "",
          governorate: GOVERNORATES[0],
          address: "",
          location: "",
        });
        setReceiver({
          name: "",
          mobile: "",
          governorate: GOVERNORATES[0],
        });
        setAmount("");
        setBenefitAmount("");
        setCurrency(CURRENCIES[0].code);
        setBranch("");
        setMessage("");
      }
    });
    setLoading(false);
    setShowConfirm(false);
  };

  // ملخص التحويل
  const summary = (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primary-700 mb-2 text-center">تأكيد بيانات التحويل</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="font-semibold mb-1">اسم المرسل:</div>
          <div className="bg-gray-50 rounded p-2 border">{sender.name}</div>
        </div>
        {sender.mobile && (
          <div>
            <div className="font-semibold mb-1">رقم هاتف المرسل:</div>
            <div className="bg-gray-50 rounded p-2 border">{sender.mobile}</div>
          </div>
        )}
        <div>
          <div className="font-semibold mb-1">محافظة المرسل:</div>
          <div className="bg-gray-50 rounded p-2 border">{sender.governorate}</div>
        </div>
        <div>
          <div className="font-semibold mb-1">اسم المستلم:</div>
          <div className="bg-gray-50 rounded p-2 border">{receiver.name}</div>
        </div>
        {receiver.mobile && (
          <div>
            <div className="font-semibold mb-1">رقم هاتف المستلم:</div>
            <div className="bg-gray-50 rounded p-2 border">{receiver.mobile}</div>
          </div>
        )}
        <div>
          <div className="font-semibold mb-1">محافظة المستلم:</div>
          <div className="bg-gray-50 rounded p-2 border">{receiver.governorate}</div>
        </div>
        <div>
          <div className="font-semibold mb-1">المبلغ:</div>
          <div className="bg-gray-50 rounded p-2 border">{amount} {currency}</div>
          {balanceLoading ? (
            <div className="text-xs text-gray-500">جاري جلب الرصيد...</div>
          ) : availableBalance !== null && (
            <div className="text-xs text-gray-600">الرصيد المتاح: {availableBalance.toLocaleString()} {currency}</div>
          )}
        </div>
        <div>
          <div className="font-semibold mb-1">المبلغ المستفاد:</div>
          <div className="bg-gray-50 rounded p-2 border">{benefitAmount || <span className="text-gray-400">غير محدد</span>}</div>
        </div>
        <div>
          <div className="font-semibold mb-1">الضريبة ({TAX_RATE * 100}%):</div>
          <div className="bg-yellow-50 rounded p-2 border font-bold text-yellow-700">{benefitAmount ? tax.toLocaleString(undefined, {maximumFractionDigits:2}) : <span className='text-gray-400'>غير محسوبة</span>}</div>
        </div>
        <div>
          <div className="font-semibold mb-1">ربح الفرع:</div>
          <div className="bg-green-50 rounded p-2 border font-bold text-green-700">{benefitAmount ? branchProfit.toLocaleString(undefined, {maximumFractionDigits:2}) : <span className='text-gray-400'>غير محسوب</span>}</div>
        </div>
        <div>
          <div className="font-semibold mb-1">الفرع المستلم:</div>
          <div className="bg-gray-50 rounded p-2 border">{branch}</div>
        </div>
        <div>
          <div className="font-semibold mb-1">رسالة:</div>
          <div className="bg-gray-50 rounded p-2 border">{message || <span className="text-gray-400">لا يوجد</span>}</div>
        </div>
      </div>
      <div className="flex justify-center gap-4 mt-6">
        <button
          className="bg-gray-400 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-500 transition"
          onClick={() => setShowConfirm(false)}
          type="button"
          disabled={loading}
        >
          إلغاء
        </button>
        <button
          className="bg-primary-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-primary-700 transition"
          onClick={handleConfirm}
          type="button"
          disabled={loading}
        >
          {loading ? "جاري الإرسال..." : "تأكيد الإرسال"}
        </button>
      </div>
    </div>
  );

  return (
    <form
      className="max-w-full w-full mx-auto space-y-6 bg-white/90 rounded-2xl shadow-2xl p-4 md:p-8 border border-primary-100 backdrop-blur-md"
      style={{ boxShadow: '0 8px 32px #1976d220' }}
      onSubmit={handleSubmit}
    >
      <Modal open={showErrorModal} onClose={() => setShowErrorModal(false)}>
        <div className="text-red-700 text-lg font-bold mb-2 text-center">حدث خطأ</div>
        <ul className="list-disc pr-5 text-right text-base">
          {errors.map((err, i) => <li key={i}>{err}</li>)}
        </ul>
        <button
          className="mt-4 bg-primary-500 text-white px-8 py-2 rounded-xl font-bold hover:bg-primary-600 transition text-lg w-full shadow-md"
          onClick={() => setShowErrorModal(false)}
        >
          إغلاق
        </button>
      </Modal>
      {showConfirm ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-extrabold text-primary-700 mb-2 text-center tracking-wide drop-shadow-sm">تأكيد بيانات التحويل</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="font-semibold mb-1 text-primary-700">اسم المرسل:</div>
              <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{sender.name}</div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-primary-700">رقم هاتف المرسل:</div>
              <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{sender.mobile}</div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-primary-700">محافظة المرسل:</div>
              <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{sender.governorate}</div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-primary-700">اسم المستلم:</div>
              <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{receiver.name}</div>
            </div>
            {receiver.mobile && (
              <div>
                <div className="font-semibold mb-1 text-primary-700">رقم هاتف المستلم:</div>
                <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{receiver.mobile}</div>
              </div>
            )}
            <div>
              <div className="font-semibold mb-1 text-primary-700">محافظة المستلم:</div>
              <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{receiver.governorate}</div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-primary-700">المبلغ:</div>
              <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{amount} {currency}</div>
              {balanceLoading ? (
                <div className="text-xs text-gray-500 mt-1">جاري جلب الرصيد...</div>
              ) : availableBalance !== null && (
                <div className="text-xs text-gray-600 mt-1">الرصيد المتاح: {availableBalance.toLocaleString()} {currency}</div>
              )}
            </div>
            <div>
              <div className="font-semibold mb-1 text-primary-700">المبلغ المستفاد:</div>
              <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{benefitAmount || <span className="text-gray-400">غير محدد</span>}</div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-primary-700">الضريبة ({TAX_RATE * 100}%):</div>
              <div className="bg-yellow-50 rounded-xl p-3 border font-bold text-yellow-700 border-yellow-200 shadow-sm">{benefitAmount ? tax.toLocaleString(undefined, {maximumFractionDigits:2}) : <span className='text-gray-400'>غير محسوبة</span>}</div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-primary-700">ربح الفرع:</div>
              <div className="bg-green-50 rounded-xl p-3 border font-bold text-green-700 border-green-200 shadow-sm">{benefitAmount ? branchProfit.toLocaleString(undefined, {maximumFractionDigits:2}) : <span className='text-gray-400'>غير محسوب</span>}</div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-primary-700">الفرع المستلم:</div>
              <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{branch}</div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-primary-700">رسالة:</div>
              <div className="bg-gray-50 rounded-xl p-3 border border-primary-100 shadow-sm text-lg font-bold">{message || <span className="text-gray-400">لا يوجد</span>}</div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-center gap-4 mt-8">
            <button
              className="bg-gray-400 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-500 transition text-lg shadow-md w-full md:w-auto"
              onClick={() => setShowConfirm(false)}
              type="button"
              disabled={loading}
            >
              إلغاء
            </button>
            <button
              className="bg-primary-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-primary-700 transition text-lg shadow-md w-full md:w-auto"
              onClick={handleConfirm}
              type="button"
              disabled={loading}
            >
              {loading ? "جاري الإرسال..." : "تأكيد الإرسال"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-extrabold text-primary-700 mb-4 text-center tracking-wide drop-shadow-sm">بيانات المرسل</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-primary-700">اسم المرسل <span className="text-red-500">*</span></label>
              <input className="input-modern h-14 text-lg" placeholder="اسم المرسل" value={sender.name} onChange={e => setSender({ ...sender, name: e.target.value })} required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-primary-700">رقم الهاتف</label>
              <input className="input-modern h-14 text-lg" placeholder="رقم الهاتف (اختياري - 9-10 أرقام)" value={sender.mobile} onChange={e => setSender({ ...sender, mobile: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-primary-700">المحافظة <span className="text-red-500">*</span></label>
              <select className="input-modern h-14 text-lg" value={sender.governorate} onChange={e => setSender({ ...sender, governorate: e.target.value })} required>
                {GOVERNORATES.map((g, index) => <option key={index} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-primary-700 mb-4 text-center tracking-wide drop-shadow-sm">بيانات المستلم</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-primary-700">اسم المستلم <span className="text-red-500">*</span></label>
              <input className="input-modern h-14 text-lg" placeholder="اسم المستلم" value={receiver.name} onChange={e => setReceiver({ ...receiver, name: e.target.value })} required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-primary-700">رقم الهاتف <span className="text-red-500">*</span></label>
              <input className="input-modern h-14 text-lg" placeholder="رقم الهاتف (اختياري - 9-10 أرقام)" value={receiver.mobile} onChange={e => setReceiver({ ...receiver, mobile: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-primary-700">المحافظة <span className="text-red-500">*</span></label>
              <select className="input-modern h-14 text-lg" value={receiver.governorate} onChange={e => {
                setReceiver({ ...receiver, governorate: e.target.value });
                setBranch("");
              }} required>
                {GOVERNORATES.map((g, index) => <option key={index} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-primary-700 mb-4 text-center tracking-wide drop-shadow-sm">تفاصيل التحويل</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-primary-700">المبلغ <span className="text-red-500">*</span></label>
              <input className="input-modern h-14 text-lg" placeholder="المبلغ" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-primary-700">المبلغ المستفاد <span className="text-gray-400">(اختياري، يطبق عليه الضريبة)</span></label>
              <input className="input-modern h-14 text-lg" placeholder="المبلغ المستفاد (يطبق عليه الضريبة)" value={benefitAmount} onChange={e => setBenefitAmount(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-primary-700">العملة <span className="text-red-500">*</span></label>
              <select className="input-modern h-14 text-lg" value={currency} onChange={e => setCurrency(e.target.value)} required>
                {CURRENCIES.map((c, index) => <option key={index} value={c.code}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2 col-span-1 xl:col-span-3">
              <label className="font-semibold text-primary-700">الفرع المستلم <span className="text-red-500">*</span></label>
              <select
                className="input-modern h-14 text-lg"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                required
              >
                <option value="">اختر الفرع المستلم</option>
                {branches.filter(b => b.governorate === receiver.governorate).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 col-span-1 xl:col-span-3">
              <label className="font-semibold text-primary-700">رسالة <span className="text-gray-400">(اختياري)</span></label>
              <input className="input-modern h-14 text-lg" placeholder="رسالة (اختياري)" value={message} onChange={e => setMessage(e.target.value)} />
            </div>
          </div>
          <div className="text-center mt-6">
            <button type="submit" className="bg-primary-500 text-white px-12 py-3 rounded-xl font-bold hover:bg-primary-600 transition text-xl shadow-lg w-full md:w-auto" disabled={loading}>
              {loading ? "جاري الإرسال..." : "إرسال التحويل"}
            </button>
          </div>
        </>
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
    </form>
  );
} 