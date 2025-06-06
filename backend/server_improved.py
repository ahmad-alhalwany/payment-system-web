import logging
from logging.handlers import RotatingFileHandler
import os
import time

# Logging setup
log_dir = os.path.dirname(os.path.abspath(__file__))
log_file = os.path.join(log_dir, 'app.log')
handler = RotatingFileHandler(log_file, maxBytes=2*1024*1024, backupCount=5, encoding='utf-8')
formatter = logging.Formatter('[%(asctime)s] %(levelname)s in %(module)s: %(message)s')
handler.setFormatter(formatter)

root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
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
import logging
from fastapi.responses import FileResponse, JSONResponse
import shutil
from fastapi import UploadFile, File
import os
from starlette.background import BackgroundTask
from cache import cache, cache_result, get_branch_cache_key, get_transaction_cache_key, get_branch_transactions_cache_key
from fastapi.requests import Request
from fastapi.exception_handlers import RequestValidationError
from fastapi.exceptions import RequestValidationError as FastAPIRequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback
from fastapi import APIRouter

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get database URL from environment variable with fallback
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost/postgres"
)

# Database URL
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autoflush=False, bind=engine)

# Create the database tables if they don't exist
Base.metadata.create_all(bind=engine)


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
        
class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "employee"
    branch_id: Optional[int] = None
    
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
    
