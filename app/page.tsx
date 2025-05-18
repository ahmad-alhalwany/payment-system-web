"use client";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-gradient-to-br from-primary-100 via-white to-primary-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-500">
      {/* شعار كبير */}
      <header className="w-full flex flex-col items-center pt-12">
        <div className="relative flex items-center justify-center w-[150px] h-[150px] rounded-full bg-gradient-to-br from-primary-100 via-white to-primary-200 dark:from-primary-800 dark:to-primary-900 shadow-xl border-4 border-primary-200 dark:border-primary-700 mb-4">
          <Image
          src="/payment-system.jpg"
          alt="شعار النظام"
            width={110}
            height={110}
            className="rounded-full object-contain drop-shadow-lg"
            priority
          />
          <span className="absolute inset-0 rounded-full ring-4 ring-primary-300 dark:ring-primary-600 animate-pulse"></span>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-primary-900 dark:text-primary-200 mb-2 tracking-tight font-[Tajawal, Cairo, sans-serif] drop-shadow-lg">
          نظام إدارة المدفوعات
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-6 font-medium max-w-2xl text-center">
          منصة متكاملة وآمنة لإدارة الحوالات المالية والفروع والموظفين بسهولة واحترافية.
        </p>
        {/* أزرار رئيسية */}
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-l from-primary-600 to-primary-400 dark:from-primary-700 dark:to-primary-500 text-white rounded-2xl text-xl font-bold shadow-lg hover:scale-105 hover:from-primary-700 hover:to-primary-500 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-200 dark:focus:ring-primary-800">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 12l3-3m0 0l-3-3m3 3H9" />
            </svg>
          تسجيل الدخول
        </Link>
          <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-l from-primary-600 to-primary-400 dark:from-primary-700 dark:to-primary-500 text-white rounded-2xl text-xl font-bold shadow-lg hover:scale-105 hover:from-primary-700 hover:to-primary-500 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-200 dark:focus:ring-primary-800">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 12l3-3m0 0l-3-3m3 3H9" />
            </svg>
            دخول المدير
          </Link>
          <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-l from-primary-400 to-primary-200 dark:from-primary-600 dark:to-primary-400 text-primary-900 dark:text-white rounded-2xl text-xl font-bold shadow-lg hover:scale-105 hover:from-primary-500 hover:to-primary-300 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-200 dark:focus:ring-primary-800">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h4m0 0V7m0 4l-4-4m4 4l4-4" />
            </svg>
            دخول مدير الفرع
          </Link>
        </div>
      </header>

      {/* قسم الميزات */}
      <section id="features" className="w-full max-w-5xl mx-auto py-12 px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white/90 dark:bg-gray-900/80 rounded-2xl shadow-xl p-8 flex flex-col items-center hover:scale-105 transition-transform duration-200 border-t-4 border-primary-400 dark:border-primary-700">
          <svg className="w-14 h-14 mb-4 text-primary-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /></svg>
          <h3 className="text-2xl font-bold mb-2 text-primary-800 dark:text-primary-200">تحويل أموال سريع وآمن</h3>
          <p className="text-gray-600 dark:text-gray-300 text-center">إرسال واستقبال الحوالات المالية بين الفروع والعملاء بسرعة وأمان تام مع تتبع كامل لكل العمليات.</p>
        </div>
        <div className="bg-white/90 dark:bg-gray-900/80 rounded-2xl shadow-xl p-8 flex flex-col items-center hover:scale-105 transition-transform duration-200 border-t-4 border-primary-400 dark:border-primary-700">
          <svg className="w-14 h-14 mb-4 text-primary-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h4m0 0V7m0 4l-4-4m4 4l4-4" /></svg>
          <h3 className="text-2xl font-bold mb-2 text-primary-800 dark:text-primary-200">إدارة الفروع والموظفين</h3>
          <p className="text-gray-600 dark:text-gray-300 text-center">إدارة جميع الفروع والموظفين من مكان واحد مع صلاحيات مرنة وتقارير مفصلة.</p>
        </div>
        <div className="bg-white/90 dark:bg-gray-900/80 rounded-2xl shadow-xl p-8 flex flex-col items-center hover:scale-105 transition-transform duration-200 border-t-4 border-primary-400 dark:border-primary-700">
          <svg className="w-14 h-14 mb-4 text-primary-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0V4m0 8v8" /></svg>
          <h3 className="text-2xl font-bold mb-2 text-primary-800 dark:text-primary-200">تقارير مالية متقدمة</h3>
          <p className="text-gray-600 dark:text-gray-300 text-center">احصل على تقارير مالية دقيقة وتحليلات لحظية تساعدك في اتخاذ القرار بثقة.</p>
      </div>
      </section>

      {/* قسم تواصل معنا */}
      <section id="contact" className="w-full max-w-3xl mx-auto py-10 px-4 flex flex-col items-center">
        <h2 className="text-3xl font-bold text-primary-800 dark:text-primary-200 mb-4">تواصل معنا</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6 text-center max-w-xl">
          لديك استفسار أو تحتاج إلى دعم؟ فريقنا جاهز لمساعدتك في أي وقت.
        </p>
        <a href="mailto:support@paymentsystem.com" className="px-8 py-3 bg-primary-600 text-white rounded-xl text-lg font-bold shadow hover:bg-primary-700 transition">راسلنا عبر البريد الإلكتروني</a>
      </section>

      {/* تذييل */}
      <footer className="w-full py-6 text-center text-xs text-gray-400 dark:text-gray-500 select-none border-t border-primary-100 dark:border-primary-800 bg-white/60 dark:bg-gray-900/60 mt-8">
        &copy; {new Date().getFullYear()} جميع الحقوق محفوظة لنظام إدارة المدفوعات
      </footer>

      <style jsx global>{`
        body { font-family: 'Tajawal', 'Cairo', sans-serif; }
      `}</style>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&family=Cairo:wght@400;700;900&display=swap" rel="stylesheet" />
    </div>
  );
}
