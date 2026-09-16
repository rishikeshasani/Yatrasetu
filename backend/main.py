from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import supabase
from routes.auth import router as auth_router
from routes.crowd import router as crowd_router
from routes.fleet import router as fleet_router
from routes.hotels import router as hotels_router
from routes.recommendations import router as recommendations_router
from routes.safety import router as safety_router
from routes.vendors import router as vendors_router
from routes.wallet import router as wallet_router
from routes.groups import router as groups_router
from routes.simulations import router as simulations_router
from routes.yolo import router as yolo_router
from routes.gps_crowd import router as gps_crowd_router

app = FastAPI(title="YatraSetu Backend")

# Allow only necessary local frontend origin(s)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(crowd_router)
app.include_router(fleet_router)
app.include_router(hotels_router)
app.include_router(hotels_router, prefix="/api")
app.include_router(recommendations_router)
app.include_router(safety_router)
app.include_router(vendors_router)
app.include_router(wallet_router)
app.include_router(groups_router)
app.include_router(simulations_router)
app.include_router(yolo_router)
app.include_router(gps_crowd_router)

@app.get("/")
def home():
    return {
        "status": "online",
        "service": "YatraSetu Backend API",
        "version": "2.0",
        "docs_url": "/docs"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "timestamp": True
    }


@app.get("/test-db")
def test_db():
    response = supabase.table("sites").select("*").execute()
    return response.data
