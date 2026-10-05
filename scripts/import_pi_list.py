#!/usr/bin/env python3
"""Turn PI_LIST.numbers into data/courses.json.

The spreadsheet is the only source of truth. This script does not add courses.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from numbers_parser import Document

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "PI_LIST.numbers"
DEFAULT_OUTPUT = ROOT / "data" / "courses.json"

BUCKETS = ("Public Interest", "Social Governance", "Digital Technology")
GEN_ED_CODES = ("SB", "DG", "DU", "AT", "HS", "R2")

COLUMNS = (
    "Tier",
    "Course",
    "Title",
    "Credits",
    "Description",
    "Prerequisites",
    "Enrollment",
    "Requirements",
    "Requirements detail",
)

MAJOR_PATTERNS: tuple[tuple[str, str], ...] = (
    (
        r"Bachelor of Arts in Communication|BA-Comm\b|Communication majors",
        "Communication",
    ),
    (
        r"Bachelor of Arts in Journalism|BA-Journ\b|Journalism majors",
        "Journalism",
    ),
    (
        r"Bachelor of Arts in Legal Studies|BA-Legal\b|Legal Studies majors",
        "Legal Studies",
    ),
    (r"\bArt majors\b", "Art"),
)

UNVERIFIED_SENTENCE = re.compile(
    r"(unpublish|not published|were not available|was not available|"
    r"\bno\b[^.]*\bwas published\b|\bspire\b|\bconfirm\b)",
    re.IGNORECASE,
)


def cell_text(value: object) -> str:
    if value is None:
        return ""
    return str(value).replace("\r\n", "\n").strip()


def course_id(number: str) -> str:
    primary = number.split("/")[0].strip().lower()
    primary = primary.replace("&", "")
    slug = re.sub(r"[^a-z0-9]+", "-", primary).strip("-")
    return slug


def parse_credits(value: object) -> int | float | None:
    if value is None or cell_text(value) == "":
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        number = float(value)
    else:
        try:
            number = float(cell_text(value))
        except ValueError:
            return None
    if number.is_integer():
        return int(number)
    return number


def parse_buckets(tier: str) -> list[str]:
    buckets: list[str] = []
    for part in tier.split(";"):
        name = part.strip()
        if not name:
            continue
        if name not in BUCKETS:
            raise SystemExit(f"Unknown tier {name!r}. Expected one of {BUCKETS}.")
        if name not in buckets:
            buckets.append(name)
    if not buckets:
        raise SystemExit(f"Course tier is empty: {tier!r}")
    return buckets


def parse_gen_ed(requirements: str) -> list[str]:
    found: list[str] = []
    for match in re.finditer(r"\b(SB|DG|DU|AT|HS|R2)\b", requirements):
        code = match.group(1)
        if code not in found:
            found.append(code)
    return found


def extract_major(text: str) -> str | None:
    for pattern, name in MAJOR_PATTERNS:
        if re.search(pattern, text):
            return name
    return None


def sentence_is_negative_ie(sentence: str) -> bool:
    mentions_ie = re.search(r"Integrative Experience|\bIE\b", sentence) is not None
    negative = re.search(r"\b(no|not|none)\b", sentence, re.IGNORECASE) is not None
    return mentions_ie and negative


def has_positive_ie(text: str) -> bool:
    chunks = re.split(r"(?<=[.])\s+", text.strip()) if text.strip() else []
    for chunk in chunks:
        if sentence_is_negative_ie(chunk):
            continue
        if re.search(r"Integrative Experience|\bIE\b", chunk):
            return True
    return False


def requirement_labels(number: str, requirements: str, detail: str) -> list[str]:
    labels: list[str] = []
    if re.search(r"\bJYW\b|junior year writing", requirements, re.IGNORECASE):
        labels.append("JYW")
    if re.search(r"elective", requirements, re.IGNORECASE):
        labels.append("CS elective")

    primary = number.split("/")[0].strip()
    if re.match(r"UWW\s+310\b", primary):
        labels.append("IE")
        return labels

    if has_positive_ie(requirements) or has_positive_ie(detail):
        major = extract_major(detail) or extract_major(requirements)
        if major:
            labels.append(f"IE ({major} majors)")
        else:
            labels.append("IE")
    return labels


def unverified_reason(description: str, detail: str) -> str | None:
    excerpts: list[str] = []
    for source in (description, detail):
        sentences = re.split(r"(?<=[.])\s+", source.strip()) if source.strip() else []
        for sentence in sentences:
            if UNVERIFIED_SENTENCE.search(sentence):
                cleaned = re.sub(r"\s+", " ", sentence).strip()
                if cleaned and cleaned not in excerpts:
                    excerpts.append(cleaned)
    if not excerpts:
        return None
    return " ".join(excerpts)


def load_rows(path: Path) -> list[dict[str, object]]:
    document = Document(str(path))
    table = document.sheets[0].tables[0]
    headers = [cell_text(table.cell(0, col).value) for col in range(table.num_cols)]
    if headers[: len(COLUMNS)] != list(COLUMNS):
        raise SystemExit(
            "Unexpected columns.\n"
            f"Found: {headers}\n"
            f"Expected to start with: {list(COLUMNS)}"
        )

    rows: list[dict[str, object]] = []
    for row_index in range(1, table.num_rows):
        values = [table.cell(row_index, col).value for col in range(len(COLUMNS))]
        if all(cell_text(value) == "" for value in values):
            continue
        rows.append({column: values[index] for index, column in enumerate(COLUMNS)})
    return rows


def build_course(row: dict[str, object]) -> dict[str, object]:
    number = cell_text(row["Course"]).replace("**", "")
    number = re.sub(r"\s+", " ", number).strip()
    title = re.sub(r"\s+", " ", cell_text(row["Title"])).strip()
    description = cell_text(row["Description"])
    detail = cell_text(row["Requirements detail"])
    requirements_text = cell_text(row["Requirements"])
    reason = unverified_reason(description, detail)

    course: dict[str, object] = {
        "id": course_id(number),
        "number": number,
        "title": title,
        "credits": parse_credits(row["Credits"]),
        "description": description,
        "prerequisites": cell_text(row["Prerequisites"]),
        "enrollment": cell_text(row["Enrollment"]),
        "buckets": parse_buckets(cell_text(row["Tier"])),
        "genEd": parse_gen_ed(requirements_text),
        "requirements": requirement_labels(number, requirements_text, detail),
        "verified": reason is None,
    }
    if reason is not None:
        course["unverifiedReason"] = reason
    return course


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUTPUT
    if not source.is_file():
        raise SystemExit(f"Spreadsheet not found: {source}")

    courses = [build_course(row) for row in load_rows(source)]
    ids = [str(course["id"]) for course in courses]
    duplicates = sorted({course_id for course_id in ids if ids.count(course_id) > 1})
    if duplicates:
        raise SystemExit(f"Duplicate course ids: {duplicates}")

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(courses, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(courses)} courses to {output}")


if __name__ == "__main__":
    main()
