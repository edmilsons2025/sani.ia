from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
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


@router.post("/test_classes/", response_model=schemas.TestClass)
def create_test_class(test_class: schemas.TestClassCreate, db: Session = Depends(get_db)):
    return crud.create_test_class(db=db, test_class=test_class)


@router.get("/test_classes/", response_model=List[schemas.TestClass])
def read_test_classes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    test_classes = crud.get_test_classes(db, skip=skip, limit=limit)
    return test_classes


@router.post("/test_classes/{test_class_id}/test_items/", response_model=schemas.TestItem)
def create_test_item_for_class(
    test_class_id: uuid.UUID, test_item: schemas.TestItemCreate, db: Session = Depends(get_db)
):
    return crud.create_test_item(db=db, test_item=test_item, test_class_id=test_class_id)


@router.delete("/test_classes/{test_class_id}", response_model=schemas.TestClass)
def delete_test_class(test_class_id: uuid.UUID, db: Session = Depends(get_db)):
    db_test_class = crud.delete_test_class(db, test_class_id=test_class_id)
    if db_test_class is None:
        raise HTTPException(status_code=404, detail="Test class not found")
    return db_test_class
