"use client";
import React, { useState } from "react";
import NewTransferForm from "./NewTransferForm";
import OutgoingTransfersTable from "./OutgoingTransfersTable";
import IncomingTransfersTable from "./IncomingTransfersTable";
import NotificationsPanel from "./NotificationsPanel";
import SettingsPanel from "./SettingsPanel";

const tabs = [
  { label: "تحويل جديد", key: "new" },
  { label: "التحويلات الصادرة", key: "outgoing" },
  { label: "التحويلات الواردة", key: "incoming" },
  { label: "الإشعارات", key: "notifications" },
  { label: "الإعدادات", key: "settings" },
];

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState("new");

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
            <NewTransferForm />
          )}
          {activeTab === "outgoing" && (
            <OutgoingTransfersTable transfers={[]} />
          )}
          {activeTab === "incoming" && (
            <IncomingTransfersTable transfers={[]} />
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