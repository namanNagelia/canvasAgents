from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth_router, agents_router
import uvicorn

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
app.include_router(agents_router, prefix="/api/agents")


@app.get("/")
async def root():
    return {"message": "Welcome to the FastAPI backend"}


@app.get("/api/hello")
async def hello():
    return {"message": "Hello from the API"}


def main():
    uvicorn.run(app, host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()
