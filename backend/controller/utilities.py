import base64
import PyPDF2
from io import BytesIO
from PIL import Image
import pytesseract
import os
import logging
from typing import Union, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: Union[bytes, BytesIO]) -> str:
    """
    Extract text from a PDF file.

    Args:
        file_bytes: PDF file content as bytes or BytesIO object

    Returns:
        Extracted text as string
    """
    try:
        if isinstance(file_bytes, bytes):
            pdf_file = BytesIO(file_bytes)
        else:
            pdf_file = file_bytes

        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = []

        for i, page in enumerate(pdf_reader.pages):
            page_text = page.extract_text()
            if page_text:
                text.append(page_text)
            else:
                logger.warning(f"No text extracted from page {i+1}")

        return "\n\n".join(text)
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        return f"[Error extracting PDF text: {str(e)}]"


def extract_text_from_image(file_bytes: Union[bytes, BytesIO]) -> str:

    try:
        if isinstance(file_bytes, bytes):
            image_file = BytesIO(file_bytes)
        else:
            image_file = file_bytes

        image = Image.open(image_file)

        if image.mode != 'L':
            image = image.convert('L')

        text = pytesseract.image_to_string(image)

        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from image: {str(e)}")
        return f"[Error extracting image text: {str(e)}]"


def process_file(file_data: Union[str, bytes, BytesIO], file_type: Optional[str] = None) -> str:
    """
    Process a file and extract text.
    """
    if not file_data:
        return ""

    try:
        if isinstance(file_data, str):
            if os.path.isfile(file_data):
                with open(file_data, "rb") as f:
                    file_content = f.read()
                file_type = file_data.split('.')[-1].lower()

            elif "," in file_data and ";" in file_data:
                file_content = base64.b64decode(file_data.split(",")[1])
                if not file_type:
                    mime_type = file_data.split(";")[0].split("/")
                    if len(mime_type) > 1:
                        file_type = mime_type[1]

            # Handle raw base64 data without MIME prefix
            elif file_data.startswith(('eyJ', 'aHR', 'PHN', 'Qk1', 'iVB', 'R0l', 'SUkq', 'UEs', '/9j')):
                try:
                    file_content = base64.b64decode(file_data)
                except:
                    return "Error: Invalid base64 data"

            else:
                # Assume it's just text
                return file_data

        elif isinstance(file_data, (bytes, BytesIO)):
            file_content = file_data

        else:
            return f"Unsupported input type: {type(file_data)}"

        # Process based on file type
        if file_type in ["pdf"]:
            return extract_text_from_pdf(file_content)
        elif file_type in ["jpeg", "jpg", "png", "gif", "bmp", "tiff", "webp"]:
            return extract_text_from_image(file_content)
        else:
            if isinstance(file_content, bytes):
                if file_content.startswith(b'%PDF'):
                    return extract_text_from_pdf(file_content)
                # Common image signatures
                elif any(file_content.startswith(sig) for sig in [b'\xff\xd8\xff', b'\x89PNG', b'GIF', b'BM']):
                    return extract_text_from_image(file_content)

            try:
                if isinstance(file_content, bytes):
                    return file_content.decode('utf-8')
                return str(file_content)
            except:
                return f"Unsupported or unknown file type: {file_type or 'unknown'}"

    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        return f"Error processing file: {str(e)}"


# def __main__():
#     """Test function for file processing"""
#     # Test PDF processing
#     pdf_path = "/Users/nnagelia/Downloads/Mindgrasp Developer Agentic Learning Canvas.pdf"
#     if os.path.exists(pdf_path):
#         print(f"Processing PDF: {pdf_path}")
#         print("-" * 50)
#         print(process_file(pdf_path))
#     else:
#         print(f"File not found: {pdf_path}")


# if __name__ == "__main__":
#     __main__()
