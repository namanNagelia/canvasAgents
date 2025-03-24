import fastapi
from fastapi import Response, Request, HTTPException, Depends
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import jwt
import bcrypt
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from db import User, session
from controller.validateJWT import validateCookie, validateBearer
import traceback
from functools import wraps

load_dotenv()
router = fastapi.APIRouter()

DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET")


# Define a decorator to handle session cleanup
def with_session_cleanup(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except HTTPException:
            # We don't rollback for HTTP exceptions as they're expected
            raise
        except SQLAlchemyError as e:
            # Explicitly handle SQLAlchemy errors
            session.rollback()
            print(f"SQLAlchemy error in {func.__name__}: {str(e)}")
            print(traceback.format_exc())
            raise HTTPException(
                status_code=500, detail=f"Database error: {str(e)}")
        except Exception as e:
            # For any other exception, try to rollback
            try:
                session.rollback()
            except Exception as rollback_error:
                print(f"Error during rollback: {str(rollback_error)}")

            print(f"Error in {func.__name__}: {str(e)}")
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
    return wrapper


class RegisterSchema(BaseModel):
    name: str
    email: str
    password: str


class LoginSchema(BaseModel):
    email: str
    password: str


@router.post("/register")
@with_session_cleanup
async def register(user: RegisterSchema):
    """
    This route is used to register a new user

    input:
    - name: str
    - email: str
    - password: str

    output:
    - message: str  
    """
    email = user.email
    if session.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = bcrypt.hashpw(user.password.encode(
        'utf-8'), bcrypt.gensalt()).decode('utf-8')
    new_user = User(name=user.name, email=user.email,
                    password=hashed_password)
    session.add(new_user)
    session.commit()
    return {"message": "Register successful"}


@router.post("/login")
@with_session_cleanup
async def login(user: LoginSchema, response: Response):
    """
    This route is used to login a user

    input:
    - email: str
    - password: str
    """
    db_user = session.query(User).filter(User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")

    if not bcrypt.checkpw(user.password.encode('utf-8'), db_user.password.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid Credentials")

    token = jwt.encode({"email": db_user.email},
                       JWT_SECRET, algorithm="HS256")

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=False,
        secure=False,
        samesite="lax",
        max_age=3600 * 24 * 30
    )

    return {
        "message": "Login successful",
        "token": token,
        "user": {"id": str(db_user.id), "email": db_user.email, "name": db_user.name}
    }


@router.get("/logout")
@with_session_cleanup
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logout successful"}


@router.get("/protected")
@with_session_cleanup
async def protected(request: Request):
    """
    This route is used to get the user details

    input:
    - request: Request
    """
    res = validateCookie(request)
    bearerToken = request.cookies.get("access_token")
    if not res["status"]:
        raise HTTPException(status_code=401, detail=res.get(
            "message", "Unauthorized"))

    userDetails = res["userDetails"]
    db_user = session.query(User).filter(
        User.email == userDetails["email"]).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Protected route accessed successfully", "user": {"id": str(db_user.id), "email": db_user.email, "name": db_user.name}, "bearerToken": bearerToken}


@router.get("/protected-bearer")
@with_session_cleanup
async def protected_bearer(request: Request):
    """
    This route is used to get the user details

    input:
    - request: Request
    """
    res = validateBearer(request)
    if not res["status"]:
        raise HTTPException(status_code=401, detail=res.get(
            "message", "Unauthorized"))

    userDetails = res["userDetails"]
    db_user = session.query(User).filter(
        User.email == userDetails["email"]).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Protected route accessed successfully", "user": {"id": str(db_user.id), "email": db_user.email, "name": db_user.name}}
