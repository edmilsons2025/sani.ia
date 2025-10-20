from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Lote(Base):
    __tablename__ = "lotes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    status = Column(String, default="Aberto")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    test_results = relationship("TestResult", back_populates="lote")

class TestClass(Base):
    __tablename__ = "test_classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    test_items = relationship("TestItem", back_populates="test_class")

class TestItem(Base):
    __tablename__ = "test_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    test_class_id = Column(Integer, ForeignKey("test_classes.id"))

    test_class = relationship("TestClass", back_populates="test_items")

class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    lote_id = Column(Integer, ForeignKey("lotes.id"))
    equipment_type = Column(String)
    equipment_sku = Column(String)
    equipment_barebone = Column(String)
    equipment_serial = Column(String, unique=True)
    general_observations = Column(String, nullable=True)

    lote = relationship("Lote", back_populates="test_results")
    test_result_items = relationship("TestResultItem", back_populates="test_result")

class TestResultItem(Base):
    __tablename__ = "test_result_items"

    id = Column(Integer, primary_key=True, index=True)
    test_result_id = Column(Integer, ForeignKey("test_results.id"))
    test_item_name = Column(String)
    status = Column(String) # "Aprovado" or "Reprovado"
    observation = Column(String, nullable=True)

    test_result = relationship("TestResult", back_populates="test_result_items")
