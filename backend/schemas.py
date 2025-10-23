import uuid # NOVO
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
    id: uuid.UUID
    test_result_id: uuid.UUID

    class Config:
        from_attributes = True # Correto (Pydantic V2)

# TestResult Schemas
class TestResultBase(BaseModel):
    # ... (seus campos base) ...
    equipment_serial: str
    general_observations: Optional[str] = None

class TestResultCreate(TestResultBase):
    test_result_items: List[TestResultItemCreate]

class TestResult(TestResultBase):
    id: uuid.UUID
    timestamp: datetime.datetime
    lote_id: uuid.UUID
    test_result_items: List[TestResultItem] = []

    class Config:
        from_attributes = True

# Lote Schemas
class LoteBase(BaseModel):
    name: str

class LoteCreate(LoteBase):
    pass

class Lote(LoteBase):
    id: uuid.UUID
    created_at: datetime.datetime
    status: str
    test_results: List[TestResult] = []

    class Config:
        from_attributes = True

# TestItem Schemas
class TestItemBase(BaseModel):
    name: str
    description: str

class TestItemCreate(TestItemBase):
    pass

class TestItem(TestItemBase):
    id: uuid.UUID
    test_class_id: uuid.UUID

    class Config:
        from_attributes = True

# TestClass Schemas
class TestClassBase(BaseModel):
    name: str

class TestClassCreate(TestClassBase):
    pass

class TestClass(TestClassBase):
    id: uuid.UUID
    test_items: List[TestItem] = []

    class Config:
        from_attributes = True