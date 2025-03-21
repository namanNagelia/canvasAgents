import fastapi

router = fastapi.APIRouter()


@router.post("/login")
async def login():
    return {"message": "Login successful"}
