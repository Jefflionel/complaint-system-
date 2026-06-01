from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# ═══════════════════════════════════════════════════════
# CITIZEN SCHEMAS
# ═══════════════════════════════════════════════════════
class UserCreate(BaseModel):
    """Data required from the frontend to register a new citizen."""
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    language_preference: str = "en"

class UserResponse(BaseModel):
    """Data sent back to the frontend after a successful login/registration."""
    id: int
    email: str
    language_preference: str
    account_status: str

    class Config:
        from_attributes = True

# ═══════════════════════════════════════════════════════
# STAFF SCHEMAS
# ═══════════════════════════════════════════════════════
class StaffCreate(BaseModel):
    """Data required to register a municipal worker."""
    email: EmailStr
    password: str
    full_name: str
    district_id: int

class StaffResponse(BaseModel):
    """Data sent back to the frontend for staff profiles."""
    id: int
    email: str
    full_name: str
    district_id: int

    class Config:
        from_attributes = True

# ═══════════════════════════════════════════════════════
# AUTHENTICATION SCHEMAS
# ═══════════════════════════════════════════════════════
class Token(BaseModel):
    """The shape of the JWT response."""
    access_token: str
    token_type: str
    user_type: str  # "citizen" or "staff"

class LoginRequest(BaseModel):
    """Standardized login payload for both citizens and staff."""
    email: EmailStr
    password: str