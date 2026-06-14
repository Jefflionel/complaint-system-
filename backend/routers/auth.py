from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import security

# Define the router
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Reusable dependency type for SonarQube S8410 compliance
DbSession = Annotated[Session, Depends(get_db)]

# ═══════════════════════════════════════════════════════
# CITIZEN ENDPOINTS
# ═══════════════════════════════════════════════════════
@router.post(
    "/register", 
    response_model=schemas.UserResponse, 
    status_code=status.HTTP_201_CREATED,
    responses={400: {"description": "Email is already registered"}} # SonarQube S8415 compliance
)
def register_citizen(user: schemas.UserCreate, db: DbSession):
    """Registers a new citizen and securely separates their identity data."""
    
    # 1. Check if email already exists
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered")

    # 2. Hash the password and create the core User account
    hashed_password = security.get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        password_hash=hashed_password,
        language_preference=user.language_preference
    )
    db.add(new_user)
    db.flush()  

    # 3. Create the separated Identity record (The Privacy Vault)
    new_identity = models.UserIdentity(
        user_id=new_user.id,
        full_name=user.full_name,
        phone=user.phone
    )
    db.add(new_identity)
    
    # 4. Commit both to the database safely
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login_citizen(credentials: schemas.LoginRequest, db: DbSession):
    """Authenticates a citizen and returns a JWT."""
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    
    if not user or not security.verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    
    if user.account_status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended")

    access_token = security.create_access_token(data={"sub": str(user.id), "type": "citizen"})
    return {"access_token": access_token, "token_type": "bearer", "user_type": "citizen"}

# ═══════════════════════════════════════════════════════
# STAFF ENDPOINTS
# ═══════════════════════════════════════════════════════
#Staff registration is handled internally via database seeding

@router.post("/staff/login", response_model=schemas.Token)
def login_staff(credentials: schemas.LoginRequest, db: DbSession):
    """Authenticates a municipal worker and returns a JWT."""
    staff = db.query(models.Staff).filter(models.Staff.email == credentials.email).first()
    
    if not staff or not security.verify_password(credentials.password, staff.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    access_token = security.create_access_token(data={"sub": str(staff.id), "type": "staff"})
    return {"access_token": access_token, "token_type": "bearer", "user_type": "staff"}