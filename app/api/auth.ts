import axios from 'axios';
import axiosInstance from './axios';
import { LoginData, LoginResponse, InitialAdminData, CreateUserRequest, UserData } from '@/app/types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface PasswordResetRequest {
  username: string;
  new_password: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface UserCreateRequest {
  username: string;
  password: string;
  role: string;
  branch_id?: number;
}

export interface TokenValidationResponse {
  valid: boolean;
  user?: LoginResponse;
}

// API Functions
export const authApi = {
  // Login
  login: async (data: LoginData): Promise<LoginResponse> => {
    try {
      const response = await axiosInstance.post('/login/', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'فشل في تسجيل الدخول');
    }
  },

  // Change password
  changePassword: async (oldPassword: string, newPassword: string): Promise<{ status: string; message: string }> => {
    try {
      const response = await axiosInstance.post('/change-password/', {
        old_password: oldPassword,
        new_password: newPassword
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'فشل في تغيير كلمة المرور');
    }
  },

  // Reset password (for admin/branch manager)
  resetPassword: async (username: string, newPassword: string): Promise<{ status: string; message: string }> => {
    try {
      const response = await axiosInstance.post('/reset-password/', {
        username,
        new_password: newPassword
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'فشل في إعادة تعيين كلمة المرور');
    }
  },

  // Register new user (for admin/branch manager)
  createUser: async (data: CreateUserRequest): Promise<UserData> => {
    try {
      const response = await axiosInstance.post('/users/', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'فشل في إنشاء المستخدم');
    }
  },

  // Check if system is initialized
  checkInitialization: async (): Promise<{ is_initialized: boolean }> => {
    try {
      const response = await axiosInstance.get('/check-initialization/');
      return response.data;
    } catch (error) {
      console.error('Error checking initialization:', error);
      return { is_initialized: false };
    }
  },

  // Initialize system with first admin
  initializeSystem: async (data: InitialAdminData): Promise<{ status: string; message: string }> => {
    try {
      const response = await axiosInstance.post('/initialize-system/', {
        username: data.username,
        password: data.password
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'فشل في تهيئة النظام');
    }
  },

  // Validate token
  validateToken: async (token: string): Promise<{ valid: boolean; user?: LoginResponse }> => {
    try {
      const response = await axiosInstance.post('/validate-token/', { token });
      return response.data;
    } catch (error) {
      return { valid: false };
    }
  }
}; 