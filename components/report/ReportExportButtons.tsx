"use client";

import React from "react";
import ModernButton from "@/components/ui/ModernButton";

interface ReportExportButtonsProps {
  onPrint: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
}

export default function ReportExportButtons({
  onPrint,
  onExportCsv,
  onExportPdf,
}: ReportExportButtonsProps) {
  return (
    <div className="flex justify-end gap-4 mt-6">
      <ModernButton color="#3498db" onClick={onPrint}>
        طباعة
      </ModernButton>
      <ModernButton color="#2ecc71" onClick={onExportCsv}>
        تصدير CSV
      </ModernButton>
      <ModernButton color="#e74c3c" onClick={onExportPdf}>
        تصدير PDF
      </ModernButton>
    </div>
  );
} 