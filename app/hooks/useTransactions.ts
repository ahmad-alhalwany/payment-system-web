import { useState, useCallback } from 'react';
import { transactionsApi, Transaction, TransactionResponse } from '../api/transactions';

export const useTransactions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Get transactions with pagination and filters
  const getTransactions = useCallback(async (params: {
    page?: number;
    per_page?: number;
    branch_id?: number;
    destination_branch_id?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await transactionsApi.getTransactions(params);
      setTransactions(response.items);
      setTotalPages(response.total_pages);
      setCurrentPage(response.page);
      setTotalItems(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new transaction
  const createTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await transactionsApi.createTransaction(transaction);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء التحويل');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get transaction by ID
  const getTransaction = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await transactionsApi.getTransaction(id);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء جلب تفاصيل التحويل');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark transaction as received
  const markAsReceived = useCallback(async (data: {
    transaction_id: string;
    receiver: string;
    receiver_mobile: string;
    receiver_id: string;
    receiver_address: string;
    receiver_governorate: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await transactionsApi.markAsReceived(data);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تأكيد استلام التحويل');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update transaction status
  const updateStatus = useCallback(async (data: {
    transaction_id: string;
    status: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await transactionsApi.updateStatus(data);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحديث حالة التحويل');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    transactions,
    totalPages,
    currentPage,
    totalItems,
    getTransactions,
    createTransaction,
    getTransaction,
    markAsReceived,
    updateStatus,
  };
}; 