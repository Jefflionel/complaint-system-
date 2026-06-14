from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from database import get_db
import models
import schemas
import security

router = APIRouter(prefix="/api/suggestions", tags=["Public Suggestion Box"])
DbSession = Annotated[Session, Depends(get_db)]

@router.post("/", response_model=schemas.SuggestionResponse, status_code=status.HTTP_201_CREATED)
def submit_suggestion(
    suggestion: schemas.SuggestionCreate,
    db: DbSession,
    current_user_id: Annotated[int, Depends(security.get_current_user_id)]
):
    """Feature F1: Citizens submit improvement ideas."""
    new_idea = models.Suggestion(
        user_id=current_user_id,
        title=suggestion.title,
        description=suggestion.description,
        category=suggestion.category,
        district_id=suggestion.district_id
    )
    db.add(new_idea)
    db.commit()
    db.refresh(new_idea)
    
    # Add a default support count of 0 for the response
    setattr(new_idea, 'support_count', 0)
    return new_idea

@router.get("/", response_model=List[schemas.SuggestionResponse])
def get_public_suggestions(
    db: DbSession,
    district_id: Optional[int] = None,
    category: Optional[schemas.SuggestionCategoryKey] = None
):
    """
    Feature F3 & F6: Fetches all suggestions, dynamically calculates upvotes, 
    sorts by most popular, and allows filtering by district or category.
    """
    # 1. Build a smart query that counts upvotes automatically
    query = db.query(
        models.Suggestion, 
        func.count(models.SuggestionSupport.id).label('support_count')
    ).outerjoin(models.SuggestionSupport).group_by(models.Suggestion.id)

    # 2. Apply optional filters
    if district_id:
        query = query.filter(models.Suggestion.district_id == district_id)
    if category:
        query = query.filter(models.Suggestion.category == category)

    # 3. Sort by highest upvotes first
    results = query.order_by(func.count(models.SuggestionSupport.id).desc()).all()

    # 4. Map the results cleanly to our schema
    final_suggestions = []
    for row in results:
        idea = row.Suggestion
        setattr(idea, 'support_count', row.support_count)
        final_suggestions.append(idea)
        
    return final_suggestions

@router.post("/{suggestion_id}/support", status_code=status.HTTP_201_CREATED)
def upvote_suggestion(
    suggestion_id: int,
    db: DbSession,
    current_user_id: Annotated[int, Depends(security.get_current_user_id)]
):
    """Feature F4 & G11: Add support to an idea. Prevents double-voting."""
    # Ensure the idea exists
    idea = db.query(models.Suggestion).filter(models.Suggestion.id == suggestion_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    new_support = models.SuggestionSupport(user_id=current_user_id, suggestion_id=suggestion_id)
    
    try:
        db.add(new_support)
        db.commit()
        return {"message": "Support added successfully!"}
    except IntegrityError:
        # The UniqueConstraint triggered because they already voted!
        db.rollback()
        raise HTTPException(status_code=400, detail="You have already supported this suggestion.")