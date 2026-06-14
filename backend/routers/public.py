from typing import Annotated, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

# Define the router
router = APIRouter(prefix="/api/public", tags=["Public Data"])

# Reusable database session dependency
DbSession = Annotated[Session, Depends(get_db)]

@router.get("/districts", response_model=List[schemas.DistrictResponse])
def get_all_districts(db: DbSession):
    """Fetches all 7 Yaoundé districts for the frontend dropdowns."""
    # Queries the database and orders them exactly from I to VII
    districts = db.query(models.District).order_by(models.District.id).all()
    return districts