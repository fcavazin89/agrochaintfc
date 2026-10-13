#!/usr/bin/env python3
"""
AgroChain Coffee & Cacao Compliance Engine
Specialized AI compliance system for Coffee (Arabica, Robusta/Conilon) and Cacao supply chains.

This engine focuses exclusively on:
- Coffee: Arabica and Robusta/Conilon varieties with SCA cupping scores
- Cacao: All varieties with chocolate quality metrics  
- EUDR compliance for both Coffee and Cacao (deforestation-free post 31/12/2020)
- Integration with CoffeeCacaoSwap DEX for tokenized trading
- Groq LLM integration for explainable AI reasoning
"""

import json
import hashlib
import time
import requests
from typing import Dict, List, Tuple, Optional, Union
from dataclasses import dataclass
from enum import Enum
import statistics
import math
from groq import Groq

class CoffeeVariety(Enum):
    ARABICA = "ARABICA"
    ROBUSTA_CONILON = "ROBUSTA_CONILON"

class CacaoVariety(Enum):
    CRIOLLO = "CRIOLLO" 
    FORASTERO = "FORASTERO"
    TRINITARIO = "TRINITARIO"
    NACIONAL = "NACIONAL"

class ProcessingMethod(Enum):
    # Coffee processing
    WASHED = "WASHED"
    NATURAL = "NATURAL" 
    HONEY = "HONEY"
    WET_HULLED = "WET_HULLED"
    # Cacao processing
    FERMENTED = "FERMENTED"
    DRIED = "DRIED"
    ROASTED_BEANS = "ROASTED_BEANS"

@dataclass
class CoffeeMetrics:
    sca_score: float  # SCA cupping score (0-100)
    acidity: float
    body: float
    flavor: float
    aroma: float
    balance: float
    moisture_content: float
    defects_per_350g: int

@dataclass 
class CacaoMetrics:
    quality_score: float  # Overall quality (0-100)
    flavor_intensity: float
    bitterness: float
    astringency: float  
    acidity: float
    cocoa_content: float
    moisture_content: float
    shell_content: float

@dataclass
class CoffeeBatch:
    batch_id: str
    producer_address: str
    variety: CoffeeVariety
    processing: ProcessingMethod
    weight_kg: float
    farm_name: str
    region: str
    harvest_date: int
    metrics: CoffeeMetrics
    geo_json_hash: str
    eudr_compliant: bool
    certification_id: Optional[str] = None

@dataclass
class CacaoBatch:
    batch_id: str
    producer_address: str
    variety: CacaoVariety
    processing: ProcessingMethod
    weight_kg: float
    farm_name: str
    region: str
    harvest_date: int
    metrics: CacaoMetrics
    geo_json_hash: str
    eudr_compliant: bool
    certification_id: Optional[str] = None
