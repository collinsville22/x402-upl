from fastapi import APIRouter, Request
from typing import Dict, Any

router = APIRouter(prefix="/api")


@router.post("/example")
async def handle_post(request: Request, data: Dict[str, Any]):
    payment = getattr(request.state, "x402_payment", None)
    tap_verified = getattr(request.state, "tap_verified", False)

    return {
        "success": True,
        "message": "Request processed successfully",
        "data": {
            "input": data,
            "payment": payment,
            "tapVerified": tap_verified,
        },
    }


@router.get("/example")
async def handle_get(request: Request):
    payment = getattr(request.state, "x402_payment", None)
    tap_verified = getattr(request.state, "tap_verified", False)

    return {
        "success": True,
        "message": "GET request processed",
        "payment": payment,
        "tapVerified": tap_verified,
    }
