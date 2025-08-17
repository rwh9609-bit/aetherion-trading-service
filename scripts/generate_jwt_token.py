import jwt
import os
import time

"""
Usage:
  Set AUTH_SECRET in your environment before running this script.
  Example:
    export AUTH_SECRET=your_secret_here
    python generate_jwt_token.py
"""

SECRET = os.environ.get('AUTH_SECRET')
if not SECRET:
    raise RuntimeError("AUTH_SECRET environment variable must be set. Do not hardcode secrets in this script.")

# JWT claims
claims = {
    'sub': 'orchestrator',
    'iat': int(time.time()),
    'exp': int(time.time()) + 3600  # 1 hour expiry
}

token = jwt.encode(claims, SECRET, algorithm='HS256')
print(f"JWT token for orchestrator: {token}")
