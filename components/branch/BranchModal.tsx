import React from "react";

interface BranchModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BranchModal({ open, onClose, title, children }: BranchModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-gray-400 hover:text-red-500 text-2xl font-bold"
          aria-label="إغلاق"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-6 text-primary-800 text-center">{title}</h2>
        {children}
      </div>
    </div>
  );
} 