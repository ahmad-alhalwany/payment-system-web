"use client";

import React, { useState, useEffect } from "react";
import axiosInstance from "@/app/api/axios";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import BranchModal from "./BranchModal";
import ModernButton from "../ui/ModernButton";

interface BranchFundHistoryModalProps {
  open: boolean;
  onClose: () => void;
  branch: {
    id: string;
    name: string;
  };
}

interface FundHistory {
  id: string;
  amount_syp: number;
  amount_usd: number;
  type: string;
  description: string;
  created_at: string;
}

const typeLabel = {
  allocation: "إيداع",
  deduction: "خصم"
};

const currencyLabel = {
  SYP: "ل.س",
  USD: "$"
};

export default function BranchFundHistoryModal({
  open,
  onClose,
  branch,
}: BranchFundHistoryModalProps) {
  const [history, setHistory] = useState<FundHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && branch) {
      fetchHistory();
    }
  }, [open, branch]);

  const fetchHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axiosInstance.get(`/branches/${branch.id}/fund-history`);
      setHistory(response.data);
    } catch (error) {
      console.error("Error fetching fund history:", error);
      setError("فشل في تحميل سجل الأموال");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <BranchModal open={open} onClose={onClose} title={`سجل التمويل - ${branch?.name || "فرع"}`}>
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-4">جاري التحميل...</div>
        ) : error ? (
          <div className="text-red-500 text-center py-4">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    التاريخ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    النوع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المبلغ (ل.س)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المبلغ ($)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الوصف
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(item.created_at), "dd MMMM yyyy", {
                        locale: ar,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.type === "deposit" ? "إيداع" : "سحب"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.amount_syp.toLocaleString()} ل.س
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.amount_usd.toLocaleString()} $
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end mt-4">
          <ModernButton color="#e74c3c" onClick={onClose}>إغلاق</ModernButton>
        </div>
      </div>
    </BranchModal>
  );
} 