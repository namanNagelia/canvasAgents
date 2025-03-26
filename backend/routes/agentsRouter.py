import fastapi
from fastapi import Response, Request, HTTPException
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import jwt
import bcrypt
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from db import User, session, LLMSession, UploadedFile
from controller.validateJWT import validateCookie, validateBearer
from controller.utilities import process_file
from controller.agents import run_agent_file_content
import uuid
import base64
from langchain_core.messages import HumanMessage, AIMessage
import json
import copy
from typing import Any, Dict, List
import traceback
from functools import wraps

load_dotenv()
router = fastapi.APIRouter()

session_chat_histories = {}


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


@router.get("/get_files/{session_id}")
@with_session_cleanup
async def get_files(request: Request, session_id: str):
    """
    This route is used to get the files for the session

    inputs{
        - session_id: str
    }

    outputs{
        - files: list
    }
    """
    files = session.query(UploadedFile).filter(
        UploadedFile.session_id == session_id
    ).all()
    print("Files: ", files)
    return {"files": files}


@router.post("/create_session/{session_id}")
@with_session_cleanup
async def create_session(request: Request, session_id: str):
    """
    Create a new session for the user
    pass in the bearer token in the header

    inputs {
      NA
    }

    outputs {
        - session_id: str
    }
    """
    decoded = validateBearer(request)
    if not decoded["status"]:
        raise HTTPException(status_code=401, detail="Unauthorized")

    email = decoded["userDetails"]["email"]
    user_id = session.query(User).filter(
        User.email == email).first().id

    llm_Session = LLMSession(user_id=user_id, id=session_id)
    session.add(llm_Session)
    session.commit()

    return {"session_id": llm_Session.id}


