"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { FiHome, FiRepeat, FiLogOut, FiMenu, FiX } from "react-icons/fi";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // روابط التنقل
  const navLinks = [
    { href: "/", label: "الرئيسية", icon: <FiHome /> },
    { href: "/money-transfer", label: "التحويلات", icon: <FiRepeat /> },
  ];

  // إخفاء القائمة عند تغيير الصفحة
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // لا تظهر Header في صفحة Login
  if (pathname === "/login" || pathname === "/unauthorized") {
    return null;
  }

  return (
    <header className="bg-white shadow-md border-b border-primary-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* شعار وعنوان */}
          <div className="flex items-center gap-4 select-none">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary-400 to-primary-700 flex items-center justify-center shadow-lg border-4 border-white hover:scale-105 transition-transform">
              <img src="/payment-system.jpg" alt="شعار النظام" className="w-10 h-10 rounded-full" />
            </div>
            <h1 className="text-2xl font-extrabold text-primary-800 tracking-tight drop-shadow-sm font-[Tajawal,Arial,sans-serif] bg-gradient-to-l from-primary-700 to-primary-500 bg-clip-text text-transparent">
              مكتب الجاسم للحوالات
            </h1>
          </div>

          {/* روابط التنقل */}
          <div className="hidden md:flex gap-6 items-center">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  pathname === link.href
                    ? "bg-primary-100 text-primary-700 font-semibold"
                    : "text-gray-700 hover:bg-primary-50 hover:text-primary-600"
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          {/* معلومات المستخدم وزر تسجيل الخروج */}
          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">{user.username}</span>
                <span className="text-primary-600">({user.role === "director" ? "مدير" : user.role === "branch_manager" ? "مدير فرع" : "موظف"})</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium shadow-sm hover:shadow-md"
            >
              <FiLogOut />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </button>

            {/* زر القائمة للجوال */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
          </div>
        </div>

        {/* القائمة المنسدلة للجوال */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-primary-200">
            <div className="flex flex-col gap-2">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    pathname === link.href
                      ? "bg-primary-100 text-primary-700 font-semibold"
                      : "text-gray-700 hover:bg-primary-50 hover:text-primary-600"
                  }`}
                >
                  <span className="text-lg">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
