"""
Lead pricing API endpoints for computing marketplace lead prices.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, List
from enum import Enum
from pydantic import BaseModel
import json
from pathlib import Path


router = APIRouter()


# ============================================================================
# Domain Models and Enums
# ============================================================================

class JobSize(str, Enum):
    SMALL = "small"
    STANDARD = "standard"
    LARGE = "large"


class Urgency(str, Enum):
    FLEXIBLE = "flexible"
    SOON = "soon"
    EMERGENCY = "emergency"


class CityTier(str, Enum):
    BUDAPEST_CENTRAL = "budapest_central"
    BUDAPEST_OUTER = "budapest_outer"
    OTHER_CITY = "other_city"
    RURAL = "rural"


class PricingBand(BaseModel):
    id: str
    label: str
    minEstimatedJobValueHuf: Optional[int]
    maxEstimatedJobValueHuf: Optional[int]
    leadPriceHuf: int


class Multipliers(BaseModel):
    size: Dict[str, float]
    urgency: Dict[str, float]
    cityTier: Dict[str, float]


class LeadPriceComputationConfig(BaseModel):
    strategy: str
    description: str
    roundToNearestHuf: int


class FreeTrialConfig(BaseModel):
    defaultFreeLeadsPerPro: int
    appliesToBands: List[str]
    notes: Optional[str] = None


class DynamicPricingModel(BaseModel):
    version: int
    defaultConversionRate: float
    targetMarketingPctOfJobValue: float
    sizeOptions: List[str]
    urgencyOptions: List[str]
    cityTierOptions: List[str]
    multipliers: Multipliers
    baseBandByCategoryAndSize: Dict[str, Dict[str, str]]
    leadPriceComputation: LeadPriceComputationConfig
    freeTrial: FreeTrialConfig


class PricingConfig(BaseModel):
    currency: str
    pricingBands: List[PricingBand]
    dynamicPricingModel: DynamicPricingModel


class LeadPriceRequest(BaseModel):
    serviceCategory: str
    jobSize: JobSize
    urgency: Urgency
    cityTier: CityTier
    overrideEstimatedJobValueHuf: Optional[int] = None


class LeadPriceBreakdown(BaseModel):
    baseBandId: str
    baseBandLeadPriceHuf: int
    appliedUrgencyMultiplier: float
    appliedCityTierMultiplier: float
    effectiveMultiplier: float
    finalLeadPriceHuf: int
    effectiveEstimatedJobValueHuf: Optional[int] = None


class LeadPriceResponse(BaseModel):
    currency: str
    serviceCategory: str
    jobSize: JobSize
    urgency: Urgency
    cityTier: CityTier
    leadPriceHuf: int
    breakdown: LeadPriceBreakdown


# ============================================================================
# Global Config Storage
# ============================================================================

_pricing_config: Optional[PricingConfig] = None


def load_pricing_config(path: str) -> PricingConfig:
    """
    Load and validate pricing configuration from a JSON file.
    
    Args:
        path: Path to the pricing configuration JSON file
        
    Returns:
        Validated PricingConfig instance
        
    Raises:
        FileNotFoundError: If the config file doesn't exist
        ValueError: If the JSON is invalid or doesn't match the schema
    """
    config_path = Path(path)
    
    if not config_path.exists():
        raise FileNotFoundError(f"Pricing config file not found at: {path}")
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in pricing config file: {e}")
    
    try:
        config = PricingConfig.parse_obj(config_data)
        return config
    except Exception as e:
        raise ValueError(f"Failed to parse pricing config: {e}")


def get_pricing_config() -> PricingConfig:
    """Dependency to inject pricing config into route handlers."""
    if _pricing_config is None:
        raise HTTPException(
            status_code=500,
            detail="Pricing configuration not loaded"
        )
    return _pricing_config


# ============================================================================
# Lead Price Computation Logic
# ============================================================================

def compute_lead_price(
    request: LeadPriceRequest,
    config: PricingConfig
) -> LeadPriceResponse:
    """
    Compute the lead price based on service category, job size, urgency, and city tier.
    
    This function implements the dynamic pricing algorithm that:
    1. Looks up the base pricing band for the service category and job size
    2. Applies multipliers based on urgency and city tier
    3. Rounds the result to the nearest configured amount
    
    Args:
        request: Lead price request with service details
        config: Pricing configuration with bands and multipliers
        
    Returns:
        Lead price response with computed price and breakdown
        
    Raises:
        ValueError: If service category, job size, or multipliers are invalid
    """
    
    # Validate service category exists
    if request.serviceCategory not in config.dynamicPricingModel.baseBandByCategoryAndSize:
        raise ValueError(f"Unknown service category: {request.serviceCategory}")
    
    category_bands = config.dynamicPricingModel.baseBandByCategoryAndSize[request.serviceCategory]
    
    # Validate job size exists for this category
    if request.jobSize.value not in category_bands:
        raise ValueError(
            f"Job size '{request.jobSize.value}' not supported for category '{request.serviceCategory}'"
        )
    
    # Determine base band ID
    base_band_id = category_bands[request.jobSize.value]
    
    # Find the pricing band
    pricing_band = None
    for band in config.pricingBands:
        if band.id == base_band_id:
            pricing_band = band
            break
    
    if pricing_band is None:
        raise ValueError(f"Pricing band not found for ID: {base_band_id}")
    
    base_lead_price = pricing_band.leadPriceHuf
    
    # Look up urgency multiplier
    if request.urgency.value not in config.dynamicPricingModel.multipliers.urgency:
        raise ValueError(f"Urgency multiplier not found for: {request.urgency.value}")
    
    urgency_mult = config.dynamicPricingModel.multipliers.urgency[request.urgency.value]
    
    # Look up city tier multiplier
    if request.cityTier.value not in config.dynamicPricingModel.multipliers.cityTier:
        raise ValueError(f"City tier multiplier not found for: {request.cityTier.value}")
    
    city_tier_mult = config.dynamicPricingModel.multipliers.cityTier[request.cityTier.value]
    
    # Compute effective multiplier
    effective_mult = urgency_mult * city_tier_mult
    
    # Compute raw lead price
    raw_lead_price = base_lead_price * effective_mult
    
    # Round to nearest configured amount
    round_to = config.dynamicPricingModel.leadPriceComputation.roundToNearestHuf
    final_lead_price = round(raw_lead_price / round_to) * round_to
    
    # Build breakdown
    breakdown = LeadPriceBreakdown(
        baseBandId=base_band_id,
        baseBandLeadPriceHuf=base_lead_price,
        appliedUrgencyMultiplier=urgency_mult,
        appliedCityTierMultiplier=city_tier_mult,
        effectiveMultiplier=effective_mult,
        finalLeadPriceHuf=int(final_lead_price),
        effectiveEstimatedJobValueHuf=request.overrideEstimatedJobValueHuf
    )
    
    # Build and return response
    response = LeadPriceResponse(
        currency=config.currency,
        serviceCategory=request.serviceCategory,
        jobSize=request.jobSize,
        urgency=request.urgency,
        cityTier=request.cityTier,
        leadPriceHuf=int(final_lead_price),
        breakdown=breakdown
    )
    
    return response


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/lead-pricing", response_model=LeadPriceResponse)
def calculate_lead_price(
    request: LeadPriceRequest,
    config: PricingConfig = Depends(get_pricing_config)
) -> LeadPriceResponse:
    """
    Calculate the lead price based on service details.
    
    This endpoint computes the price a professional should pay for a lead
    based on the service category, job size, urgency, and location.
    """
    try:
        return compute_lead_price(request, config)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/pricing-config", response_model=PricingConfig)
def get_pricing_configuration(
    config: PricingConfig = Depends(get_pricing_config)
) -> PricingConfig:
    """
    Get the current pricing configuration.
    
    This endpoint returns the loaded pricing configuration for debugging
    and administrative purposes.
    """
    return config


# ============================================================================
# Initialization
# ============================================================================

def initialize_pricing_config(config_path: str) -> None:
    """
    Initialize the global pricing configuration.
    
    This should be called once at application startup.
    
    Args:
        config_path: Path to the pricing configuration JSON file
    """
    global _pricing_config
    _pricing_config = load_pricing_config(config_path)
