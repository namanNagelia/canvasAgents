from tavily import TavilyClient
from openai import OpenAI
from dotenv import load_dotenv
import os
import jwt

load_dotenv()

openai = OpenAI(api_key=os.getenv("OPENAI_KEY"))
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
OPENAI_KEY = os.getenv("OPENAI_API_KEY")
# tavily_client = TavilyClient(api_key=TAVILY_API_KEY)
# response = tavily_client.search(
#     query="Who is Leo Messi?", search_depth="advanced", include_images=True)

print("hi")
