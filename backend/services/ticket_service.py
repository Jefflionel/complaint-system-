from datetime import datetime
from sqlalchemy.orm import Session
import models

def generate_ticket_id(db: Session) -> str:
    """Generates sequential tracking numbers like YDE-2026-0001"""
    current_year = datetime.now().year
    prefix = f"YDE-{current_year}-"

    # Find the last complaint submitted this year
    last_complaint = db.query(models.Complaint)\
        .filter(models.Complaint.ticket_id.like(f"{prefix}%"))\
        .order_by(models.Complaint.id.desc())\
        .first()

    if last_complaint:
        # Extract the sequence number and increment it
        last_number = int(last_complaint.ticket_id.split("-")[-1])
        new_number = last_number + 1
    else:
        # First complaint of the year
        new_number = 1

    # Format with leading zeros (e.g., 0001)
    return f"{prefix}{new_number:04d}"