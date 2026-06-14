from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum

# ═══════════════════════════════════════════════════════
# CITIZEN & STAFF SCHEMAS
# ═══════════════════════════════════════════════════════
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    phone: Optional[str] = None
    language_preference: str = "en"

class UserResponse(BaseModel):
    id: int
    email: str
    language_preference: str
    account_status: str
    model_config = ConfigDict(from_attributes=True)

class StaffCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    district_id: int = Field(..., ge=1, le=7)

class StaffResponse(BaseModel):
    id: int
    email: str
    full_name: str
    district_id: int
    model_config = ConfigDict(from_attributes=True)

# ═══════════════════════════════════════════════════════
# AUTH & PUBLIC DATA SCHEMAS
# ═══════════════════════════════════════════════════════
class Token(BaseModel):
    access_token: str
    token_type: str
    user_type: str  

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class DistrictResponse(BaseModel):
    id: int
    name: str
    code: str
    model_config = ConfigDict(from_attributes=True)

# ═══════════════════════════════════════════════════════
# COMPLAINT ENUMS 
# ═══════════════════════════════════════════════════════
class ComplaintCategoryKey(str, Enum):
    ROADS_TRANSPORT = "ROADS_TRANSPORT"
    WASTE_MANAGEMENT = "WASTE_MANAGEMENT"
    WATER_SANITATION = "WATER_SANITATION"
    ELECTRICITY_LIGHTING = "ELECTRICITY_LIGHTING"
    DRAINAGE_FLOODING = "DRAINAGE_FLOODING"
    PUBLIC_FACILITIES = "PUBLIC_FACILITIES"
    OTHER = "OTHER"

class ComplaintStatus(str, Enum):
    """The strict, allowed workflow states (Feature C2)."""
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    REJECTED = "Rejected"

class DepartmentKey(str, Enum):
    """Departments a complaint can be assigned to by staff (Feature D5)."""
    ROADS = "Roads"
    WASTE = "Waste"
    WATER = "Water"
    ELECTRICITY = "Electricity"
    DRAINAGE = "Drainage"

# ═══════════════════════════════════════════════════════
# COMPLAINT SCHEMAS
# ═══════════════════════════════════════════════════════
class ComplaintCreate(BaseModel):
    title: str
    description: str
    district_id: int = Field(..., ge=1, le=7)
    category_name: ComplaintCategoryKey
    is_anonymous: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ComplaintResponse(BaseModel):
    id: int
    ticket_id: str
    title: str
    category: ComplaintCategoryKey
    status: ComplaintStatus  # Now enforced by the Enum
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
    # ═══════════════════════════════════════════════════════
# SUGGESTION BOX SCHEMAS 
# ═══════════════════════════════════════════════════════
class SuggestionCategoryKey(str, Enum):
    """Specific categories for the public forum (Feature F2)."""
    ENVIRONMENT = "Environment"
    INFRASTRUCTURE = "Infrastructure"
    YOUTH = "Youth"
    CULTURE = "Culture"
    SAFETY = "Safety"
    OTHER = "Other"

class SuggestionCreate(BaseModel):
    title: str
    description: str
    category: SuggestionCategoryKey
    district_id: int = Field(..., ge=1, le=7)

class SuggestionResponse(BaseModel):
    id: int
    title: str
    description: str
    category: SuggestionCategoryKey
    district_id: int
    created_at: datetime
    support_count: int = 0  # We will calculate this on the fly!
    
    model_config = ConfigDict(from_attributes=True)