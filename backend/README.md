# Payment System Backend

## تحسينات المرحلة الأولى

تم تطبيق التحسينات التالية:

### 1. تحسينات الأمان
- ✅ تحسين CORS - إزالة `allow_origins=["*"]` واستخدام origins محددة
- ✅ إضافة Security Headers Middleware
- ✅ إضافة Input Validation و Sanitization
- ✅ تحسين Error Handling مع Custom Exceptions

### 2. تحسينات الأداء
- ✅ إضافة Rate Limiting Middleware
- ✅ تحسين Logging Middleware
- ✅ إضافة Health Check endpoint

### 3. تحسينات البنية
- ✅ تقسيم الكود إلى routers منفصلة
- ✅ إنشاء config.py للإعدادات
- ✅ إنشاء dependencies.py للـ dependencies المشتركة
- ✅ إنشاء exceptions.py للـ Custom Exceptions
- ✅ إنشاء middleware.py للـ Middlewares

### 4. Docker & Infrastructure
- ✅ إنشاء Dockerfile للـ Backend
- ✅ إنشاء docker-compose.yml شامل
- ✅ إضافة Health Checks

## البنية الجديدة

```
backend/
├── main.py              # نقطة الدخول الرئيسية
├── config.py            # إعدادات التطبيق
├── database.py          # إعدادات قاعدة البيانات
├── models.py            # نماذج قاعدة البيانات
├── security.py          # وظائف الأمان
├── cache.py             # إعدادات Redis Cache
├── exceptions.py        # Custom Exceptions
├── dependencies.py      # Shared Dependencies
├── middleware.py        # Custom Middlewares
├── routers/             # API Routers
│   ├── __init__.py
│   └── auth.py          # Authentication endpoints
├── utils/               # Utility functions
│   ├── __init__.py
│   └── validation.py    # Input validation
└── server_improved.py   # الملف القديم (للتوافق العكسي)
```

## الإعدادات (Environment Variables)

انظر إلى `.env.example` للحصول على قائمة كاملة بالإعدادات المتاحة.

### الإعدادات المهمة:

- `DATABASE_URL`: رابط قاعدة البيانات
- `SECRET_KEY`: مفتاح التشفير (يجب تغييره في الإنتاج)
- `CORS_ORIGINS`: قائمة origins المسموح بها (مفصولة بفواصل)
- `REDIS_HOST`, `REDIS_PORT`: إعدادات Redis
- `RATE_LIMIT_ENABLED`: تفعيل/تعطيل Rate Limiting
- `RATE_LIMIT_PER_MINUTE`: عدد الطلبات المسموح بها في الدقيقة

## التشغيل

### باستخدام Docker Compose (موصى به):

```bash
docker-compose up -d
```

### بدون Docker:

```bash
# تثبيت المتطلبات
pip install -r requirements.txt

# تشغيل الخادم
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - تسجيل الدخول
- `POST /api/v1/auth/register` - تسجيل مستخدم جديد (يتطلب manager)
- `POST /api/v1/auth/change-password` - تغيير كلمة المرور
- `POST /api/v1/auth/reset-password` - إعادة تعيين كلمة المرور (يتطلب manager)

### Health Check
- `GET /health` - فحص صحة التطبيق

## ملاحظات

- الملف `server_improved.py` لا يزال موجوداً للتوافق العكسي
- سيتم نقل جميع الـ endpoints تدريجياً إلى routers منفصلة
- استخدم `main.py` كنقطة الدخول الجديدة

## الخطوات التالية

1. نقل جميع endpoints إلى routers منفصلة
2. إضافة Unit Tests
3. تحسين Database Queries
4. إضافة Redis-based Rate Limiting
5. إضافة Monitoring و Logging محسّن