@router.post("/upload_file")
@with_session_cleanup
async def upload_file(request: Request):
    """
    This route is used to upload a file to the session

    inputs {
        - session_id: str
        - file: fastapi.UploadFile
    }

    outputs {
        - file_id: str
        - session_id: str
    }
    """
    try:
        data = await request.form()
        session_id = data.get("session_id")
        print("Session ID: ", session_id)
        file: fastapi.UploadFile = data.get("file")

        if not session_id or not file:
            raise HTTPException(
                status_code=400, detail="Session ID and file are required")

        auth_result = validateBearer(request)
        if not auth_result["status"]:
            raise HTTPException(status_code=401, detail="Unauthorized")

        file_content = await file.read()
        content_type = file.content_type

        base64_data = base64.b64encode(file_content).decode("utf-8")

        text_content = process_file(file_content)

        uploaded_file = UploadedFile(
            content=text_content,
            base64=base64_data,
            fileType=content_type,
            session_id=session_id
        )
        print("Uploaded file: ", uploaded_file.session_id)

        session.add(uploaded_file)
        session.commit()
        session.refresh(uploaded_file)

        return {
            "file_id": str(uploaded_file.id),
            "session_id": str(session_id),
            "file_type": content_type,
            "content_length": len(text_content)
        }
    except Exception as e:
        print(f"Error in upload_file: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


def clean_dict(data: Any) -> Any:
    """
    Recursively clean a dictionary or list to make it JSON-serializable.
    Handles HumanMessage objects and other non-serializable types.
    """
    if isinstance(data, dict):
        cleaned = {}
        for key, value in data.items():
            if hasattr(value, '__dict__'):  # Handle objects like HumanMessage
                cleaned[key] = clean_dict(value.__dict__)
            elif isinstance(value, (dict, list)):
                cleaned[key] = clean_dict(value)
            elif isinstance(value, (str, int, float, bool)) or value is None:
                cleaned[key] = value
            else:
                # Convert other non-serializable objects to string as fallback
                cleaned[key] = str(value)
        # For HumanMessage-like objects, add default fields if missing
        if 'content' in cleaned and 'type' not in cleaned:
            cleaned.update({
                "type": "human",
                "additional_kwargs": cleaned.get("additional_kwargs", {}),
                "response_metadata": cleaned.get("response_metadata", {}),
                "name": None,
                "id": None,
                "example": False
            })
        return cleaned
    elif isinstance(data, list):
        return [clean_dict(item) for item in data]
    elif hasattr(data, '__dict__'):  # Handle objects directly
        return clean_dict(data.__dict__)
    elif isinstance(data, (str, int, float, bool)) or data is None:
        return data
    else:
        return str(data)  # Fallback for other types


@router.get("/get_session_history")
@with_session_cleanup
async def get_session_history(request: Request):
    """
    This route is used to get the session history, querying by USER_ID gotten from the token

    inputs {
       na just token
    }

    outputs {
        - array of session objects
    }
    """
    decoded = validateBearer(request)
    if not decoded["status"]:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user_email = decoded["userDetails"]["email"]
    user_obj = session.query(User).filter(
        User.email == user_email).first()

    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")

    print("User ID: ", user_obj.id)
    session_history = session.query(LLMSession).filter(
        LLMSession.user_id == user_obj.id).all()

    # Convert to JSON-serializable format
    result = []
    for sess in session_history:
        result.append({
            "id": str(sess.id),
            "user_id": str(sess.user_id),
            "created_at": sess.created_at.isoformat() if sess.created_at else None,
            "user_input": sess.user_input or [],
            "ai_response": sess.ai_response or [],
            "chat_history": sess.chat_history or []
        })

    return result


@router.post("/chat")
@with_session_cleanup
async def chat(request: Request):
    """
    This route is used to chat with the agent

    inputs {
        - session_id: str
        - message: str
        - agent_type: str
        - file_ids: list (reference to the file ID table)
    }

    outputs {
        - id: str
        - user_id: str
        - user_input: list
        - ai_response: list
        - chat_history: list
    }
    """
    data = await request.json()
    session_id = data.get("session_id")
    message = data.get("message")
    agent_type = data.get("agent_type", "general")
    file_ids = data.get("file_ids", [])

    auth_result = validateBearer(request)
    if not auth_result["status"]:
        raise HTTPException(status_code=401, detail="Unauthorized")

    llm_session_obj = session.query(LLMSession).filter(
        LLMSession.id == uuid.UUID(session_id)
    ).first()

    if not llm_session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    session.refresh(llm_session_obj)
    ai_response = copy.deepcopy(llm_session_obj.ai_response or [])
    user_input = copy.deepcopy(llm_session_obj.user_input or [])
    chat_history = copy.deepcopy(llm_session_obj.chat_history or [])
    print("chat_history: ", chat_history)

    file_contents = {}
    print("Got initial data")

    if len(file_ids) > 0:
        uploaded_files = session.query(UploadedFile).filter(
            UploadedFile.id.in_([uuid.UUID(fid) for fid in file_ids])
        ).all()

        for file in uploaded_files:
            file_contents[str(file.id)] = file.content
    print("File contents: ", file_contents)

    if file_contents:
        print("Running agent with file content")
        context_message = message + "\n\n" + \
            "\n\n".join(file_contents.values())
        result, updated_lang_history = run_agent_file_content(
            context_message,
            file_content=file_contents,
            agent_type=agent_type,
            session_id=session_id,
            chat_history=chat_history
        )
    else:
        print("Running agent")
        result, updated_lang_history = run_agent_file_content(
            message,
            file_content=file_contents,
            agent_type=agent_type,
            session_id=session_id,
            chat_history=chat_history
        )

    user_input.append({"agent_type": agent_type, "message": message})
    ai_response.append({"agent_type": agent_type, "message": result})

    obj = {
        "id": str(llm_session_obj.id),
        "user_id": str(llm_session_obj.user_id),
        "user_input": user_input,
        "ai_response": ai_response,
        "chat_history": updated_lang_history,
    }
    cleaned_obj = clean_dict(obj)

    print("Cleaned obj: ", cleaned_obj)

    llm_session_obj.user_input = cleaned_obj["user_input"]
    llm_session_obj.ai_response = cleaned_obj["ai_response"]
    llm_session_obj.chat_history = cleaned_obj["chat_history"]
    session.add(llm_session_obj)

    session.commit()
    session.refresh(llm_session_obj)

    return cleaned_obj


@router.get("/get_session_details/{session_id}")
@with_session_cleanup
async def get_session_details(request: Request, session_id: str):
    """
    This route is used to get the session history
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

    session_details = session.query(LLMSession).filter(
        LLMSession.id == uuid.UUID(session_id)
    ).first()
    return {"message": "Session details retrieved successfully", "sessionDetails": session_details}

"""

ON UI:
1. Create new session
2, You can upload a file on the sidebar, it will use /upload to upload it
3. You can chat with the agent, it will use /chat to chat with the agent. If you select files from the upload section, it will use /chat with the file paths
4. When you click on the chat, it will show the chat history on the left and the chat on the right
5. When you send a message, it will use /chat to get the response
6. The response will be shown on the right
7. The chat history will be shown on the left


"""
