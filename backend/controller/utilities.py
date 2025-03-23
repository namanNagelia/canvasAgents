import base64
import PyPDF2
from io import BytesIO
from PIL import Image
import pytesseract
import os
import logging
from typing import Union, Optional
import fitz  # PyMuPDF

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: Union[bytes, BytesIO]) -> str:
    """
    Extract text from a PDF file, with OCR fallback for image-based PDFs.

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
            # Create a copy to use for fitz later
            pdf_file_copy = BytesIO(pdf_file.getvalue())
            pdf_file.seek(0)  # Reset position for PyPDF2

        # First try using PyPDF2 for text extraction
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = []
        pages_with_text = 0

        for i, page in enumerate(pdf_reader.pages):
            page_text = page.extract_text()
            if page_text and len(page_text.strip()) > 0:
                text.append(page_text)
                pages_with_text += 1
            else:
                logger.warning(
                    f"No text extracted from page {i+1} with PyPDF2")

        # If we got text from all pages, return it
        if pages_with_text == len(pdf_reader.pages):
            return "\n\n".join(text)

        # Otherwise, try PyMuPDF (fitz) as it might be better at text extraction
        logger.info(
            "Some pages have no text. Trying PyMuPDF for better extraction...")

        if isinstance(file_bytes, BytesIO):
            pdf_file_copy.seek(0)
            pdf_doc = fitz.open(
                stream=pdf_file_copy.getvalue(), filetype="pdf")
        else:
            pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")

        text = []
        pages_with_text = 0

        for i, page in enumerate(pdf_doc):
            page_text = page.get_text()
            if page_text and len(page_text.strip()) > 0:
                text.append(page_text)
                pages_with_text += 1
            else:
                logger.warning(
                    f"No text extracted from page {i+1} with PyMuPDF")

        # If we got text from all pages, return it
        if pages_with_text == len(pdf_doc):
            return "\n\n".join(text)

        # If we still have pages without text, apply OCR
        logger.info(
            "Some pages still have no text. Applying OCR to extract from images...")

        # Reset text list to contain all pages
        text = [""] * len(pdf_doc)

        for i, page in enumerate(pdf_doc):
            # If we already have text for this page from PyMuPDF, use it
            if i < len(text) and text[i]:
                continue

            # Extract images from the page
            pix = page.get_pixmap(alpha=False)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

            # Convert to grayscale for better OCR
            img = img.convert('L')

            # Apply OCR
            ocr_text = pytesseract.image_to_string(img)

            if ocr_text and len(ocr_text.strip()) > 0:
                text[i] = ocr_text
                logger.info(
                    f"Successfully extracted text from page {i+1} using OCR")
            else:
                logger.warning(
                    f"Failed to extract text from page {i+1} even with OCR")

        return "\n\n".join(text)

    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        return f"[Error extracting PDF text: {str(e)}]"


def extract_text_from_image(file_bytes: Union[bytes, BytesIO]) -> str:
    """
    Extract text from an image using OCR.

    Args:
        file_bytes: Image file content as bytes or BytesIO object

    Returns:
        Extracted text as string
    """
    try:
        if isinstance(file_bytes, bytes):
            image_file = BytesIO(file_bytes)
        else:
            image_file = file_bytes

        image = Image.open(image_file)

        # Convert to grayscale for better OCR results
        if image.mode != 'L':
            image = image.convert('L')

        # Apply OCR
        text = pytesseract.image_to_string(image)

        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from image: {str(e)}")
        return f"[Error extracting image text: {str(e)}]"


def process_file(file_data: Union[str, bytes, BytesIO], file_type: Optional[str] = None) -> str:
    """
    Process a file and extract text.

    Args:
        file_data: File content as string, bytes, or BytesIO object
        file_type: Optional file type hint

    Returns:
        Extracted text as string
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


# # For testing
# def main():
#     """Test function for file processing"""
#     # Test PDF processing
#     pdf_path = "your_pdf_path.pdf"
#     if os.path.exists(pdf_path):
#         print(f"Processing PDF: {pdf_path}")
#         print("-" * 50)
#         result = process_file(pdf_path)
#         print(f"Extracted {len(result)} characters of text")
#         print("-" * 50)
#         print(result[:500] + "..." if len(result) > 500 else result)  # Print preview
#     else:
#         print(f"File not found: {pdf_path}")


# if __name__ == "__main__":
#     main()
