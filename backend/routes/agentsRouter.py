import fastapi
from fastapi import Response, Request, HTTPException
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import jwt
import bcrypt
from sqlalchemy.orm import sessionmaker
from db import User, session, LLMSession, UploadedFile
from controller.validateJWT import validateCookie, validateBearer
from controller.utilities import process_file
from controller.agents import run_agent, display_result
import uuid
import base64
from langchain_core.messages import HumanMessage, AIMessage

load_dotenv()
router = fastapi.APIRouter()

# Create a dictionary to store chat histories by session
session_chat_histories = {}


@router.post("/create_session")
async def create_session(request: Request):
    """
    Create a new session for the user
    """
    decoded = validateBearer(request)
    print("Decoded: ", decoded)
    print(type(decoded))
    if not decoded["status"]:
        raise HTTPException(status_code=401, detail="Unauthorized")
    email = decoded["userDetails"]["email"]
    print(email)
    user_id = session.query(User).filter(
        User.email == email).first().id
    print("User ID: ", user_id)

    llm_Session = LLMSession(user_id=user_id)
    session.add(llm_Session)
    session.commit()
    return {"session_id": llm_Session.id}


@router.post("/upload_file")
async def upload_file(request: Request):
    data = await request.form()
    session_id = data.get("session_id")
    file: fastapi.UploadFile = data.get("file")

    if not session_id or not file:
        raise HTTPException(
            status_code=400, detail="Session ID and file are required")

    auth_result = validateBearer(request)
    if not auth_result["status"]:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        file_content = await file.read()
        content_type = file.content_type

        base64_data = base64.b64encode(file_content).decode("utf-8")

        text_content = process_file(file_content)

        uploaded_file = UploadedFile(
            session_id=session_id,
            content=text_content,
            base64=base64_data,
            fileType=content_type
        )

        session.add(uploaded_file)
        session.commit()
        session.refresh(uploaded_file)

        return {
            "file_id": str(uploaded_file.id),
            "session_id": str(session_id),
            "file_type": content_type,
            "content_length": len(text_content)
        }

    except ValueError as e:
        raise HTTPException(
            status_code=400, detail=f"Invalid session ID: {str(e)}")
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error uploading file: {str(e)}")
