"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { FiMenu, FiX, FiHome, FiUsers, FiRepeat, FiPlusCircle, FiBarChart2, FiBox, FiSettings, FiGitBranch } from "react-icons/fi";

export default function ManagerSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // عناصر القائمة مع الأيقونات والمسارات
  const navItems = [
    { href: "/dashboard/director", label: "الرئيسية", icon: <FiHome /> },
    { href: "/dashboard/branches", label: "إدارة الفروع", icon: <FiGitBranch /> },
    { href: "/dashboard/employees", label: "إدارة الموظفين", icon: <FiUsers /> },
    { href: "/dashboard/transactions", label: "التحويلات", icon: <FiRepeat /> },
    { href: "/money-transfer?role=director", label: "تحويل جديد", icon: <FiPlusCircle />, special: true },
    { href: "/dashboard/reports", label: "التقارير", icon: <FiBarChart2 /> },
    { href: "/dashboard/inventory", label: "المخزون", icon: <FiBox /> },
    { href: "/dashboard/settings", label: "الإعدادات", icon: <FiSettings /> },
  ];

  return (
    <>
      {/* الزر الجانبي العصري - يظهر فقط في الشاشات الصغيرة */}
      <button
        className="fixed top-6 left-3 z-50 bg-white/60 backdrop-blur-lg text-primary-700 p-2 rounded-2xl shadow-lg transition hover:bg-primary-100 focus:outline-none border border-primary-200 md:hidden"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "إغلاق القائمة الجانبية" : "فتح القائمة الجانبية"}
        style={{ boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)" }}
      >
        {open ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* طبقة تعتيم عند فتح القائمة - تظهر فقط في الشاشات الصغيرة */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 transition-opacity duration-300 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* الشريط الجانبي */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-40 transition-transform duration-500 ease-[cubic-bezier(.68,-0.55,.27,1.55)]
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:block
        `}
        style={{ direction: "rtl" }}
      >
        {/* تأثير زجاجي وتدرج وعمق */}
        <div className="relative h-full flex flex-col rounded-3xl shadow-2xl overflow-hidden border border-primary-100 backdrop-blur-2xl bg-gradient-to-br from-white/80 via-primary-50/60 to-primary-100/60">
          {/* الشعار والتدرج المتحرك */}
          <div className="flex flex-col items-center gap-2 pt-8 pb-4 px-4 bg-gradient-to-tr from-primary-400 via-primary-500 to-primary-700 animate-gradient-x shadow-inner rounded-b-3xl">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary-200 via-primary-400 to-primary-700 flex items-center justify-center shadow-xl border-4 border-white animate-pulse">
              <span className="text-4xl text-white font-bold">💸</span>
            </div>
            <span className="text-white font-bold text-lg tracking-wide drop-shadow">لوحة المدير</span>
            <span className="text-primary-100 text-xs mt-1">مرحباً بك 👋</span>
          </div>
          {/* عناصر القائمة */}
          <nav className="flex flex-col gap-2 mt-8 px-4">
            {navItems.map(({ href, label, icon, special }, idx) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-2 rounded-2xl font-medium select-none transition-all duration-200 relative
                    ${isActive ? "bg-gradient-to-l from-primary-400/80 to-primary-200/80 text-primary-900 shadow-lg border-r-8 border-primary-600" : "text-primary-700 hover:bg-primary-100/80 hover:scale-[1.03]"}
                    ${special ? "bg-gradient-to-l from-green-200 to-green-100 text-green-800 hover:from-green-300 hover:to-green-200 font-bold border-0" : ""}
                  `}
                  style={isActive ? { boxShadow: "0 2px 16px 0 rgba(80,120,255,0.10)" } : {}}
                  onClick={() => setOpen(false)}
                >
                  <span className={`text-2xl transition-colors duration-200 ${isActive ? "text-primary-800" : special ? "text-green-600" : "text-primary-400 group-hover:text-primary-600"}`}>{icon}</span>
                  <span className="text-base">{label}</span>
                  {/* حد جانبي متحرك للعنصر النشط */}
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary-600 to-primary-400 rounded-full animate-pulse" />}
                </Link>
              );
            })}
      </nav>
        </div>
    </aside>
    </>
  );
} 