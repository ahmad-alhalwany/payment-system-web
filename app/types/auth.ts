export interface InitializationStatus {
  is_initialized: boolean;
  message?: string;
}

export interface InitialAdminData {
  username: string;
  password: string;
  confirmPassword: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
  username: string;
  branch_id: number;
  user_id: number;
}

export interface UserData {
  username: string;
  password: string;
  role: string;
  branch_id?: number;
  full_name?: string;
  email?: string;
  phone?: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: string;
  branch_id?: number;
}

export interface Branch {
  id: number;
  branch_id: string;
  name: string;
  location: string;
  governorate: string;
  created_at?: string;
  tax_rate?: number;
}

export interface User {
  id: number;
  username: string;
  role: string;
  branch_id: number;
  branch_name?: string;
  created_at?: string;
  is_active?: boolean;
} 