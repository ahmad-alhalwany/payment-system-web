import axiosInstance from './axios';

export interface Employee {
  id: number;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  branch_id: number;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface EmployeeCreateRequest {
  username: string;
  password: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  branch_id: number;
}

export interface EmployeeUpdateRequest {
  full_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  is_active?: boolean;
}

export const employeesApi = {
  // الحصول على قائمة الموظفين
  getEmployees: async (branchId: number): Promise<Employee[]> => {
    const response = await axiosInstance.get(`/branches/${branchId}/employees`);
    return response.data;
  },

  // الحصول على موظف محدد
  getEmployee: async (branchId: number, employeeId: number): Promise<Employee> => {
    const response = await axiosInstance.get(`/branches/${branchId}/employees/${employeeId}`);
    return response.data;
  },

  // إضافة موظف جديد
  createEmployee: async (branchId: number, data: EmployeeCreateRequest): Promise<Employee> => {
    const response = await axiosInstance.post(`/branches/${branchId}/employees`, data);
    return response.data;
  },

  // تحديث بيانات موظف
  updateEmployee: async (
    branchId: number,
    employeeId: number,
    data: EmployeeUpdateRequest
  ): Promise<Employee> => {
    const response = await axiosInstance.put(
      `/branches/${branchId}/employees/${employeeId}`,
      data
    );
    return response.data;
  },

  // حذف موظف
  deleteEmployee: async (branchId: number, employeeId: number): Promise<void> => {
    await axiosInstance.delete(`/branches/${branchId}/employees/${employeeId}`);
  },

  // تفعيل/تعطيل موظف
  toggleEmployeeStatus: async (
    branchId: number,
    employeeId: number,
    isActive: boolean
  ): Promise<Employee> => {
    const response = await axiosInstance.patch(
      `/branches/${branchId}/employees/${employeeId}/status`,
      { is_active: isActive }
    );
    return response.data;
  },

  // تغيير كلمة مرور موظف
  changeEmployeePassword: async (
    branchId: number,
    employeeId: number,
    newPassword: string
  ): Promise<void> => {
    await axiosInstance.post(
      `/branches/${branchId}/employees/${employeeId}/change-password`,
      { new_password: newPassword }
    );
  }
}; 