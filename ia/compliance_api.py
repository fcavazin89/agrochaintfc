from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'ia'))

from coffee_cacao_compliance_engine import (
    CoffeeCacaoComplianceEngine,
    CoffeeBatch, CacaoBatch,
    CoffeeVariety, CacaoVariety,
    ProcessingMethod,
    CoffeeMetrics, CacaoMetrics
)

app = FastAPI(
    title="AgroChain Coffee & Cacao Compliance API",
    description="AI-powered compliance verification for Coffee and Cacao supply chains",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize compliance engine with Groq API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "REDACTED_GROQ_KEY")
engine = CoffeeCacaoComplianceEngine(groq_api_key=GROQ_API_KEY)

class CoffeeAnalysisRequest(BaseModel):
    batch_id: str
    producer_address: str
    variety: str
    processing: str
    weight_kg: float
    farm_name: str
    region: str
    harvest_date: int
    sca_score: float
    moisture_content: float
    defects_per_350g: int
    geo_json_hash: str
    eudr_compliant: bool
    satellite_ndvi: float
    plot_area_ha: float

class CacaoAnalysisRequest(BaseModel):
    batch_id: str
    producer_address: str
    variety: str
    processing: str
    weight_kg: float
    farm_name: str
    region: str
    harvest_date: int
    quality_score: float
    moisture_content: float
    shell_content: float
    geo_json_hash: str
    eudr_compliant: bool
    satellite_ndvi: float
    plot_area_ha: float

@app.get("/")
async def root():
    return {
        "service": "AgroChain Coffee & Cacao Compliance API",
        "version": "2.0.0",
        "endpoints": {
            "coffee_analysis": "/api/coffee/analyze",
            "cacao_analysis": "/api/cacao/analyze",
            "health": "/health"
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "engine": "active", "groq_enabled": engine.groq_client is not None}

@app.post("/api/coffee/analyze")
async def analyze_coffee(request: CoffeeAnalysisRequest):
    try:
        coffee_metrics = CoffeeMetrics(
            sca_score=request.sca_score,
            acidity=8.0,
            body=7.5,
            flavor=8.2,
            aroma=8.0,
            balance=8.1,
            moisture_content=request.moisture_content,
            defects_per_350g=request.defects_per_350g
        )
        
        coffee_batch = CoffeeBatch(
            batch_id=request.batch_id,
            producer_address=request.producer_address,
            variety=CoffeeVariety[request.variety.upper()],
            processing=ProcessingMethod[request.processing.upper()],
            weight_kg=request.weight_kg,
            farm_name=request.farm_name,
            region=request.region,
            harvest_date=request.harvest_date,
            metrics=coffee_metrics,
            geo_json_hash=request.geo_json_hash,
            eudr_compliant=request.eudr_compliant
        )
        
        result = engine.analyze_coffee_batch(
            batch=coffee_batch,
            satellite_ndvi=request.satellite_ndvi,
            plot_area_ha=request.plot_area_ha
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cacao/analyze")
async def analyze_cacao(request: CacaoAnalysisRequest):
    try:
        cacao_metrics = CacaoMetrics(
            quality_score=request.quality_score,
            flavor_intensity=7.8,
            bitterness=3.5,
            astringency=3.0,
            acidity=6.5,
            cocoa_content=72.0,
            moisture_content=request.moisture_content,
            shell_content=request.shell_content
        )
        
        cacao_batch = CacaoBatch(
            batch_id=request.batch_id,
            producer_address=request.producer_address,
            variety=CacaoVariety[request.variety.upper()],
            processing=ProcessingMethod[request.processing.upper()],
            weight_kg=request.weight_kg,
            farm_name=request.farm_name,
            region=request.region,
            harvest_date=request.harvest_date,
            metrics=cacao_metrics,
            geo_json_hash=request.geo_json_hash,
            eudr_compliant=request.eudr_compliant
        )
        
        result = engine.analyze_cacao_batch(
            batch=cacao_batch,
            satellite_ndvi=request.satellite_ndvi,
            plot_area_ha=request.plot_area_ha
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
