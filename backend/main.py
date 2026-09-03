from routes.crowd import router as crowd_router
from database import supabase
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.recommendations import router as recommendations_router
from routes.safety import router as safety_router
from routes.vendors import router as vendors_router
from routes.wallet import router as wallet_router

app = FastAPI(title="YatraSetu Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(crowd_router)
app.include_router(recommendations_router)
app.include_router(safety_router)
app.include_router(vendors_router)
app.include_router(wallet_router)

@app.get("/")
def home():
    return {
        "message": "YatraSetu Backend Running"
    }

@app.get("/test-db")
def test_db():
    response = supabase.table("sites").select("*").execute()
    return response.data
