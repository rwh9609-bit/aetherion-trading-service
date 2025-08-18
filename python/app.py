from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backtest_api import router as backtest_router

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:3000"],
	allow_credentials=True,
	allow_methods=["*"] ,
	allow_headers=["*"]
)

app.include_router(backtest_router)

# You can run this app with: uvicorn python.app:app --reload
