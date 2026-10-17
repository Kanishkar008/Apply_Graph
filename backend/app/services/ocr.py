"""Local OCR processing module for scanned and image-only PDF documents.

Uses Tesseract OCR and pypdfium2 for offline, private text extraction.
No external network, API, or LLM services are invoked.
Enforces resource guards: max page limits, resolution caps, and processing timeouts.
"""

import io
import logging
import os
import shutil
from typing import List, Optional

import pypdfium2 as pdfium
import pytesseract
from fastapi import HTTPException, status
from PIL import Image

logger = logging.getLogger(__name__)

# Resource and security limits
MAX_OCR_PAGES: int = 10
OCR_DPI: int = 200  # 200 DPI offers optimal Tesseract accuracy while keeping bitmap size small
MAX_IMAGE_DIMENSION: int = 4096
OCR_PAGE_TIMEOUT_SECONDS: int = 20


def configure_tesseract_path() -> Optional[str]:
    """Locate and configure local tesseract executable on Linux or Windows."""
    # Check if already accessible via PATH
    tess_path = shutil.which("tesseract")
    if tess_path:
        pytesseract.pytesseract.tesseract_cmd = tess_path
        return tess_path

    # Common Windows installation directories
    windows_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
    ]
    for p in windows_paths:
        if os.path.exists(p):
            pytesseract.pytesseract.tesseract_cmd = p
            return p

    return None


class OCRExtractor:
    """Handles local OCR rendering and text extraction for scanned PDFs."""

    @classmethod
    def extract_text_from_scanned_pdf(cls, content: bytes) -> str:
        """Render pages of an image-only PDF and run offline Tesseract OCR.

        Raises:
            HTTPException(400): If PDF cannot be rendered or has no pages.
            HTTPException(422): If page count exceeds limits or OCR yields no readable text.
            HTTPException(503): If local Tesseract executable is not installed.
        """
        # Ensure Tesseract executable is configured
        tess_bin = configure_tesseract_path()
        if not tess_bin:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Local OCR engine (Tesseract) is not installed or accessible on this system.",
            )

        try:
            pdf = pdfium.PdfDocument(content)
        except Exception as err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to open PDF document for OCR processing: {str(err)}",
            )

        num_pages = len(pdf)
        if num_pages == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PDF contains no pages.",
            )

        # Enforce page count limit to prevent DoS / unbounded CPU usage
        if num_pages > MAX_OCR_PAGES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Scanned PDF page count ({num_pages}) exceeds the maximum allowed limit "
                    f"of {MAX_OCR_PAGES} pages for OCR processing."
                ),
            )

        extracted_text_parts: List[str] = []

        # Stream / process page by page to avoid memory accumulation
        scale = OCR_DPI / 72.0  # standard PDF point is 1/72 inch

        for page_idx in range(num_pages):
            page = None
            bitmap = None
            pil_image = None
            try:
                page = pdf[page_idx]
                width, height = page.get_size()
                pixel_w = int(width * scale)
                pixel_h = int(height * scale)

                # Cap resolution to prevent memory exhaustion
                if pixel_w > MAX_IMAGE_DIMENSION or pixel_h > MAX_IMAGE_DIMENSION:
                    cur_scale = min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height)
                else:
                    cur_scale = scale

                bitmap = page.render(scale=cur_scale)
                pil_image = bitmap.to_pil()

                # Run Tesseract with page timeout
                page_text = pytesseract.image_to_string(
                    pil_image,
                    lang="eng",
                    timeout=OCR_PAGE_TIMEOUT_SECONDS,
                )

                clean_text = page_text.strip() if page_text else ""
                if clean_text:
                    extracted_text_parts.append(clean_text)

            except pytesseract.TesseractNotFoundError:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Tesseract OCR executable not found on the server.",
                )
            except pytesseract.TesseractError as terr:
                logger.warning(f"OCR error on page {page_idx + 1}: {terr}")
                continue
            except RuntimeError as rerr:
                if "timeout" in str(rerr).lower():
                    logger.warning(f"OCR timed out on page {page_idx + 1}")
                    continue
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"OCR processing failed on page {page_idx + 1}: {str(rerr)}",
                )
            except Exception as err:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Error rendering PDF page {page_idx + 1} for OCR: {str(err)}",
                )
            finally:
                if pil_image:
                    pil_image.close()
                if bitmap:
                    bitmap.close()
                if page:
                    page.close()

        pdf.close()

        full_extracted = "\n\n".join(extracted_text_parts).strip()
        if not full_extracted:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Scanned PDF contains no readable text after OCR processing.",
            )

        return full_extracted
