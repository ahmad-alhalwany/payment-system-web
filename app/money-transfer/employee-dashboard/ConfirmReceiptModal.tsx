import React, { useState } from "react";
import { Transaction } from "../../api/transactions";

interface ConfirmReceiptModalProps {
  open: boolean;
  onClose: () => void;
  transfer: Transaction | null;
  onConfirm: () => void;
  loading?: boolean;
}

export default function ConfirmReceiptModal({ open, onClose, transfer, onConfirm, loading = false }: ConfirmReceiptModalProps) {
  if (!open || !transfer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(120deg, #0008 0%, #e0f7fa88 100%)' }}>
      <div style={{ background: 'rgba(255,255,255,0.98)', borderRadius: 24, boxShadow: '0 8px 32px #1976d220', width: '100%', maxWidth: 420, padding: 32, position: 'relative', animation: 'fadeIn 0.3s' }}>
        <button
          style={{ position: 'absolute', left: 24, top: 24, color: '#888', fontSize: 28, fontWeight: 900, background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
          onClick={onClose}
          aria-label="إغلاق"
          disabled={loading}
          onMouseOver={e => e.currentTarget.style.color = '#d32f2f'}
          onMouseOut={e => e.currentTarget.style.color = '#888'}
        >
          ×
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1976d2', marginBottom: 24, textAlign: 'center', letterSpacing: 1 }}>تأكيد استلام التحويل</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#1976d2', marginBottom: 8 }}>اسم المستلم</div>
            <div style={{ fontWeight: 900, fontSize: 22, background: '#f5faff', borderRadius: 12, padding: '12px 24px', border: '1px solid #e3f2fd', color: '#222', minWidth: 180, textAlign: 'center' }}>{transfer.receiver}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 32 }}>
            <button
              style={{ background: '#bdbdbd', color: '#fff', padding: '10px 32px', borderRadius: 99, fontWeight: 700, fontSize: 16, border: 'none', boxShadow: '0 2px 8px #bdbdbd22', transition: 'background 0.2s', cursor: 'pointer', outline: 'none' }}
              onClick={onClose}
              type="button"
              disabled={loading}
              onMouseOver={e => e.currentTarget.style.background = '#757575'}
              onMouseOut={e => e.currentTarget.style.background = '#bdbdbd'}
            >
              إلغاء
            </button>
            <button
              style={{ background: '#1976d2', color: '#fff', padding: '10px 36px', borderRadius: 99, fontWeight: 700, fontSize: 16, border: 'none', boxShadow: '0 2px 8px #1976d220', transition: 'background 0.2s', cursor: 'pointer', outline: 'none' }}
              type="submit"
              disabled={loading}
              onMouseOver={e => e.currentTarget.style.background = '#1565c0'}
              onMouseOut={e => e.currentTarget.style.background = '#1976d2'}
            >
              {loading ? "جاري التأكيد..." : "تأكيد الاستلام"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 