export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < 8) {
    return {
      isValid: false,
      message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: "كلمة المرور يجب أن تحتوي على حرف كبير على الأقل"
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: "كلمة المرور يجب أن تحتوي على حرف صغير على الأقل"
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      message: "كلمة المرور يجب أن تحتوي على رقم على الأقل"
    };
  }

  return { isValid: true };
};

export const validateUsername = (username: string): { isValid: boolean; message?: string } => {
  if (username.length < 3) {
    return {
      isValid: false,
      message: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"
    };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return {
      isValid: false,
      message: "اسم المستخدم يجب أن يحتوي على أحرف وأرقام وشرطة سفلية فقط"
    };
  }

  return { isValid: true };
};

export const validateEmail = (email: string): { isValid: boolean; message?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      message: "البريد الإلكتروني غير صالح"
    };
  }
  return { isValid: true };
};

export const validatePhone = (phone: string): { isValid: boolean; message?: string } => {
  const phoneRegex = /^[0-9]{9,10}$/;
  if (!phoneRegex.test(phone)) {
    return {
      isValid: false,
      message: "رقم الهاتف يجب أن يكون 9-10 أرقام"
    };
  }
  return { isValid: true };
};

export const validateRole = (role: string): { isValid: boolean; message?: string } => {
  const validRoles = ["director", "branch_manager", "employee"];
  if (!validRoles.includes(role)) {
    return {
      isValid: false,
      message: "الدور غير صالح"
    };
  }
  return { isValid: true };
}; 