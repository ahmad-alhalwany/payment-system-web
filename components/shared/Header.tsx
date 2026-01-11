'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/app/hooks/useAuth'
import { FiLogOut, FiHome, FiRepeat, FiUsers, FiGitBranch, FiBarChart2, FiSearch } from 'react-icons/fi'

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
      router.push(`/search?query=${encodeURIComponent(search)}`)
    }
  }

  // روابط التنقل حسب الدور
  const navLinks = [
    { href: '/', label: 'الرئيسية', icon: <FiHome /> },
    { href: '/money-transfer', label: 'التحويلات', icon: <FiRepeat /> },
  ];
  if (user?.role === 'director' || user?.role === 'branch_manager') {
    navLinks.push({ href: '/dashboard/employees', label: 'الموظفون', icon: <FiUsers /> });
  }
  if (user?.role === 'director') {
    navLinks.push({ href: '/dashboard/branches', label: 'الفروع', icon: <FiGitBranch /> });
    navLinks.push({ href: '/dashboard/reports', label: 'التقارير', icon: <FiBarChart2 /> });
  }

  return (
    <header className="bg-white/90 shadow-md sticky top-0 z-50 backdrop-blur-lg">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 justify-between items-center">
          {/* القائمة الجانبية للجوال */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-full text-primary-700 hover:bg-primary-100 focus:outline-none border-2 border-primary-100 shadow"
              aria-label="فتح القائمة"
            >
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          {/* شعار وعنوان */}
          <div className="flex items-center gap-4 select-none">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary-400 to-primary-700 flex items-center justify-center shadow-lg border-4 border-white hover:scale-105 transition-transform">
              <img src="/payment-system.jpg" alt="شعار النظام" className="w-10 h-10 rounded-full" />
            </div>
            <h1 className="text-2xl font-extrabold text-primary-800 tracking-tight drop-shadow-sm font-[Tajawal,Arial,sans-serif] bg-gradient-to-l from-primary-700 to-primary-500 bg-clip-text text-transparent">مكتب جاسم للحوالات</h1>
          </div>
          {/* روابط التنقل */}
          <div className="hidden md:flex gap-6 items-center">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1 px-2 py-1 rounded-lg font-semibold text-primary-700 hover:bg-primary-100 hover:text-primary-900 transition-all relative group"
              >
                <span className="text-lg">{link.icon}</span>
                <span>{link.label}</span>
                {/* خط سفلي متدرج عند التفعيل */}
                {/* يمكن تفعيل active link حسب المسار لاحقًا */}
                <span className="absolute left-0 right-0 -bottom-1 h-0.5 bg-gradient-to-l from-primary-600 to-primary-400 scale-x-0 group-hover:scale-x-100 transition-transform origin-right" />
              </Link>
            ))}
          </div>
          {/* شريط البحث */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 bg-primary-50 rounded-full px-4 py-2 mx-4 w-80 shadow-sm border border-primary-100 focus-within:ring-2 focus-within:ring-primary-200">
            <input
              type="text"
              className="bg-transparent outline-none flex-1 px-2 py-1 text-primary-800 placeholder:text-primary-400"
              placeholder="بحث متقدم... (اسم، رقم، ...الخ)"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit" className="text-primary-600 hover:text-primary-800 p-1.5 rounded-full transition hover:bg-primary-100">
              <FiSearch className="w-5 h-5" />
            </button>
          </form>
          {/* زر تسجيل الخروج */}
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-full font-semibold text-sm md:text-base transition shadow focus:ring-2 focus:ring-red-200 min-w-[90px] md:min-w-[110px] h-9 md:h-10"
              style={{lineHeight: 1.2}}
            >
              <FiLogOut className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </button>
          </div>
        </div>
        {/* قائمة الجوال */}
        {isMenuOpen && (
          <div className="md:hidden mt-2 bg-white/95 rounded-2xl shadow-xl p-4 flex flex-col gap-4 animate-fadeIn border border-primary-100">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-primary-700 hover:bg-primary-100 hover:text-primary-900 transition-all"
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="text-lg">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
            <form onSubmit={handleSearch} className="flex items-center gap-2 bg-primary-50 rounded-full px-3 py-2 mt-2 border border-primary-100">
              <input
                type="text"
                className="bg-transparent outline-none flex-1 px-2 py-1 text-primary-800 placeholder:text-primary-400"
                placeholder="بحث متقدم... (اسم، رقم، ...الخ)"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button type="submit" className="text-primary-600 hover:text-primary-800 p-1.5 rounded-full transition hover:bg-primary-100">
                <FiSearch className="w-5 h-5" />
              </button>
            </form>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-full font-semibold text-sm transition shadow focus:ring-2 focus:ring-red-200 mt-2 min-w-[90px] h-9"
              style={{lineHeight: 1.2}}
            >
              <FiLogOut className="w-4 h-4" />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </button>
          </div>
        )}
      </nav>
    </header>
  )
} 