class CoffeeCacaoComplianceEngine:
    """
    Specialized compliance engine for Coffee and Cacao agricultural supply chains.
    Integrates with Groq LLM for explainable AI compliance reasoning.
    """
    
    def __init__(self, groq_api_key: str):
        self.groq_client = Groq(api_key=groq_api_key) if groq_api_key else None
        
        # Coffee productivity baselines by region (kg/ha)
        self.coffee_productivity_baselines = {
            "cerrado": {"arabica": {"mean": 1800, "std": 300}, "robusta": {"mean": 2200, "std": 400}},
            "sul_de_minas": {"arabica": {"mean": 1600, "std": 250}, "robusta": {"mean": 2000, "std": 350}},
            "caparao": {"arabica": {"mean": 1700, "std": 280}, "robusta": {"mean": 2100, "std": 380}},
            "bahia": {"arabica": {"mean": 1400, "std": 200}, "robusta": {"mean": 1900, "std": 320}},
            "rondonia": {"arabica": {"mean": 1300, "std": 180}, "robusta": {"mean": 2500, "std": 450}},
            "espirito_santo": {"arabica": {"mean": 1200, "std": 150}, "robusta": {"mean": 2400, "std": 400}}
        }
        
        # Cacao productivity baselines by region (kg/ha)  
        self.cacao_productivity_baselines = {
            "bahia": {"mean": 450, "std": 80},
            "para": {"mean": 520, "std": 90}, 
            "amazonas": {"mean": 380, "std": 70},
            "rondonia": {"mean": 400, "std": 75},
            "ecuador": {"mean": 600, "std": 120},
            "madagascar": {"mean": 350, "std": 60},
            "venezuela": {"mean": 480, "std": 85}
        }
        
        # EUDR cutoff date (January 1, 2021)
        self.EUDR_CUTOFF_TIMESTAMP = 1609459200
        
        # Quality thresholds
        self.MIN_COFFEE_SCA_SCORE = 80.0  # Specialty coffee threshold
        self.MIN_CACAO_QUALITY_SCORE = 75.0  # Premium cacao threshold
        
        # NDVI thresholds for satellite validation
        self.MIN_NDVI_COFFEE = 0.75  # Healthy coffee plantation
        self.MIN_NDVI_CACAO = 0.78   # Healthy cacao plantation (higher due to shade trees)

    def analyze_coffee_batch(self, batch: CoffeeBatch, satellite_ndvi: float, 
                           plot_area_ha: float) -> Dict[str, Union[float, str, bool]]:
        """
        Comprehensive compliance analysis for Coffee batches.
        Returns scores and reasoning for each compliance module.
        """
        
        # Module 1: Geographic & EUDR Compliance (45% weight)
        geo_score = self._analyze_coffee_geo_compliance(batch, satellite_ndvi)
        
        # Module 2: Mass Balance & Anti-Fraud (35% weight) 
        mass_balance_score = self._analyze_coffee_mass_balance(batch, plot_area_ha)
        
        # Module 3: Quality & Documentary Compliance (20% weight)
        doc_score = self._analyze_coffee_quality_compliance(batch)
        
        # Calculate overall confidence score
        overall_score = (45 * geo_score + 35 * mass_balance_score + 20 * doc_score) / 100
        
        # Generate AI reasoning if Groq is available
        ai_reasoning = self._generate_coffee_reasoning(batch, geo_score, mass_balance_score, 
                                                     doc_score, overall_score)
        
        return {
            "batch_id": batch.batch_id,
            "variety": batch.variety.value,
            "geo_environmental_score": geo_score,
            "mass_balance_score": mass_balance_score, 
            "documentary_score": doc_score,
            "overall_confidence": overall_score,
            "eudr_compliant": batch.eudr_compliant and batch.harvest_date >= self.EUDR_CUTOFF_TIMESTAMP,
            "sca_score": batch.metrics.sca_score,
            "verdict": self._determine_verdict(overall_score, batch.eudr_compliant),
            "ai_reasoning": ai_reasoning,
            "timestamp": int(time.time())
        }

    def analyze_cacao_batch(self, batch: CacaoBatch, satellite_ndvi: float,
                          plot_area_ha: float) -> Dict[str, Union[float, str, bool]]:
        """
        Comprehensive compliance analysis for Cacao batches.
        """
        
        # Module 1: Geographic & EUDR Compliance (45% weight)
        geo_score = self._analyze_cacao_geo_compliance(batch, satellite_ndvi)
        
        # Module 2: Mass Balance & Anti-Fraud (35% weight)
        mass_balance_score = self._analyze_cacao_mass_balance(batch, plot_area_ha)
        
        # Module 3: Quality & Documentary Compliance (20% weight) 
        doc_score = self._analyze_cacao_quality_compliance(batch)
        
        # Calculate overall confidence score
        overall_score = (45 * geo_score + 35 * mass_balance_score + 20 * doc_score) / 100
        
        # Generate AI reasoning
        ai_reasoning = self._generate_cacao_reasoning(batch, geo_score, mass_balance_score,
                                                    doc_score, overall_score)
        
        return {
            "batch_id": batch.batch_id,
            "variety": batch.variety.value,
            "geo_environmental_score": geo_score,
            "mass_balance_score": mass_balance_score,
            "documentary_score": doc_score, 
            "overall_confidence": overall_score,
            "eudr_compliant": batch.eudr_compliant and batch.harvest_date >= self.EUDR_CUTOFF_TIMESTAMP,
            "quality_score": batch.metrics.quality_score,
            "verdict": self._determine_verdict(overall_score, batch.eudr_compliant),
            "ai_reasoning": ai_reasoning,
            "timestamp": int(time.time())
        }
    def _analyze_coffee_geo_compliance(self, batch: CoffeeBatch, ndvi: float) -> float:
        """Analyze geographic and EUDR compliance for coffee."""
        score = 100.0
        
        # EUDR compliance check
        if not batch.eudr_compliant:
            return 0.0
        
        if batch.harvest_date < self.EUDR_CUTOFF_TIMESTAMP:
            score -= 50.0  # Severe penalty for pre-EUDR harvests
        
        # NDVI satellite validation
        if ndvi < self.MIN_NDVI_COFFEE:
            penalty = (self.MIN_NDVI_COFFEE - ndvi) * 100  # Linear penalty
            score -= penalty
        
        # Region-specific validation
        region_key = batch.region.lower().replace(" ", "_")
        if region_key not in self.coffee_productivity_baselines:
            score -= 10.0  # Unknown region penalty
        
        return max(0.0, score)

    def _analyze_coffee_mass_balance(self, batch: CoffeeBatch, plot_area_ha: float) -> float:
        """Analyze mass balance and productivity for coffee."""
        if plot_area_ha <= 0:
            return 0.0
        
        productivity_kg_ha = batch.weight_kg / plot_area_ha
        region_key = batch.region.lower().replace(" ", "_")
        variety_key = batch.variety.value.lower()
        
        if region_key not in self.coffee_productivity_baselines:
            return 50.0  # Neutral score for unknown regions
        
        baseline = self.coffee_productivity_baselines[region_key].get(variety_key.split("_")[0])
        if not baseline:
            return 50.0
        
        # Calculate Z-score
        z_score = (productivity_kg_ha - baseline["mean"]) / baseline["std"]
        
        # Penalty for excessive productivity (potential "grain laundering")
        if z_score > 2.2:  # More than 2.2 std deviations above mean
            penalty = min(100, (z_score - 2.2) * 30)
            return max(0.0, 100.0 - penalty)
        
        # Bonus for typical productivity
        if -1.0 <= z_score <= 1.5:
            return 100.0
        
        # Mild penalty for low productivity
        if z_score < -1.0:
            penalty = abs(z_score + 1.0) * 15
            return max(50.0, 100.0 - penalty)
        
        return 85.0  # Default good score

    def _analyze_coffee_quality_compliance(self, batch: CoffeeBatch) -> float:
        """Analyze quality metrics and documentary compliance for coffee."""
        score = 100.0
        
        # SCA cupping score validation
        if batch.metrics.sca_score < self.MIN_COFFEE_SCA_SCORE:
            score -= (self.MIN_COFFEE_SCA_SCORE - batch.metrics.sca_score) * 2
        
        # Moisture content check (ideal: 10-12%)
        if batch.metrics.moisture_content > 12.5:
            score -= (batch.metrics.moisture_content - 12.5) * 5
        elif batch.metrics.moisture_content < 9.0:
            score -= (9.0 - batch.metrics.moisture_content) * 3
        
        # Defects check (max 5 defects per 350g for specialty)
        if batch.metrics.defects_per_350g > 5:
            score -= (batch.metrics.defects_per_350g - 5) * 8
        
        return max(0.0, score)

    def _analyze_cacao_geo_compliance(self, batch: CacaoBatch, ndvi: float) -> float:
        """Analyze geographic and EUDR compliance for cacao."""
        score = 100.0
        
        if not batch.eudr_compliant:
            return 0.0
        
        if batch.harvest_date < self.EUDR_CUTOFF_TIMESTAMP:
            score -= 50.0
        
        # Cacao requires higher NDVI due to shade trees
        if ndvi < self.MIN_NDVI_CACAO:
            penalty = (self.MIN_NDVI_CACAO - ndvi) * 120
            score -= penalty
        
        return max(0.0, score)

    def _analyze_cacao_mass_balance(self, batch: CacaoBatch, plot_area_ha: float) -> float:
        """Analyze mass balance and productivity for cacao."""
        if plot_area_ha <= 0:
            return 0.0
        
        productivity_kg_ha = batch.weight_kg / plot_area_ha
        region_key = batch.region.lower().replace(" ", "_")
        
        if region_key not in self.cacao_productivity_baselines:
            return 50.0
        
        baseline = self.cacao_productivity_baselines[region_key]
        z_score = (productivity_kg_ha - baseline["mean"]) / baseline["std"]
        
        if z_score > 2.0:  # Cacao has lower tolerance for over-production
            penalty = min(100, (z_score - 2.0) * 35)
            return max(0.0, 100.0 - penalty)
        
        if -1.0 <= z_score <= 1.5:
            return 100.0
        
        if z_score < -1.0:
            penalty = abs(z_score + 1.0) * 20
            return max(40.0, 100.0 - penalty)
        
        return 80.0

    def _analyze_cacao_quality_compliance(self, batch: CacaoBatch) -> float:
        """Analyze quality metrics for cacao."""
        score = 100.0
        
        # Overall quality score
        if batch.metrics.quality_score < self.MIN_CACAO_QUALITY_SCORE:
            score -= (self.MIN_CACAO_QUALITY_SCORE - batch.metrics.quality_score) * 1.5
        
        # Moisture content (ideal: 6-8%)
        if batch.metrics.moisture_content > 8.5:
            score -= (batch.metrics.moisture_content - 8.5) * 8
        elif batch.metrics.moisture_content < 5.5:
            score -= (5.5 - batch.metrics.moisture_content) * 6
        
        # Shell content (max 12% for good quality)
        if batch.metrics.shell_content > 12.0:
            score -= (batch.metrics.shell_content - 12.0) * 4
        
        return max(0.0, score)
    def _generate_coffee_reasoning(self, batch: CoffeeBatch, geo_score: float, 
                                 mass_balance_score: float, doc_score: float, 
                                 overall_score: float) -> str:
        """Generate AI-powered reasoning for coffee batch compliance using Groq."""
        
        if not self.groq_client:
            return f"Coffee {batch.variety.value} batch analysis: Geo={geo_score:.1f}%, Mass={mass_balance_score:.1f}%, Quality={doc_score:.1f}%, Overall={overall_score:.1f}%"
        
        try:
            prompt = f"""Analyze this Coffee batch compliance report and provide explainable reasoning:

Batch Details:
- Variety: {batch.variety.value}
- Region: {batch.region}
- Processing: {batch.processing.value}
- Weight: {batch.weight_kg}kg
- SCA Score: {batch.metrics.sca_score}/100
- EUDR Compliant: {batch.eudr_compliant}

Compliance Scores:
- Geographic/EUDR: {geo_score:.1f}%
- Mass Balance: {mass_balance_score:.1f}%  
- Quality/Documentary: {doc_score:.1f}%
- Overall Confidence: {overall_score:.1f}%

Provide a concise 2-3 sentence explanation of the key compliance factors and any concerns for this coffee batch. Focus on EUDR, quality metrics, and supply chain integrity."""

            response = self.groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama3-8b-8192",
                max_tokens=150,
                temperature=0.3
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            return f"AI reasoning unavailable: {str(e)}"

    def _generate_cacao_reasoning(self, batch: CacaoBatch, geo_score: float,
                                mass_balance_score: float, doc_score: float,
                                overall_score: float) -> str:
        """Generate AI-powered reasoning for cacao batch compliance."""
        
        if not self.groq_client:
            return f"Cacao {batch.variety.value} batch analysis: Geo={geo_score:.1f}%, Mass={mass_balance_score:.1f}%, Quality={doc_score:.1f}%, Overall={overall_score:.1f}%"
        
        try:
            prompt = f"""Analyze this Cacao batch compliance report and provide explainable reasoning:

Batch Details:
- Variety: {batch.variety.value}
- Region: {batch.region}
- Processing: {batch.processing.value}
- Weight: {batch.weight_kg}kg
- Quality Score: {batch.metrics.quality_score}/100
- EUDR Compliant: {batch.eudr_compliant}

Compliance Scores:
- Geographic/EUDR: {geo_score:.1f}%
- Mass Balance: {mass_balance_score:.1f}%
- Quality/Documentary: {doc_score:.1f}%
- Overall Confidence: {overall_score:.1f}%

Provide a concise 2-3 sentence explanation focusing on EUDR compliance, cacao quality factors, and supply chain integrity for this batch."""

            response = self.groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama3-8b-8192",
                max_tokens=150,
                temperature=0.3
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            return f"AI reasoning unavailable: {str(e)}"

    def _determine_verdict(self, overall_score: float, eudr_compliant: bool) -> str:
        """Determine final verdict based on scores and EUDR compliance."""
        
        if not eudr_compliant:
            return "REJECTED_EUDR_VIOLATION"
        
        if overall_score >= 88.0:
            return "COMPLIANT_APPROVED" 
        elif overall_score >= 60.0:
            return "FLAGGED_REVIEW_REQUIRED"
        else:
            return "REJECTED_QUALITY_CONCERNS"

    def create_merkle_proof(self, evidence_data: List[str]) -> Dict[str, str]:
        """Create Merkle tree proof for evidence integrity."""
        
        if not evidence_data:
            return {"merkle_root": "", "proofs": []}
        
        # Create leaf hashes
        leaves = [hashlib.sha256(data.encode()).hexdigest() for data in evidence_data]
        
        # Build Merkle tree
        tree_levels = [leaves]
        current_level = leaves
        
        while len(current_level) > 1:
            next_level = []
            for i in range(0, len(current_level), 2):
                left = current_level[i]
                right = current_level[i + 1] if i + 1 < len(current_level) else left
                combined = hashlib.sha256((left + right).encode()).hexdigest()
                next_level.append(combined)
            tree_levels.append(next_level)
            current_level = next_level
        
        merkle_root = current_level[0] if current_level else ""
        
        return {
            "merkle_root": merkle_root,
            "leaf_count": len(leaves),
            "tree_depth": len(tree_levels) - 1
        }

