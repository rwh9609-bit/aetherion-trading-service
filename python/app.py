from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, Response
import os
import grpc
import stripe
from backtest_api import router as backtest_router
from fastapi import BackgroundTasks 
from protos import trading_api_pb2, trading_api_pb2_grpc

stripe.api_key = os.getenv("STRIPE_API_KEY")

app = FastAPI()

FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
SUCCESS_URL = f"{FRONTEND_BASE_URL}/success?session_id={{CHECKOUT_SESSION_ID}}"
CANCEL_URL = f"{FRONTEND_BASE_URL}/cancel"

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
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

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

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

@app.get("/cancel")
async def cancel():
    return JSONResponse(content={"message": "Subscription canceled or checkout aborted."})

def _process_checkout_session(stripe_customer_id: str):
    grpc_host = os.getenv("GRPC_HOST", "localhost:50051")
    with grpc.insecure_channel(grpc_host) as channel:
        subscription_stub = trading_api_pb2_grpc.SubscriptionServiceStub(channel)
        resp = subscription_stub.UpgradeUserRole(
            trading_api_pb2.UpgradeUserRoleRequest(user_id=stripe_customer_id)
        )
        if resp.status == trading_api_pb2.StatusResponse.SUCCESS:
            print(f"Upgraded user {stripe_customer_id} to superuser.")
        else:
            print(f"Failed to upgrade {stripe_customer_id}: {resp.error_message}")


@app.post("/stripe-webhook")
async def stripe_webhook(request: Request, background_tasks: BackgroundTasks):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature") or request.headers.get("Stripe-Signature")
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv("STRIPE_WEBHOOK_SECRET")
        )
    except Exception as e:
        # Invalid signature => tell Stripe to retry by returning 400
        return JSONResponse(status_code=400, content={"error": "Invalid signature"})

    event_type = event["type"]
    obj = event["data"]["object"]

    if event_type == "checkout.session.completed":
        stripe_customer_id = obj.get("customer")
        if stripe_customer_id:
            background_tasks.add_task(_process_checkout_session, stripe_customer_id)
    # Optional: handle other events similarly in background

    # Always acknowledge successful receipt with 2xx
    return Response(status_code=200)

# Redirect backend /success to frontend success page (so UI and favicon come from the frontend)
@app.get("/success")
async def success(session_id: str | None = None):
    target = f"{FRONTEND_BASE_URL}/success"
    if session_id:
        target += f"?session_id={session_id}"
    return RedirectResponse(url=target, status_code=307)

# Optional: silence favicon 404s if browser hits backend directly
@app.get("/favicon.ico")
async def favicon():
    return Response(status_code=204)