"use client";

import React from "react";

interface ReportTableProps {
  data: any[];
  columns: string[];
  reportType: string;
  formatDate: (date: string) => string;
  formatAmount: (amount: number) => string;
  getStatusLabel: (status: string) => string;
}

export default function ReportTable({
  data,
  columns,
  reportType,
  formatDate,
  formatAmount,
  getStatusLabel,
}: ReportTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {columns.map((column, colIndex) => {
                let cellContent = "";
                switch (reportType) {
                  case "transactions":
                    switch (colIndex) {
                      case 0:
                        cellContent = row.transfer_id;
                        break;
                      case 1:
                        cellContent = row.sender_name;
                        break;
                      case 2:
                        cellContent = row.recipient_name;
                        break;
                      case 3:
                        cellContent = formatAmount(row.amount);
                        break;
                      case 4:
                        cellContent = row.currency;
                        break;
                      case 5:
                        cellContent = formatDate(row.created_at);
                        break;
                      case 6:
                        cellContent = getStatusLabel(row.status);
                        break;
                      case 7:
                        cellContent = row.branch;
                        break;
                      case 8:
                        cellContent = row.employee;
                        break;
                    }
                    break;
                  case "branches":
                    switch (colIndex) {
                      case 0:
                        cellContent = row.id;
                        break;
                      case 1:
                        cellContent = row.name;
                        break;
                      case 2:
                        cellContent = formatAmount(row.total_syp);
                        break;
                      case 3:
                        cellContent = formatAmount(row.total_usd);
                        break;
                      case 4:
                        cellContent = row.count;
                        break;
                    }
                    break;
                  case "employees":
                    switch (colIndex) {
                      case 0:
                        cellContent = row.username;
                        break;
                      case 1:
                        cellContent = row.role;
                        break;
                      case 2:
                        cellContent = row.branch;
                        break;
                      case 3:
                        cellContent = formatDate(row.created_at);
                        break;
                      case 4:
                        cellContent = getStatusLabel(row.status);
                        break;
                    }
                    break;
                  case "daily":
                    switch (colIndex) {
                      case 0:
                        cellContent = formatDate(row.date);
                        break;
                      case 1:
                        cellContent = formatAmount(row.total_syp);
                        break;
                      case 2:
                        cellContent = formatAmount(row.total_usd);
                        break;
                      case 3:
                        cellContent = row.count;
                        break;
                    }
                    break;
                }
                return (
                  <td
                    key={colIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                  >
                    {cellContent}
                  </td>
                );
              })}
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 