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
from controller.agents import run_agent, display_result, run_agent_file_content
import uuid
import base64
from langchain_core.messages import HumanMessage, AIMessage
import json
import copy
from typing import Any, Dict, List
load_dotenv()
router = fastapi.APIRouter()

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


@router.post("/chat")
async def chat(request: Request):
    """
    This route is used to chat with the agent
    """
    try:
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
        ai_response = copy.deepcopy(llm_session_obj.ai_response)
        user_input = copy.deepcopy(llm_session_obj.user_input)
        chat_history = copy.deepcopy(llm_session_obj.chat_history)
        print("chat_history: ", chat_history)
        file_contents = {}
        print("Got initial data")
        if file_ids:
            uploaded_files = session.query(UploadedFile).filter(
                UploadedFile.id.in_([uuid.UUID(fid) for fid in file_ids])
            ).all()

            for file in uploaded_files:
                file_contents[str(file.id)] = file.content

        if file_contents:
            print("Running agent with file content")
            context_message = message + "\n\n" + \
                "\n\n".join(file_contents.values())
            result, updated_lang_history = run_agent_file_content(
                context_message,
                file_content=None,  # Not using this
                agent_type=agent_type,
                session_id=session_id,
                chat_history=chat_history
            )
        else:
            print("Running agent")
            result, updated_lang_history = run_agent_file_content(
                message,
                file_content=None,
                agent_type=agent_type,
                session_id=session_id,
                chat_history=chat_history
            )
        user_input.append({"agent_type": agent_type, "message": message})
        ai_response.append({"agent_type": agent_type, "message": result})

        # Create the object and clean it
        obj = {
            "id": str(llm_session_obj.id),
            "user_id": str(llm_session_obj.user_id),
            "user_input": user_input,
            "ai_response": ai_response,
            "chat_history": updated_lang_history,
        }

        # Clean the dictionary to ensure JSON-serializability
        cleaned_obj = clean_dict(obj)

        print("Cleaned obj: ", cleaned_obj)
        print(json.dumps(cleaned_obj, indent=4))

        # Assign cleaned values to the database object
        llm_session_obj.user_input = cleaned_obj["user_input"]
        llm_session_obj.ai_response = cleaned_obj["ai_response"]
        llm_session_obj.chat_history = cleaned_obj["chat_history"]
        session.add(llm_session_obj)

        session.commit()

        session.refresh(llm_session_obj)

        return cleaned_obj
    except Exception as e:
        session.rollback()
        print(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


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
