from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth_router
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth")


@app.get("/")
async def root():
    return {"message": "Welcome to the FastAPI backend"}


@app.get("/api/hello")
async def hello():
    return {"message": "Hello from the API"}
