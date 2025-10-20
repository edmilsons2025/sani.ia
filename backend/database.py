import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Carrega as variáveis do arquivo .env
load_dotenv()

# Lê a variável de ambiente correta para este serviço
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_SGT_URL")

# O argumento 'connect_args' é específico do SQLite e deve ser removido para o PostgreSQL
engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Função para obter uma sessão do banco de dados (boa prática)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()