# backend/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import security

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )

    hashed_password = security.get_password_hash(user.password)

    new_user = models.User(
        email=user.email,
        password_hash=hashed_password,
        language_preference=user.language_preference
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_identity = models.UserIdentity(
        user_id=new_user.id,
        full_name=user.full_name,
        phone=user.phone
    )
    db.add(new_identity)
    db.commit()

    return {"message": "User registered successfully"}


@router.post("/login", response_model=schemas.Token)
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    
    # 1. Check CITIZENS
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if user and security.verify_password(request.password, user.password_hash):
        # FIX: We now pass the user.id instead of the email!
        access_token = security.create_access_token(data={"sub": str(user.id), "type": "citizen"})
        return {"access_token": access_token, "token_type": "bearer", "user_type": "citizen"}

    # 2. Check STAFF
    staff = db.query(models.Staff).filter(models.Staff.email == request.email).first()
    if staff and security.verify_password(request.password, staff.password_hash):
        # FIX: We now pass the staff.id instead of the email!
        access_token = security.create_access_token(data={"sub": str(staff.id), "type": "staff"})
        return {"access_token": access_token, "token_type": "bearer", "user_type": "staff"}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password."
    )

# Add to the bottom of backend/routers/auth.py

@router.get("/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(security.get_current_user_id)
):
    """Fetches the currently logged-in user's profile and identity data."""
    user = db.query(models.User).filter(models.User.id == current_user_id).first()
    identity = db.query(models.UserIdentity).filter(models.UserIdentity.user_id == current_user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "email": user.email,
        "identity": {
            "full_name": identity.full_name if identity else "Not provided",
            "phone": identity.phone if identity else "Not provided"
        }
    }

@router.patch("/me")
def update_my_profile(
    data: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(security.get_current_user_id)
):
    """Updates the user's name, phone, or password."""
    user = db.query(models.User).filter(models.User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update Identity
    if data.full_name or data.phone:
        identity = db.query(models.UserIdentity).filter(models.UserIdentity.user_id == current_user_id).first()
        
        if not identity:
            identity = models.UserIdentity(user_id=current_user_id)
            db.add(identity)
            
        if data.full_name:
            identity.full_name = data.full_name
        if data.phone:
            identity.phone = data.phone

    # Update Password safely
    if data.password:
        user.password_hash = security.get_password_hash(data.password)

    db.commit()
    return {"message": "Profile updated successfully"}

@router.get("/staff/me")
def get_staff_profile(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(security.get_current_user_id)
):
    """Fetches the currently logged-in staff's profile data."""
    staff = db.query(models.Staff).filter(models.Staff.id == current_user_id).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    # Safely fetch the name (checking if your database uses 'name' or 'full_name' for staff)
    staff_name = getattr(staff, 'name', getattr(staff, 'full_name', 'Admin User'))

    return {
        "id": staff.id,
        "email": staff.email,
        "identity": {
            "full_name": staff_name,
            "phone": "N/A" # Staff don't use phone numbers
        }
    }

@router.patch("/staff/me")
def update_staff_profile(
    data: schemas.UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(security.get_current_user_id)
):
    """Updates the staff's name or password."""
    staff = db.query(models.Staff).filter(models.Staff.id == current_user_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")

    if data.full_name:
        if hasattr(staff, 'name'):
            staff.name = data.full_name
        elif hasattr(staff, 'full_name'):
            staff.full_name = data.full_name
        
    if data.password:
        # Checking to see which password column name your staff table uses
        if hasattr(staff, 'password_hash'):
            staff.password_hash = security.get_password_hash(data.password)
        elif hasattr(staff, 'hashed_password'):
            staff.hashed_password = security.get_password_hash(data.password)

    db.commit()
    return {"message": "Staff profile updated successfully"}

@router.delete("/me", status_code=204)
def delete_my_account(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(security.get_current_user_id)
):
    """Permanently deletes the citizen's account and all associated data."""
    user = db.query(models.User).filter(models.User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    # Returns 204 No Content on success