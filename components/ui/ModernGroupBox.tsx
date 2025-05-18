import React from "react";

interface ModernGroupBoxProps {
  title?: string;
  color?: string;
  children: React.ReactNode;
}

export default function ModernGroupBox({ title, color = "#f5f5f5", children }: ModernGroupBoxProps) {
  return (
    <div className="rounded-xl shadow p-6 mb-6" style={{ backgroundColor: color }}>
      {title && <div className="text-lg font-bold mb-4 text-primary-800">{title}</div>}
      {children}
    </div>
  );
} 