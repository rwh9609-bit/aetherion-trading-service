from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, Response
import os
import jwt
import grpc
import stripe
from backtest_api import router as backtest_router
from fastapi import BackgroundTasks 
from protos import trading_api_pb2, trading_api_pb2_grpc
from typing import Optional  # <-- add this import

def _extract_bearer_token(request: Request) -> Optional[str]:
    # Prefer Authorization header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1]
    # Fallback to common cookie names (if you use cookie-based auth)
    for key in ("token", "access_token", "Authorization"):
        cookie_val = request.cookies.get(key)
        if not cookie_val:
            continue
        return cookie_val.split(" ", 1)[1] if cookie_val.startswith("Bearer ") else cookie_val
    return None

def _decode_user(request: Request):
    """
    Return (user_id, email). Raise on failure. Supports key rotation.
    """
    token = _extract_bearer_token(request)
    if not token:
        raise ValueError("missing Authorization bearer token")

    secrets = [os.getenv("AUTH_SECRET", ""), os.getenv("AUTH_PREVIOUS_SECRET", "")]
    last_err = None
    for secret in secrets:
        if not secret:
            continue
        try:
            payload = jwt.decode(token, secret, algorithms=["HS256"])
            user_id = payload.get("user_id") or payload.get("sub")
            email = payload.get("email") or payload.get("preferred_username") or ""
            if not user_id:
                raise ValueError("token missing user_id/sub")
            return user_id, email
        except Exception as e:
            last_err = e
            continue
    raise ValueError("invalid token") from last_err

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

@app.get("/api/whoami")
async def whoami(request: Request):
    try:
        user_id, email = _decode_user(request)
        return {"user_id": user_id, "email": email}
    except Exception as e:
        return JSONResponse(status_code=401, content={"error": "unauthorized", "detail": str(e)})

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/api/create-checkout-session")
async def create_checkout_session(request: Request):
    print('Creating checkout session...')
    data = await request.json()
    price_id = data.get("priceId")
    if not price_id:
        return JSONResponse(status_code=400, content={"error": "missing priceId"})
    print(f"Received price_id: {price_id}")
    try:
        user_id, email = _decode_user(request)
        email = (email or "").strip()
        print(f"Auth OK for user_id={user_id}, email={email or '<none>'}")
    except Exception:
        return JSONResponse(status_code=401, content={"error": "unauthorized"})
    try:
        session_params = {
            "payment_method_types": ["card"],
            "line_items": [{"price": price_id, "quantity": 1}],
            "mode": "subscription",
            "success_url": SUCCESS_URL,
            "cancel_url": CANCEL_URL,
            "client_reference_id": user_id,
            "metadata": {"user_id": user_id, "email": email},
        }
        # Only set customer_email if present (Stripe rejects empty string)
        if email:
            session_params["customer_email"] = email

        session = stripe.checkout.Session.create(**session_params)
        return {"sessionId": session.id}
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

@app.get("/cancel")
async def cancel():
    return JSONResponse(content={"message": "Subscription canceled or checkout aborted."})

def _process_checkout_session(user_id: str):
    grpc_host = os.getenv("GRPC_HOST", "localhost:50051")
    with grpc.insecure_channel(grpc_host) as channel:
        subscription_stub = trading_api_pb2_grpc.SubscriptionServiceStub(channel)
        resp = subscription_stub.UpgradeUserRole(
            trading_api_pb2.UpgradeUserRoleRequest(user_id=user_id)
        )
        if resp.status == trading_api_pb2.StatusResponse.SUCCESS:
            print(f"Upgraded user {user_id} to superuser.")
        else:
            print(f"Failed to upgrade {user_id}: {resp.error_message}")


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
        user_id = obj.get("client_reference_id") or (obj.get("metadata") or {}).get("user_id")
        stripe_customer_id = obj.get("customer")
        subscription_id = obj.get("subscription")
        print(f"[Stripe] session completed user_id={user_id} customer={stripe_customer_id} sub={subscription_id}")

        if user_id:
            background_tasks.add_task(_process_checkout_session, user_id)
            # after you add the RPC, also call it here:
            grpc_host = os.getenv("GRPC_HOST", "localhost:50051")
            with grpc.insecure_channel(grpc_host) as channel:
              stub = trading_api_pb2_grpc.SubscriptionServiceStub(channel)
              stub.UpdateUserStripeInfo(trading_api_pb2.UpdateUserStripeInfoRequest(
                  user_id=user_id, stripe_customer_id=stripe_customer_id or "", subscription_id=subscription_id or "",
              ))
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