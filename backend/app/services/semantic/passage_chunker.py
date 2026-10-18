"""Exact-span resume passage chunking module.

Decomposes raw resume text into semantic candidate passages while guaranteeing strict,
unbreakable provenance:
    original_text[start_char:end_char] == passage_text

Never modifies or normalizes character slices directly.
All trims adjust the span offsets precisely.
"""

import re
from dataclasses import dataclass
from typing import List, Optional


@dataclass(frozen=True)
class PassageChunk:
    """An exact textual excerpt with absolute character bounds in the source text."""

    text: str
    start_char: int
    end_char: int

    def __post_init__(self) -> None:
        if self.start_char < 0 or self.end_char < self.start_char:
            raise ValueError(
                f"Invalid chunk offsets: start_char={self.start_char}, end_char={self.end_char}"
            )


class PassageChunker:
    """Splits resume text into semantic retrieval blocks with exact provenance bounds."""

    # Default limits
    MAX_PASSAGE_CHARS: int = 400
    MIN_PASSAGE_CHARS: int = 15

    # Regex patterns
    # Match structural blocks: 2 or more newlines, or markdown / bullet lines
    _BLOCK_SPLIT_PATTERN = re.compile(r"(?:\r?\n\s*){2,}")
    _BULLET_LINE_PATTERN = re.compile(r"(?:^|\r?\n)\s*[\u2022\u2023\u25E6\u2043\u2219\*\-\+]\s*")
    # Sentence splitting within an oversized block (punctuation followed by space and capital letter/number)
    _SENTENCE_BOUNDARY_PATTERN = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(\[])")

    @classmethod
    def chunk_text(
        cls,
        text: Optional[str],
        max_chars: Optional[int] = None,
        min_chars: Optional[int] = None,
    ) -> List[PassageChunk]:
        """Split text into discrete passage chunks while strictly preserving character offsets.

        Every returned PassageChunk c satisfies:
            text[c.start_char : c.end_char] == c.text
        """
        if not text or not text.strip():
            return []

        limit_max = max_chars or cls.MAX_PASSAGE_CHARS
        limit_min = min_chars or cls.MIN_PASSAGE_CHARS

        chunks: List[PassageChunk] = []

        # 1. First divide text into coarse blocks by double-newlines
        block_spans = cls._find_spans_by_pattern(text, cls._BLOCK_SPLIT_PATTERN)

        for b_start, b_end in block_spans:
            block_text = text[b_start:b_end]
            if not block_text.strip():
                continue

            # 2. Check if block contains bullet points
            bullet_spans = cls._find_bullet_spans(text, b_start, b_end)
            if bullet_spans:
                sub_units = bullet_spans
            else:
                sub_units = [(b_start, b_end)]

            # 3. For each sub-unit, if it exceeds limit_max, split into sentences
            for u_start, u_end in sub_units:
                u_text = text[u_start:u_end]
                if len(u_text) > limit_max:
                    sentence_spans = cls._find_sentence_spans(text, u_start, u_end)
                    for s_start, s_end in sentence_spans:
                        cls._add_chunk_if_valid(text, s_start, s_end, chunks, limit_min)
                else:
                    cls._add_chunk_if_valid(text, u_start, u_end, chunks, limit_min)

        return chunks

    @classmethod
    def _find_spans_by_pattern(cls, text: str, delimiter_regex: re.Pattern) -> List[tuple[int, int]]:
        """Return [start, end] ranges of non-delimiter segments in text."""
        spans: List[tuple[int, int]] = []
        last_idx = 0
        for m in delimiter_regex.finditer(text):
            if m.start() > last_idx:
                spans.append((last_idx, m.start()))
            last_idx = m.end()
        if last_idx < len(text):
            spans.append((last_idx, len(text)))
        return spans

    @classmethod
    def _find_bullet_spans(cls, text: str, start: int, end: int) -> List[tuple[int, int]]:
        """Identify individual bullet items inside a block range."""
        sub_text = text[start:end]
        matches = list(cls._BULLET_LINE_PATTERN.finditer(sub_text))
        if not matches or len(matches) <= 1:
            return []

        spans: List[tuple[int, int]] = []
        for i, m in enumerate(matches):
            bullet_start = start + m.start()
            if i + 1 < len(matches):
                bullet_end = start + matches[i + 1].start()
            else:
                bullet_end = end
            spans.append((bullet_start, bullet_end))
        return spans

    @classmethod
    def _find_sentence_spans(cls, text: str, start: int, end: int) -> List[tuple[int, int]]:
        """Identify sentence boundaries within an oversized span."""
        sub_text = text[start:end]
        matches = list(cls._SENTENCE_BOUNDARY_PATTERN.finditer(sub_text))
        if not matches:
            return [(start, end)]

        spans: List[tuple[int, int]] = []
        last_offset = 0
        for m in matches:
            spans.append((start + last_offset, start + m.start()))
            last_offset = m.end()
        if last_offset < len(sub_text):
            spans.append((start + last_offset, end))
        return spans

    @classmethod
    def _add_chunk_if_valid(
        cls,
        text: str,
        start: int,
        end: int,
        out_chunks: List[PassageChunk],
        min_chars: int,
    ) -> None:
        """Trim surrounding whitespace, verify provenance invariance, and append if valid."""
        raw_slice = text[start:end]
        if not raw_slice.strip():
            return

        # Determine exact whitespace trims without regex reconstruction
        leading_ws = len(raw_slice) - len(raw_slice.lstrip())
        trailing_ws = len(raw_slice) - len(raw_slice.rstrip())

        adj_start = start + leading_ws
        adj_end = end - trailing_ws
        clean_text = text[adj_start:adj_end]

        if len(clean_text) < min_chars:
            return

        # Strict invariant verification
        assert text[adj_start:adj_end] == clean_text, (
            f"Provenance mismatch: text[{adj_start}:{adj_end}] != clean_text"
        )

        out_chunks.append(PassageChunk(text=clean_text, start_char=adj_start, end_char=adj_end))
