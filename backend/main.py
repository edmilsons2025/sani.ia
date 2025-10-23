from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
import models
from routers import lotes, test_classes, test_results, test_items

app = FastAPI()

models.Base.metadata.create_all(bind=engine)

# Set up CORS
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "SGT API"}

app.include_router(lotes.router, prefix="/api")
app.include_router(test_classes.router, prefix="/api")
app.include_router(test_results.router, prefix="/api")
app.include_router(test_items.router, prefix="/api")
