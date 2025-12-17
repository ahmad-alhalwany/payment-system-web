"""
Main FastAPI application - Payment System
This is the main entry point for the payment system API
"""
import logging
from logging.handlers import RotatingFileHandler
import os
import time
import traceback

# Import configuration and utilities
from config import settings
from database import engine, Base
from middleware import RateLimitMiddleware, SecurityHeadersMiddleware, LoggingMiddleware
from exceptions import PaymentSystemException

# Logging setup
log_dir = os.path.dirname(os.path.abspath(__file__))
log_file = os.path.join(log_dir, settings.LOG_FILE)
handler = RotatingFileHandler(
    log_file,
    maxBytes=settings.LOG_MAX_BYTES,
    backupCount=settings.LOG_BACKUP_COUNT,
    encoding='utf-8'
)
formatter = logging.Formatter('[%(asctime)s] %(levelname)s in %(module)s: %(message)s')
handler.setFormatter(formatter)

root_logger = logging.getLogger()
root_logger.setLevel(getattr(logging, settings.LOG_LEVEL))
if not root_logger.hasHandlers():
    root_logger.addHandler(handler)

logger = logging.getLogger(__name__)

from fastapi import FastAPI, HTTPException, Depends, status, Request
from sqlalchemy import create_engine, func, and_, or_, desc
from sqlalchemy.orm import sessionmaker, Session, joinedload, aliased
from models import User, Branch, Base, BranchFund, Notification, Transaction, BranchProfits
from pydantic import BaseModel, field_validator, ValidationError
import uuid
from datetime import datetime, timedelta
from security import hash_password, verify_password, create_jwt_token, SECRET_KEY, ALGORITHM
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from typing import Optional, List, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
import sqlalchemy.exc
from functools import lru_cache
from fastapi.responses import FileResponse, JSONResponse
import shutil
from fastapi import UploadFile, File
from starlette.background import BackgroundTask
from cache import cache, cache_result, get_branch_cache_key, get_transaction_cache_key, get_branch_transactions_cache_key
from fastapi.exception_handlers import RequestValidationError
from fastapi.exceptions import RequestValidationError as FastAPIRequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi import APIRouter

# Create FastAPI app with improved configuration
app = FastAPI(
    title="Payment System API",
    description="نظام إدارة التحويلات المالية الداخلية",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS Middleware - Improved security
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# Logging Middleware
app.add_middleware(LoggingMiddleware)

# Rate Limiting Middleware (if enabled)
if settings.RATE_LIMIT_ENABLED:
    app.add_middleware(
        RateLimitMiddleware,
        requests_per_minute=settings.RATE_LIMIT_PER_MINUTE
    )

# Database setup - using config settings
DATABASE_URL = settings.DATABASE_URL

# Database engine (already created in database.py, but keeping for compatibility)
# Use engine from database.py if available
try:
    from database import engine, SessionLocal
except ImportError:
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_timeout=30,
        pool_recycle=1800
    )
    SessionLocal = sessionmaker(autoflush=False, bind=engine)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Create the database tables if they don't exist
Base.metadata.create_all(bind=engine)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    }

