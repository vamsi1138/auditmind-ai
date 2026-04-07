from pathlib import Path
from typing import Iterable

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas
from pypdf import PdfReader
import pypdfium2 as pdfium


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
TMP_DIR = ROOT / "tmp" / "pdfs"
PDF_PATH = OUTPUT_DIR / "auditmind-app-summary.pdf"
PNG_PATH = TMP_DIR / "auditmind-app-summary-page-1.png"

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN_X = 38
TOP_MARGIN = 38
BOTTOM_MARGIN = 36
GUTTER = 18
COLUMN_WIDTH = (PAGE_WIDTH - (MARGIN_X * 2) - GUTTER) / 2
LEFT_X = MARGIN_X
RIGHT_X = MARGIN_X + COLUMN_WIDTH + GUTTER
BODY_TOP_Y = PAGE_HEIGHT - 112
BODY_BOTTOM_Y = BOTTOM_MARGIN + 48

ACCENT = colors.HexColor("#0F4C5C")
ACCENT_SOFT = colors.HexColor("#EAF4F6")
TEXT = colors.HexColor("#182026")
MUTED = colors.HexColor("#4A5A66")
RULE = colors.HexColor("#D7E3E8")
HILITE = colors.HexColor("#F7FAFB")


SUMMARY = {
    "what_it_is": (
        "AuditMind AI is a smart contract security copilot focused on fast Solidity review. "
        "In this repo, a React UI and Express API combine rule-based checks with optional "
        "ElizaOS or Qwen analysis to return structured risk reports."
    ),
    "who_its_for": (
        "Primary users: Solidity developers and beginners who want a quick, "
        "beginner-friendly risk screen before a deeper audit."
    ),
    "what_it_does": [
        "Accepts pasted Solidity code for analysis from the web UI.",
        "Validates Solidity-like input and rejects empty, tiny, or oversized submissions.",
        "Runs deterministic checks for patterns such as selfdestruct, delegatecall, tx.origin, low-level calls, owner controls, pause controls, mint or burn logic, and withdraw-like functions.",
        "Builds a strict JSON audit prompt and tries an Eliza audit endpoint first, then a direct Qwen endpoint, with rule-only fallback if neither is configured.",
        "Returns a contract summary, risks, severities, suggestions, detected features, rule flags, verdict, and risk score.",
        "Lets users filter findings, switch between beginner and technical views, and export JSON or text summaries.",
        "Stores recent analyses in browser localStorage for quick revisit.",
    ],
    "how_it_works": [
        "React frontend (`src/frontend/AuditMindApp.tsx`) sends pasted code to `POST /api/analyze` via `src/frontend/utils.ts`.",
        "Express server (`src/server.ts`) routes the request through `src/backend/routes/analyze.ts`, resolves input type, and validates contract text.",
        "Analyzer service (`src/backend/services/analyzer.ts`) runs `ruleChecks.ts` to detect flags, features, and rule-based risks.",
        "Prompt builder creates a strict JSON prompt; `agentAnalyzer.ts` calls `ELIZA_AUDIT_API_URL`, then `QWEN_API_URL`, and falls back if both are missing or fail.",
        "Backend merges rule and AI findings into an `AuditReport`; frontend renders the report and saves recent runs in localStorage.",
    ],
    "how_to_run": [
        "1. Run `npm install`.",
        "2. Optional: copy `.env.example` to `.env` and set `ELIZA_AUDIT_API_URL` or `QWEN_API_URL` for AI-backed analysis. Without them, the backend still falls back to rule-based checks.",
        "3. Start the backend with `npm run backend` and the frontend with `npm run frontend`.",
        "4. Open `http://localhost:5173`. The frontend defaults to backend URL `http://localhost:3001` unless `VITE_API_BASE` is set.",
    ],
    "repo_notes": [
        "Address and GitHub fetchers are declared but not implemented in repo.",
        "Server-side auth and persistent application storage: Not found in repo.",
    ],
    "evidence": (
        "Repo evidence used: README.md, docs/agent-workflow.md, src/server.ts, "
        "src/backend/routes/analyze.ts, src/backend/services/*.ts, "
        "src/backend/utils/*.ts, src/frontend/AuditMindApp.tsx, src/frontend/utils.ts."
    ),
}


def wrap_lines(text: str, font_name: str, font_size: int, width: float) -> list[str]:
    return simpleSplit(text, font_name, font_size, width)


def draw_text_block(
    c: canvas.Canvas,
    lines: Iterable[str],
    x: float,
    y: float,
    font_name: str,
    font_size: int,
    line_height: float,
    color=TEXT,
    bullet_indent: float | None = None,
) -> float:
    c.setFillColor(color)
    c.setFont(font_name, font_size)
    current_y = y
    for line in lines:
        if bullet_indent is None:
            c.drawString(x, current_y, line)
        else:
            if line.startswith("- "):
                c.drawString(x, current_y, line[:2])
                c.drawString(x + bullet_indent, current_y, line[2:])
            else:
                c.drawString(x + bullet_indent, current_y, line)
        current_y -= line_height
    return current_y


def bullet_lines(items: list[str], width: float, font_name: str = "Helvetica", font_size: int = 8) -> list[str]:
    result: list[str] = []
    wrap_width = width - 14
    for item in items:
        wrapped = wrap_lines(item, font_name, font_size, wrap_width)
        if not wrapped:
            continue
        result.append(f"- {wrapped[0]}")
        result.extend(wrapped[1:])
    return result