@app.put("/branches/{branch_id}")
def update_branch(
    branch_id: int,
    branch_data: BranchUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    # المدير يمكنه تعديل كل شيء
    if current_user["role"] == "director":
        update_data = branch_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(branch, field, value)
    # مدير الفرع يمكنه فقط تعديل فرعه (location و phone_number فقط)
    elif current_user["role"] == "branch_manager":
        if branch.id != current_user["branch_id"]:
            raise HTTPException(status_code=403, detail="You can only edit your own branch")
        allowed_fields = ["location", "phone_number"]
        update_data = branch_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field in allowed_fields:
                setattr(branch, field, value)
    else:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    try:
        db.commit()
        db.refresh(branch)
        # حذف الكاش بعد التعديل
        from cache import get_branch_cache_key, cache
        cache.delete(get_branch_cache_key(branch.id))
        return {
            "status": "success",
            "branch": {
                "id": branch.id,
                "branch_id": branch.branch_id,
                "name": branch.name,
                "location": branch.location,
                "governorate": branch.governorate,
                "phone_number": branch.phone_number,
                "status": branch.status
            }
        }
    except sqlalchemy.exc.IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Branch ID or name already exists")

@app.get("/customers/")
def get_customers(
    name: Optional[str] = None,
    mobile: Optional[str] = None,
    id_number: Optional[str] = None,
    governorate: Optional[str] = None,
    user_type: Optional[str] = None,  # 'sender' or 'receiver'
    db: Session = Depends(get_db)
):
    # Build base query
    query = db.query(
        Transaction.sender.label('sender_name'),
        Transaction.sender_mobile,
        Transaction.sender_governorate,
        Transaction.sender_location,
        Transaction.sender_id,
        Transaction.receiver.label('receiver_name'),
        Transaction.receiver_mobile,
        Transaction.receiver_governorate,
        Transaction.receiver_location,
        Transaction.receiver_id
    )

    # Apply filters
    if name:
        query = query.filter(
            (Transaction.sender.ilike(f"%{name}%")) | 
            (Transaction.receiver.ilike(f"%{name}%"))
        )
    if mobile:
        query = query.filter(
            (Transaction.sender_mobile.ilike(f"%{mobile}%")) | 
            (Transaction.receiver_mobile.ilike(f"%{mobile}%"))
        )
    if id_number:
        query = query.filter(
            (Transaction.sender_id.ilike(f"%{id_number}%")) | 
            (Transaction.receiver_id.ilike(f"%{id_number}%"))
        )
    if governorate:
        query = query.filter(
            (Transaction.sender_governorate.ilike(f"%{governorate}%")) | 
            (Transaction.receiver_governorate.ilike(f"%{governorate}%"))
        )
    if user_type:
        if user_type == "sender":
            query = query.filter(Transaction.sender.isnot(None))
        elif user_type == "receiver":
            query = query.filter(Transaction.receiver.isnot(None))

    # Group by to get unique customers
    query = query.group_by(
        Transaction.sender,
        Transaction.sender_mobile,
        Transaction.sender_governorate,
        Transaction.sender_location,
        Transaction.sender_id,
        Transaction.receiver,
        Transaction.receiver_mobile,
        Transaction.receiver_governorate,
        Transaction.receiver_location,
        Transaction.receiver_id
    )

    # Execute query
    customers = query.all()

    # Format results
    customer_list = []
    for cust in customers:
        customer_list.append({
            "sender_name": cust.sender_name or "",
            "sender_mobile": cust.sender_mobile or "",
            "sender_governorate": cust.sender_governorate or "",
            "sender_location": cust.sender_location or "",
            "sender_id": cust.sender_id or "",
            "receiver_name": cust.receiver_name or "",
            "receiver_mobile": cust.receiver_mobile or "",
            "receiver_governorate": cust.receiver_governorate or "",
            "receiver_location": cust.receiver_location or "",
            "receiver_id": cust.receiver_id or "",
            "user_type": user_type or ""
        })

    return {"customers": customer_list}

@app.get("/check-initialization/")
def check_initialization(db: Session = Depends(get_db)):
    admin_exists = db.query(User).filter(User.role == "director").first()
    return {"is_initialized": admin_exists is not None}

@app.post("/initialize-system/")
def initialize_system(user: UserCreate, db: Session = Depends(get_db)):
    # Check if any admin exists
    if db.query(User).filter(User.role == "director").first():
        raise HTTPException(status_code=400, detail="النظام مهيأ مسبقاً")

    # Create admin user
    hashed_password = hash_password(user.password)
    db_user = User(
        username=user.username,
        password=hashed_password,
        role="director",
        branch_id=1,  # Link to default branch
        created_at=datetime.now()
    )
    db.add(db_user)

    # Create default branch if not exists
    if not db.query(Branch).filter(Branch.id == 1).first():
        db_branch = Branch(
            branch_id="MAIN",
            name="الفرع الرئيسي",
            location="المقر المركزي",
            governorate="المركزية",
            created_at=datetime.now()
        )
        db.add(db_branch)

    db.commit()
    return {"status": "success", "message": "تم إنشاء مدير النظام بنجاح"} 

@app.post("/branches/{branch_id}/allocate-funds/")
def allocate_funds(
    branch_id: int, 
    allocation: FundAllocation,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Director access required")

    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    # Validate currency input
    currency = allocation.currency.upper()  # Normalize to uppercase
    if currency not in ["SYP", "USD"]:
        raise HTTPException(status_code=400, 
                          detail="العملة غير مدعومة. الرجاء استخدام SYP أو USD")

    # Handle SYP operations
    if currency == "SYP":
        if allocation.type == 'deduction':
            if branch.allocated_amount_syp < allocation.amount:
                raise HTTPException(
                    status_code=400,
                    detail="رصيد الفرع بالليرة السورية غير كافي للخصم"
                )
            branch.allocated_amount_syp -= allocation.amount
        else:
            branch.allocated_amount_syp += allocation.amount
        
        # Update legacy field explicitly
        branch.allocated_amount = branch.allocated_amount_syp

    # Handle USD operations
    elif currency == "USD":
        if allocation.type == 'deduction':
            if branch.allocated_amount_usd < allocation.amount:
                raise HTTPException(
                    status_code=400,
                    detail="رصيد الفرع بالدولار الأمريكي غير كافي للخصم"
                )
            branch.allocated_amount_usd -= allocation.amount
        else:
            branch.allocated_amount_usd += allocation.amount

    # Create audit record with precise values
    fund_record = BranchFund(
        branch_id=branch_id,
        amount=allocation.amount * (1 if allocation.type == 'allocation' else -1),
        type=allocation.type,
        currency=currency,
        description=(
            allocation.description or 
            f"{'إيداع' if allocation.type == 'allocation' else 'خصم'} "
            f"بواسطة {current_user['username']} ({currency})"
        )
    )
    
    try:
        db.add(fund_record)
        db.commit()
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"فشل في حفظ العملية: {str(e)}"
        )

    return {
        "status": "success",
        "new_allocated_syp": branch.allocated_amount_syp,
        "new_allocated_usd": branch.allocated_amount_usd,
        "currency": currency
    }

@app.get("/branches/{branch_id}/funds-history")
def get_funds_history(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Authorization
    if current_user["role"] == "branch_manager" and current_user["branch_id"] != branch_id:
        raise HTTPException(status_code=403, detail="Access denied")

    history = db.query(BranchFund).filter(
        BranchFund.branch_id == branch_id
    ).order_by(BranchFund.created_at.desc()).all()

    return [{
        "date": record.created_at.strftime("%Y-%m-%d") if record.created_at else "غير معروف",
        "type": record.type,
        "amount": record.amount,
        "currency": record.currency,  # إضافة حقل العملة
        "description": record.description
    } for record in history]
    
@app.post("/send-money/")
async def send_money(transaction: TransactionSchema, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    branch_id = current_user.get("branch_id")
    employee_id = current_user.get("user_id")
    # منع استقبال حوالات للفرع الرئيسي
    if transaction.destination_branch_id == 0:
        raise HTTPException(status_code=400, detail="لا يمكن إرسال حوالة إلى الفرع الرئيسي (الفرع الرئيسي للإرسال فقط)")
    transaction_id = save_to_db(transaction, branch_id, employee_id, db)
    return {"status": "success", "message": "Transaction saved!", "transaction_id": transaction_id}

@app.post("/transactions/", status_code=201)
async def create_transaction(transaction: TransactionSchema, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        if transaction.amount <= 0:
            raise HTTPException(status_code=400, detail="المبلغ يجب أن يكون أكبر من صفر")
        if transaction.base_amount < 0 or transaction.benefited_amount < 0:
            raise HTTPException(status_code=400, detail="المبالغ لا يمكن أن تكون سالبة")
        branch_id = transaction.branch_id
        if branch_id is None:
            branch_id = current_user.get("branch_id")
        employee_id = current_user.get("user_id")
        # منع استقبال حوالات للفرع الرئيسي
        if transaction.destination_branch_id == 0:
            raise HTTPException(status_code=400, detail="لا يمكن إرسال حوالة إلى الفرع الرئيسي (الفرع الرئيسي للإرسال فقط)")
        try:
            transaction_id = save_to_db(transaction, branch_id, employee_id, db)
            # Invalidate relevant caches
            cache.clear_pattern(f"branch_transactions:{transaction.branch_id}:*")
            cache.clear_pattern(f"branch_transactions:{transaction.destination_branch_id}:*")
            cache.delete(get_branch_cache_key(transaction.branch_id))
            cache.delete(get_branch_cache_key(transaction.destination_branch_id))
            return {
                "status": "success",
                "message": "تم إنشاء التحويل بنجاح",
                "transaction_id": transaction_id
            }
        except Exception as e:
            print(f"[ERROR] Error saving transaction: {e}")
            print(f"[ERROR] Transaction data: {transaction.dict()}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))
    except ValidationError as e:
        print(f"[ERROR] Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[ERROR] Unexpected error in create_transaction: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class TransactionReceived(BaseModel):
    transaction_id: str
    receiver: str
    receiver_mobile: str
    receiver_id: str
    receiver_address: str
    receiver_governorate: str

@app.post("/mark-transaction-received/")
def mark_transaction_received(received_data: TransactionReceived, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Verify transaction exists and belongs to current branch (الفرع المستلم)
        transaction = db.query(Transaction).filter(
            Transaction.id == received_data.transaction_id,
            Transaction.destination_branch_id == current_user["branch_id"]
        ).first()
        
        if not transaction:
            raise HTTPException(status_code=404, 
                             detail="Transaction not found or not authorized for this branch")
        
        # Update transaction
        transaction.is_received = True
        transaction.received_by = current_user["user_id"]
        transaction.received_at = datetime.now()
        transaction.receiver = received_data.receiver
        transaction.receiver_mobile = received_data.receiver_mobile
        transaction.receiver_id = received_data.receiver_id
        transaction.receiver_address = received_data.receiver_address
        transaction.receiver_governorate = received_data.receiver_governorate
        transaction.status = 'completed'
        
        # Update notification
        notification = db.query(Notification).filter(
            Notification.transaction_id == received_data.transaction_id
        ).first()
        if notification:
            notification.status = 'sent'
        
        db.commit()
        return {"status": "success", "message": "Transaction marked as received"}
        
    except Exception as e:
        db.rollback()
        print(f"Error in mark_transaction_received: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

@app.post("/login/")
async def login(user: LoginRequest, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first() 
    if db_user and verify_password(user.password, db_user.password):
        # Create token with expiration time (24 hours)
        access_token_expires = timedelta(hours=8)
        expires = datetime.utcnow() + access_token_expires
        
        # Include user role and branch_id in the token
        token_data = {
            "username": db_user.username,
            "role": db_user.role,
            "branch_id": db_user.branch_id,
            "user_id": db_user.id,
            "exp": expires
        }
        
        access_token = create_jwt_token(token_data)
        return {
            "access_token": access_token, 
            "token_type": "bearer", 
            "role": db_user.role, 
            "username": db_user.username,
            "branch_id": db_user.branch_id,
            "user_id": db_user.id,
            "token": access_token  # Adding token directly for frontend compatibility
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.post("/register/")
def register_user(user: UserCreate, token: str = Depends(oauth2_scheme)):
    try:
        # Try to decode the token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("username")
        role = payload.get("role")
        branch_id = payload.get("branch_id")
        user_id = payload.get("user_id")
        
        # Check if user has permission to create users
        if role not in ["director", "branch_manager"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        
        # Branch managers can only create employees for their own branch
        if role == "branch_manager" and (user.role != "employee" or user.branch_id != branch_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Branch managers can only create employees for their own branch")
        
        db = SessionLocal()
        try:
            # Check if username already exists
            existing_user = db.query(User).filter(User.username == user.username).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="Username already registered")
            
            # Check if branch exists if branch_id is provided
            if user.branch_id:
                branch = db.query(Branch).filter(Branch.id == user.branch_id).first()
                if not branch:
                    raise HTTPException(status_code=404, detail="Branch not found")
            
            # Create new user
            hashed_password = hash_password(user.password)
            db_user = User(
                username=user.username,
                password=hashed_password,
                role=user.role,
                branch_id=user.branch_id,
                created_at=datetime.now()
            )
            
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
            branch_name = None
            if db_user.branch_id:
                branch = db.query(Branch).filter(Branch.id == db_user.branch_id).first()
                branch_name = branch.name if branch else None
            return {
                "id": db_user.id,
                "username": db_user.username,
                "role": db_user.role,
                "branch_id": db_user.branch_id,
                "branch_name": branch_name,
                "created_at": db_user.created_at.strftime("%Y-%m-%d %H:%M:%S") if db_user.created_at else None
            }
        finally:
            db.close()
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.post("/users/")
def create_user(user: UserCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Check if user has permission to create users
    if current_user["role"] not in ["director", "branch_manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    
    # Branch managers can only create employees for their own branch
    if current_user["role"] == "branch_manager" and (user.role != "employee" or user.branch_id != current_user["branch_id"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Branch managers can only create employees")
    
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Check if branch exists if branch_id is provided
    if user.branch_id:
        branch = db.query(Branch).filter(Branch.id == user.branch_id).first()
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
    
    # Create new user
    hashed_password = hash_password(user.password)
    db_user = User(
        username=user.username,
        password=hashed_password,
        role=user.role,
        branch_id=user.branch_id,
        created_at=datetime.now()
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    branch_name = None
    if db_user.branch_id:
        branch = db.query(Branch).filter(Branch.id == db_user.branch_id).first()
        branch_name = branch.name if branch else None
    return {
        "id": db_user.id,
        "username": db_user.username,
        "role": db_user.role,
        "branch_id": db_user.branch_id,
        "branch_name": branch_name,
        "created_at": db_user.created_at.strftime("%Y-%m-%d %H:%M:%S") if db_user.created_at else None
    }

@app.post("/branches/")
def create_branch(branch: BranchCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Only directors can create branches
    if current_user["role"] != "director":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    
    try:
        # Check if branch_id already exists
        existing_branch = db.query(Branch).filter(Branch.branch_id == branch.branch_id).first()
        if existing_branch:
            raise HTTPException(status_code=400, detail="Branch ID already registered")
        
        # Create new branch
        db_branch = Branch(
            branch_id=branch.branch_id,
            name=branch.name,
            location=branch.location,
            governorate=branch.governorate,
            created_at=datetime.now()
        )
        
        db.add(db_branch)
        db.commit()
        db.refresh(db_branch)
        
        return {"id": db_branch.id, "branch_id": db_branch.branch_id, "name": db_branch.name, "location": db_branch.location, "governorate": db_branch.governorate}
    
    except sqlalchemy.exc.IntegrityError as e:
        db.rollback()
        # Handle specific integrity errors with user-friendly messages
        if "UNIQUE constraint failed: branches.name" in str(e):
            raise HTTPException(status_code=400, detail="A branch with this name already exists. Please use a different name.")
        elif "UNIQUE constraint failed: branches.branch_id" in str(e):
            raise HTTPException(status_code=400, detail="A branch with this ID already exists. Please use a different branch ID.")
        else:
            # For other integrity errors
            raise HTTPException(status_code=400, detail=f"Database integrity error: {str(e)}")

@app.get("/branches/")
def get_branches(request: Request, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:
        include_employee_count = request.query_params.get('include_employee_count', 'false').lower() == 'true'
        user_role = current_user["role"]
        user_branch_id = current_user.get("branch_id")
    except:
        branches = db.query(Branch).all()
        branch_list = []
        for branch in branches:
            branch_data = {
                "id": branch.id,
                "branch_id": branch.branch_id,
                "name": branch.name,
                "location": branch.location,
                "governorate": branch.governorate,
                "created_at": branch.created_at.strftime("%Y-%m-%d %H:%M:%S") if branch.created_at else None,
                "tax_rate": getattr(branch, 'tax_rate', 0.0)
            }
            if include_employee_count:
                employee_count = db.query(func.count(User.id)).filter(User.branch_id == branch.id).scalar() or 0
                branch_data['employee_count'] = employee_count
            branch_list.append(branch_data)
        return {"branches": branch_list}
    branches = db.query(Branch).all()
    branch_list = []
    for branch in branches:
        branch_data = {
            "id": branch.id,
            "branch_id": branch.branch_id,
            "name": branch.name,
            "location": branch.location,
            "governorate": branch.governorate,
            "phone_number": branch.phone_number,
            "created_at": branch.created_at.strftime("%Y-%m-%d %H:%M:%S") if branch.created_at else None,
            "allocated_amount_syp": branch.allocated_amount_syp,
            "allocated_amount_usd": branch.allocated_amount_usd,
            "allocated_amount": branch.allocated_amount,
            "tax_rate": getattr(branch, 'tax_rate', 0.0)
        }
        if include_employee_count:
            employee_count = db.query(func.count(User.id)).filter(User.branch_id == branch.id).scalar() or 0
            branch_data['employee_count'] = employee_count
        if user_role == "director":
            branch_data.update({
                "allocated_amount": branch.allocated_amount,
                "current_balance": branch.allocated_amount
            })
        elif user_role == "branch_manager" and branch.id == user_branch_id:
            branch_data.update({
                "allocated_amount": branch.allocated_amount,
                "current_balance": branch.allocated_amount
            })
        branch_list.append(branch_data)
    return {"branches": branch_list}

@app.get("/branches/{branch_id}")
def get_branch(branch_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Try to get from cache first
    cache_key = get_branch_cache_key(branch_id)
    cached_result = cache.get(cache_key)
    if cached_result:
        return cached_result

    # Special handling for System Manager branch (ID 0)
    if branch_id == 0:
        result = {
            "id": 0,
            "branch_id": "0",
            "name": "System Manager",
            "location": "Main Office",
            "governorate": "رئيسي",
            "allocated_amount": 9999999999.0,
            "allocated_amount_syp": 9999999999.0,
            "allocated_amount_usd": 9999999999.0,
            "tax_rate": 0.0,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "financial_stats": {
                "available_balance": 9999999999.0,
                "available_balance_syp": 9999999999.0,
                "available_balance_usd": 9999999999.0,
                "total_allocated": 9999999999.0,
                "total_sent": 0.0,
                "total_received": 0.0
            }
        }
        cache.set(cache_key, result, expire=300)
        return result
    
    # Authorization check
    if current_user["role"] == "branch_manager" and current_user["branch_id"] != branch_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this branch")

    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    # Initialize default values
    total_sent = 0.0
    total_received = 0.0
    total_allocated = 0.0

    try:
        # Get total sent transactions amount
        total_sent = db.query(func.coalesce(func.sum(Transaction.amount), 0.0)).filter(
            Transaction.branch_id == branch_id,
            Transaction.status == 'completed'
        ).scalar() or 0.0

        # Get total received transactions amount
        total_received = db.query(func.coalesce(func.sum(Transaction.amount), 0.0)).filter(
            Transaction.destination_branch_id == branch_id,
            Transaction.status == 'completed'
        ).scalar() or 0.0

        # Get allocation history
        total_allocated = db.query(func.coalesce(func.sum(BranchFund.amount), 0.0)).filter(
            BranchFund.branch_id == branch_id,
            BranchFund.type == 'allocation'
        ).scalar() or 0.0

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )

    result = {
        "id": branch.id,
        "branch_id": branch.branch_id,
        "name": branch.name,
        "location": branch.location,
        "governorate": branch.governorate,
        "phone_number": branch.phone_number,  # تمت الإضافة هنا
        "allocated_amount": branch.allocated_amount,
        "allocated_amount_syp": branch.allocated_amount_syp,
        "allocated_amount_usd": branch.allocated_amount_usd,
        "financial_stats": {
            "total_allocated": total_allocated,
            "available_balance": branch.allocated_amount,
            "available_balance_syp": branch.allocated_amount_syp,
            "available_balance_usd": branch.allocated_amount_usd,
            "total_sent": total_sent,
            "total_received": total_received
        },
        "created_at": branch.created_at.strftime("%Y-%m-%d %H:%M:%S") if branch.created_at else None
    }

    # Cache the result
    cache.set(cache_key, result, expire=300)
    
    return result

@app.get("/users/")
def get_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    branch_id: Optional[int] = None,  # إضافة بارامتر branch_id
    page: int = 1,
    per_page: int = 20
):
    # التحقق من الصلاحيات
    if current_user["role"] not in ["director", "branch_manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    query = db.query(User)
    # إذا كان المستخدم مدير فرع، قصر النتائج على فرعه
    if current_user["role"] == "branch_manager":
        query = query.filter(User.branch_id == current_user["branch_id"])
    # تطبيق تصفية branch_id إذا تم تقديمه
    if branch_id:
        # المديرين الفرعيين لا يمكنهم طلب فروع أخرى
        if current_user["role"] == "branch_manager" and branch_id != current_user["branch_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your branch's employees")
        query = query.filter(User.branch_id == branch_id)
    total = query.count()
    query = query.order_by(User.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    users = query.all()
    user_list = []
    for user in users:
        branch_name = None
        if user.branch_id:
            branch = db.query(Branch).filter(Branch.id == user.branch_id).first()
            branch_name = branch.name if branch else None
        user_list.append({
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "branch_id": user.branch_id,
            "branch_name": branch_name,
            "created_at": user.created_at.strftime("%Y-%m-%d %H:%M:%S") if user.created_at else None
        })
    return {
        "items": user_list,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }

@app.get("/employees/")
def get_employees(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), branch_id: Optional[int] = None):
    # Only directors and branch managers can view employees
    if current_user["role"] not in ["director", "branch_manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    
    query = db.query(User)
    
    # Filter by role to only include employees
    query = query.filter(User.role == "employee")
    
    # Filter by branch_id if provided
    if branch_id:
        # Branch managers can only view employees in their own branch
        if current_user["role"] == "branch_manager" and current_user["branch_id"] != branch_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view employees in your branch")
        query = query.filter(User.branch_id == branch_id)
    # If no branch_id provided but user is branch manager, only show their branch
    elif current_user["role"] == "branch_manager":
        query = query.filter(User.branch_id == current_user["branch_id"])
    
    employees = query.all()
    
    # Get branch names for each employee
    employee_list = []
    for employee in employees:
        branch_name = None
        if employee.branch_id:
            branch = db.query(Branch).filter(Branch.id == employee.branch_id).first()
            if branch:
                branch_name = branch.name
        
        employee_list.append({
            "id": employee.id,
            "username": employee.username,
            "role": employee.role,
            "branch_id": employee.branch_id,
            "branch_name": branch_name,
            "created_at": employee.created_at.strftime("%Y-%m-%d %H:%M:%S") if employee.created_at else None
        })
    
    return employee_list

@app.get("/branches/{branch_id}/employees/")
def get_branch_employees(branch_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Check if user has permission to view branch employees
    if current_user["role"] not in ["director", "branch_manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    
    # Branch managers can only view employees in their own branch
    if current_user["role"] == "branch_manager" and current_user["branch_id"] != branch_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view employees in your branch")
    
    # Check if branch exists
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # Get employees for the branch
    employees = db.query(User).filter(User.branch_id == branch_id).all()
    
    employee_list = []
    for employee in employees:
        employee_list.append({
            "id": employee.id,
            "username": employee.username,
            "role": employee.role,
            "branch_id": employee.branch_id,
            "created_at": employee.created_at.strftime("%Y-%m-%d %H:%M:%S") if employee.created_at else None
        })
    
    return employee_list

@app.get("/transactions/")
def get_transactions(
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user),
    branch_id: Optional[int] = None,
    filter_type: Optional[str] = None,
    destination_branch_id: Optional[int] = None,
    limit: Optional[int] = None,
    id: Optional[str] = None,
    sender: Optional[str] = None,
    receiver: Optional[str] = None,
    status: Optional[str] = None,
    date: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = 1,
    per_page: int = 20
):
    # Generate cache key based on parameters (ignore for paginated for now)
    # ... existing code ...
    SendingBranch = aliased(Branch)
    DestinationBranch = aliased(Branch)
    query = db.query(
        Transaction,
        SendingBranch.name.label('sending_branch_name'),
        DestinationBranch.name.label('destination_branch_name')
    ).outerjoin(
        SendingBranch, Transaction.branch_id == SendingBranch.id
    ).outerjoin(
        DestinationBranch, Transaction.destination_branch_id == DestinationBranch.id
    )

    # Base security filtering
    if current_user["role"] == "employee":
        query = query.filter(
            (Transaction.employee_id == current_user["user_id"]) | 
            (Transaction.destination_branch_id == current_user["branch_id"])
        )
    elif current_user["role"] == "branch_manager":
        query = query.filter(
            (Transaction.branch_id == current_user["branch_id"]) | 
            (Transaction.destination_branch_id == current_user["branch_id"])
        )

    # Apply filters
    if branch_id:
        query = query.filter(Transaction.branch_id == branch_id)
    if destination_branch_id:
        query = query.filter(Transaction.destination_branch_id == destination_branch_id)
    if id:
        query = query.filter(Transaction.id.ilike(f"%{id}%"))
    if sender:
        query = query.filter(Transaction.sender.ilike(f"%{sender}%"))
    if receiver:
        query = query.filter(Transaction.receiver.ilike(f"%{receiver}%"))
    if status:
        query = query.filter(Transaction.status == status)
    if date:
        query = query.filter(Transaction.date.ilike(f"%{date}%"))
    # إضافة فلترة التاريخ بدقة
    from datetime import datetime
    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(Transaction.date >= start)
        except ValueError:
            pass
    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d")
            end = end.replace(hour=23, minute=59, second=59)
            query = query.filter(Transaction.date <= end)
        except ValueError:
            pass

    # Apply type filter if specified
    if filter_type:
        branch = db.query(Branch).filter(Branch.id == current_user["branch_id"]).first()
        if branch:
            if filter_type == "incoming":
                query = query.filter(Transaction.receiver_governorate == branch.governorate)
            elif filter_type == "outgoing":
                query = query.filter(Transaction.sender_governorate == branch.governorate)
            elif filter_type == "branch_related":
                query = query.filter(
                    (Transaction.sender_governorate == branch.governorate) | 
                    (Transaction.receiver_governorate == branch.governorate)
                )

    # Count total before pagination
    total = query.count()

    # Apply sorting and pagination
    query = query.order_by(Transaction.date.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    try:
        results = query.all()
        transaction_list = []
        for transaction, sending_branch_name, destination_branch_name in results:
            transaction_dict = {
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
                "employee_name": transaction.employee_name,
                "branch_governorate": transaction.branch_governorate,
                "branch_id": transaction.branch_id,
                "destination_branch_id": transaction.destination_branch_id,
                "employee_id": transaction.employee_id,
                "status": transaction.status,
                "date": transaction.date,
                "is_received": transaction.is_received,
                "sending_branch_name": sending_branch_name,
                "destination_branch_name": destination_branch_name
            }
            transaction_list.append(transaction_dict)

        return {
            "items": transaction_list,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }

    except sqlalchemy.exc.SQLAlchemyError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error occurred: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error occurred: {str(e)}"
        )

@app.get("/reports/transactions/")
def get_transactions_report(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    start_date: str = None,
    end_date: str = None,
    branch_id: int = None,
    destination_branch_id: int = None,
    status: str = None,
    page: int = 1,
    per_page: int = 10
):
    try:
        # Authorization check
        if current_user["role"] not in ["director", "branch_manager"]:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        # Branch managers can only access their branch's data
        if current_user["role"] == "branch_manager":
            # إذا كان يبحث عن صادر (branch_id)، يجب أن يكون فرعه فقط
            if branch_id is not None:
                if branch_id != current_user["branch_id"]:
                    raise HTTPException(status_code=403, detail="Can only access your branch's data")
                branch_id = current_user["branch_id"]

        # Calculate offset for pagination
        offset = (page - 1) * per_page

        # Build base query with joins for branch names
        SendingBranch = aliased(Branch)
        DestinationBranch = aliased(Branch)
        
        query = db.query(
            Transaction,
            SendingBranch.name.label('sending_branch_name'),
            DestinationBranch.name.label('destination_branch_name')
        ).outerjoin(
            SendingBranch, Transaction.branch_id == SendingBranch.id
        ).outerjoin(
            DestinationBranch, Transaction.destination_branch_id == DestinationBranch.id
        )

        # Add filters
        if branch_id:
            query = query.filter(Transaction.branch_id == branch_id)
        if destination_branch_id:
            query = query.filter(Transaction.destination_branch_id == destination_branch_id)
        if status:
            query = query.filter(Transaction.status == status)
        if start_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d")
                query = query.filter(Transaction.date >= start)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
        if end_date:
            try:
                end = datetime.strptime(end_date, "%Y-%m-%d")
                end = end.replace(hour=23, minute=59, second=59)
                query = query.filter(Transaction.date <= end)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")

        # Get total count for pagination
        total = query.count()

        # Add sorting and pagination
        query = query.order_by(Transaction.date.desc())
        query = query.offset(offset).limit(per_page)

        # Execute query
        results = query.all()

        # Format results
        transactions = []
        for transaction, sending_branch_name, destination_branch_name in results:
            transaction_dict = {
                "id": transaction.id,
                "sender": transaction.sender,
                "receiver": transaction.receiver,
                "amount": transaction.amount,
                "currency": transaction.currency,
                "date": transaction.date.isoformat(),
                "status": transaction.status,
                "branch_id": transaction.branch_id,
                "destination_branch_id": transaction.destination_branch_id,
                "employee_name": transaction.employee_name,
                "sending_branch_name": sending_branch_name or "غير معروف",
                "destination_branch_name": destination_branch_name or "غير معروف",
                "branch_governorate": transaction.branch_governorate,
                "is_received": transaction.is_received,
                "tax_amount": transaction.tax_amount,
                "tax_rate": transaction.tax_rate,
                "benefited_amount": transaction.benefited_amount
            }
            transactions.append(transaction_dict)

        return {
            "items": transactions,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_transactions_report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.get("/reports/employees/")
def get_employees_report(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    branch_id: int = None,
    status: str = None,
    role: str = None,
    page: int = 1,
    per_page: int = 10
):
    try:
        if current_user["role"] not in ["director", "branch_manager"]:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        if current_user["role"] == "branch_manager":
            if branch_id and branch_id != current_user["branch_id"]:
                raise HTTPException(status_code=403, detail="Can only access your branch's data")
            branch_id = current_user["branch_id"]

        offset = (page - 1) * per_page

        query = db.query(User).join(Branch, User.branch_id == Branch.id)

        if branch_id:
            query = query.filter(User.branch_id == branch_id)
        if role:
            query = query.filter(User.role == role)
        # Only filter by is_active if status is not None
        if status is not None:
            # Some databases may not have is_active, so use getattr with default True
            if status == "active":
                query = query.filter(getattr(User, 'is_active', True) == True)
            elif status == "inactive":
                query = query.filter(getattr(User, 'is_active', True) == False)

        total = query.count()
        query = query.order_by(User.created_at.desc())
        query = query.offset(offset).limit(per_page)
        employees = query.all()

        employee_list = []
        for employee in employees:
            branch = db.query(Branch).filter(Branch.id == employee.branch_id).first()
            employee_dict = {
                "id": employee.id,
                "username": employee.username,
                "role": employee.role,
                "branch_id": employee.branch_id,
                "branch_name": branch.name if branch else "غير معروف",
                "created_at": employee.created_at.isoformat() if employee.created_at else None,
                "is_active": getattr(employee, 'is_active', True)
            }
            employee_list.append(employee_dict)

        return {
            "items": employee_list,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_employees_report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.put("/users/{user_id}")
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Authorization check
    if current_user["role"] not in ["director", "branch_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    # Find the user
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent branch managers from modifying other branches
    if current_user["role"] == "branch_manager":
        if db_user.branch_id != current_user["branch_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot modify users from other branches"
            )
        
        # Prevent branch managers from creating other managers
        if user_data.role == "branch_manager":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot create other branch managers"
            )

    # Update fields
    update_data = user_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            if key == "password" and value:
                setattr(db_user, key, hash_password(value))
            else:
                setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    
    return {
        "id": db_user.id,
        "username": db_user.username,
        "role": db_user.role,
        "branch_id": db_user.branch_id
    }

# Add this function to handle profit recording
def record_branch_profit(db: Session, transaction: Transaction):
    """Record profit for a completed transaction."""
    try:
        # Important: We only calculate profits based on benefited_amount, not the total amount
        if transaction.benefited_amount <= 0:
            logger.info(f"No benefited amount for transaction {transaction.id}, skipping profit calculation")
            return

        # Calculate profit from benefited amount only
        tax_on_benefited = transaction.benefited_amount * (transaction.tax_rate / 100)
        profit_from_benefited = transaction.benefited_amount - tax_on_benefited
        
        # Create profit record for benefited amount
        if profit_from_benefited > 0:
            benefited_profit = BranchProfits(
                branch_id=transaction.branch_id,
                transaction_id=transaction.id,
                profit_amount=profit_from_benefited,
                currency=transaction.currency,
                source_type='benefited_amount',
                date=transaction.date
            )
            db.add(benefited_profit)
            logger.info(f"Recorded profit from benefited amount: {profit_from_benefited} {transaction.currency}")
        
        # Record tax amount as separate profit
        if tax_on_benefited > 0:
            tax_profit = BranchProfits(
                branch_id=transaction.branch_id,
                transaction_id=transaction.id,
                profit_amount=tax_on_benefited,
                currency=transaction.currency,
                source_type='tax',
                date=transaction.date
            )
            db.add(tax_profit)
            logger.info(f"Recorded profit from tax: {tax_on_benefited} {transaction.currency}")
        
        # Add audit log entry
        logger.info(
            f"Transaction {transaction.id} profits:"
            f"\nTotal Amount: {transaction.amount} {transaction.currency}"
            f"\nBenefited Amount: {transaction.benefited_amount} {transaction.currency}"
            f"\nTax Rate: {transaction.tax_rate}%"
            f"\nTax on Benefited: {tax_on_benefited} {transaction.currency}"
            f"\nProfit from Benefited: {profit_from_benefited} {transaction.currency}"
        )
        
        db.commit()
    except Exception as e:
        logger.error(f"Error recording branch profit: {str(e)}")
        db.rollback()
        raise

@app.post("/update-transaction-status/")
def update_transaction_status(
    status_update: TransactionStatus, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        transaction = db.query(Transaction).filter(
            Transaction.id == status_update.transaction_id
        ).with_for_update().first()
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        branch_id = transaction.branch_id
        amount = transaction.amount
        old_status = transaction.status
        dest_branch_id = transaction.destination_branch_id
        new_status = status_update.status

        # Authorization check
        if current_user["role"] == "branch_manager":
            if branch_id != current_user["branch_id"] and dest_branch_id != current_user["branch_id"]:
                raise HTTPException(
                    status_code=403,
                    detail="Not authorized to modify this transaction"
                )

        # Handle fund allocation and profits
        if old_status == "processing" and new_status == "completed":
            # Record profits when transaction is completed
            record_branch_profit(db, transaction)
        elif (
            (old_status == "processing" and new_status in ["cancelled", "rejected"]) or
            (old_status == "completed" and new_status in ["cancelled", "rejected"])
        ):
            # Refund the amount to the originating branch
            branch = db.query(Branch).filter(Branch.id == branch_id).with_for_update().first()
            if branch:
                branch.allocated_amount += amount
                if transaction.currency == "SYP":
                    branch.allocated_amount_syp += amount
                elif transaction.currency == "USD":
                    branch.allocated_amount_usd += amount
                # Record fund refund
                fund_record = BranchFund(
                    branch_id=branch_id,
                    amount=amount,
                    type="refund",
                    currency=transaction.currency,
                    description=f"Refund for {new_status} transaction {status_update.transaction_id}"
                )
                db.add(fund_record)
            # Remove profit records if transaction is cancelled/rejected
            db.query(BranchProfits).filter(
                BranchProfits.transaction_id == transaction.id
            ).delete()

        # Update transaction status
        transaction.status = new_status

        # Update notification status
        notification_status = {
            "completed": "sent",
            "cancelled": "failed",
            "rejected": "failed",
            "processing": "pending",
            "pending": "pending"
        }.get(new_status, "pending")
        
        notification = db.query(Notification).filter(
            Notification.transaction_id == status_update.transaction_id
        ).first()
        if notification:
            notification.status = notification_status

        try:
            db.commit()
            # Invalidate relevant caches
            cache.clear_pattern(f"branch_transactions:{branch_id}:*")
            cache.clear_pattern(f"branch_transactions:{dest_branch_id}:*")
            cache.delete(get_branch_cache_key(branch_id))
            cache.delete(get_branch_cache_key(dest_branch_id))
            cache.delete(get_transaction_cache_key(status_update.transaction_id))
            
            return {"status": "success", "message": "Status updated with fund adjustment"}
        except Exception as e:
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
        print(f"Error in update_transaction_status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

@app.post("/reset-password/")
def reset_password(reset_data: PasswordReset, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Only directors and branch managers can reset passwords
    if current_user["role"] not in ["director", "branch_manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Find the user
    user = db.query(User).filter(User.username == reset_data.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Branch managers can only reset passwords for employees in their branch
    if current_user["role"] == "branch_manager" and (user.role != "employee" or user.branch_id != current_user["branch_id"]):
        raise HTTPException(status_code=403, detail="You can only reset passwords for employees in your branch")
    
    # Update password
    user.password = hash_password(reset_data.new_password)
    db.commit()
    
    return {"status": "success", "message": "Password reset successfully"}

@app.post("/change-password/")
def change_password(password_data: ChangePassword, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Find the user
    user = db.query(User).filter(User.username == current_user["username"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify old password
    if not verify_password(password_data.old_password, user.password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    # Update password
    user.password = hash_password(password_data.new_password)
    db.commit()
    
    return {"status": "success", "message": "Password changed successfully"}

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    require_role(current_user, ["director", "branch_manager"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "director":
        raise HTTPException(status_code=403, detail="Directors cannot be deleted")
    if current_user["role"] == "branch_manager":
        if user.role != "employee" or user.branch_id != current_user["branch_id"]:
            raise HTTPException(status_code=403, detail="You can only delete employees in your branch")
    db.delete(user)
    db.commit()
    return {"status": "success", "message": "User deleted successfully"}

@app.delete("/branches/{branch_id}/")
def delete_branch(branch_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    require_role(current_user, ["director"])
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    users = db.query(User).filter(User.branch_id == branch_id).all()
    if users:
        raise HTTPException(status_code=400, detail="Cannot delete branch with assigned users")
    db.delete(branch)
    db.commit()
    return {"status": "success", "message": "Branch deleted successfully"}

@app.get("/branches/stats/")
def get_branch_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        # Get all branches
        branches = db.query(Branch).all()
        stats = []
        for branch in branches:
            # Outgoing transactions
            outgoing_stats = db.query(
                func.count(Transaction.id).label('count'),
                func.coalesce(func.sum(Transaction.amount), 0.0).label('amount'),
                func.coalesce(func.sum(Transaction.tax_amount), 0.0).label('tax')
            ).filter(Transaction.branch_id == branch.id).first()
            # Incoming transactions
            incoming_stats = db.query(
                func.count(Transaction.id).label('count'),
                func.coalesce(func.sum(Transaction.amount), 0.0).label('amount'),
                func.coalesce(func.sum(Transaction.tax_amount), 0.0).label('tax')
            ).filter(Transaction.destination_branch_id == branch.id).first()
            # Employee count
            employee_count = db.query(func.count(User.id)).filter(User.branch_id == branch.id).scalar() or 0
            # Combine outgoing and incoming
            total_count = (outgoing_stats.count or 0) + (incoming_stats.count or 0)
            total_amount = (outgoing_stats.amount or 0) + (incoming_stats.amount or 0)
            total_tax = (outgoing_stats.tax or 0) + (incoming_stats.tax or 0)
            stats.append({
                "branch_id": branch.id,
                "name": branch.name,
                "transaction_count": total_count,
                "total_amount": float(total_amount),
                "total_tax": float(total_tax),
                "employee_count": employee_count
            })
        return {"branch_stats": stats}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving branch stats: {str(e)}"
        )

@app.get("/users/stats/")
def get_user_stats(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Get total number of users
    total_users = db.query(User).count()
    
    # Get number of employees
    employees = db.query(User).filter(User.role == "employee").count()
    
    return {
        "total": total_users,
        "directors": db.query(User).filter(User.role == "director").count(),
        "branch_managers": db.query(User).filter(User.role == "branch_manager").count(),
        "employees": employees
    }

@app.get("/branches/{branch_id}/employees/stats/")
def get_branch_employees_stats(branch_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Check if user has permission to view branch employee stats
    if current_user["role"] not in ["director", "branch_manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    
    # Branch managers can only view stats for their own branch
    if current_user["role"] == "branch_manager" and current_user["branch_id"] != branch_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view stats for your branch")
    
    # Check if branch exists
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # Get total number of employees in the branch
    total_employees = db.query(User).filter(User.branch_id == branch_id).count()
    
    return {
        "total": total_employees,
        "active": total_employees  # For now, all employees are considered active
    }

@app.get("/branches/{branch_id}/transactions/stats/")
def get_branch_transactions_stats(branch_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Check if user has permission to view branch transaction stats
    if current_user["role"] not in ["director", "branch_manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    
    # Branch managers can only view stats for their own branch
    if current_user["role"] == "branch_manager" and current_user["branch_id"] != branch_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view stats for your branch")
    
    # Check if branch exists
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    try:
        # Get total number of transactions for the branch
        total_stats = db.query(
            func.count(Transaction.id).label('total_count'),
            func.coalesce(func.sum(Transaction.amount), 0.0).label('total_amount')
        ).filter(
            Transaction.branch_id == branch_id
        ).first()
        
        total_transactions = total_stats.total_count or 0
        total_amount = total_stats.total_amount or 0
        
        # Get number of completed transactions
        completed_transactions = db.query(func.count(Transaction.id)).filter(
            Transaction.branch_id == branch_id,
            Transaction.status == 'completed'
        ).scalar() or 0
        
        # Get number of pending transactions
        pending_transactions = db.query(func.count(Transaction.id)).filter(
            Transaction.branch_id == branch_id,
            Transaction.status == 'processing'
        ).scalar() or 0
        
        return {
            "total": total_transactions,
            "total_amount": total_amount,
            "completed": completed_transactions,
            "pending": pending_transactions
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )

@app.get("/transactions/stats/")
def get_transactions_stats(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:
        # Base query for total transactions and amount
        query = db.query(
            func.count(Transaction.id).label('total_count'),
            func.coalesce(func.sum(Transaction.amount), 0.0).label('total_amount')
        )

        # Branch managers can only see transactions from their branch
        if current_user["role"] == "branch_manager":
            query = query.filter(Transaction.branch_id == current_user["branch_id"])

        # Get total transactions and amount
        total_stats = query.first()
        total_transactions = total_stats.total_count or 0
        total_amount = total_stats.total_amount or 0

        # Query for completed transactions
        completed_query = db.query(func.count(Transaction.id))
        if current_user["role"] == "branch_manager":
            completed_query = completed_query.filter(
                Transaction.branch_id == current_user["branch_id"],
                Transaction.status == 'completed'
            )
        else:
            completed_query = completed_query.filter(Transaction.status == 'completed')
        completed_transactions = completed_query.scalar() or 0

        # Query for pending transactions
        pending_query = db.query(func.count(Transaction.id))
        if current_user["role"] == "branch_manager":
            pending_query = pending_query.filter(
                Transaction.branch_id == current_user["branch_id"],
                Transaction.status == 'processing'
            )
        else:
            pending_query = pending_query.filter(Transaction.status == 'processing')
        pending_transactions = pending_query.scalar() or 0

        return {
            "total": total_transactions,
            "total_amount": total_amount,
            "completed": completed_transactions,
            "pending": pending_transactions
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )

@app.get("/transactions/{transaction_id}/")
def get_transaction(transaction_id: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    SendingBranch = aliased(Branch)
    DestinationBranch = aliased(Branch)
    # Get transaction with branch names
    result = db.query(
        Transaction,
        SendingBranch.name.label('sending_branch_name'),
        DestinationBranch.name.label('destination_branch_name')
    ).outerjoin(
        SendingBranch, Transaction.branch_id == SendingBranch.id
    ).outerjoin(
        DestinationBranch, Transaction.destination_branch_id == DestinationBranch.id
    ).filter(Transaction.id == transaction_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Transaction not found")
    transaction, sending_branch_name, destination_branch_name = result
    # Branch managers can only view transactions from their branch
    if current_user["role"] == "branch_manager" and transaction.branch_id != current_user["branch_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view transactions from your branch")
    # Convert transaction to dictionary
    transaction_dict = {
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
        "employee_name": transaction.employee_name,
        "branch_governorate": transaction.branch_governorate,
        "branch_id": transaction.branch_id,
        "destination_branch_id": transaction.destination_branch_id,
        "employee_id": transaction.employee_id,
        "status": transaction.status,
        "date": transaction.date,
        "is_received": transaction.is_received,
        "sending_branch_name": "المركزية" if transaction.branch_id in [0, None] else sending_branch_name,
        "destination_branch_name": destination_branch_name
    }
    return transaction_dict

@app.get("/notifications/")
def get_notifications(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Get notifications for the current user's branch"""
    # Build base query
    query = db.query(Notification).join(
        Transaction, Notification.transaction_id == Transaction.id
    )
    
    # Branch managers can only see notifications from their branch
    if current_user["role"] == "branch_manager":
        query = query.filter(Transaction.branch_id == current_user["branch_id"])
    
    # Order by created_at descending
    query = query.order_by(Notification.created_at.desc())
    
    notifications = query.all()
    
    notification_list = []
    for notification in notifications:
        notification_dict = {
            "id": notification.id,
            "transaction_id": notification.transaction_id,
            "recipient_phone": notification.recipient_phone,
            "message": notification.message,
            "status": notification.status,
            "created_at": notification.created_at.strftime("%Y-%m-%d %H:%M:%S") if notification.created_at else None
        }
        notification_list.append(notification_dict)
    
    return {"notifications": notification_list}

@app.get("/reports/{report_type}/")
def get_report(
    report_type: str,
    start_date: str = None,
    end_date: str = None,
    branch_id: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get various reports based on type"""
    # Validate dates if provided
    if start_date:
        try:
            start_date = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
    
    if end_date:
        try:
            end_date = datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
    
    # Base query
    query = db.query(Transaction)
    
    # Apply date filters if provided
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    
    # Branch managers can only see their branch's data
    if current_user["role"] == "branch_manager":
        query = query.filter(Transaction.branch_id == current_user["branch_id"])
    elif branch_id:
        query = query.filter(Transaction.branch_id == branch_id)
    
    # Get all transactions for the report
    transactions = query.all()
    
    if report_type == "daily":
        # Group by date
        daily_data = {}
        for transaction in transactions:
            date_str = transaction.date.strftime("%Y-%m-%d")
            if date_str not in daily_data:
                daily_data[date_str] = {
                    "total_syp": 0,
                    "total_usd": 0,
                    "count": 0
                }
            
            if transaction.currency == "SYP":
                daily_data[date_str]["total_syp"] += transaction.amount
            else:
                daily_data[date_str]["total_usd"] += transaction.amount
            daily_data[date_str]["count"] += 1
        
        return {"daily_report": daily_data}
    
    elif report_type == "branch":
        # Group by branch
        branch_data = {}
        for transaction in transactions:
            branch_id = transaction.branch_id
            if branch_id not in branch_data:
                branch_data[branch_id] = {
                    "total_syp": 0,
                    "total_usd": 0,
                    "count": 0
                }
            
            if transaction.currency == "SYP":
                branch_data[branch_id]["total_syp"] += transaction.amount
            else:
                branch_data[branch_id]["total_usd"] += transaction.amount
            branch_data[branch_id]["count"] += 1
        
        return {"branch_report": branch_data}
    
    elif report_type == "currency":
        # Group by currency
        currency_data = {
            "SYP": {"total": 0, "count": 0},
            "USD": {"total": 0, "count": 0}
        }
        
        for transaction in transactions:
            currency_data[transaction.currency]["total"] += transaction.amount
            currency_data[transaction.currency]["count"] += 1
        
        return {"currency_report": currency_data}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")

# Tax-related endpoints
class TaxRateUpdate(BaseModel):
    tax_rate: float

    @field_validator('tax_rate')
    def validate_tax_rate(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Tax rate must be between 0 and 100')
        return v

@app.put("/api/branches/{branch_id}/tax_rate/")
def update_branch_tax_rate(
    branch_id: int,
    tax_data: TaxRateUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "director":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only directors can update tax rates"
        )
    
    if tax_data.tax_rate < 0 or tax_data.tax_rate > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tax rate must be between 0 and 100"
        )
    
    try:
        branch = db.query(Branch).filter(Branch.id == branch_id).first()
        if not branch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Branch not found"
            )
        
        branch.tax_rate = tax_data.tax_rate
        db.commit()
        
        return {
            "id": branch.id,
            "name": branch.name,
            "tax_rate": branch.tax_rate,
            "message": "Tax rate updated successfully"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.get("/api/branches/{branch_id}/tax_rate/")
def get_branch_tax_rate(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get tax rate for a specific branch. إذا كان الفرع هو المدير (0) تعاد الضريبة 0 ويعود الربح بالكامل للمدير."""
    if branch_id == 0:
        return {"branch_id": 0, "tax_rate": 0.0}
    # Find the branch
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branch not found"
        )
    
    return {
        "id": branch.id,
        "name": branch.name,
        "tax_rate": branch.tax_rate
    }

@app.get("/api/transactions/tax_summary/")
def tax_summary_endpoint(
    start_date: str,
    end_date: str,
    branch_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        # Convert string dates to datetime objects
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        end = end.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Build base query for transactions
        tx_query = db.query(Transaction)
        if branch_id:
            tx_query = tx_query.filter(
                (Transaction.branch_id == branch_id) | (Transaction.destination_branch_id == branch_id)
            )
        elif current_user["role"] == "branch_manager":
            tx_query = tx_query.filter(
                (Transaction.branch_id == current_user["branch_id"]) | (Transaction.destination_branch_id == current_user["branch_id"])
            )
        tx_query = tx_query.filter(
            Transaction.date.between(start, end),
            Transaction.status == 'completed'
        )
        transactions = tx_query.all()

        # Calculate totals
        total_amount = sum(tx.amount or 0 for tx in transactions)
        total_benefited_amount = sum(tx.benefited_amount or 0 for tx in transactions)
        total_tax_amount = sum(tx.tax_amount or 0 for tx in transactions)
        total_transactions = len(transactions)
        total_profit = 0.0

        # Prepare branch summary
        branch_summary_dict = {}
        for tx in transactions:
            b_id = tx.branch_id
            currency = tx.currency or "SYP"
            if b_id not in branch_summary_dict:
                branch = db.query(Branch).filter(Branch.id == b_id).first()
                branch_summary_dict[b_id] = {
                    "branch_id": b_id,
                    "branch_name": branch.name if branch else str(b_id),
                    "tax_rate": branch.tax_rate if branch else 0,
                    "transaction_count": 0,
                    "total_amount": 0.0,
                    "benefited_amount": 0.0,
                    "tax_amount": 0.0,
                    "profit": 0.0,
                    "currency": currency
                }
            summary = branch_summary_dict[b_id]
            summary["transaction_count"] += 1
            summary["total_amount"] += tx.amount or 0
            summary["benefited_amount"] += tx.benefited_amount or 0
            summary["tax_amount"] += tx.tax_amount or 0
            summary["currency"] = currency
            # حساب الربح: إذا كان الفرع هو المدير (id==0) الربح = benefited_amount، غير ذلك الربح = benefited_amount - tax_amount
            if b_id == 0:
                profit = tx.benefited_amount or 0
            else:
                profit = (tx.benefited_amount or 0) - (tx.tax_amount or 0)
            summary["profit"] += profit
            total_profit += profit
        branch_summary = list(branch_summary_dict.values())

        # Prepare transactions list for frontend
        tx_list = []
        for tx in transactions:
            sending_branch = db.query(Branch).filter(Branch.id == tx.branch_id).first()
            destination_branch = db.query(Branch).filter(Branch.id == tx.destination_branch_id).first()
            # حساب الربح لكل عملية
            if tx.branch_id == 0:
                profit = tx.benefited_amount or 0
            else:
                profit = (tx.benefited_amount or 0) - (tx.tax_amount or 0)
            tx_list.append({
                "id": tx.id,
                "date": tx.date.strftime("%Y-%m-%d"),
                "amount": tx.amount,
                "benefited_amount": tx.benefited_amount,
                "tax_rate": tx.tax_rate,
                "tax_amount": tx.tax_amount,
                "currency": tx.currency,
                "source_branch": sending_branch.name if sending_branch else str(tx.branch_id),
                "destination_branch": destination_branch.name if destination_branch else str(tx.destination_branch_id),
                "status": tx.status,
                "profit": profit
            })

        response_data = {
            "start_date": start_date,
            "end_date": end_date,
            "total_amount": total_amount,
            "total_benefited_amount": total_benefited_amount,
            "total_tax_amount": total_tax_amount,
            "total_transactions": total_transactions,
            "total_profit": total_profit,
            "branch_summary": branch_summary,
            "transactions": tx_list
        }
        return response_data

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date format. Please use YYYY-MM-DD format: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving tax summary: {str(e)}"
        )

@app.get("/backup/")
def download_backup(current_user: dict = Depends(get_current_user)):
    # السماح فقط للمديرين
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Director access required")
    db_path = "transactions.db"
    backup_path = "system_backup_temp.sqlite"
    # عمل نسخة مؤقتة حتى لا تتعارض مع عمليات الكتابة
    try:
        shutil.copyfile(db_path, backup_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")
    response = FileResponse(backup_path, filename="system_backup.sqlite", media_type="application/octet-stream")
    # حذف الملف المؤقت بعد الإرسال
    import os
    from starlette.background import BackgroundTask
    response.background = BackgroundTask(lambda: os.remove(backup_path))
    return response

@app.post("/restore/")
async def restore_backup(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Director access required")
    db_path = "transactions.db"
    try:
        # احفظ الملف المرفوع مؤقتاً
        temp_path = "restore_temp.sqlite"
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        # استبدل قاعدة البيانات القديمة بالجديدة
        shutil.move(temp_path, db_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")
    return {"status": "success", "message": "تمت الاستعادة بنجاح"}

@app.get("/financial/total/")
def get_total_financial_stats(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Director access required")
    total_syp = db.query(func.coalesce(func.sum(Branch.allocated_amount_syp), 0.0)).scalar()
    total_usd = db.query(func.coalesce(func.sum(Branch.allocated_amount_usd), 0.0)).scalar()
    return {
        "total_balance_syp": total_syp,
        "total_balance_usd": total_usd
    }

@app.get("/activity/")
def get_activity(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user), limit: int = 20):
    # المدير فقط يمكنه رؤية كل الأنشطة
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Director access required")
    activities = []
    transactions = db.query(Transaction).order_by(desc(Transaction.date)).limit(limit).all()
    for tx in transactions:
        activities.append({
            "time": tx.date.strftime("%Y-%m-%d %H:%M:%S") if tx.date else "",
            "type": "تحويل مالي",
            "details": f"من {tx.sender} إلى {tx.receiver} بمبلغ {tx.amount} {tx.currency}",
            "status": tx.status
        })
    return {"activities": activities}

@app.get("/api/branches/{branch_id}/profits/")
async def get_branch_profits(
    branch_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    currency: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get profits for a specific branch with filters."""
    # Authorization check
    if current_user["role"] != "branch_manager" or current_user["branch_id"] != branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only branch managers can view their own branch profits"
        )

    try:
        # Build base query for transactions
        query = db.query(Transaction).filter(
            Transaction.branch_id == branch_id,  # Only outgoing transactions
            Transaction.status == 'completed'    # Only completed transactions
        )

        # Apply date filters
        if start_date:
            query = query.filter(Transaction.date >= datetime.strptime(start_date, "%Y-%m-%d"))
        if end_date:
            query = query.filter(Transaction.date <= datetime.strptime(end_date, "%Y-%m-%d"))

        # Apply currency filter
        if currency:
            query = query.filter(Transaction.currency == currency)

        # Execute query
        transactions = query.all()

        # Calculate profits
        total_syp = 0
        total_usd = 0
        transaction_list = []

        for tx in transactions:
            # حساب الضريبة بشكل صحيح فقط على المبلغ المستفاد
            tax_amount = tx.benefited_amount * (tx.tax_rate / 100)
            benefited_profit = tx.benefited_amount - tax_amount
            tax_profit = 0  # الضريبة ليست ربح للفرع المرسل
            total_profit = benefited_profit

            # تحديث الإجماليات
            if tx.currency == "SYP":
                total_syp += total_profit
            elif tx.currency == "USD":
                total_usd += total_profit

            transaction_list.append({
                "id": tx.id,
                "date": tx.date.strftime("%Y-%m-%d %H:%M:%S"),
                "benefited_amount": float(tx.benefited_amount),
                "tax_rate": float(tx.tax_rate),
                "tax_amount": float(tax_amount),
                "benefited_profit": float(benefited_profit),
                "tax_profit": float(tax_profit),
                "profit": float(total_profit),
                "currency": tx.currency,
                "status": tx.status
            })

        return {
            "total_profits_syp": float(total_syp),
            "total_profits_usd": float(total_usd),
            "total_transactions": len(transactions),
            "transactions": transaction_list
        }

    except Exception as e:
        logger.error(f"Error getting branch profits: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving profits data: {str(e)}"
        )

@app.get("/api/branches/{branch_id}/profits/summary/")
async def get_branch_profits_summary(
    branch_id: int,
    period: str = "monthly",  # monthly, yearly, or all-time
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a summary of branch profits over time."""
    # Authorization check
    if current_user["role"] != "branch_manager" or current_user["branch_id"] != branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only branch managers can view their own branch profits"
        )

    try:
        # Calculate start date based on period
        today = datetime.now()
        if period == "monthly":
            start_date = today.replace(day=1)
        elif period == "yearly":
            start_date = today.replace(month=1, day=1)
        else:  # all-time
            start_date = None

        # Build query
        query = db.query(
            func.sum(Transaction.benefited_amount - (Transaction.benefited_amount * (Transaction.tax_rate / 100))).label('profit'),
            Transaction.currency
        ).filter(
            Transaction.branch_id == branch_id,
            Transaction.status == 'completed'
        )

        if start_date:
            query = query.filter(Transaction.date >= start_date)

        # Group by currency
        query = query.group_by(Transaction.currency)

        # Execute query
        results = query.all()

        # Format results
        summary = {
            "period": period,
            "profits": {
                "SYP": 0.0,
                "USD": 0.0
            }
        }

        for profit, currency in results:
            if currency in summary["profits"]:
                summary["profits"][currency] = float(profit or 0)

        return summary

    except Exception as e:
        logger.error(f"Error getting branch profits summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving profits summary: {str(e)}"
        )

@app.get("/api/branches/{branch_id}/profits/statistics/")
async def get_branch_profits_statistics(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed statistics about branch profits."""
    # Authorization check
    if current_user["role"] != "branch_manager" or current_user["branch_id"] != branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only branch managers can view their own branch statistics"
        )

    try:
        # Get total transactions and average profit per transaction
        stats = db.query(
            func.count(Transaction.id).label('total_transactions'),
            func.avg(Transaction.benefited_amount - (Transaction.benefited_amount * (Transaction.tax_rate / 100))).label('avg_profit'),
            Transaction.currency
        ).filter(
            Transaction.branch_id == branch_id,
            Transaction.status == 'completed'
        ).group_by(Transaction.currency).all()

        # Calculate highest profit transaction
        highest_profit_tx = db.query(Transaction).filter(
            Transaction.branch_id == branch_id,
            Transaction.status == 'completed'
        ).order_by(desc(Transaction.benefited_amount - (Transaction.benefited_amount * (Transaction.tax_rate / 100)))).first()

        # Format statistics
        statistics = {
            "total_transactions": {},
            "average_profit": {},
            "highest_profit": {
                "amount": 0,
                "currency": "",
                "date": None,
                "transaction_id": None
            }
        }

        for count, avg, currency in stats:
            statistics["total_transactions"][currency] = count
            statistics["average_profit"][currency] = float(avg or 0)

        if highest_profit_tx:
            profit = highest_profit_tx.benefited_amount - (highest_profit_tx.benefited_amount * (highest_profit_tx.tax_rate / 100))
            statistics["highest_profit"] = {
                "amount": float(profit),
                "currency": highest_profit_tx.currency,
                "date": highest_profit_tx.date.strftime("%Y-%m-%d %H:%M:%S"),
                "transaction_id": highest_profit_tx.id
            }

        return statistics

    except Exception as e:
        logger.error(f"Error getting branch statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving branch statistics: {str(e)}"
        )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    logger = logging.getLogger("uvicorn.error")
    logger.error(f"Unhandled error: {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "حدث خطأ غير متوقع في الخادم. الرجاء المحاولة لاحقاً.",
            "error_type": str(type(exc).__name__),
        },
    )

@app.exception_handler(FastAPIRequestValidationError)
async def validation_exception_handler(request: Request, exc: FastAPIRequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "detail": "المدخلات غير صحيحة. الرجاء التحقق من البيانات المدخلة.",
            "errors": exc.errors(),
        },
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
        },
    )

# Metrics variables
metrics = {
    'total_requests': 0,
    'successful_requests': 0,
    'failed_requests': 0,
    'total_duration': 0.0
}

@app.middleware("http")
async def log_request_metrics(request: Request, call_next):
    start_time = time.time()
    metrics['total_requests'] += 1
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        metrics['total_duration'] += duration
        if response.status_code < 400:
            metrics['successful_requests'] += 1
        else:
            metrics['failed_requests'] += 1
        logger.info(f"{request.method} {request.url.path} - {response.status_code} - {duration:.3f}s")
        return response
    except Exception as exc:
        duration = time.time() - start_time
        metrics['failed_requests'] += 1
        metrics['total_duration'] += duration
        logger.error(f"{request.method} {request.url.path} - 500 - {duration:.3f}s - Exception: {exc}")
        raise

@app.get("/metrics/")
def get_metrics():
    avg_duration = metrics['total_duration'] / metrics['total_requests'] if metrics['total_requests'] else 0
    return {
        "total_requests": metrics['total_requests'],
        "successful_requests": metrics['successful_requests'],
        "failed_requests": metrics['failed_requests'],
        "average_duration": round(avg_duration, 4)
    }

def require_role(current_user, allowed_roles):
    if current_user["role"] not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ليس لديك الصلاحية الكافية.")

def require_branch_access(current_user, branch_id):
    if current_user["role"] == "branch_manager" and current_user["branch_id"] != branch_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="يمكنك فقط إدارة فرعك.")

@app.get("/reports/daily/")
def get_daily_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    start_date: str = None,
    end_date: str = None
):
    from datetime import datetime
    # إذا لم يتم تمرير start_date أو end_date، اجعلها تساوي تاريخ اليوم
    today_str = datetime.now().strftime("%Y-%m-%d")
    if not start_date:
        start_date = today_str
    if not end_date:
        end_date = today_str
    query = db.query(Transaction)
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        query = query.filter(Transaction.date >= start)
    except ValueError:
        pass
    try:
        end = datetime.strptime(end_date, "%Y-%m-%d")
        end = end.replace(hour=23, minute=59, second=59)
        query = query.filter(Transaction.date <= end)
    except ValueError:
        pass
    # Branch managers can only see their branch's data
    if current_user["role"] == "branch_manager":
        query = query.filter(Transaction.branch_id == current_user["branch_id"])
    transactions = query.all()
    total_count = len(transactions)
    total_amount = sum(tx.amount or 0 for tx in transactions)
    total_tax = sum(tx.tax_amount or 0 for tx in transactions)
    completed_count = sum(1 for tx in transactions if tx.status == "completed")
    processing_count = sum(1 for tx in transactions if tx.status == "processing")
    cancelled_count = sum(1 for tx in transactions if tx.status == "cancelled")
    rejected_count = sum(1 for tx in transactions if tx.status == "rejected")
    pending_count = sum(1 for tx in transactions if tx.status == "pending")
    return {
        "summary": {
            "total_count": total_count,
            "total_amount": total_amount,
            "total_tax": total_tax,
            "completed_count": completed_count,
            "processing_count": processing_count,
            "cancelled_count": cancelled_count,
            "rejected_count": rejected_count,
            "pending_count": pending_count
        }
    }

settings_router = APIRouter()

system_settings = {
    "systemName": "شركة العنكبوت للحوالات",
    "companyName": "اسم الشركة",
    "adminEmail": "admin@example.com",
    "defaultCurrency": "ليرة سورية",
    "mainPhone": ""
}

@settings_router.get("/settings/system/")
def get_system_settings():
    return system_settings

@settings_router.put("/settings/system/")
def update_system_settings(new_settings: dict):
    system_settings.update(new_settings)
    return system_settings

app.include_router(settings_router)