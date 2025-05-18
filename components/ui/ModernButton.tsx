import React from "react";

interface ModernButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: string;
  children: React.ReactNode;
}

export default function ModernButton({ color = "#3498db", children, ...props }: ModernButtonProps) {
  return (
    <button
      {...props}
      style={{ backgroundColor: color, color: "#fff", borderRadius: 8, padding: "10px 20px", fontWeight: 600, ...props.style }}
      className={"transition hover:opacity-90 shadow " + (props.className || "")}
    >
      {children}
    </button>
  );
} 