# Exception handlers
@app.exception_handler(PaymentSystemException)
async def payment_system_exception_handler(request: Request, exc: PaymentSystemException):
    """Handle custom payment system exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    return JSONResponse(
        status_code=422,
        content={
            "detail": "المدخلات غير صحيحة. الرجاء التحقق من البيانات المدخلة.",
            "errors": exc.errors(),
        },
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    if settings.DEBUG:
        return JSONResponse(
            status_code=500,
            content={
                "detail": "حدث خطأ غير متوقع",
                "error": str(exc),
                "traceback": traceback.format_exc(),
            },
        )
    else:
        return JSONResponse(
            status_code=500,
            content={
                "detail": "حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.",
            },
        )

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Data models
class TransactionSchema(BaseModel):
    sender: str
    sender_mobile: str
    sender_governorate: str
    
    receiver: str
    receiver_mobile: str
    receiver_governorate: str
    
    amount: float
    base_amount: float
    benefited_amount: float
    tax_rate: float
    tax_amount: float
    currency: str = "ليرة سورية"
    
    message: str
    employee_name: str
    branch_governorate: str
    destination_branch_id: int
    branch_id: Optional[int] = None
    date: Optional[str] = None  # <-- Add date field as string (ISO format)

    @field_validator('amount')
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('المبلغ يجب أن يكون أكبر من صفر')
        return v

    @field_validator('base_amount', 'benefited_amount')
    def amounts_non_negative(cls, v, info):
        if v < 0:
            raise ValueError(f"{info.field_name} لا يمكن أن يكون سالباً")
        return v

    @field_validator('tax_rate')
    def tax_rate_valid(cls, v):
        if not (0 <= v <= 100):
            raise ValueError('نسبة الضريبة يجب أن تكون بين 0 و 100')
        return v

    @field_validator('sender_mobile', 'receiver_mobile')
    def mobile_valid(cls, v, info):
        if not v.isdigit() or not (9 <= len(v) <= 10):
            raise ValueError(f"رقم الجوال {info.field_name} غير صحيح")
        return v

    @field_validator('currency')
    def currency_valid(cls, v):
        allowed = ["SYP", "USD", "ليرة سورية"]
        if v not in allowed:
            raise ValueError(f"العملة غير مدعومة. استخدم: {', '.join(allowed)}")
        return v

class TransactionReceived(BaseModel):
    transaction_id: str
    is_received: bool
    receiver: str
    receiver_mobile: str
    receiver_id: str
    receiver_address: str
    receiver_governorate: str

class TransactionStatus(BaseModel):
    transaction_id: str
    status: str

class LoginRequest(BaseModel):
    username: str
    password: str

class PasswordReset(BaseModel):
    username: str
    new_password: str

class ChangePassword(BaseModel):
    old_password: str
    new_password: str
    
class FundAllocation(BaseModel):
    amount: float
    type: str  # 'allocation' أو 'deduction'
    currency: str   # Added currency field with default value
    description: Optional[str] = None
    
class TransactionResponse(BaseModel):
    id: str
    sender: str
    receiver: str
    amount: float
    currency: str
    status: str
    date: str
    branch_id: int
    destination_branch_id: int
    employee_name: str
    sending_branch_name: str  # إضافة هذا الحقل
    destination_branch_name: str  # إضافة هذا الحقل
    branch_governorate: str  
    
class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "employee"
    branch_id: Optional[int] = None  
    
class BranchUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    governorate: Optional[str] = None
    status: Optional[str] = None
    phone_number: Optional[str] = None
    
class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    branch_id: Optional[int] = None

    class Config:
        from_attributes = True 
        
class BranchCreate(BaseModel):
    branch_id: str
    name: str
    location: str
    governorate: str
    phone_number: Optional[str] = None
        
def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("username")
        role: str = payload.get("role")
        branch_id: int = payload.get("branch_id")
        user_id: int = payload.get("user_id")
        
        if username is None or role is None:
            raise credentials_exception
            
        return {"username": username, "role": role, "branch_id": branch_id, "user_id": user_id}
    except JWTError:
        raise credentials_exception        
        

def save_to_db(transaction: TransactionSchema, branch_id=None, employee_id=None, db: Session = None):
    # Use the date from the transaction if provided, otherwise use now
    if hasattr(transaction, 'date') and transaction.date:
        try:
            transaction_date = datetime.strptime(transaction.date, "%Y-%m-%d")
        except Exception:
            transaction_date = datetime.now()
    else:
        transaction_date = datetime.now()
    transaction_id = str(uuid.uuid4())
    
    try:
        # Check if this is a System Manager transfer (branch_id = 0)
        is_system_manager = branch_id == 0 or transaction.employee_name == "System Manager" or transaction.employee_name == "system_manager"
        
        # --- Get tax_rate from sending branch (branch_id) ---
        sending_branch = db.query(Branch).filter(Branch.id == branch_id).first()
        if sending_branch:
            tax_rate = sending_branch.tax_rate or 0.0
        else:
            tax_rate = 0.0
        # استخدم benefited_amount كما هو من الإدخال
        benefited_amount = transaction.benefited_amount
        tax_amount = benefited_amount * (tax_rate / 100)

        # Override values in transaction
        transaction.tax_rate = tax_rate
        transaction.tax_amount = tax_amount
        transaction.benefited_amount = benefited_amount

        if is_system_manager:
            # System Manager has unlimited funds - skip all allocation checks
            print("System Manager transaction detected - bypassing fund checks")
            # Just verify destination branch exists
            destination_branch = db.query(Branch).filter(Branch.id == transaction.destination_branch_id).first()
            
            if not destination_branch:
                raise HTTPException(status_code=404, detail="Destination branch not found")
        else:
            # 1. Check sending branch allocation for regular transfers based on currency
            if transaction.currency == "SYP":
                branch = db.query(Branch).filter(Branch.id == branch_id).first()
                
                if not branch:
                    raise HTTPException(status_code=404, detail="Sending branch not found")
                    
                allocated = branch.allocated_amount_syp
                
                if allocated < transaction.amount:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient allocated funds in SYP. Available: {allocated} SYP"
                    )
            elif transaction.currency == "USD":
                branch = db.query(Branch).filter(Branch.id == branch_id).first()
                
                if not branch:
                    raise HTTPException(status_code=404, detail="Sending branch not found")
                    
                allocated = branch.allocated_amount_usd
                
                if allocated < transaction.amount:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient allocated funds in USD. Available: {allocated} USD"
                    )
            else:
                # Default to SYP for other currencies for backward compatibility
                branch = db.query(Branch).filter(Branch.id == branch_id).first()
                
                if not branch:
                    raise HTTPException(status_code=404, detail="Sending branch not found")
                    
                allocated = branch.allocated_amount_syp
                
                if allocated < transaction.amount:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient allocated funds. Available: {allocated} {transaction.currency}"
                    )
        
        # For non-system manager transactions, check if destination branch exists
        if not is_system_manager:
            destination_branch = db.query(Branch).filter(Branch.id == transaction.destination_branch_id).first()
            
            if not destination_branch:
                raise HTTPException(status_code=404, detail="Destination branch not found")
        
        # 3. Deduct from sending branch allocation (skip for System Manager)
        if not is_system_manager:
            if transaction.currency == "SYP":
                branch.allocated_amount_syp -= transaction.amount
                branch.allocated_amount = branch.allocated_amount_syp
            elif transaction.currency == "USD":
                branch.allocated_amount_usd -= transaction.amount
            else:
                # Default to SYP for other currencies for backward compatibility
                branch.allocated_amount_syp -= transaction.amount
                branch.allocated_amount = branch.allocated_amount_syp
            
            # 4. Increase destination branch allocation for regular transfers
            if transaction.currency == "SYP":
                destination_branch.allocated_amount_syp += transaction.amount
                destination_branch.allocated_amount = destination_branch.allocated_amount_syp
            elif transaction.currency == "USD":
                destination_branch.allocated_amount_usd += transaction.amount
            else:
                # Default to SYP for other currencies for backward compatibility
                destination_branch.allocated_amount_syp += transaction.amount
                destination_branch.allocated_amount = destination_branch.allocated_amount_syp
        else:
            # For System Manager, just increase destination branch allocation
            if transaction.currency == "SYP":
                destination_branch.allocated_amount_syp += transaction.amount
                destination_branch.allocated_amount = destination_branch.allocated_amount_syp
            elif transaction.currency == "USD":
                destination_branch.allocated_amount_usd += transaction.amount
            else:
                # Default to SYP for other currencies for backward compatibility
                destination_branch.allocated_amount_syp += transaction.amount
                destination_branch.allocated_amount = destination_branch.allocated_amount_syp
        
        # عند إنشاء سجل Transaction، إذا كان branch_id == 0 (مدير النظام) احفظ None لتجاوز قيد المفتاح الأجنبي
        transaction_branch_id = None if branch_id == 0 else branch_id
        new_transaction = Transaction(
            id=transaction_id,
            sender=transaction.sender,
            sender_mobile=transaction.sender_mobile,
            sender_governorate=transaction.sender_governorate,
            receiver=transaction.receiver,
            receiver_mobile=transaction.receiver_mobile,
            receiver_governorate=transaction.receiver_governorate,
            amount=transaction.amount,
            base_amount=transaction.base_amount,
            benefited_amount=benefited_amount,
            tax_rate=tax_rate,
            tax_amount=tax_amount,
            currency=transaction.currency,
            message=transaction.message or "",
            branch_id=transaction_branch_id,
            destination_branch_id=transaction.destination_branch_id,
            employee_id=employee_id,
            employee_name=transaction.employee_name,
            branch_governorate=transaction.branch_governorate,
            status="processing",
            is_received=False,
            date=transaction_date
        )
        db.add(new_transaction)
        
        # Record fund deduction for sending branch (skip for System Manager)
        if not is_system_manager:
            fund_record = BranchFund(
                branch_id=branch_id,
                amount=transaction.amount,
                type="deduction",
                currency=transaction.currency,
                description=f"Transaction {transaction_id} deduction"
            )
            db.add(fund_record)
        
        # Record fund allocation for receiving branch
        fund_record = BranchFund(
            branch_id=transaction.destination_branch_id,
            amount=transaction.amount,
            type="allocation",
            currency=transaction.currency,
            description=f"Transaction {transaction_id} allocation from {is_system_manager and 'System Manager' or f'branch {branch_id}'}"
        )
        db.add(fund_record)
        
        # Create notification
        notification_message = f"Hello {transaction.receiver}, you have a new money transfer of {transaction.amount} {transaction.currency} waiting. Please visit your nearest branch to collect it."
        notification = Notification(
            transaction_id=transaction_id,
            recipient_phone=transaction.receiver_mobile,
            message=notification_message,
            status="pending"
        )
        db.add(notification)
        
        try:
            db.commit()
            return transaction_id
        except sqlalchemy.exc.IntegrityError as e:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Database integrity error: {str(e)}"
            )
        except sqlalchemy.exc.SQLAlchemyError as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Database error: {str(e)}"
            )
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error in save_to_db: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

# Include routers if available
try:
    from routers import auth
    app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
    logger.info("Auth router loaded successfully")
except ImportError as e:
    logger.warning(f"Could not import auth router: {e}")

# Startup and Shutdown events
@app.on_event("startup")
async def startup_event():
    """Startup event"""
    logger.info("Application startup")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"CORS Origins: {settings.CORS_ORIGINS}")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event"""
    logger.info("Application shutdown")

