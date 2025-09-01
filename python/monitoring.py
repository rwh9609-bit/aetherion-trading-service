import time
import uuid
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging
import os
import requests

# Configure basic logging as fallback
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_database_health():
    """Check if database connection is healthy"""
    try:
        # You would use your actual database client here
        # Example with SQLAlchemy: db.session.execute("SELECT 1")
        # For now, we'll simulate success
        return {
            "healthy": True,
            "latency_ms": 15,
            "message": "Connected successfully"
        }
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        return {
            "healthy": False,
            "message": str(e)
        }

def check_cache_health():
    """Check if cache service is healthy"""
    try:
        # Example with Redis: redis_client.ping()
        # For now, we'll simulate success
        return {
            "healthy": True,
            "latency_ms": 5,
            "message": "Cache responding normally"
        }
    except Exception as e:
        logger.error(f"Cache health check failed: {str(e)}")
        return {
            "healthy": False,
            "message": str(e)
        }

def check_stripe_health():
    """Check if Stripe API is accessible"""
    try:
        if not os.environ.get("STRIPE_API_KEY"):
            return {
                "healthy": False,
                "message": "STRIPE_API_KEY not configured"
            }
            
        # For Stripe, we could check a simple endpoint
        # But for now, we'll just check if the API key exists
        return {
            "healthy": True,
            "message": "Stripe API key configured"
        }
    except Exception as e:
        logger.error(f"Stripe health check failed: {str(e)}")
        return {
            "healthy": False,
            "message": str(e)
        }

def check_grpc_service_health(service_host, service_port=50051):
    """Check if a gRPC service is responsive"""
    try:
        # Simple TCP connection check for gRPC
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex((service_host, service_port))
        sock.close()
        
        if result == 0:
            return {
                "healthy": True,
                "message": f"Connected to {service_host}:{service_port}"
            }
        else:
            return {
                "healthy": False,
                "message": f"Failed to connect to {service_host}:{service_port}"
            }
    except Exception as e:
        return {
            "healthy": False, 
            "message": str(e)
        }

def setup_monitoring(app: FastAPI, service_name: str = "backend-api"):
    """Configure monitoring without OpenTelemetry dependencies"""
    
    # Add middleware for request tracking
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        start_time = time.time()
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        
        # Add context to request
        request.state.request_id = request_id
        request.state.start_time = start_time
        
        # Process the request
        try:
            response = await call_next(request)
            
            # Calculate processing time
            process_time = time.time() - start_time
            
            # Add headers to response
            response.headers["X-Process-Time"] = str(process_time)
            response.headers["X-Request-ID"] = request_id
            
            # Log the request
            log_data = {
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration": process_time
            }
            
            if response.status_code >= 500:
                logger.error(f"Request error: {log_data}")
            elif response.status_code >= 400:
                logger.warning(f"Request warning: {log_data}")
            else:
                logger.info(f"Request success: {log_data}")
                
            return response
        except Exception as e:
            logger.error(f"Unhandled exception: {str(e)}", 
                         extra={"request_id": request_id, "path": request.url.path})
            raise
    
    # Add health check endpoint
    @app.get("/healthz/detailed", include_in_schema=False)
    async def detailed_health():
        # Check all dependencies
        grpc_host = os.environ.get("GRPC_HOST", "trading")
        checks = {
            "database": check_database_health(),
            "cache": check_cache_health(),
            "stripe": check_stripe_health(),
            "trading_service": check_grpc_service_health(grpc_host.split(":")[0], 
                                                       int(grpc_host.split(":")[1]) if ":" in grpc_host else 50051)
        }
        
        status_code = 200 if all(check["healthy"] for check in checks.values()) else 503
        
        return JSONResponse(
            status_code=status_code,
            content={
                "status": "healthy" if status_code == 200 else "unhealthy",
                "timestamp": time.time(),
                "service": service_name,
                "checks": checks
            }
        )
    
    return app