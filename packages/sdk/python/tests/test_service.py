from fastapi import FastAPI, Header, HTTPException, Response
from fastapi.responses import JSONResponse
from typing import Optional
import json
import base64
from solana.rpc.api import Client
from solders.pubkey import Pubkey

app = FastAPI(title="x402 Test Service")

WALLET_ADDRESS = "YOUR_WALLET_ADDRESS_HERE"
PRICE_PER_CALL = "0.001"
NETWORK = "devnet"


@app.get("/api/data")
async def get_data(x_payment: Optional[str] = Header(None)):
    if not x_payment:
        return JSONResponse(
            status_code=402,
            content={
                "scheme": "solana",
                "network": NETWORK,
                "asset": "SOL",
                "payTo": WALLET_ADDRESS,
                "amount": PRICE_PER_CALL,
                "timeout": 60,
                "resource": "/api/data",
                "description": "Test data endpoint"
            }
        )

    try:
        payment_data = json.loads(base64.b64decode(x_payment).decode())

        signature = payment_data.get("signature")
        amount = payment_data.get("amount")
        to_address = payment_data.get("to")

        if to_address != WALLET_ADDRESS:
            raise HTTPException(status_code=402, detail="Invalid recipient address")

        if float(amount) < float(PRICE_PER_CALL):
            raise HTTPException(status_code=402, detail="Insufficient payment amount")

        client = Client("https://api.devnet.solana.com")
        tx = client.get_transaction(signature, encoding="json", max_supported_transaction_version=0)

        if not tx.value:
            raise HTTPException(status_code=402, detail="Payment transaction not found")

        return {
            "success": True,
            "data": {
                "message": "Payment verified successfully",
                "timestamp": payment_data.get("timestamp"),
                "signature": signature,
            }
        }

    except Exception as e:
        raise HTTPException(status_code=402, detail=f"Payment verification failed: {str(e)}")


@app.post("/api/inference")
async def run_inference(
    request: dict,
    x_payment: Optional[str] = Header(None)
):
    if not x_payment:
        return JSONResponse(
            status_code=402,
            content={
                "scheme": "solana",
                "network": NETWORK,
                "asset": "SOL",
                "payTo": WALLET_ADDRESS,
                "amount": "0.005",
                "timeout": 60,
                "resource": "/api/inference",
                "description": "AI inference endpoint"
            }
        )

    try:
        payment_data = json.loads(base64.b64decode(x_payment).decode())
        signature = payment_data.get("signature")

        return {
            "success": True,
            "result": {
                "model": request.get("model", "default"),
                "response": "This is a test response from the inference service",
                "tokens_used": 42,
                "payment_signature": signature,
            }
        }

    except Exception as e:
        raise HTTPException(status_code=402, detail=f"Payment verification failed: {str(e)}")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "x402-test-service"}


if __name__ == "__main__":
    import uvicorn
    print(f"Starting x402 test service on http://localhost:8000")
    print(f"Wallet: {WALLET_ADDRESS}")
    print(f"Price per call: {PRICE_PER_CALL} SOL")
    print(f"Network: {NETWORK}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
