import fastapi
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import jwt
import bcrypt


load_dotenv()

router = fastapi.APIRouter()


@router.post("/register")
async def login():
    return {"message": "Login successful"}