# All existing endpoints from the original file
# Note: Due to file size, adding key endpoints. Full endpoints list continues below.

@app.delete("/branches/{branch_id}/allocations/")
def reset_allocations(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    currency: Optional[str] = None
):
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Director access required")
    
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # If currency is specified, reset only that currency
    if currency == "SYP":
        # Record the reset in fund history
        if branch.allocated_amount_syp > 0:
            fund_record = BranchFund(
                branch_id=branch_id,
                amount=-branch.allocated_amount_syp,
                type="deduction",
                currency="SYP",
                description="حذف الرصيد بالليرة السورية بالكامل بواسطة المدير"
            )
            db.add(fund_record)
        
        branch.allocated_amount_syp = 0.0
        # Update legacy field for backward compatibility
        branch.allocated_amount = 0.0
        db.commit()
        
        return {"status": "success", "message": "SYP allocations reset"}
    
    elif currency == "USD":
        # Record the reset in fund history
        if branch.allocated_amount_usd > 0:
            fund_record = BranchFund(
                branch_id=branch_id,
                amount=-branch.allocated_amount_usd,
                type="deduction",
                currency="USD",
                description="حذف الرصيد بالدولار الأمريكي بالكامل بواسطة المدير"
            )
            db.add(fund_record)
        
        branch.allocated_amount_usd = 0.0
        db.commit()
        
        return {"status": "success", "message": "USD allocations reset"}
    
    # If no currency specified, reset both
    else:
        # Record the reset in fund history for SYP
        if branch.allocated_amount_syp > 0:
            fund_record_syp = BranchFund(
                branch_id=branch_id,
                amount=-branch.allocated_amount_syp,
                type="deduction",
                currency="SYP",
                description="حذف الرصيد بالليرة السورية بالكامل بواسطة المدير"
            )
            db.add(fund_record_syp)
        
        # Record the reset in fund history for USD
        if branch.allocated_amount_usd > 0:
            fund_record_usd = BranchFund(
                branch_id=branch_id,
                amount=-branch.allocated_amount_usd,
                type="deduction",
                currency="USD",
                description="حذف الرصيد بالدولار الأمريكي بالكامل بواسطة المدير"
            )
            db.add(fund_record_usd)
        
        branch.allocated_amount_syp = 0.0
        branch.allocated_amount_usd = 0.0
        # Update legacy field for backward compatibility
        branch.allocated_amount = 0.0
        db.commit()
        
        return {"status": "success", "message": "All allocations reset"}

