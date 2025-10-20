from sqlalchemy.orm import Session
import models, schemas

# Lote CRUD
def get_lote(db: Session, lote_id: int):
    return db.query(models.Lote).filter(models.Lote.id == lote_id).first()

def get_lote_by_name(db: Session, name: str):
    return db.query(models.Lote).filter(models.Lote.name == name).first()

def get_lotes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Lote).offset(skip).limit(limit).all()

def create_lote(db: Session, lote: schemas.LoteCreate):
    db_lote = models.Lote(name=lote.name)
    db.add(db_lote)
    db.commit()
    db.refresh(db_lote)
    return db_lote

def update_lote_status(db: Session, lote_id: int, status: str):
    db_lote = db.query(models.Lote).filter(models.Lote.id == lote_id).first()
    if db_lote:
        db_lote.status = status
        db.commit()
        db.refresh(db_lote)
    return db_lote

# TestClass CRUD
def get_test_class(db: Session, test_class_id: int):
    return db.query(models.TestClass).filter(models.TestClass.id == test_class_id).first()

def get_test_classes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.TestClass).offset(skip).limit(limit).all()

def create_test_class(db: Session, test_class: schemas.TestClassCreate):
    db_test_class = models.TestClass(name=test_class.name)
    db.add(db_test_class)
    db.commit()
    db.refresh(db_test_class)
    return db_test_class

def delete_test_class(db: Session, test_class_id: int):
    db_test_class = db.query(models.TestClass).filter(models.TestClass.id == test_class_id).first()
    if db_test_class:
        db.delete(db_test_class)
        db.commit()
    return db_test_class

# TestItem CRUD
def create_test_item(db: Session, test_item: schemas.TestItemCreate, test_class_id: int):
    db_test_item = models.TestItem(**test_item.dict(), test_class_id=test_class_id)
    db.add(db_test_item)
    db.commit()
    db.refresh(db_test_item)
    return db_test_item

def delete_test_item(db: Session, test_item_id: int):
    db_test_item = db.query(models.TestItem).filter(models.TestItem.id == test_item_id).first()
    if db_test_item:
        db.delete(db_test_item)
        db.commit()
    return db_test_item

# TestResult CRUD
def create_test_result(db: Session, test_result: schemas.TestResultCreate, lote_id: int):
    db_test_result = models.TestResult(
        **test_result.dict(exclude={"test_result_items"}), lote_id=lote_id
    )
    db.add(db_test_result)
    db.commit()
    db.refresh(db_test_result)

    for item in test_result.test_result_items:
        db_item = models.TestResultItem(
            **item.dict(), test_result_id=db_test_result.id
        )
        db.add(db_item)
        db.commit()
        db.refresh(db_item)

    return db_test_result

def get_test_results(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.TestResult).offset(skip).limit(limit).all()
