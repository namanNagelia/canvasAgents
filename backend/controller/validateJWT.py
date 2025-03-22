import os
from dotenv import load_dotenv
from fastapi import Request
import jwt
load_dotenv()
JWT_SECRET = os.getenv("JWT_SECRET")


def validateCookie(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        return {"status": False, "message": "No token found"}

    try:
        decoded_token = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return {"status": True, "userDetails": decoded_token}
    except jwt.ExpiredSignatureError:
        return {"status": False, "message": "Token expired"}
    except jwt.InvalidTokenError:
        return {"status": False, "message": "Invalid token"}


def validateBearer(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"status": False, "message": "No authorization header"}

    token = auth_header.split("Bearer ")[1]

    try:
        decoded_token = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return {"status": True, "userDetails": decoded_token}
    except jwt.ExpiredSignatureError:
        return {"status": False, "message": "Token expired"}
    except jwt.InvalidTokenError:
        return {"status": False, "message": "Invalid token"}
