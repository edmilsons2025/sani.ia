from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Annotated

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


@router.post("/lotes/", response_model=schemas.Lote)
def create_lote(lote: schemas.LoteCreate, db: Session = Depends(get_db)):
    db_lote = crud.get_lote_by_name(db, name=lote.name)
    if db_lote:
        raise HTTPException(status_code=400, detail="Lote already registered")
    return crud.create_lote(db=db, lote=lote)


@router.get("/lotes/", response_model=List[schemas.Lote])
def read_lotes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    lotes = crud.get_lotes(db, skip=skip, limit=limit)
    return lotes


@router.get("/lotes/{lote_id}", response_model=schemas.Lote)
def read_lote(lote_id: int, db: Session = Depends(get_db)):
    db_lote = crud.get_lote(db, lote_id=lote_id)
    if db_lote is None:
        raise HTTPException(status_code=404, detail="Lote not found")
    return db_lote


@router.put("/lotes/{lote_id}/status", response_model=schemas.Lote)
def update_lote_status(lote_id: int, status: Annotated[str, Body(embed=True)], db: Session = Depends(get_db)):
    db_lote = crud.update_lote_status(db, lote_id=lote_id, status=status)
    if db_lote is None:
        raise HTTPException(status_code=404, detail="Lote not found")
    return db_lote
