'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/app/hooks/useAuth'

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userRole');
  localStorage.removeItem('username');
  localStorage.removeItem('branchId');
  localStorage.removeItem('userId');
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

export default function Header() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [search, setSearch] = useState("")
  const { user, logout } = useAuth()

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      // يمكنك تخصيص منطق البحث العام هنا (مثلاً: الانتقال لصفحة نتائج البحث)
      router.push(`/search?query=${encodeURIComponent(search)}`)
    }
  }

  return (
    <header className="bg-white shadow sticky top-0 z-50">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* القائمة الجانبية للجوال */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none"
              aria-label="فتح القائمة"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          {/* شعار وعنوان */}
          <div className="flex items-center gap-4">
            <img src="/payment-system.jpg" alt="شعار النظام" className="w-10 h-10 rounded-full shadow" />
            <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap">نظام التحويلات المالية</h1>
          </div>
          {/* روابط التنقل */}
          <div className="hidden md:flex gap-6 items-center">
            <Link href="/" className="hover:text-primary-600 font-semibold">الرئيسية</Link>
            <Link href="/money-transfer" className="hover:text-primary-600 font-semibold">التحويلات</Link>
            {(user?.role === "director" || user?.role === "branch_manager") && (
              <Link href="/dashboard/employees" className="hover:text-primary-600 font-semibold">الموظفون</Link>
            )}
            {user?.role === "director" && (
              <>
                <Link href="/dashboard/branches" className="hover:text-primary-600 font-semibold">الفروع</Link>
                <Link href="/dashboard/reports" className="hover:text-primary-600 font-semibold">التقارير</Link>
              </>
            )}
          </div>
          {/* شريط البحث */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1 mx-4 w-72">
            <input
              type="text"
              className="bg-transparent outline-none flex-1 px-2 py-1"
              placeholder="بحث متقدم... (اسم، رقم، ...الخ)"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit" className="text-primary-600 hover:text-primary-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4-4m0 0A7 7 0 104 4a7 7 0 0013 13z" />
              </svg>
            </button>
          </form>
          {/* زر تسجيل الخروج */}
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold transition"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
        {/* قائمة الجوال */}
        {isMenuOpen && (
          <div className="md:hidden mt-2 bg-white rounded-lg shadow p-4 flex flex-col gap-3 animate-fadeIn">
            <Link href="/" className="hover:text-primary-600 font-semibold" onClick={() => setIsMenuOpen(false)}>الرئيسية</Link>
            <Link href="/money-transfer" className="hover:text-primary-600 font-semibold" onClick={() => setIsMenuOpen(false)}>التحويلات</Link>
            {(user?.role === "director" || user?.role === "branch_manager") && (
              <Link href="/dashboard/employees" className="hover:text-primary-600 font-semibold" onClick={() => setIsMenuOpen(false)}>الموظفون</Link>
            )}
            {user?.role === "director" && (
              <>
                <Link href="/dashboard/branches" className="hover:text-primary-600 font-semibold" onClick={() => setIsMenuOpen(false)}>الفروع</Link>
                <Link href="/dashboard/reports" className="hover:text-primary-600 font-semibold" onClick={() => setIsMenuOpen(false)}>التقارير</Link>
              </>
            )}
            <form onSubmit={handleSearch} className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1 mt-2">
              <input
                type="text"
                className="bg-transparent outline-none flex-1 px-2 py-1"
                placeholder="بحث متقدم... (اسم، رقم، ...الخ)"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button type="submit" className="text-primary-600 hover:text-primary-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4-4m0 0A7 7 0 104 4a7 7 0 0013 13z" />
                </svg>
              </button>
            </form>
          </div>
        )}
      </nav>
    </header>
  )
} 