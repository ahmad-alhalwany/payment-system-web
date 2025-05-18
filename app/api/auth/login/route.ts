import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    // تحقق الأدمن
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { 
          username,
          role: 'director',
          branchId: null
        },
        SECRET_KEY,
        { expiresIn: '24h' }
      )

      return NextResponse.json({
        token,
        role: 'director',
        message: 'تم تسجيل الدخول بنجاح'
      })
    }

    // تحقق مدير الفرع
    if (username === 'branch' && password === 'branch123') {
      const token = jwt.sign(
        {
          username,
          role: 'branch_manager',
          branchId: 'b1', // مثال: رمز الفرع
        },
        SECRET_KEY,
        { expiresIn: '24h' }
      )

      return NextResponse.json({
        token,
        role: 'branch_manager',
        branch_id: 'b1',
        username,
        user_id: '2',
        message: 'تم تسجيل الدخول بنجاح'
      })
    }

    // تحقق موظف التحويلات
    if (username === 'employee' && password === 'employee123') {
      const token = jwt.sign(
        {
          username,
          role: 'employee',
          branchId: 'b1',
        },
        SECRET_KEY,
        { expiresIn: '24h' }
      )

      return NextResponse.json({
        token,
        role: 'employee',
        branch_id: 'b1',
        username,
        user_id: '3',
        message: 'تم تسجيل الدخول بنجاح'
      })
    }

    return NextResponse.json(
      { message: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: 'حدث خطأ أثناء تسجيل الدخول' },
      { status: 500 }
    )
  }
} 