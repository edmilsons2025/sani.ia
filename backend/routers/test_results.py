from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import crud, models, schemas
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

router = APIRouter()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/lotes/{lote_id}/test_results/", response_model=schemas.TestResult)
def create_test_result_for_lote(
    lote_id: int, test_result: schemas.TestResultCreate, db: Session = Depends(get_db)
):
    return crud.create_test_result(db=db, test_result=test_result, lote_id=lote_id)


@router.get("/test_results/", response_model=List[schemas.TestResult])
def read_test_results(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    test_results = crud.get_test_results(db, skip=skip, limit=limit)
    return test_results
