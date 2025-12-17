"""
Shared dependencies for the application
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from typing import Dict, Optional

from database import get_db
from config import settings
from models import User
from exceptions import AuthenticationError, AuthorizationError
from jose import jwt, JWTError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Dict:
    """
    Get current authenticated user from JWT token
    """
    credentials_exception = AuthenticationError("Could not validate credentials")
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("username")
        role: str = payload.get("role")
        branch_id: Optional[int] = payload.get("branch_id")
        user_id: Optional[int] = payload.get("user_id")
        
        if username is None or role is None:
            raise credentials_exception
            
        # Verify user still exists in database
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            raise credentials_exception
        
        return {
            "username": username,
            "role": role,
            "branch_id": branch_id,
            "user_id": user_id
        }
    except JWTError:
        raise credentials_exception


def require_role(allowed_roles: list[str]):
    """
    Dependency to require specific role(s)
    """
    def role_checker(current_user: Dict = Depends(get_current_user)) -> Dict:
        if current_user["role"] not in allowed_roles:
            raise AuthorizationError(
                f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


def require_director(current_user: Dict = Depends(get_current_user)) -> Dict:
    """Require director role"""
    if current_user["role"] != "director":
        raise AuthorizationError("Director access required")
    return current_user


def require_manager(current_user: Dict = Depends(get_current_user)) -> Dict:
    """Require manager role (director or branch_manager)"""
    if current_user["role"] not in ["director", "branch_manager"]:
        raise AuthorizationError("Manager access required")
    return current_user

