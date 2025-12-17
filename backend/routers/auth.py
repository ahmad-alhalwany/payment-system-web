"""
Authentication router
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel

from database import get_db
from models import User
from security import hash_password, verify_password, create_jwt_token
from dependencies import get_current_user, require_manager
from exceptions import AuthenticationError, BusinessLogicError
from config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "employee"
    branch_id: int | None = None


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class PasswordResetRequest(BaseModel):
    username: str
    new_password: str


@router.post("/login")
async def login(user: LoginRequest, db: Session = Depends(get_db)):
    """
    User login endpoint
    """
    db_user = db.query(User).filter(User.username == user.username).first()
    
    if not db_user or not verify_password(user.password, db_user.password):
        raise AuthenticationError("Incorrect username or password")
    
    # Create token with expiration time
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
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
        "token": access_token  # For frontend compatibility
    }


@router.post("/register")
def register_user(
    user: UserCreate,
    current_user: dict = Depends(require_manager),
    db: Session = Depends(get_db)
):
    """
    Register new user (requires manager role)
    """
    # Branch managers can only create employees for their own branch
    if current_user["role"] == "branch_manager":
        if user.role != "employee" or user.branch_id != current_user["branch_id"]:
            raise BusinessLogicError(
                "Branch managers can only create employees for their own branch"
            )
    
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise BusinessLogicError("Username already registered")
    
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
    
    return {
        "id": db_user.id,
        "username": db_user.username,
        "role": db_user.role,
        "branch_id": db_user.branch_id,
        "created_at": db_user.created_at.isoformat() if db_user.created_at else None
    }


@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user password
    """
    db_user = db.query(User).filter(User.username == current_user["username"]).first()
    
    if not db_user:
        raise AuthenticationError("User not found")
    
    if not verify_password(request.old_password, db_user.password):
        raise AuthenticationError("Incorrect old password")
    
    db_user.password = hash_password(request.new_password)
    db.commit()
    
    return {"status": "success", "message": "Password changed successfully"}


@router.post("/reset-password")
def reset_password(
    request: PasswordResetRequest,
    current_user: dict = Depends(require_manager),
    db: Session = Depends(get_db)
):
    """
    Reset user password (requires manager role)
    """
    db_user = db.query(User).filter(User.username == request.username).first()
    
    if not db_user:
        raise BusinessLogicError("User not found")
    
    # Branch managers can only reset passwords for their branch employees
    if current_user["role"] == "branch_manager":
        if db_user.branch_id != current_user["branch_id"]:
            raise BusinessLogicError("You can only reset passwords for your branch employees")
    
    db_user.password = hash_password(request.new_password)
    db.commit()
    
    return {"status": "success", "message": "Password reset successfully"}

