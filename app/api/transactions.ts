import axiosInstance from './axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Types
export interface Transaction {
  id: string;
  sender: string;
  sender_mobile: string;
  sender_governorate: string;
  sender_location?: string;
  sender_id?: string;
  sender_address?: string;
  receiver: string;
  receiver_mobile: string;
  receiver_governorate: string;
  receiver_location?: string;
  receiver_id?: string;
  receiver_address?: string;
  amount: number;
  base_amount: number;
  benefited_amount: number;
  tax_rate: number;
  tax_amount: number;
  currency: string;
  message: string;
  employee_name: string;
  branch_governorate: string;
  destination_branch_id: number;
  branch_id?: number;
  date?: string;
  status: string;
  is_received: boolean;
  sending_branch_name?: string;
  destination_branch_name?: string;
}

export interface TransactionResponse {
  items: Transaction[];
  total: number;
  page: number;
  total_pages: number;
}

// API Functions
export const transactionsApi = {
  // Create new transaction
  createTransaction: async (transaction: Omit<Transaction, 'id'>) => {
    const response = await axiosInstance.post(`${API_URL}/transactions/`, transaction);
    return response.data;
  },

  // Get transactions with pagination and filters
  getTransactions: async (params: {
    page?: number;
    per_page?: number;
    branch_id?: number;
    destination_branch_id?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<TransactionResponse> => {
    const response = await axiosInstance.get(`${API_URL}/transactions/`, { params });
    return response.data;
  },

  // Get transaction by ID
  getTransaction: async (id: string): Promise<Transaction> => {
    const response = await axiosInstance.get(`${API_URL}/transactions/${id}/`);
    return response.data;
  },

  // Mark transaction as received
  markAsReceived: async (data: {
    transaction_id: string;
    receiver: string;
    receiver_mobile: string;
    receiver_id: string;
    receiver_address: string;
    receiver_governorate: string;
  }) => {
    const response = await axiosInstance.post(`${API_URL}/mark-transaction-received/`, data);
    return response.data;
  },

  // Update transaction status
  updateStatus: async (data: {
    transaction_id: string;
    status: string;
  }) => {
    const response = await axiosInstance.post(`${API_URL}/update-transaction-status/`, data);
    return response.data;
  }
}; 