'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuth } from '@/app/hooks/useAuth'

const loginSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
  confirmPassword: z.string().min(1, 'تأكيد كلمة المرور مطلوب'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const { login, checkInitialization, initializeSystem } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Check if system is initialized
  useEffect(() => {
    const checkSystem = async () => {
      try {
        const response = await checkInitialization()
        setIsInitialized(response.is_initialized)
      } catch (err) {
        console.error('Error checking system initialization:', err)
        setIsInitialized(false)
      }
    }
    checkSystem()
  }, [checkInitialization])

  const onSubmit = async (data: LoginFormData) => {
    setError('')
    setStatus('جاري التحقق من البيانات...')
    setProgress(10)
    setIsLoading(true)
    try {
      setStatus('جاري الاتصال بالخادم...')
      setProgress(30)
      const response = await login(data)
      setProgress(70)
      setProgress(100)
      setStatus('تم تسجيل الدخول بنجاح!')
      setUserRole(response.role)
      // إظهار زر إنشاء مستخدم إذا كان الدور يسمح
      if (['director', 'branch_manager'].includes(response.role)) {
        setShowCreateUser(true)
      }
      toast.success('تم تسجيل الدخول بنجاح')
      // توجيه المستخدم حسب دوره
      setTimeout(() => {
        switch (response.role) {
          case 'director':
            router.push('/dashboard/director')
            break
          case 'branch_manager':
            router.push('/branch-dashboard')
            break
          case 'employee':
            router.push('/money-transfer')
            break
          default:
            router.push('/')
        }
      }, 700)
    } catch (error) {
      setError('تعذر الاتصال بالخادم')
      setStatus('')
      setProgress(0)
      toast.error('تعذر الاتصال بالخادم')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle system initialization
  const handleInitializeSystem = async (data: LoginFormData) => {
    try {
      setIsLoading(true)
      setStatus('جاري تهيئة النظام...')
      await initializeSystem({
        username: data.username,
        password: data.password,
        confirmPassword: data.confirmPassword
      })
      toast.success('تم تهيئة النظام بنجاح')
      router.push('/dashboard/director')
    } catch (error) {
      setError('فشل في تهيئة النظام')
      toast.error('فشل في تهيئة النظام')
    } finally {
      setIsLoading(false)
    }
  }

  // If system is not initialized, show initialization form
  if (isInitialized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-100 via-white to-primary-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-500">
        <div className="max-w-md w-full space-y-8 bg-white/80 dark:bg-gray-900/80 rounded-3xl shadow-2xl p-8 border border-primary-100 dark:border-gray-800 backdrop-blur-md">
          <div className="flex flex-col items-center">
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 mb-2 shadow">
              <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /></svg>
            </span>
            <h2 className="text-3xl font-extrabold text-primary-900 dark:text-primary-200 mb-2">تهيئة النظام</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">قم بإنشاء حساب المدير الرئيسي للنظام</p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit(handleInitializeSystem)}>
            <div className="space-y-4">
              <input {...register('username')} type="text" required className="w-full px-4 py-3 rounded-xl border border-primary-200 dark:border-primary-700 bg-white dark:bg-gray-800 text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-300" placeholder="اسم المستخدم" />
              {errors.username && (<p className="text-sm text-red-600">{errors.username.message}</p>)}
              <div className="relative">
                <input {...register('password')} type={showPassword ? 'text' : 'password'} required className="w-full px-4 py-3 rounded-xl border border-primary-200 dark:border-primary-700 bg-white dark:bg-gray-800 text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-300 pr-12" placeholder="كلمة المرور" />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600 dark:text-primary-300 dark:hover:text-primary-100 focus:outline-none">
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12.001C3.226 16.273 7.322 19.5 12 19.5c1.658 0 3.237-.335 4.646-.94M21.065 11.999A10.45 10.45 0 0020.02 8.22M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.072 3.905A10.477 10.477 0 0022.065 12c-1.292-4.273-5.388-7.5-10.065-7.5-1.658 0-3.237.335-4.646.94M3.98 8.223A10.45 10.45 0 003.935 12c1.292 4.273 5.388 7.5 10.065 7.5 1.658 0 3.237-.335 4.646-.94" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (<p className="text-sm text-red-600">{errors.password.message}</p>)}
              <div className="relative">
                <input {...register('confirmPassword')} type={showConfirmPassword ? 'text' : 'password'} required className="w-full px-4 py-3 rounded-xl border border-primary-200 dark:border-primary-700 bg-white dark:bg-gray-800 text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-300 pr-12" placeholder="تأكيد كلمة المرور" />
                <button type="button" tabIndex={-1} onClick={() => setShowConfirmPassword((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600 dark:text-primary-300 dark:hover:text-primary-100 focus:outline-none">
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12.001C3.226 16.273 7.322 19.5 12 19.5c1.658 0 3.237-.335 4.646-.94M21.065 11.999A10.45 10.45 0 0020.02 8.22M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.072 3.905A10.477 10.477 0 0022.065 12c-1.292-4.273-5.388-7.5-10.065-7.5-1.658 0-3.237.335-4.646.94M3.98 8.223A10.45 10.45 0 003.935 12c1.292 4.273 5.388 7.5 10.065 7.5 1.658 0 3.237-.335 4.646-.94" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && (<p className="text-sm text-red-600">{errors.confirmPassword.message}</p>)}
            </div>
            <button type="submit" disabled={isLoading} className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-lg shadow hover:bg-primary-700 transition">{isLoading ? 'جاري التهيئة...' : 'تهيئة النظام'}</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-100 via-white to-primary-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-500">
      <div className="max-w-md w-full space-y-8 bg-white/80 dark:bg-gray-900/80 rounded-3xl shadow-2xl p-8 border border-primary-100 dark:border-gray-800 backdrop-blur-md">
        <div className="flex flex-col items-center mb-4">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 mb-2 shadow">
            <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 12l3-3m0 0l-3-3m3 3H9" /></svg>
          </span>
          <h2 className="text-3xl font-extrabold text-primary-900 dark:text-primary-200 mb-2">تسجيل الدخول</h2>
          <p className="text-gray-600 dark:text-gray-300">قم بتسجيل الدخول للوصول إلى لوحة التحكم</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <input {...register('username')} type="text" required className="w-full px-4 py-3 rounded-xl border border-primary-200 dark:border-primary-700 bg-white dark:bg-gray-800 text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-300" placeholder="اسم المستخدم" />
            {errors.username && (<p className="text-sm text-red-600">{errors.username.message}</p>)}
            <div className="relative">
              <input {...register('password')} type={showPassword ? 'text' : 'password'} required className="w-full px-4 py-3 rounded-xl border border-primary-200 dark:border-primary-700 bg-white dark:bg-gray-800 text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-300 pr-12" placeholder="كلمة المرور" />
              <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600 dark:text-primary-300 dark:hover:text-primary-100 focus:outline-none">
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12.001C3.226 16.273 7.322 19.5 12 19.5c1.658 0 3.237-.335 4.646-.94M21.065 11.999A10.45 10.45 0 0020.02 8.22M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.072 3.905A10.477 10.477 0 0022.065 12c-1.292-4.273-5.388-7.5-10.065-7.5-1.658 0-3.237.335-4.646.94M3.98 8.223A10.45 10.45 0 003.935 12c1.292 4.273 5.388 7.5 10.065 7.5 1.658 0 3.237-.335 4.646-.94" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (<p className="text-sm text-red-600">{errors.password.message}</p>)}
          </div>

          {error && (<div className="text-red-600 text-sm text-center">{error}</div>)}
          {status && (<div className="text-gray-600 text-sm text-center">{status}</div>)}
          {progress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
          )}
          <button type="submit" disabled={isLoading} className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-lg shadow hover:bg-primary-700 transition">
              {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
        </form>
      </div>
      <style jsx global>{`
        body { font-family: 'Tajawal', 'Cairo', sans-serif; }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&family=Cairo:wght@400;700;900&display=swap" rel="stylesheet" />
    </div>
  )
} 