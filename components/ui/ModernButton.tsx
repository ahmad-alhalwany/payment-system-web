import React from "react";

interface ModernButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: string;
  children: React.ReactNode;
}

export default function ModernButton({ color = "#3498db", children, ...props }: ModernButtonProps) {
  return (
    <button
      {...props}
      style={{ background: `linear-gradient(90deg, ${color} 60%, #1976d2 100%)`, color: "#fff", borderRadius: 16, padding: "12px 28px", fontWeight: 700, fontSize: 17, boxShadow: '0 2px 12px #1976d220', ...props.style }}
      className={"transition hover:scale-105 hover:opacity-90 shadow-lg " + (props.className || "")}
    >
      {children}
    </button>
  );
} 