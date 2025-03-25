# Backend

This is a FastAPI backend for the project.

## Setup

1. Create a virtual environment:

   ```
   python -m venv venv
   ```

2. Activate the virtual environment:

   - On Windows: `venv\Scripts\activate`
   - On macOS/Linux: `source venv/bin/activate`

3. Install dependencies:

   ```
   pip install -r requirements.txt
   ```

4. Run the development server:
   ```
   uvicorn main:app --reload
   ```

The API will be available at http://localhost:8000

## API Documentation

- API documentation is available at http://localhost:8000/docs
- ReDoc UI is available at http://localhost:8000/redoc
