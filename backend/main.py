from contextlib import asynccontextmanager
from fastapi import FastAPI
from database import engine, Base, SessionLocal
import models
import security  # <-- Required for hashing the default passwords
from routers import auth, public, citizen, staff, suggestions
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# ═══════════════════════════════════════════════════════
# DATABASE SEEDING LOGIC
# ═══════════════════════════════════════════════════════
def seed_districts():
    """Seeds the database with the 7 Yaoundé districts if they don't exist."""
    db = SessionLocal()
    try:
        if db.query(models.District).count() == 0:
            print("Seeding Yaoundé Districts into the database...")
            districts = [
                models.District(name="Yaoundé I", code="Y1"),
                models.District(name="Yaoundé II", code="Y2"),
                models.District(name="Yaoundé III", code="Y3"),
                models.District(name="Yaoundé IV", code="Y4"),
                models.District(name="Yaoundé V", code="Y5"),
                models.District(name="Yaoundé VI", code="Y6"),
                models.District(name="Yaoundé VII", code="Y7"),
            ]
            db.add_all(districts)
            db.commit()
            print("Districts seeded successfully!")
    finally:
        db.close()

def seed_staff():
    """Seeds the 7 official municipal staff accounts for the defense presentation."""
    db = SessionLocal()
    try:
        if db.query(models.Staff).count() == 0:
            print("Seeding Official Yaoundé Staff accounts...")
            staff_members = []
            
            # Loop from 1 to 7 to create the specific district admins
            for i in range(1, 8):
                # Hash the password before saving it!
                hashed_pwd = security.get_password_hash(f"YaoundeAdmin{i}")
                
                staff = models.Staff(
                    email=f"admin.y{i}@yaounde.cm",
                    password_hash=hashed_pwd,
                    full_name=f"Admin Yaoundé {i}",
                    district_id=i
                )
                staff_members.append(staff)
                
            db.add_all(staff_members)
            db.commit()
            print("Staff accounts seeded successfully!")
    finally:
        db.close()

# ═══════════════════════════════════════════════════════
# APP LIFESPAN CONFIGURATION
# ═══════════════════════════════════════════════════════
@asynccontextmanager
async def lifespan(app: FastAPI):
    # What happens when the server starts up:
    Base.metadata.create_all(bind=engine)
    seed_districts()  # Must run FIRST because staff need a district_id
    seed_staff()      # Runs SECOND to assign staff to districts
    yield

# Initialize FastAPI
app = FastAPI(title="Yaoundé Complaints API", lifespan=lifespan)

# Create uploads folder if it doesn't exist
os.makedirs("uploads", exist_ok=True)
# Expose it to the internet
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# Fetch allowed origins from environment, default to allow-all for local dev if not set
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL] if FRONTEND_URL != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the routes
app.include_router(auth.router)
app.include_router(public.router)
app.include_router(citizen.router)
app.include_router(staff.router)
app.include_router(suggestions.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Yaoundé Community Complaint System API is running securely!"
    }