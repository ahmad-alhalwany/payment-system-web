'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/shared/Header'
import toast from 'react-hot-toast'

interface Branch {
  id: number
  name: string
}

interface Employee {
  id: number
  name: string
  username: string
  role: 'employee' | 'branch_manager'
  branch: number
  status: 'active' | 'inactive'
}

const validatePassword = (password: string) => {
  if (!password) return [] // إذا كانت كلمة المرور فارغة، لا نتحقق منها

  const minLength = 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  const errors = []
  if (password.length < minLength) {
    errors.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  }
  if (!hasUpperCase) {
    errors.push('يجب أن تحتوي على حرف كبير واحد على الأقل')
  }
  if (!hasLowerCase) {
    errors.push('يجب أن تحتوي على حرف صغير واحد على الأقل')
  }
  if (!hasNumbers) {
    errors.push('يجب أن تحتوي على رقم واحد على الأقل')
  }
  if (!hasSpecialChar) {
    errors.push('يجب أن تحتوي على رمز خاص واحد على الأقل')
  }

  return errors
}

export default function EditEmployeePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    branch: '',
    status: 'active'
  })
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userRole = localStorage.getItem('userRole')

    if (!token || userRole !== 'director') {
      router.push('/login')
      return
    }

    const fetchData = async () => {
      try {
        // هنا سنقوم بجلب بيانات الموظف والفروع من API
        // هذا مثال للبيانات
        const employee: Employee = {
          id: parseInt(params.id),
          name: 'أحمد محمد',
          username: 'ahmed.m',
          role: 'branch_manager',
          branch: 1,
          status: 'active'
        }

        const branchesList: Branch[] = [
          { id: 1, name: 'الفرع الرئيسي' },
          { id: 2, name: 'فرع جدة' }
        ]

        setFormData({
          name: employee.name,
          username: employee.username,
          password: '',
          confirmPassword: '',
          role: employee.role,
          branch: employee.branch.toString(),
          status: employee.status
        })

        setBranches(branchesList)
        setIsLoading(false)
      } catch (error) {
        toast.error('حدث خطأ أثناء جلب البيانات')
        router.push('/dashboard/director/employees')
      }
    }

    fetchData()
  }, [params.id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('كلمات المرور غير متطابقة')
      return
    }

    if (formData.password) {
      const errors = validatePassword(formData.password)
      if (errors.length > 0) {
        setPasswordErrors(errors)
        return
      }
    }

    setIsSaving(true)
    try {
      // هنا سنقوم بإرسال البيانات إلى API
      toast.success('تم تحديث بيانات الموظف بنجاح')
      router.push('/dashboard/director/employees')
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث بيانات الموظف')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (name === 'password') {
      const errors = validatePassword(value)
      setPasswordErrors(errors)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-xl">جاري التحميل...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="py-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">تعديل بيانات الموظف</h1>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  الاسم
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  اسم المستخدم
                </label>
                <input
                  type="text"
                  name="username"
                  id="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  كلمة المرور الجديدة (اختياري)
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                    passwordErrors.length > 0 ? 'border-red-500' : ''
                  }`}
                />
                {passwordErrors.length > 0 && (
                  <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                    {passwordErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  تأكيد كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  الدور
                </label>
                <select
                  name="role"
                  id="role"
                  required
                  value={formData.role}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="employee">موظف</option>
                  <option value="branch_manager">مدير فرع</option>
                </select>
              </div>

              <div>
                <label htmlFor="branch" className="block text-sm font-medium text-gray-700">
                  الفرع
                </label>
                <select
                  name="branch"
                  id="branch"
                  required
                  value={formData.branch}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">اختر الفرع</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  الحالة
                </label>
                <select
                  name="status"
                  id="status"
                  required
                  value={formData.status}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving || passwordErrors.length > 0}
                  className="btn-primary"
                >
                  {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
} 