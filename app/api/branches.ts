import axiosInstance from './axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Types
export interface Branch {
  allocated_amount_usd: null;
  allocated_amount_syp: null;
  id: number;
  name: string;
  location: string;
  governorate: string;
  status: string;
  phone_number?: string;
  financial_stats?: {
    available_balance: number;
    total_transactions: number;
    total_profit: number;
  };
}

// API Functions
export const branchesApi = {
  // Get all branches
  getBranches: async (): Promise<{ branches: Branch[] }> => {
    const response = await axiosInstance.get(`${API_URL}/branches/`);
    return response.data;
  },

  // Get branch by ID
  getBranch: async (id: number): Promise<Branch> => {
    const response = await axiosInstance.get(`${API_URL}/branches/${id}`);
    return response.data;
  },

  // Get branch tax rate
  getBranchTaxRate: async (id: number): Promise<{ tax_rate: number }> => {
    const response = await axiosInstance.get(`${API_URL}/api/branches/${id}/tax_rate/`);
    return response.data;
  }
}; 