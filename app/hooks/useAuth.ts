import { useState, useCallback, useEffect } from 'react';
import { authApi, LoginRequest, ChangePasswordRequest, PasswordResetRequest, UserCreateRequest } from '../api/auth';
import { InitialAdminData, LoginResponse } from '@/app/types/auth';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<LoginResponse | null>(null);

  // تحميل بيانات المستخدم من localStorage عند تحميل الصفحة
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const username = localStorage.getItem('username') || '';
      const role = localStorage.getItem('userRole') || '';
      const branch_id = localStorage.getItem('branchId');
      const user_id = localStorage.getItem('userId');
      const token_type = localStorage.getItem('token_type') || 'bearer';
      setUser({
        access_token: token,
        token_type,
        username,
        role,
        branch_id: branch_id ? Number(branch_id) : 0,
        user_id: user_id ? Number(user_id) : 0,
      });
    }
  }, []);

  // Check token validity on mount and every 5 minutes
  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // TODO: Implement token validation API call
          // const response = await authApi.validateToken(token);
          // if (!response.valid) {
          //   logout();
          // }
        } catch (err) {
          logout();
        }
      }
    };

    checkToken();
    const interval = setInterval(checkToken, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Login
  const login = useCallback(async (data: LoginRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.login(data);
      
      // Save token and user data to localStorage
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('token_type', response.token_type || 'bearer');
      localStorage.setItem('userRole', response.role);
      localStorage.setItem('username', response.username);
      localStorage.setItem('branchId', response.branch_id?.toString() || '');
      localStorage.setItem('userId', response.user_id.toString());
      
      // Save user data to state
      setUser(response);
      
      // Set cookies for middleware
      const expires = new Date(Date.now() + 8 * 60 * 60 * 1000).toUTCString();
      document.cookie = `token=${response.access_token}; path=/; expires=${expires}`;
      document.cookie = `userRole=${response.role}; path=/; expires=${expires}`;
      
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل الدخول');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (data: ChangePasswordRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.changePassword(data.old_password, data.new_password);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تغيير كلمة المرور');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset password (for admin/branch manager)
  const resetPassword = useCallback(async (data: PasswordResetRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.resetPassword(data.username, data.new_password);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إعادة تعيين كلمة المرور');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Register new user (for admin/branch manager)
  const registerUser = useCallback(async (data: UserCreateRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.createUser(data);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء المستخدم');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if system is initialized
  const checkInitialization = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.checkInitialization();
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء التحقق من تهيئة النظام');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize system with first admin
  const initializeSystem = useCallback(async (data: InitialAdminData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.initializeSystem(data);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تهيئة النظام');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('branchId');
    localStorage.removeItem('userId');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  // Logout
  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  // Check if user is authenticated
  const isAuthenticated = useCallback(() => {
    return !!localStorage.getItem('token');
  }, []);

  // Check if user has specific role
  const hasRole = useCallback((role: string) => {
    return user?.role === role;
  }, [user]);

  // Check if user has any of the specified roles
  const hasAnyRole = useCallback((roles: string[]) => {
    return roles.includes(user?.role || '');
  }, [user]);

  return {
    loading,
    error,
    user,
    login,
    logout,
    changePassword,
    resetPassword,
    registerUser,
    checkInitialization,
    initializeSystem,
    isAuthenticated,
    hasRole,
    hasAnyRole,
  };
}; 