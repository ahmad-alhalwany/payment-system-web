import React from "react";

export default function Modal({ open, onClose, children }: { open: boolean, onClose: () => void, children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[300px] max-w-[90vw] relative">
        <button
          className="absolute top-2 left-2 text-gray-500 hover:text-red-500 text-xl"
          onClick={onClose}
        >×</button>
        {children}
      </div>
    </div>
  );
} 