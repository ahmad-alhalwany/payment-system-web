import axiosInstance from './axios';

export interface BranchInfo {
  id: number;
  name: string;
  location: string;
  governorate: string;
  allocated_amount_syp: number;
  allocated_amount_usd: number;
  tax_rate: number;
}

export interface BranchStats {
  total_transactions: number;
  total_amount: number;
  completed_transactions: number;
  pending_transactions: number;
}

export interface EmployeeStats {
  total: number;
  active: number;
}

export interface TransactionStats {
  total: number;
  total_amount: number;
  completed: number;
  pending: number;
}

export const branchManagerApi = {
  // الحصول على معلومات الفرع
  getBranchInfo: async (branchId: number): Promise<BranchInfo> => {
    const response = await axiosInstance.get(`/branches/${branchId}`);
    return response.data;
  },

  // الحصول على إحصائيات الفرع
  getBranchStats: async (branchId: number): Promise<BranchStats> => {
    const response = await axiosInstance.get(`/branches/${branchId}/transactions/stats`);
    return response.data;
  },

  // الحصول على إحصائيات الموظفين
  getEmployeeStats: async (branchId: number): Promise<EmployeeStats> => {
    const response = await axiosInstance.get(`/branches/${branchId}/employees/stats`);
    return response.data;
  },

  // الحصول على إحصائيات التحويلات
  getTransactionStats: async (branchId: number): Promise<TransactionStats> => {
    const response = await axiosInstance.get(`/transactions/stats?branch_id=${branchId}`);
    return response.data;
  },

  // تحديث معلومات الفرع
  updateBranchInfo: async (branchId: number, data: Partial<BranchInfo>): Promise<BranchInfo> => {
    const response = await axiosInstance.put(`/branches/${branchId}`, data);
    return response.data;
  },

  // الحصول على سجل الأرباح
  getProfitsHistory: async (
    branchId: number,
    startDate?: string,
    endDate?: string,
    currency?: string
  ) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (currency) params.append('currency', currency);

    const response = await axiosInstance.get(
      `/api/branches/${branchId}/profits/?${params.toString()}`
    );
    return response.data;
  },

  // الحصول على ملخص الأرباح
  getProfitsSummary: async (branchId: number, period: 'monthly' | 'yearly' | 'all-time' = 'monthly') => {
    const response = await axiosInstance.get(
      `/api/branches/${branchId}/profits/summary/?period=${period}`
    );
    return response.data;
  },

  // الحصول على إحصائيات الأرباح
  getProfitsStatistics: async (branchId: number) => {
    const response = await axiosInstance.get(
      `/api/branches/${branchId}/profits/statistics/`
    );
    return response.data;
  }
}; 