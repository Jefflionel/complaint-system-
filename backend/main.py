from fastapi import FastAPI
from database import engine, Base
import models

# Instructs SQLAlchemy to create all tables in the database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Yaoundé Complaints API")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Yaoundé Community Complaint System API is running, and all 9 tables are created successfully!"
    }
