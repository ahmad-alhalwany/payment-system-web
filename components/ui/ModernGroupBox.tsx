import React from "react";

interface ModernGroupBoxProps {
  title?: string;
  color?: string;
  children: React.ReactNode;
}

export default function ModernGroupBox({ title, color = "#f5f5f5", children }: ModernGroupBoxProps) {
  return (
    <div className="rounded-2xl shadow-lg p-8 mb-8 border border-primary-100 bg-white/90" style={{ backgroundColor: color, boxShadow: '0 4px 24px #1976d220' }}>
      {title && <div className="text-2xl font-extrabold mb-6 text-primary-800 drop-shadow-sm">{title}</div>}
      {children}
    </div>
  );
} 