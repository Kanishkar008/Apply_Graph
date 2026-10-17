"""Unit and integration tests for local OCR processing on scanned PDFs."""

import io
from unittest.mock import patch, MagicMock
import pytest
from fastapi import HTTPException
from PIL import Image, ImageDraw
import pypdf

from app.services.ocr import OCRExtractor, MAX_OCR_PAGES
from app.services.resume import extract_text_from_pdf, validate_and_extract_content


def create_synthetic_scanned_pdf(text: str = "") -> bytes:
    """Create a genuine image-only PDF with rendered text and NO extractable text stream."""
    img = Image.new("RGB", (800, 600), color="white")
    if text.strip():
        draw = ImageDraw.Draw(img)
        draw.text((50, 50), text, fill="black")

    buf = io.BytesIO()
    img.save(buf, format="PDF")
    return buf.getvalue()


def create_multi_page_pdf(num_pages: int) -> bytes:
    """Create a multi-page PDF document."""
    writer = pypdf.PdfWriter()
    for _ in range(num_pages):
        page = pypdf.PageObject.create_blank_page(width=612, height=792)
        writer.add_page(page)

    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def make_valid_pdf(text: str) -> bytes:
    """Construct a minimal valid PDF containing extractable text."""
    stream = f"BT /F1 12 Tf 50 700 Td ({text}) Tj ET".encode("latin1")
    pdf = f"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length {len(stream)} >> stream
{stream.decode('latin1')}
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
trailer << /Size 6 /Root 1 0 R >>
startxref
0
%%EOF""".encode("latin1")
    return pdf


def test_text_pdf_does_not_trigger_ocr():
    """Verify that text-based PDFs extract immediately without invoking OCR."""
    text_content = make_valid_pdf("Alex Morgan Software Engineer")

    with patch.object(OCRExtractor, "extract_text_from_scanned_pdf") as mock_ocr:
        extracted = extract_text_from_pdf(text_content)
        assert "Alex Morgan" in extracted
        mock_ocr.assert_not_called()


def test_genuine_scanned_pdf_extracts_readable_text():
    """Verify that image-only PDFs with text rendered as image are parsed via OCR."""
    sample_text = "Morgan Reed\nSenior Distributed Systems Engineer\nSkills: Python, Go, Docker"
    scanned_pdf = create_synthetic_scanned_pdf(sample_text)

    # Ensure pypdf sees zero text
    reader = pypdf.PdfReader(io.BytesIO(scanned_pdf))
    direct_text = "".join(p.extract_text() or "" for p in reader.pages).strip()
    assert len(direct_text) == 0

    # Extract via full pipeline
    extracted = extract_text_from_pdf(scanned_pdf)
    assert "Morgan" in extracted
    assert "Systems Engineer" in extracted or "Engineer" in extracted
    assert "Python" in extracted


def test_scanned_pdf_no_readable_text_fails_clearly():
    """Verify that scanned PDFs without readable text return 422 with informative message."""
    blank_scanned_pdf = create_synthetic_scanned_pdf("")  # Completely blank image

    with pytest.raises(HTTPException) as exc_info:
        extract_text_from_pdf(blank_scanned_pdf)

    assert exc_info.value.status_code == 422
    assert "no readable text" in exc_info.value.detail.lower()


def test_ocr_page_limit_guard():
    """Verify that PDFs exceeding MAX_OCR_PAGES are rejected to prevent resource exhaustion."""
    excessive_pages_pdf = create_multi_page_pdf(MAX_OCR_PAGES + 2)

    with pytest.raises(HTTPException) as exc_info:
        OCRExtractor.extract_text_from_scanned_pdf(excessive_pages_pdf)

    assert exc_info.value.status_code == 422
    assert f"exceeds the maximum allowed limit of {MAX_OCR_PAGES}" in exc_info.value.detail


def test_ocr_handles_tesseract_errors_safely():
    """Verify that unexpected Tesseract/rendering exceptions are handled gracefully."""
    scanned_pdf = create_synthetic_scanned_pdf("Sample text")

    with patch("pytesseract.image_to_string", side_effect=RuntimeError("OCR engine timeout")):
        with pytest.raises(HTTPException) as exc_info:
            OCRExtractor.extract_text_from_scanned_pdf(scanned_pdf)
        assert exc_info.value.status_code == 422
        assert "no readable text" in exc_info.value.detail.lower()


def test_malformed_pdf_rejected_before_ocr():
    """Verify that malformed PDFs fail with 400 before OCR is attempted."""
    malformed = b"%PDF-corrupted-garbage-bytes-not-a-valid-structure"

    with patch.object(OCRExtractor, "extract_text_from_scanned_pdf") as mock_ocr:
        with pytest.raises(HTTPException) as exc_info:
            extract_text_from_pdf(malformed)
        assert exc_info.value.status_code in [400, 415]
        mock_ocr.assert_not_called()
