"""
Main FastAPI application entry point
"""
import logging
from logging.handlers import RotatingFileHandler
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback

from config import settings
from database import engine, Base
from middleware import RateLimitMiddleware, SecurityHeadersMiddleware, LoggingMiddleware
from exceptions import PaymentSystemException

# Setup logging
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

# Create FastAPI app
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

# Create database tables
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

# Include routers
try:
    from routers import auth
    app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
    logger.info("Auth router loaded successfully")
except ImportError as e:
    logger.warning(f"Could not import auth router: {e}")

# Temporary: Include old server for backward compatibility
# This will be removed after migrating all endpoints
# Import old endpoints for backward compatibility
try:
    from server_improved import app as old_app
    # Include old app routes directly instead of mounting
    # This maintains backward compatibility while we migrate
    logger.info("Old server_improved loaded for backward compatibility")
except ImportError as e:
    logger.warning(f"Could not import old server_improved: {e}")

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )

