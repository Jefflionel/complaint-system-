import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Fetch the database URL strictly from the environment variable
# No hardcoded fallback string allowed!
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Security check: Prevent the app from starting if the secret is missing
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("CRITICAL ERROR: DATABASE_URL environment variable is not set!")

# Create the SQLAlchemy engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create a session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for our models
Base = declarative_base()

# Dependency to get the DB session in our routes later
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()