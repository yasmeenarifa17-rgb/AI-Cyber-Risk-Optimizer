from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()  # load .env from backend directory if present

from engines.risk_engine import calculate_risk
from engines.financial_engine import calculate_financial_risk
from engines.recommendation_engine import generate_recommendations
from engines.optimization_engine import optimize_investment
from engines.simulation_engine import simulate_risk_reduction
from auth.routes import router as auth_router
from chat.chat_router import router as chat_router
from auth.database import connect_db, close_db

app = FastAPI(
    title="AI Cyber Risk Optimizer",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Lifecycle ────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    await connect_db()

@app.on_event("shutdown")
async def shutdown():
    await close_db()

# ── Routers ──────────────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(chat_router)

# ── Existing engine endpoints (unchanged) ────────────────────────────────────

@app.get("/")
def root():
    return {"message": "AI Cyber Risk Optimizer API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/api/risk/calculate")
def calculate_risk_api(data: dict):
    result = calculate_risk(
        data["threat_likelihood"],
        data["vulnerability_severity"],
        data["asset_criticality"],
        data["exposure"]
    )
    return result


@app.post("/api/financial-risk")
def financial_risk(data: dict):
    return calculate_financial_risk(
        data["risk_score"],
        data["asset_value"],
        data["incident_probability"]
    )


@app.post("/api/recommendations")
def recommendations(data: dict):
    return {
        "recommendations": generate_recommendations(
            data["threat_likelihood"],
            data["vulnerability_severity"],
            data["asset_criticality"],
            data["exposure"]
        )
    }


@app.post("/api/optimize-investment")
def investment_optimization(data: dict):
    return optimize_investment(data["budget"])


@app.post("/api/simulate")
def simulation(data: dict):
    return simulate_risk_reduction(
        data["current_risk"],
        data["investment"],
        data["reduction_factor"]
    )
