import axiosInstance from './axios';

export interface ProfitRecord {
  id: number;
  branch_id: number;
  date: string;
  amount: number;
  currency: string;
  description: string;
  created_at: string;
}

export interface ProfitSummary {
  total_profit: number;
  currency: string;
  period: string;
  start_date: string;
  end_date: string;
  transaction_count: number;
}

export interface ProfitStatistics {
  daily_profits: {
    date: string;
    amount: number;
  }[];
  monthly_profits: {
    month: string;
    amount: number;
  }[];
  yearly_profits: {
    year: string;
    amount: number;
  }[];
  currency: string;
}

export const profitsApi = {
  // الحصول على سجل الأرباح
  getProfitsHistory: async (
    branchId: number,
    startDate?: string,
    endDate?: string,
    currency?: string
  ): Promise<ProfitRecord[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (currency) params.append('currency', currency);

    const response = await axiosInstance.get(
      `/branches/${branchId}/profits?${params.toString()}`
    );
    return response.data;
  },

  // الحصول على ملخص الأرباح
  getProfitsSummary: async (
    branchId: number,
    period: 'daily' | 'monthly' | 'yearly' | 'all-time' = 'monthly',
    currency?: string
  ): Promise<ProfitSummary> => {
    const params = new URLSearchParams();
    params.append('period', period);
    if (currency) params.append('currency', currency);

    const response = await axiosInstance.get(
      `/branches/${branchId}/profits/summary?${params.toString()}`
    );
    return response.data;
  },

  // الحصول على إحصائيات الأرباح
  getProfitsStatistics: async (
    branchId: number,
    currency?: string
  ): Promise<ProfitStatistics> => {
    const params = new URLSearchParams();
    if (currency) params.append('currency', currency);

    const response = await axiosInstance.get(
      `/branches/${branchId}/profits/statistics?${params.toString()}`
    );
    return response.data;
  },

  // إضافة ربح جديد
  addProfit: async (
    branchId: number,
    data: {
      amount: number;
      currency: string;
      description: string;
      date?: string;
    }
  ): Promise<ProfitRecord> => {
    const response = await axiosInstance.post(`/branches/${branchId}/profits`, data);
    return response.data;
  },

  // تحديث ربح
  updateProfit: async (
    branchId: number,
    profitId: number,
    data: {
      amount?: number;
      currency?: string;
      description?: string;
      date?: string;
    }
  ): Promise<ProfitRecord> => {
    const response = await axiosInstance.put(
      `/branches/${branchId}/profits/${profitId}`,
      data
    );
    return response.data;
  },

  // حذف ربح
  deleteProfit: async (branchId: number, profitId: number): Promise<void> => {
    await axiosInstance.delete(`/branches/${branchId}/profits/${profitId}`);
  }
}; 