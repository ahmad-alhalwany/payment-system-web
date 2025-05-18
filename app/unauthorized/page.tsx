import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-100 via-white to-red-200">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center border border-red-200">
        <div className="text-5xl mb-4 text-red-500">🚫</div>
        <h1 className="text-2xl font-bold mb-2 text-red-700">غير مصرح لك بالدخول</h1>
        <p className="mb-6 text-gray-700">ليس لديك الصلاحية للوصول إلى هذه الصفحة. إذا كنت تظن أن هذا خطأ، يرجى تسجيل الدخول بحساب آخر.</p>
        <div className="flex justify-center gap-4">
          <Link href="/" className="bg-primary-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-600 transition">الصفحة الرئيسية</Link>
          <Link href="/login" className="bg-gray-400 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-500 transition">تسجيل الدخول</Link>
        </div>
      </div>
    </div>
  );
} 