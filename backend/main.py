from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from routes import auth_router, agents_router
import uvicorn
from sqlalchemy.exc import SQLAlchemyError, PendingRollbackError
from db import session
import traceback

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global middleware to handle SQLAlchemy errors and rollbacks


@app.middleware("http")
async def db_session_middleware(request: Request, call_next):
    try:
        # Try to process the request normally
        response = await call_next(request)
        return response
    except Exception as e:
        # If any SQLAlchemy error occurs, ensure the session is rolled back
        if isinstance(e, SQLAlchemyError) or isinstance(e, PendingRollbackError):
            try:
                print(f"Rolling back session due to: {str(e)}")
                session.rollback()
            except Exception as rollback_error:
                print(f"Error during rollback: {str(rollback_error)}")
                print(traceback.format_exc())

        # Re-raise the original exception to let FastAPI handle it
        raise

# Always ensure connections are returned to the pool


@app.on_event("shutdown")
def shutdown_db_client():
    try:
        session.close_all()
    except Exception as e:
        print(f"Error closing sessions: {str(e)}")


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
