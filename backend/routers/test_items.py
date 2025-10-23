import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import crud, models, schemas
from database import SessionLocal, engine

router = APIRouter()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.delete("/test_items/{test_item_id}", response_model=schemas.TestItem)
def delete_test_item(test_item_id: uuid.UUID, db: Session = Depends(get_db)):
    db_test_item = crud.delete_test_item(db, test_item_id=test_item_id)
    if db_test_item is None:
        raise HTTPException(status_code=404, detail="Test item not found")
    return db_test_item
