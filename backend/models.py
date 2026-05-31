from sqlalchemy import (
    Column, Integer, String, Boolean, ForeignKey, Text,
    DECIMAL, DateTime, UniqueConstraint
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

# ═══════════════════════════════════════════════════════
# TABLE 1: districts
# ═══════════════════════════════════════════════════════
class District(Base):
    __tablename__ = "districts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)   # "Yaoundé I"
    code = Column(String(10), unique=True, nullable=False)    # "Y1"
    
    # Relationships
    complaints = relationship("Complaint", back_populates="district")
    staff = relationship("Staff", back_populates="district", uselist=False)  # 1-to-1
    suggestions = relationship("Suggestion", back_populates="district")

# ═══════════════════════════════════════════════════════
# TABLE 2: users
# ═══════════════════════════════════════════════════════
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)         
    language_preference = Column(String(5), default="en")       
    account_status = Column(String(20), default="active")       
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    identity = relationship("UserIdentity", back_populates="user", uselist=False)
    complaints = relationship("Complaint", back_populates="user")
    suggestions = relationship("Suggestion", back_populates="user")
    suggestion_supports = relationship("SuggestionSupport", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

# ═══════════════════════════════════════════════════════
# TABLE 3: user_identities
# ═══════════════════════════════════════════════════════
class UserIdentity(Base):
    __tablename__ = "user_identities"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"),
        unique=True, nullable=False
    )
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="identity")

# ═══════════════════════════════════════════════════════
# TABLE 4: staff
# ═══════════════════════════════════════════════════════
class Staff(Base):
    __tablename__ = "staff"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    district_id = Column(
        Integer, ForeignKey("districts.id"), nullable=False
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    district = relationship("District", back_populates="staff")
    status_changes = relationship("ComplaintStatusHistory", back_populates="changed_by_staff")

# ═══════════════════════════════════════════════════════
# TABLE 5: complaints
# ═══════════════════════════════════════════════════════
class Complaint(Base):
    __tablename__ = "complaints"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String(20), unique=True, nullable=False, index=True)  
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True  # NULL = anonymous
    )
    is_anonymous = Column(Boolean, default=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)        
    district_id = Column(
        Integer, ForeignKey("districts.id"), nullable=False
    )
    latitude = Column(DECIMAL(10, 7), nullable=True)     
    longitude = Column(DECIMAL(10, 7), nullable=True)    
    photo_path = Column(String(500), nullable=True)       
    status = Column(String(30), default="submitted", index=True)
    assigned_department = Column(String(100), nullable=True)  
    resolution_photo_path = Column(String(500), nullable=True) 
    resolution_notes = Column(Text, nullable=True)         
    is_duplicate_of = Column(
        Integer, ForeignKey("complaints.id"), nullable=True  
    )
    sync_status = Column(String(20), default="synced")     
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="complaints")
    district = relationship("District", back_populates="complaints")
    status_history = relationship(
        "ComplaintStatusHistory", back_populates="complaint",
        order_by="ComplaintStatusHistory.created_at"
    )
    notifications = relationship("Notification", back_populates="complaint")

# ═══════════════════════════════════════════════════════
# TABLE 6: complaint_status_history
# ═══════════════════════════════════════════════════════
class ComplaintStatusHistory(Base):
    __tablename__ = "complaint_status_history"
    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(
        Integer, ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=False
    )
    old_status = Column(String(30), nullable=True)      
    new_status = Column(String(30), nullable=False)      
    changed_by = Column(
        Integer, ForeignKey("staff.id"), nullable=True   
    )
    notes = Column(Text, nullable=True)                  
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    complaint = relationship("Complaint", back_populates="status_history")
    changed_by_staff = relationship("Staff", back_populates="status_changes")

# ═══════════════════════════════════════════════════════
# TABLE 7: suggestions
# ═══════════════════════════════════════════════════════
class Suggestion(Base):
    __tablename__ = "suggestions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=True)
    district_id = Column(
        Integer, ForeignKey("districts.id"), nullable=False
    )
    support_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="suggestions")
    district = relationship("District", back_populates="suggestions")
    supports = relationship("SuggestionSupport", back_populates="suggestion")

# ═══════════════════════════════════════════════════════
# TABLE 8: suggestion_supports
# ═══════════════════════════════════════════════════════
class SuggestionSupport(Base):
    __tablename__ = "suggestion_supports"
    id = Column(Integer, primary_key=True, index=True)
    suggestion_id = Column(
        Integer, ForeignKey("suggestions.id", ondelete="CASCADE"),
        nullable=False
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Constraints
    __table_args__ = (
        UniqueConstraint("suggestion_id", "user_id", name="uq_one_support_per_user"),
    )
    
    # Relationships
    suggestion = relationship("Suggestion", back_populates="supports")
    user = relationship("User", back_populates="suggestion_supports")

# ═══════════════════════════════════════════════════════
# TABLE 9: notifications
# ═══════════════════════════════════════════════════════
class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    complaint_id = Column(
        Integer, ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=True  
    )
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    complaint = relationship("Complaint", back_populates="notifications")