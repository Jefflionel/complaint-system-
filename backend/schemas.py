# backend/schemas.py
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
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    REJECTED = "Rejected"

class DepartmentKey(str, Enum):
    ROADS = "Roads"
    WASTE = "Waste"
    WATER = "Water"
    ELECTRICITY = "Electricity"
    DRAINAGE = "Drainage"

# ═══════════════════════════════════════════════════════
# NESTED USER INFO FOR STAFF DASHBOARD (THE ANONYMOUS FIX)
# ═══════════════════════════════════════════════════════
class UserIdentityNested(BaseModel):
    full_name: str
    phone: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class UserNested(BaseModel):
    identity: Optional[UserIdentityNested] = None
    model_config = ConfigDict(from_attributes=True)

# ═══════════════════════════════════════════════════════
# COMPLAINT SCHEMAS
# ═══════════════════════════════════════════════════════
class ComplaintCreate(BaseModel):
    title: str
    description: str
    location: str 
    district_id: int = Field(..., ge=1, le=7)
    category_name: ComplaintCategoryKey
    is_anonymous: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ComplaintResponse(BaseModel):
    id: int
    ticket_id: str
    title: str
    description: str          
    location: Optional[str]   
    district_id: int          
    category: ComplaintCategoryKey
    status: ComplaintStatus  
    latitude: Optional[float] 
    longitude: Optional[float]
    photo_path: Optional[str] 
    is_anonymous: bool         # Tells the frontend if it's hidden
    user: Optional[UserNested] = None # Passes the user data to the frontend
    resolution_notes: Optional[str] = None       
    resolution_photo_path: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ═══════════════════════════════════════════════════════
# SUGGESTION BOX SCHEMAS 
# ═══════════════════════════════════════════════════════
class SuggestionCategoryKey(str, Enum):
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
    support_count: int = 0  
    
    model_config = ConfigDict(from_attributes=True)