import { useState, useCallback } from 'react';
import { branchesApi, Branch } from '../api/branches';

export const useBranches = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);

  // Get all branches
  const getBranches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await branchesApi.getBranches();
      setBranches(response.branches);
      return response.branches;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء جلب الفروع');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get branch by ID
  const getBranch = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await branchesApi.getBranch(id);
      setCurrentBranch(response);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء جلب بيانات الفرع');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get branch tax rate
  const getBranchTaxRate = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await branchesApi.getBranchTaxRate(id);
      return response.tax_rate;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء جلب نسبة الضريبة');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    branches,
    currentBranch,
    getBranches,
    getBranch,
    getBranchTaxRate,
  };
}; 