def section(
    c: canvas.Canvas,
    x: float,
    y: float,
    width: float,
    title: str,
    body_lines: list[str],
    line_height: float = 11,
    body_font_size: int = 8,
    fill_box: bool = False,
) -> float:
    top_y = y
    if fill_box:
        box_height = 26 + (len(body_lines) * line_height)
        c.setFillColor(HILITE)
        c.roundRect(x - 8, y - box_height + 12, width + 16, box_height + 8, 8, fill=1, stroke=0)

    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x, y, title.upper())

    c.setStrokeColor(RULE)
    c.setLineWidth(0.8)
    c.line(x, y - 4, x + width, y - 4)

    next_y = y - 18
    if body_lines:
        bullet_indent = 10 if any(line.startswith("- ") for line in body_lines) else None
        next_y = draw_text_block(
            c,
            body_lines,
            x,
            next_y,
            "Helvetica",
            body_font_size,
            line_height,
            bullet_indent=bullet_indent,
        )

    return next_y - 12


def draw_header(c: canvas.Canvas) -> None:
    c.setFillColor(ACCENT_SOFT)
    c.roundRect(MARGIN_X, PAGE_HEIGHT - 86, PAGE_WIDTH - (MARGIN_X * 2), 54, 12, fill=1, stroke=0)

    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(MARGIN_X + 16, PAGE_HEIGHT - 56, "AuditMind AI")

    c.setFillColor(TEXT)
    c.setFont("Helvetica", 10)
    c.drawString(MARGIN_X + 16, PAGE_HEIGHT - 72, "One-page repo summary")

    badge_x = PAGE_WIDTH - MARGIN_X - 150
    c.setFillColor(colors.white)
    c.roundRect(badge_x, PAGE_HEIGHT - 72, 134, 22, 10, fill=1, stroke=0)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(badge_x + 67, PAGE_HEIGHT - 58, "Repo-based summary")


def draw_footer(c: canvas.Canvas) -> None:
    c.setStrokeColor(RULE)
    c.setLineWidth(0.8)
    c.line(MARGIN_X, BOTTOM_MARGIN + 18, PAGE_WIDTH - MARGIN_X, BOTTOM_MARGIN + 18)

    evidence_lines = wrap_lines(SUMMARY["evidence"], "Helvetica", 7, PAGE_WIDTH - (MARGIN_X * 2))
    draw_text_block(
        c,
        evidence_lines,
        MARGIN_X,
        BOTTOM_MARGIN + 9,
        "Helvetica",
        7,
        8.5,
        color=MUTED,
    )


def build_pdf() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(PDF_PATH), pagesize=A4)
    c.setTitle("AuditMind AI - App Summary")
    c.setAuthor("OpenAI Codex")
    c.setSubject("One-page summary based on repo evidence")

    draw_header(c)

    left_y = BODY_TOP_Y
    left_y = section(
        c,
        LEFT_X,
        left_y,
        COLUMN_WIDTH,
        "What it is",
        wrap_lines(SUMMARY["what_it_is"], "Helvetica", 8.5, COLUMN_WIDTH),
        line_height=10.5,
        body_font_size=8.5,
    )
    left_y = section(
        c,
        LEFT_X,
        left_y,
        COLUMN_WIDTH,
        "Who it's for",
        wrap_lines(SUMMARY["who_its_for"], "Helvetica", 8.5, COLUMN_WIDTH),
        line_height=10.5,
        body_font_size=8.5,
    )
    left_y = section(
        c,
        LEFT_X,
        left_y,
        COLUMN_WIDTH,
        "What it does",
        bullet_lines(SUMMARY["what_it_does"], COLUMN_WIDTH, font_size=8),
        line_height=10,
        body_font_size=8,
        fill_box=True,
    )

    right_y = BODY_TOP_Y
    right_y = section(
        c,
        RIGHT_X,
        right_y,
        COLUMN_WIDTH,
        "How it works",
        bullet_lines(SUMMARY["how_it_works"], COLUMN_WIDTH, font_size=8),
        line_height=10,
        body_font_size=8,
        fill_box=True,
    )
    right_y = section(
        c,
        RIGHT_X,
        right_y,
        COLUMN_WIDTH,
        "How to run",
        wrap_numbered_steps(SUMMARY["how_to_run"], COLUMN_WIDTH),
        line_height=10,
        body_font_size=8,
    )
    right_y = section(
        c,
        RIGHT_X,
        right_y,
        COLUMN_WIDTH,
        "Repo notes",
        bullet_lines(SUMMARY["repo_notes"], COLUMN_WIDTH, font_size=8),
        line_height=10,
        body_font_size=8,
    )

    if min(left_y, right_y) < BODY_BOTTOM_Y:
        raise RuntimeError("Content overflowed the single page layout.")

    draw_footer(c)
    c.showPage()
    c.save()


def wrap_numbered_steps(items: list[str], width: float) -> list[str]:
    result: list[str] = []
    for item in items:
        wrapped = wrap_lines(item, "Helvetica", 8, width)
        if not wrapped:
            continue
        result.append(wrapped[0])
        result.extend("   " + line for line in wrapped[1:])
    return result


def validate_pdf() -> None:
    reader = PdfReader(str(PDF_PATH))
    if len(reader.pages) != 1:
        raise RuntimeError(f"Expected 1 page, found {len(reader.pages)}.")


def render_preview() -> None:
    pdf = pdfium.PdfDocument(str(PDF_PATH))
    page = pdf[0]
    bitmap = page.render(scale=2.2)
    bitmap.to_pil().save(PNG_PATH)


if __name__ == "__main__":
    build_pdf()
    validate_pdf()
    render_preview()
    print(PDF_PATH)
    print(PNG_PATH)
