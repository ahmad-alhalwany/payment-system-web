import React from "react";

export default function Modal({ open, onClose, children }: { open: boolean, onClose: () => void, children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/60 via-blue-100/40 to-white/60 backdrop-blur-[2px] flex items-center justify-center z-50">
      <div className="bg-white/95 rounded-3xl shadow-2xl p-4 md:p-8 min-w-[300px] max-w-[92vw] relative border border-primary-100 animate-fadeIn" style={{ boxShadow: '0 8px 32px #1976d220' }}>
        <button
          className="absolute top-4 left-4 text-gray-400 hover:text-red-500 text-2xl font-extrabold transition-all duration-150"
          onClick={onClose}
        >×</button>
        {children}
      </div>
    </div>
  );
} 