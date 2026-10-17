import io
import pypdf
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.services.resume import sanitize_filename


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


def make_blank_pdf() -> bytes:
    """Construct a valid PDF with no extractable text (simulating blank or image-only scan)."""
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def test_sanitize_filename() -> None:
    """Test filename sanitization against path traversal, control chars, and null bytes."""
    assert sanitize_filename("../../../etc/passwd") == "passwd"
    assert sanitize_filename("..\\..\\Windows\\System32\\cmd.exe") == "cmd.exe"
    assert sanitize_filename("my\x00resume\x1f.pdf") == "myresume.pdf"
    assert sanitize_filename("   resume   final.txt  ") == "resume final.txt"
    assert sanitize_filename("") == "uploaded_resume.txt"


def test_upload_txt_resume_success(client: TestClient) -> None:
    """Test successful ingestion of a plain text resume."""
    content = "Jane Doe\nFull-Stack Engineer\nPython, FastAPI, React, PostgreSQL\n5 years experience".encode("utf-8")
    files = {"file": ("jane_doe_resume.txt", content, "text/plain")}

    response = client.post("/api/v1/resumes", files=files)
    assert response.status_code == 201

    data = response.json()
    assert "id" in data
    assert data["filename"] == "jane_doe_resume.txt"
    assert data["file_type"] == "txt"
    assert data["file_size"] == len(content)
    assert "Jane Doe" in data["raw_text"]
    assert "FastAPI" in data["raw_text"]

    # Verify retrieval
    resume_id = data["id"]
    get_res = client.get(f"/api/v1/resumes/{resume_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == resume_id


def test_upload_pdf_resume_success(client: TestClient) -> None:
    """Test successful ingestion of a PDF resume."""
    pdf_bytes = make_valid_pdf("Alex Smith - Lead Architect - Kubernetes Python")
    files = {"file": ("alex_architect.pdf", pdf_bytes, "application/pdf")}

    response = client.post("/api/v1/resumes", files=files)
    assert response.status_code == 201

    data = response.json()
    assert data["filename"] == "alex_architect.pdf"
    assert data["file_type"] == "pdf"
    assert "Alex Smith" in data["raw_text"]


def test_upload_empty_file_rejected(client: TestClient) -> None:
    """Test that zero-byte file uploads are rejected with 400 Bad Request."""
    files = {"file": ("empty.txt", b"", "text/plain")}
    response = client.post("/api/v1/resumes", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_upload_unsupported_file_type(client: TestClient) -> None:
    """Test that unsupported formats (e.g. .jpg, .exe) are rejected with 415."""
    files = {"file": ("photo.jpg", b"fake binary data", "image/jpeg")}
    response = client.post("/api/v1/resumes", files=files)
    assert response.status_code == 415
    assert "Unsupported file format" in response.json()["detail"]


def test_upload_malformed_pdf(client: TestClient) -> None:
    """Test that corrupted PDF content is rejected with 400 Bad Request."""
    corrupt_pdf = b"%PDF-1.4\nCorrupt header and broken xref data"
    files = {"file": ("corrupt.pdf", corrupt_pdf, "application/pdf")}
    response = client.post("/api/v1/resumes", files=files)
    assert response.status_code == 400
    assert "Failed to read PDF document" in response.json()["detail"] or "Malformed" in response.json()["detail"]


def test_upload_blank_pdf_ocr_no_readable_text(client: TestClient) -> None:
    """Test that image-only / blank PDFs without extractable text return 422 indicating no readable text."""
    blank_pdf = make_blank_pdf()
    files = {"file": ("scanned_blank.pdf", blank_pdf, "application/pdf")}
    response = client.post("/api/v1/resumes", files=files)
    assert response.status_code in [422, 503]
    detail = response.json()["detail"]
    assert "no readable text" in detail.lower() or "not installed" in detail.lower()


def test_upload_oversized_file(client: TestClient) -> None:
    """Test that files exceeding upload limit are rejected with 413 Payload Too Large."""
    with patch("app.services.resume.settings.MAX_UPLOAD_SIZE_BYTES", 50):
        files = {"file": ("big_resume.txt", b"A" * 100, "text/plain")}
        response = client.post("/api/v1/resumes", files=files)
        assert response.status_code == 413
        assert "exceeds the maximum limit" in response.json()["detail"]


def test_list_resumes_without_raw_text(client: TestClient) -> None:
    """Test that listing resumes returns metadata without full raw_text payload."""
    # Upload sample resume
    files = {"file": ("listing_test.txt", b"Sample text for listing test", "text/plain")}
    post_res = client.post("/api/v1/resumes", files=files)
    assert post_res.status_code == 201

    list_res = client.get("/api/v1/resumes")
    assert list_res.status_code == 200
    items = list_res.json()
    assert isinstance(items, list)
    assert len(items) >= 1

    first = items[0]
    assert "id" in first
    assert "filename" in first
    assert "file_type" in first
    assert "file_size" in first
    assert "created_at" in first
    assert "raw_text" not in first  # Metadata listing excludes raw text payload


def test_get_resume_by_id_and_not_found(client: TestClient) -> None:
    """Test retrieving existing resume vs nonexistent ID."""
    files = {"file": ("detail_test.txt", b"Specific text content", "text/plain")}
    post_res = client.post("/api/v1/resumes", files=files)
    resume_id = post_res.json()["id"]

    # Success retrieval
    get_res = client.get(f"/api/v1/resumes/{resume_id}")
    assert get_res.status_code == 200
    assert get_res.json()["raw_text"] == "Specific text content"

    # Nonexistent ID
    bad_res = client.get("/api/v1/resumes/non-existent-uuid-12345")
    assert bad_res.status_code == 404
    assert "not found" in bad_res.json()["detail"].lower()


def test_delete_resume_and_subsequent_not_found(client: TestClient) -> None:
    """Test deleting resume (204) and handling nonexistent ID (404)."""
    files = {"file": ("to_delete.txt", b"Delete this resume", "text/plain")}
    post_res = client.post("/api/v1/resumes", files=files)
    resume_id = post_res.json()["id"]

    # Delete
    del_res = client.delete(f"/api/v1/resumes/{resume_id}")
    assert del_res.status_code == 204

    # Verify no longer exists
    get_res = client.get(f"/api/v1/resumes/{resume_id}")
    assert get_res.status_code == 404

    # Delete again -> 404
    del_again = client.delete(f"/api/v1/resumes/{resume_id}")
    assert del_again.status_code == 404
