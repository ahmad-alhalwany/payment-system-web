import React from "react";

interface InventoryFiltersProps {
  fromDate: string;
  setFromDate: (v: string) => void;
  toDate: string;
  setToDate: (v: string) => void;
  branch: string;
  setBranch: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  onApply: () => void;
  onRefresh: () => void;
  branches: { value: string; label: string }[];
  currencies: { value: string; label: string }[];
  statuses: { value: string; label: string }[];
}

export default function InventoryFilters({
  fromDate, setFromDate,
  toDate, setToDate,
  branch, setBranch,
  currency, setCurrency,
  status, setStatus,
  onApply, onRefresh,
  branches, currencies, statuses
}: InventoryFiltersProps) {
  return (
    <div className="bg-white rounded shadow p-4 mb-6 flex flex-col md:flex-row gap-4 items-end flex-wrap">
      <div>
        <label className="block mb-1 font-bold">من تاريخ</label>
        <input type="date" className="input-field" value={fromDate} onChange={e => setFromDate(e.target.value)} />
      </div>
      <div>
        <label className="block mb-1 font-bold">إلى تاريخ</label>
        <input type="date" className="input-field" value={toDate} onChange={e => setToDate(e.target.value)} />
      </div>
      <div>
        <label className="block mb-1 font-bold">الفرع</label>
        <select className="input-field" value={branch} onChange={e => setBranch(e.target.value)}>
          {branches.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block mb-1 font-bold">العملة</label>
        <select className="input-field" value={currency} onChange={e => setCurrency(e.target.value)}>
          {currencies.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block mb-1 font-bold">الحالة</label>
        <select className="input-field" value={status} onChange={e => setStatus(e.target.value)}>
          {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <button className="bg-primary-600 text-white px-6 py-2 rounded font-bold hover:bg-primary-700 transition" onClick={onApply}>تطبيق</button>
      <button className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 transition" onClick={onRefresh}>تحديث</button>
    </div>
  );
} 