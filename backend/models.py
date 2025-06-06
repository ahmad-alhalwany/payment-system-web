from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Float, Text, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String, default="employee")
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relationship to Branch
    branch = relationship("Branch", back_populates="users")

class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    location = Column(String)
    governorate = Column(String)
    phone_number = Column(String)  # رقم هاتف الفرع
    allocated_amount_syp = Column(Float, default=0.0)
    allocated_amount_usd = Column(Float, default=0.0)
    allocated_amount = Column(Float, default=0.0)  # Kept for backward compatibility
    tax_rate = Column(Float, default=0.0)  # Added tax rate field
    created_at = Column(DateTime, default=datetime.now)
    
    fund_history = relationship("BranchFund", back_populates="branch")
    # Relationships
    users = relationship("User", back_populates="branch")
    sent_transactions = relationship("Transaction", foreign_keys="[Transaction.branch_id]", back_populates="branch")
    received_transactions = relationship("Transaction", foreign_keys="[Transaction.destination_branch_id]", back_populates="destination_branch")
    profits = relationship("BranchProfits", back_populates="branch")


class BranchFund(Base):
    __tablename__ = "branch_funds"

    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    amount = Column(Float)
    type = Column(String)
    currency = Column(String, default="SYP")  # Added currency field
    description = Column(String)
    created_at = Column(DateTime, default=datetime.now)
    
    branch = relationship("Branch", back_populates="fund_history")

class Transaction(Base):
    __tablename__ = "transactions"
    
    # Add indexes for commonly queried fields
    __table_args__ = (
        Index('idx_transaction_date', 'date'),
        Index('idx_transaction_branch', 'branch_id'),
        Index('idx_transaction_currency', 'currency'),
        Index('idx_transaction_status', 'status'),
        Index('idx_transaction_dates', 'date', 'branch_id', 'currency', 'status')
    )

    id = Column(String, primary_key=True, index=True)
    sender = Column(String)
    sender_mobile = Column(String)
    sender_governorate = Column(String)
    sender_location = Column(String)
    receiver = Column(String)
    receiver_mobile = Column(String)
    amount = Column(Float)  # Total amount
    base_amount = Column(Float, default=0.0)  # Added base amount
    benefited_amount = Column(Float, default=0.0)  # Added benefited amount
    currency = Column(String, default="ليرة سورية")
    message = Column(Text)
    
    # Branch relationships
    branch_id = Column(Integer, ForeignKey("branches.id"))
    destination_branch_id = Column(Integer, ForeignKey("branches.id"))
    
    # Tax information
    tax_amount = Column(Float, default=0.0)  # Amount of tax collected
    tax_rate = Column(Float, default=0.0)    # Tax rate applied at time of transaction
    
    # User relationships
    employee_id = Column(Integer, ForeignKey("users.id"))
    received_by = Column(Integer, ForeignKey("users.id"))
    
    employee_name = Column(String)
    branch_governorate = Column(String)
    status = Column(String, default="processing")
    is_received = Column(Boolean, default=False)
    received_at = Column(DateTime)
    date = Column(DateTime, default=datetime.now)
    receiver_governorate = Column(String)
    
    # Relationships
    branch = relationship("Branch", foreign_keys=[branch_id], back_populates="sent_transactions")
    destination_branch = relationship("Branch", foreign_keys=[destination_branch_id], back_populates="received_transactions")
    employee = relationship("User", foreign_keys=[employee_id])
    receiver_user = relationship("User", foreign_keys=[received_by])
    profits = relationship("BranchProfits", back_populates="transaction")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, ForeignKey("transactions.id"))
    recipient_phone = Column(String)
    message = Column(Text)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.now)

    transaction = relationship("Transaction", backref="notifications")

class BranchProfits(Base):
    __tablename__ = "branch_profits"

    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    transaction_id = Column(String, ForeignKey("transactions.id"))
    profit_amount = Column(Float, default=0.0)
    currency = Column(String)
    source_type = Column(String)  # 'benefited_amount', 'tax', etc.
    date = Column(DateTime, default=datetime.now)
    
    # Relationships
    branch = relationship("Branch", back_populates="profits")
    transaction = relationship("Transaction", back_populates="profits")

# Add relationship to Branch class
Branch.profits = relationship("BranchProfits", back_populates="branch")

# Add relationship to Transaction class
Transaction.profits = relationship("BranchProfits", back_populates="transaction")   