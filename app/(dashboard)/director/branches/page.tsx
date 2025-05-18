'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/shared/Header'
import toast from 'react-hot-toast'

interface Branch {
  id: number
  name: string
  address: string
  manager: string
  employeesCount: number
  status: 'active' | 'inactive'
}

export default function BranchesPage() {
  const router = useRouter()
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userRole = localStorage.getItem('userRole')

    if (!token || userRole !== 'director') {
      router.push('/login')
      return
    }

    // هنا سنقوم بجلب البيانات من API
    // هذا مثال للبيانات
    setBranches([
      {
        id: 1,
        name: 'الفرع الرئيسي',
        address: 'الرياض، حي النخيل',
        manager: 'أحمد محمد',
        employeesCount: 10,
        status: 'active'
      },
      {
        id: 2,
        name: 'فرع جدة',
        address: 'جدة، حي الروضة',
        manager: 'محمد علي',
        employeesCount: 8,
        status: 'active'
      }
    ])
    setIsLoading(false)
  }, [router])

  const handleAddBranch = () => {
    setIsAddModalOpen(true)
  }

  const handleEditBranch = (id: number) => {
    router.push(`/dashboard/director/branches/${id}/edit`)
  }

  const handleDeleteBranch = async (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الفرع؟')) {
      try {
        // هنا سنقوم بإرسال طلب حذف إلى API
        toast.success('تم حذف الفرع بنجاح')
        setBranches(branches.filter(branch => branch.id !== id))
      } catch (error) {
        toast.error('حدث خطأ أثناء حذف الفرع')
      }
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">إدارة الفروع</h1>
            <button
              onClick={handleAddBranch}
              className="btn-primary"
            >
              إضافة فرع جديد
            </button>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    اسم الفرع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    العنوان
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    المدير
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    عدد الموظفين
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {branches.map((branch) => (
                  <tr key={branch.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {branch.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {branch.address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {branch.manager}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {branch.employeesCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        branch.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {branch.status === 'active' ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditBranch(branch.id)}
                        className="text-primary-600 hover:text-primary-900 ml-4"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDeleteBranch(branch.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
} 