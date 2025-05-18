'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Header from '@/components/shared/Header'
import toast from 'react-hot-toast'

const branchSchema = z.object({
  name: z.string().min(1, 'اسم الفرع مطلوب'),
  address: z.string().min(1, 'عنوان الفرع مطلوب'),
  manager: z.string().min(1, 'اسم المدير مطلوب'),
  status: z.enum(['active', 'inactive'])
})

type BranchFormData = z.infer<typeof branchSchema>

export default function EditBranchPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema)
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userRole = localStorage.getItem('userRole')

    if (!token || userRole !== 'director') {
      router.push('/login')
      return
    }

    // هنا سنقوم بجلب بيانات الفرع من API
    // هذا مثال للبيانات
    setValue('name', 'الفرع الرئيسي')
    setValue('address', 'الرياض، حي النخيل')
    setValue('manager', 'أحمد محمد')
    setValue('status', 'active')
    setIsLoading(false)
  }, [router, setValue])

  const onSubmit = async (data: BranchFormData) => {
    try {
      setIsSubmitting(true)
      // هنا سنقوم بإرسال البيانات إلى API
      toast.success('تم تحديث بيانات الفرع بنجاح')
      router.push('/dashboard/director/branches')
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث بيانات الفرع')
    } finally {
      setIsSubmitting(false)
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
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">تعديل بيانات الفرع</h1>
            <button
              onClick={() => router.back()}
              className="btn-secondary"
            >
              رجوع
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                اسم الفرع
              </label>
              <input
                {...register('name')}
                type="text"
                className="input-field mt-1"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                العنوان
              </label>
              <input
                {...register('address')}
                type="text"
                className="input-field mt-1"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="manager" className="block text-sm font-medium text-gray-700">
                المدير
              </label>
              <input
                {...register('manager')}
                type="text"
                className="input-field mt-1"
              />
              {errors.manager && (
                <p className="mt-1 text-sm text-red-600">{errors.manager.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                الحالة
              </label>
              <select
                {...register('status')}
                className="input-field mt-1"
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
} 