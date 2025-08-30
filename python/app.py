from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backtest_api import router as backtest_router
import stripe
import os

stripe.api_key = os.getenv("STRIPE_API_KEY")

app = FastAPI()

SUCCESS_URL = os.getenv("STRIPE_SUCCESS_URL", "http://localhost:8000/success?session_id={CHECKOUT_SESSION_ID}")
CANCEL_URL = os.getenv("STRIPE_CANCEL_URL", "http://localhost:8000/cancel")


# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "https://www.aetherion.cloud",
        "https://app.aetherion.cloud",
        "https://api.aetherion.cloud",
        "https://aetherion.cloud"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(backtest_router)

@app.post("/api/create-checkout-session")
async def create_checkout_session(request: Request):
    print('Creating checkout session...')
    data = await request.json()
    price_id = data.get("priceId")
    print(f"Received price_id: {price_id}")
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=SUCCESS_URL,
            cancel_url=CANCEL_URL,
        )
        return {"sessionId": session.id}
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
# You can run this app with: uvicorn python.app:app --reload


@app.get("/cancel")
async def cancel():
    return JSONResponse(content={"message": "Subscription canceled or checkout aborted."})


@app.post("/stripe-webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    event = None
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv("STRIPE_WEBHOOK_SECRET")
        )
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        # Find user by Stripe customer/session ID
        # Update user role in DB to 'superuser'
        # Example:
        # db.update_user_role(stripe_customer_id=session["customer"], role="superuser")
    return {"status": "success"}
