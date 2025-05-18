'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axiosInstance from '@/app/api/axios'
import Header from '@/components/shared/Header'

interface DashboardStats {
  totalBranches: number
  totalEmployees: number
  totalTransactions: number
  totalAmount: number
}

export default function DirectorDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalBranches: 0,
    totalEmployees: 0,
    totalTransactions: 0,
    totalAmount: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userRole = localStorage.getItem('userRole')

    if (!token || userRole !== 'director') {
      router.push('/login')
      return
    }

    const fetchStats = async () => {
      try {
        const response = await axiosInstance.get('/dashboard/stats')
        setStats(response.data)
        setError("")
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
        setError("فشل في تحميل إحصائيات لوحة التحكم")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [router])

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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-xl text-red-600">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">لوحة تحكم المدير</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">إجمالي الفروع</h2>
            <p className="text-3xl font-bold text-primary-600">{stats.totalBranches}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">إجمالي الموظفين</h2>
            <p className="text-3xl font-bold text-primary-600">{stats.totalEmployees}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">إجمالي التحويلات</h2>
            <p className="text-3xl font-bold text-primary-600">{stats.totalTransactions}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">إجمالي المبالغ</h2>
            <p className="text-3xl font-bold text-primary-600">{stats.totalAmount.toLocaleString()} ل.س</p>
          </div>
        </div>
      </main>
    </div>
  )
} 