# Example usage and testing functions
def test_coffee_compliance():
    """Test coffee compliance analysis."""
    
    # Sample coffee batch
    coffee_metrics = CoffeeMetrics(
        sca_score=84.5,
        acidity=8.2,
        body=7.8,
        flavor=8.5,
        aroma=8.0,
        balance=8.3,
        moisture_content=11.2,
        defects_per_350g=3
    )
    
    coffee_batch = CoffeeBatch(
        batch_id="COFFEE_ARABICA_001",
        producer_address="0x1234567890abcdef",
        variety=CoffeeVariety.ARABICA,
        processing=ProcessingMethod.WASHED,
        weight_kg=15000.0,  # 15 tons
        farm_name="Fazenda Serra Dourada",
        region="cerrado",
        harvest_date=1640995200,  # Jan 1, 2022
        metrics=coffee_metrics,
        geo_json_hash="0xabcdef123456",
        eudr_compliant=True
    )
    
    # Initialize engine (without Groq for testing)
    engine = CoffeeCacaoComplianceEngine(groq_api_key=None)
    
    # Analyze batch
    result = engine.analyze_coffee_batch(
        batch=coffee_batch,
        satellite_ndvi=0.82,
        plot_area_ha=75.0  # 200kg/ha productivity
    )
    
    print("Coffee Compliance Analysis Result:")
    print(json.dumps(result, indent=2))
    
    return result

if __name__ == "__main__":
    test_coffee_compliance()