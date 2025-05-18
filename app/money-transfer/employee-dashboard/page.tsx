"use client";
import React, { useState, useEffect } from "react";
import NewTransferForm from "./NewTransferForm";
import OutgoingTransfersTable from "./OutgoingTransfersTable";
import IncomingTransfersTable from "./IncomingTransfersTable";
import NotificationsPanel from "./NotificationsPanel";
import SettingsPanel from "./SettingsPanel";
import axiosInstance from "@/app/api/axios";
import { Transaction } from "@/app/api/transactions";

interface Branch {
  id: number;
  name: string;
  governorate: string;
}

interface TransferData {
  sender: any;
  receiver: any;
  amount: number;
  benefitAmount?: number;
  currency: string;
  branch: string;
  message?: string;
}

const tabs = [
  { label: "تحويل جديد", key: "new" },
  { label: "التحويلات الصادرة", key: "outgoing" },
  { label: "التحويلات الواردة", key: "incoming" },
  { label: "الإشعارات", key: "notifications" },
  { label: "الإعدادات", key: "settings" },
];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState("new");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [outgoingTransfers, setOutgoingTransfers] = useState<Transaction[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<Transaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await axiosInstance.get('/api/branches');
        setBranches(response.data);
        if (response.data.length > 0) {
          setCurrentBranch(response.data[0]);
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
      }
    };
    fetchBranches();
  }, []);

  // Handle transfer submission
  const handleTransferSubmit = async (transferData: TransferData) => {
    try {
      setLoading(true);
      await axiosInstance.post('/api/transfers', transferData);
      // Refresh transfers after successful submission
      fetchTransfers();
    } catch (error) {
      console.error('Error submitting transfer:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch transfers
  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const [outgoingResponse, incomingResponse] = await Promise.all([
        axiosInstance.get('/api/transfers/outgoing'),
        axiosInstance.get('/api/transfers/incoming')
      ]);
      setOutgoingTransfers(outgoingResponse.data.transfers);
      setIncomingTransfers(incomingResponse.data.transfers);
      setTotalPages(outgoingResponse.data.totalPages);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (id: string, status: string) => {
    try {
      setLoading(true);
      await axiosInstance.patch(`/api/transfers/${id}`, { status });
      fetchTransfers();
    } catch (error) {
      console.error('Error updating transfer status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-primary-800 text-center">لوحة موظف التحويلات</h1>
        {/* التبويبات */}
        <div className="flex gap-2 mb-8 justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`px-6 py-2 rounded-t-lg font-semibold transition border-b-2 ${
                activeTab === tab.key
                  ? "bg-white border-primary-500 text-primary-800 shadow"
                  : "bg-primary-100 border-transparent text-primary-500 hover:bg-primary-200"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* محتوى التبويب */}
        <div className="bg-white rounded-b-xl shadow p-8 min-h-[300px]">
          {activeTab === "new" && (
            <NewTransferForm 
              onSubmit={handleTransferSubmit}
              branches={branches}
              currentBranch={currentBranch}
            />
          )}
          {activeTab === "outgoing" && (
            <OutgoingTransfersTable 
              transfers={outgoingTransfers}
              onStatusChange={handleStatusChange}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              loading={loading}
            />
          )}
          {activeTab === "incoming" && (
            <IncomingTransfersTable 
              transfers={incomingTransfers}
              onStatusChange={handleStatusChange}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              loading={loading}
            />
          )}
          {activeTab === "notifications" && (
            <NotificationsPanel />
          )}
          {activeTab === "settings" && (
            <SettingsPanel />
          )}
        </div>
      </div>
    </div>
  );
} 