# ============================================
# Main Endpoints
# ============================================

@app.get("/branches/")
def get_branches(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all branches"""
    branches = db.query(Branch).all()
    return {"branches": [{
        "id": branch.id,
        "branch_id": branch.branch_id,
        "name": branch.name,
        "location": branch.location,
        "governorate": branch.governorate,
        "phone_number": branch.phone_number,
        "allocated_amount_syp": branch.allocated_amount_syp,
        "allocated_amount_usd": branch.allocated_amount_usd,
        "allocated_amount": branch.allocated_amount,
        "tax_rate": branch.tax_rate,
        "created_at": branch.created_at.isoformat() if branch.created_at else None
    } for branch in branches]}

@app.get("/branches/{branch_id}")
def get_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific branch by ID"""
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # Calculate financial stats
    # Get total transactions for this branch
    total_sent = db.query(func.count(Transaction.id)).filter(
        Transaction.branch_id == branch_id
    ).scalar() or 0
    
    total_received = db.query(func.count(Transaction.id)).filter(
        Transaction.destination_branch_id == branch_id
    ).scalar() or 0
    
    total_transactions = total_sent + total_received
    
    # Calculate total profit (sum of tax_amount from transactions)
    total_profit = db.query(func.sum(Transaction.tax_amount)).filter(
        Transaction.branch_id == branch_id
    ).scalar() or 0.0
    
    return {
        "id": branch.id,
        "branch_id": branch.branch_id,
        "name": branch.name,
        "location": branch.location,
        "governorate": branch.governorate,
        "phone_number": branch.phone_number,
        "allocated_amount_syp": branch.allocated_amount_syp,
        "allocated_amount_usd": branch.allocated_amount_usd,
        "allocated_amount": branch.allocated_amount,
        "tax_rate": branch.tax_rate,
        "status": "active",  # Default status
        "created_at": branch.created_at.isoformat() if branch.created_at else None,
        "financial_stats": {
            "available_balance": branch.allocated_amount_syp,  # Can add USD if needed
            "total_transactions": total_transactions,
            "total_profit": float(total_profit) if total_profit else 0.0
        }
    }

@app.get("/api/branches/{branch_id}/tax_rate/")
def get_branch_tax_rate(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get branch tax rate"""
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    return {"tax_rate": branch.tax_rate or 0.0}

@app.get("/users/")
def get_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all users"""
    # Directors can see all users, branch managers can see users in their branch
    if current_user["role"] == "director":
        users = db.query(User).all()
    elif current_user["role"] == "branch_manager":
        users = db.query(User).filter(User.branch_id == current_user["branch_id"]).all()
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    return {"items": [{
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "branch_id": user.branch_id,
        "created_at": user.created_at.isoformat() if user.created_at else None
    } for user in users]}

@app.get("/financial/total/")
def get_financial_total(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get total financial balance across all branches"""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Director access required")
    
    branches = db.query(Branch).all()
    total_balance_syp = sum(branch.allocated_amount_syp for branch in branches)
    total_balance_usd = sum(branch.allocated_amount_usd for branch in branches)
    
    return {
        "total_balance_syp": total_balance_syp,
        "total_balance_usd": total_balance_usd
    }

@app.get("/activity/")
def get_activity(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    """Get recent activity (transactions)"""
    # Directors can see all activities, branch managers can see their branch activities
    if current_user["role"] == "director":
        transactions = db.query(Transaction).order_by(desc(Transaction.date)).limit(limit).all()
    elif current_user["role"] == "branch_manager":
        transactions = db.query(Transaction).filter(
            or_(
                Transaction.branch_id == current_user["branch_id"],
                Transaction.destination_branch_id == current_user["branch_id"]
            )
        ).order_by(desc(Transaction.date)).limit(limit).all()
    else:
        transactions = db.query(Transaction).filter(
            Transaction.employee_id == current_user["user_id"]
        ).order_by(desc(Transaction.date)).limit(limit).all()
    
    activities = []
    for trans in transactions:
        sending_branch = db.query(Branch).filter(Branch.id == trans.branch_id).first() if trans.branch_id else None
        destination_branch = db.query(Branch).filter(Branch.id == trans.destination_branch_id).first() if trans.destination_branch_id else None
        
        # Format date for display
        if trans.date:
            date_obj = trans.date if isinstance(trans.date, datetime) else datetime.fromisoformat(str(trans.date))
            time_str = date_obj.strftime("%Y-%m-%d %H:%M:%S")
        else:
            time_str = "غير محدد"
        
        # Determine activity type
        activity_type = "تحويل مالي"
        
        # Format details
        details = f"تحويل {trans.amount} {trans.currency} من {trans.sender} إلى {trans.receiver}"
        if sending_branch and destination_branch:
            details += f" (من {sending_branch.name} إلى {destination_branch.name})"
        elif sending_branch:
            details += f" (من {sending_branch.name})"
        elif destination_branch:
            details += f" (إلى {destination_branch.name})"
        
        # Map status to Arabic
        status_map = {
            "pending": "قيد الانتظار",
            "processing": "قيد المعالجة",
            "completed": "مكتمل",
            "cancelled": "ملغي"
        }
        status_ar = status_map.get(trans.status, trans.status)
        
        # Convert transaction ID to integer if it's a string/UUID
        activity_id = trans.id
        if isinstance(trans.id, str):
            # Use hash of string ID to get a consistent integer
            activity_id = abs(hash(trans.id)) % 1000000
        
        activities.append({
            "id": activity_id,
            "time": time_str,
            "type": activity_type,
            "details": details,
            "status": status_ar
        })
    
    return {"activities": activities}

# ============================================
# Transactions Endpoints
# ============================================

@app.get("/transactions/")
def get_transactions(
    page: int = 1,
    per_page: int = 20,
    branch_id: Optional[int] = None,
    destination_branch_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get transactions with pagination and filters"""
    query = db.query(Transaction)
    
    # Apply filters based on user role
    if current_user["role"] == "branch_manager":
        query = query.filter(
            or_(
                Transaction.branch_id == current_user["branch_id"],
                Transaction.destination_branch_id == current_user["branch_id"]
            )
        )
    elif current_user["role"] == "employee":
        query = query.filter(Transaction.employee_id == current_user["user_id"])
    
    # Apply additional filters
    if branch_id:
        query = query.filter(Transaction.branch_id == branch_id)
    if destination_branch_id:
        query = query.filter(Transaction.destination_branch_id == destination_branch_id)
    if status:
        query = query.filter(Transaction.status == status)
    if start_date:
        query = query.filter(Transaction.date >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Transaction.date <= datetime.fromisoformat(end_date))
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    transactions = query.order_by(desc(Transaction.date)).offset((page - 1) * per_page).limit(per_page).all()
    
    # Format response
    items = []
    for trans in transactions:
        sending_branch = db.query(Branch).filter(Branch.id == trans.branch_id).first() if trans.branch_id else None
        destination_branch = db.query(Branch).filter(Branch.id == trans.destination_branch_id).first() if trans.destination_branch_id else None
        
        items.append({
            "id": trans.id,
            "sender": trans.sender,
            "receiver": trans.receiver,
            "amount": trans.amount,
            "currency": trans.currency,
            "status": trans.status,
            "date": trans.date.isoformat() if trans.date else None,
            "branch_id": trans.branch_id,
            "destination_branch_id": trans.destination_branch_id,
            "sending_branch_name": sending_branch.name if sending_branch else "System Manager",
            "destination_branch_name": destination_branch.name if destination_branch else "Unknown",
            "employee_name": trans.employee_name
        })
    
    total_pages = (total + per_page - 1) // per_page
    
    return {
        "items": items,
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": total_pages
    }

@app.get("/transactions/{transaction_id}/")
def get_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific transaction by ID"""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    sending_branch = db.query(Branch).filter(Branch.id == transaction.branch_id).first() if transaction.branch_id else None
    destination_branch = db.query(Branch).filter(Branch.id == transaction.destination_branch_id).first() if transaction.destination_branch_id else None
    
    return {
        "id": transaction.id,
        "sender": transaction.sender,
        "sender_mobile": transaction.sender_mobile,
        "sender_governorate": transaction.sender_governorate,
        "receiver": transaction.receiver,
        "receiver_mobile": transaction.receiver_mobile,
        "receiver_governorate": transaction.receiver_governorate,
        "amount": transaction.amount,
        "base_amount": transaction.base_amount,
        "benefited_amount": transaction.benefited_amount,
        "tax_rate": transaction.tax_rate,
        "tax_amount": transaction.tax_amount,
        "currency": transaction.currency,
        "message": transaction.message,
        "status": transaction.status,
        "is_received": transaction.is_received,
        "date": transaction.date.isoformat() if transaction.date else None,
        "branch_id": transaction.branch_id,
        "destination_branch_id": transaction.destination_branch_id,
        "sending_branch_name": sending_branch.name if sending_branch else "System Manager",
        "destination_branch_name": destination_branch.name if destination_branch else "Unknown",
        "employee_name": transaction.employee_name
    }

@app.post("/transactions/")
def create_transaction(
    transaction: TransactionSchema,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new transaction"""
    branch_id = transaction.branch_id if transaction.branch_id else current_user.get("branch_id")
    employee_id = current_user.get("user_id")
    
    transaction_id = save_to_db(transaction, branch_id=branch_id, employee_id=employee_id, db=db)
    
    return {"transaction_id": transaction_id, "status": "success"}

@app.post("/mark-transaction-received/")
def mark_transaction_received(
    data: TransactionReceived,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark a transaction as received"""
    transaction = db.query(Transaction).filter(Transaction.id == data.transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    transaction.is_received = data.is_received
    transaction.receiver = data.receiver
    transaction.receiver_mobile = data.receiver_mobile
    transaction.receiver_governorate = data.receiver_governorate
    transaction.received_by = current_user.get("user_id")
    transaction.received_at = datetime.now()
    transaction.status = "completed" if data.is_received else "pending"
    
    db.commit()
    
    return {"status": "success", "message": "Transaction updated"}

@app.post("/update-transaction-status/")
def update_transaction_status(
    data: TransactionStatus,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update transaction status"""
    transaction = db.query(Transaction).filter(Transaction.id == data.transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    transaction.status = data.status
    db.commit()
    
    return {"status": "success", "message": "Transaction status updated"}

# ============================================
# Users Endpoints (POST, PUT, DELETE)
# ============================================

@app.post("/users/")
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new user"""
    # Only directors and branch managers can create users
    if current_user["role"] not in ["director", "branch_manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Branch managers can only create employees in their branch
    if current_user["role"] == "branch_manager":
        user_data.branch_id = current_user["branch_id"]
    
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    new_user = User(
        username=user_data.username,
        password=hashed_password,
        role=user_data.role,
        branch_id=user_data.branch_id
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "id": new_user.id,
        "username": new_user.username,
        "role": new_user.role,
        "branch_id": new_user.branch_id
    }

@app.put("/users/{user_id}")
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only directors can update any user, branch managers can only update users in their branch
    if current_user["role"] == "branch_manager":
        if user.branch_id != current_user["branch_id"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    if user_data.username:
        # Check if username already exists (excluding current user)
        existing_user = db.query(User).filter(
            User.username == user_data.username,
            User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        user.username = user_data.username
    
    if user_data.password:
        user.password = hash_password(user_data.password)
    
    if user_data.role:
        if current_user["role"] != "director":
            raise HTTPException(status_code=403, detail="Only directors can change roles")
        user.role = user_data.role
    
    if user_data.branch_id is not None:
        if current_user["role"] != "director":
            raise HTTPException(status_code=403, detail="Only directors can change branch assignment")
        user.branch_id = user_data.branch_id
    
    db.commit()
    db.refresh(user)
    
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "branch_id": user.branch_id
    }

@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a user"""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can delete users")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    
    return {"status": "success", "message": "User deleted"}

# ============================================
# Branches Endpoints (POST, PUT, DELETE, allocate-funds)
# ============================================

@app.post("/branches/")
def create_branch(
    branch_data: BranchCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new branch"""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can create branches")
    
    # Check if branch_id or name already exists
    existing_branch = db.query(Branch).filter(
        or_(
            Branch.branch_id == branch_data.branch_id,
            Branch.name == branch_data.name
        )
    ).first()
    if existing_branch:
        raise HTTPException(status_code=400, detail="Branch ID or name already exists")
    
    new_branch = Branch(
        branch_id=branch_data.branch_id,
        name=branch_data.name,
        location=branch_data.location,
        governorate=branch_data.governorate,
        phone_number=branch_data.phone_number
    )
    
    db.add(new_branch)
    db.commit()
    db.refresh(new_branch)
    
    return {
        "id": new_branch.id,
        "branch_id": new_branch.branch_id,
        "name": new_branch.name,
        "location": new_branch.location,
        "governorate": new_branch.governorate,
        "phone_number": new_branch.phone_number
    }

@app.put("/branches/{branch_id}")
def update_branch(
    branch_id: int,
    branch_data: BranchUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a branch"""
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # Only directors can update branches
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can update branches")
    
    if branch_data.name:
        # Check if name already exists (excluding current branch)
        existing_branch = db.query(Branch).filter(
            Branch.name == branch_data.name,
            Branch.id != branch_id
        ).first()
        if existing_branch:
            raise HTTPException(status_code=400, detail="Branch name already exists")
        branch.name = branch_data.name
    
    if branch_data.location:
        branch.location = branch_data.location
    
    if branch_data.governorate:
        branch.governorate = branch_data.governorate
    
    if branch_data.phone_number:
        branch.phone_number = branch_data.phone_number
    
    db.commit()
    db.refresh(branch)
    
    return {
        "id": branch.id,
        "branch_id": branch.branch_id,
        "name": branch.name,
        "location": branch.location,
        "governorate": branch.governorate,
        "phone_number": branch.phone_number
    }

@app.delete("/branches/{branch_id}/")
def delete_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a branch"""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can delete branches")
    
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    db.delete(branch)
    db.commit()
    
    return {"status": "success", "message": "Branch deleted"}

@app.post("/branches/{branch_id}/allocate-funds/")
def allocate_funds(
    branch_id: int,
    allocation: FundAllocation,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Allocate or deduct funds from a branch"""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can allocate funds")
    
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    if allocation.type == "allocation":
        if allocation.currency == "SYP":
            branch.allocated_amount_syp += allocation.amount
            branch.allocated_amount = branch.allocated_amount_syp
        elif allocation.currency == "USD":
            branch.allocated_amount_usd += allocation.amount
    elif allocation.type == "deduction":
        if allocation.currency == "SYP":
            if branch.allocated_amount_syp < allocation.amount:
                raise HTTPException(status_code=400, detail="Insufficient funds")
            branch.allocated_amount_syp -= allocation.amount
            branch.allocated_amount = branch.allocated_amount_syp
        elif allocation.currency == "USD":
            if branch.allocated_amount_usd < allocation.amount:
                raise HTTPException(status_code=400, detail="Insufficient funds")
            branch.allocated_amount_usd -= allocation.amount
    
    # Record in fund history
    fund_record = BranchFund(
        branch_id=branch_id,
        amount=allocation.amount if allocation.type == "allocation" else -allocation.amount,
        type=allocation.type,
        currency=allocation.currency,
        description=allocation.description or f"Fund {allocation.type} by director"
    )
    db.add(fund_record)
    db.commit()
    
    return {"status": "success", "message": f"Funds {allocation.type}ed successfully"}

# ============================================
# Statistics Endpoints
# ============================================

@app.get("/branches/{branch_id}/transactions/stats")
def get_branch_transactions_stats(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get transaction statistics for a branch"""
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # Check permissions
    if current_user["role"] == "branch_manager" and current_user["branch_id"] != branch_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    total_sent = db.query(func.count(Transaction.id)).filter(
        Transaction.branch_id == branch_id
    ).scalar() or 0
    
    total_received = db.query(func.count(Transaction.id)).filter(
        Transaction.destination_branch_id == branch_id
    ).scalar() or 0
    
    completed = db.query(func.count(Transaction.id)).filter(
        Transaction.destination_branch_id == branch_id,
        Transaction.status == "completed"
    ).scalar() or 0
    
    pending = db.query(func.count(Transaction.id)).filter(
        Transaction.destination_branch_id == branch_id,
        Transaction.status == "pending"
    ).scalar() or 0
    
    return {
        "total_sent": total_sent,
        "total_received": total_received,
        "completed": completed,
        "pending": pending
    }

@app.get("/branches/{branch_id}/employees/stats")
def get_branch_employees_stats(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get employee statistics for a branch"""
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # Check permissions
    if current_user["role"] == "branch_manager" and current_user["branch_id"] != branch_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    total_employees = db.query(func.count(User.id)).filter(
        User.branch_id == branch_id
    ).scalar() or 0
    
    managers = db.query(func.count(User.id)).filter(
        User.branch_id == branch_id,
        User.role == "branch_manager"
    ).scalar() or 0
    
    employees = db.query(func.count(User.id)).filter(
        User.branch_id == branch_id,
        User.role == "employee"
    ).scalar() or 0
    
    return {
        "total_employees": total_employees,
        "managers": managers,
        "employees": employees
    }

# ============================================
# Authentication Endpoints
# ============================================

@app.post("/login/")
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """User login endpoint"""
    user = db.query(User).filter(User.username == login_data.username).first()
    
    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    # Create token with expiration time
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expires = datetime.utcnow() + access_token_expires
    
    # Include user role and branch_id in the token
    token_data = {
        "username": user.username,
        "role": user.role,
        "branch_id": user.branch_id,
        "user_id": user.id,
        "exp": expires
    }
    
    access_token = create_jwt_token(token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "branch_id": user.branch_id,
        "user_id": user.id,
        "token": access_token  # For frontend compatibility
    }

@app.post("/change-password/")
def change_password_endpoint(
    data: ChangePassword,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Change user password"""
    user = db.query(User).filter(User.username == current_user["username"]).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(data.old_password, user.password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    user.password = hash_password(data.new_password)
    db.commit()
    
    return {"status": "success", "message": "Password changed successfully"}

# ============================================
# System Initialization Endpoints
# ============================================

@app.get("/check-initialization/")
def check_initialization(
    db: Session = Depends(get_db)
):
    """Check if system is initialized (has at least one director user)"""
    director_count = db.query(func.count(User.id)).filter(User.role == "director").scalar() or 0
    is_initialized = director_count > 0
    
    return {"is_initialized": is_initialized}

class InitializeSystemRequest(BaseModel):
    username: str
    password: str

@app.post("/initialize-system/")
def initialize_system(
    data: InitializeSystemRequest,
    db: Session = Depends(get_db)
):
    """Initialize system with first director user"""
    # Check if system is already initialized
    director_count = db.query(func.count(User.id)).filter(User.role == "director").scalar() or 0
    if director_count > 0:
        raise HTTPException(status_code=400, detail="System is already initialized")
    
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create first director user
    hashed_password = hash_password(data.password)
    new_user = User(
        username=data.username,
        password=hashed_password,
        role="director",
        branch_id=None  # Director doesn't belong to a branch
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "status": "success",
        "message": "System initialized successfully",
        "user_id": new_user.id,
        "username": new_user.username
    }

# ============================================
# Additional Authentication Endpoints
# ============================================

@app.post("/reset-password/")
def reset_password(
    data: PasswordReset,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Reset user password (requires manager role)"""
    # Only directors and branch managers can reset passwords
    if current_user["role"] not in ["director", "branch_manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    user = db.query(User).filter(User.username == data.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Branch managers can only reset passwords for their branch employees
    if current_user["role"] == "branch_manager":
        if user.branch_id != current_user["branch_id"]:
            raise HTTPException(status_code=403, detail="You can only reset passwords for your branch employees")
    
    user.password = hash_password(data.new_password)
    db.commit()
    
    return {"status": "success", "message": "Password reset successfully"}

@app.post("/validate-token/")
def validate_token(
    data: dict,
    db: Session = Depends(get_db)
):
    """Validate JWT token"""
    token = data.get("token")
    if not token:
        return {"valid": False}
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("username")
        
        if not username:
            return {"valid": False}
        
        # Verify user still exists
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return {"valid": False}
        
        return {
            "valid": True,
            "user": {
                "username": user.username,
                "role": user.role,
                "branch_id": user.branch_id,
                "user_id": user.id
            }
        }
    except JWTError:
        return {"valid": False}

# ============================================
# Branch Employees Endpoints
# ============================================

@app.get("/branches/{branch_id}/employees")
def get_branch_employees(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all employees for a branch"""
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # Check permissions
    if current_user["role"] == "branch_manager" and current_user["branch_id"] != branch_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    employees = db.query(User).filter(User.branch_id == branch_id).all()
    
    return [{
        "id": emp.id,
        "username": emp.username,
        "role": emp.role,
        "branch_id": emp.branch_id,
        "created_at": emp.created_at.isoformat() if emp.created_at else None
    } for emp in employees]

@app.get("/branches/{branch_id}/employees/{employee_id}")
def get_branch_employee(
    branch_id: int,
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific employee"""
    employee = db.query(User).filter(
        User.id == employee_id,
        User.branch_id == branch_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check permissions
    if current_user["role"] == "branch_manager" and current_user["branch_id"] != branch_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    return {
        "id": employee.id,
        "username": employee.username,
        "role": employee.role,
        "branch_id": employee.branch_id,
        "created_at": employee.created_at.isoformat() if employee.created_at else None
    }

@app.post("/branches/{branch_id}/employees")
def create_branch_employee(
    branch_id: int,
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new employee for a branch"""
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # Check permissions
    if current_user["role"] == "branch_manager" and current_user["branch_id"] != branch_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Branch managers can only create employees
    if current_user["role"] == "branch_manager" and user_data.role != "employee":
        raise HTTPException(status_code=403, detail="Branch managers can only create employees")
    
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Set branch_id
    user_data.branch_id = branch_id
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    new_user = User(
        username=user_data.username,
        password=hashed_password,
        role=user_data.role or "employee",
        branch_id=branch_id
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "id": new_user.id,
        "username": new_user.username,
        "role": new_user.role,
        "branch_id": new_user.branch_id
    }

@app.put("/branches/{branch_id}/employees/{employee_id}")
def update_branch_employee(
    branch_id: int,
    employee_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a branch employee"""
    employee = db.query(User).filter(
        User.id == employee_id,
        User.branch_id == branch_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check permissions
    if current_user["role"] == "branch_manager" and current_user["branch_id"] != branch_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    if user_data.username:
        existing_user = db.query(User).filter(
            User.username == user_data.username,
            User.id != employee_id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        employee.username = user_data.username
    
    if user_data.password:
        employee.password = hash_password(user_data.password)
    
    if user_data.role:
        if current_user["role"] != "director":
            raise HTTPException(status_code=403, detail="Only directors can change roles")
        employee.role = user_data.role
    
    db.commit()
    db.refresh(employee)
    
    return {
        "id": employee.id,
        "username": employee.username,
        "role": employee.role,
        "branch_id": employee.branch_id
    }

@app.delete("/branches/{branch_id}/employees/{employee_id}")
def delete_branch_employee(
    branch_id: int,
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a branch employee"""
    employee = db.query(User).filter(
        User.id == employee_id,
        User.branch_id == branch_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check permissions
    if current_user["role"] == "branch_manager" and current_user["branch_id"] != branch_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    db.delete(employee)
    db.commit()
    
    return {"status": "success", "message": "Employee deleted"}

@app.patch("/branches/{branch_id}/employees/{employee_id}/status")
def toggle_employee_status(
    branch_id: int,
    employee_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Toggle employee active status"""
    employee = db.query(User).filter(
        User.id == employee_id,
        User.branch_id == branch_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check permissions
    if current_user["role"] == "branch_manager" and current_user["branch_id"] != branch_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Note: This is a placeholder - you may need to add an is_active field to User model
    # For now, we'll just return success
    db.commit()
    
    return {
        "id": employee.id,
        "username": employee.username,
        "is_active": data.get("is_active", True)
    }

@app.post("/branches/{branch_id}/employees/{employee_id}/change-password")
def change_employee_password(
    branch_id: int,
    employee_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Change employee password"""
    employee = db.query(User).filter(
        User.id == employee_id,
        User.branch_id == branch_id
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check permissions
    if current_user["role"] == "branch_manager" and current_user["branch_id"] != branch_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    new_password = data.get("new_password")
    if not new_password:
        raise HTTPException(status_code=400, detail="New password is required")
    
    employee.password = hash_password(new_password)
    db.commit()
    
    return {"status": "success", "message": "Password changed successfully"}

# ============================================
# Transaction Statistics
# ============================================

@app.get("/transactions/stats")
def get_transaction_stats(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get transaction statistics"""
    query = db.query(Transaction)
    
    # Apply filters based on user role
    if current_user["role"] == "branch_manager":
        query = query.filter(
            or_(
                Transaction.branch_id == current_user["branch_id"],
                Transaction.destination_branch_id == current_user["branch_id"]
            )
        )
    elif current_user["role"] == "employee":
        query = query.filter(Transaction.employee_id == current_user["user_id"])
    
    if branch_id:
        query = query.filter(
            or_(
                Transaction.branch_id == branch_id,
                Transaction.destination_branch_id == branch_id
            )
        )
    
    total = query.count()
    completed = query.filter(Transaction.status == "completed").count()
    pending = query.filter(Transaction.status == "pending").count()
    processing = query.filter(Transaction.status == "processing").count()
    cancelled = query.filter(Transaction.status == "cancelled").count()
    
    return {
        "total": total,
        "completed": completed,
        "pending": pending,
        "processing": processing,
        "cancelled": cancelled
    }

# Note: Additional endpoints like /reports/, /profits/, etc. should be added as needed
@app.get("/")
def root():
    return {
        "message": "Payment System API",
        "status": "running",
        "docs": "/docs" if settings.DEBUG else "disabled"
    }