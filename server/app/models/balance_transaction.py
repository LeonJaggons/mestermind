from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.session import Base


class BalanceTransactionType(str, enum.Enum):
    deposit = "deposit"  # Adding funds to balance
    withdrawal = "withdrawal"  # Using balance for purchase
    refund = "refund"  # Refund to balance


class BalanceTransaction(Base):
    """Model for tracking all balance transactions"""
    __tablename__ = "balance_transactions"

    id = Column(Integer, primary_key=True, index=True)
    pro_profile_id = Column(Integer, ForeignKey("pro_profiles.id", ondelete="CASCADE"), nullable=False)
    
    # Transaction details
    transaction_type = Column(SQLEnum(BalanceTransactionType), nullable=False)
    amount_huf = Column(Integer, nullable=False)  # Amount in HUF (positive for deposits, negative for withdrawals)
    balance_before_huf = Column(Integer, nullable=False)  # Balance before this transaction
    balance_after_huf = Column(Integer, nullable=False)  # Balance after this transaction
    
    # Reference to related entities
    lead_purchase_id = Column(Integer, ForeignKey("lead_purchases.id", ondelete="SET NULL"), nullable=True)  # If related to a purchase
    stripe_payment_intent_id = Column(String, nullable=True)  # If related to a Stripe payment
    description = Column(Text, nullable=True)  # Human-readable description
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    pro_profile = relationship("ProProfile", backref="balance_transactions")
    lead_purchase = relationship("LeadPurchase", backref="balance_transactions")

