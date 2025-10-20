from pydantic import BaseModel
from typing import List, Optional
import datetime

# TestResultItem Schemas
class TestResultItemBase(BaseModel):
    test_item_name: str
    status: str
    observation: Optional[str] = None

class TestResultItemCreate(TestResultItemBase):
    pass

class TestResultItem(TestResultItemBase):
    id: int
    test_result_id: int

    class Config:
        orm_mode = True

# TestResult Schemas
class TestResultBase(BaseModel):
    equipment_type: str
    equipment_sku: str
    equipment_barebone: str
    equipment_serial: str
    general_observations: Optional[str] = None

class TestResultCreate(TestResultBase):
    test_result_items: List[TestResultItemCreate]

class TestResult(TestResultBase):
    id: int
    timestamp: datetime.datetime
    lote_id: int
    test_result_items: List[TestResultItem] = []

    class Config:
        orm_mode = True

# Lote Schemas
class LoteBase(BaseModel):
    name: str

class LoteCreate(LoteBase):
    pass

class Lote(LoteBase):
    id: int
    created_at: datetime.datetime
    status: str
    test_results: List[TestResult] = []

    class Config:
        orm_mode = True

# TestItem Schemas
class TestItemBase(BaseModel):
    name: str
    description: str

class TestItemCreate(TestItemBase):
    pass

class TestItem(TestItemBase):
    id: int
    test_class_id: int

    class Config:
        orm_mode = True

# TestClass Schemas
class TestClassBase(BaseModel):
    name: str

class TestClassCreate(TestClassBase):
    pass

class TestClass(TestClassBase):
    id: int
    test_items: List[TestItem] = []

    class Config:
        orm_mode = True
