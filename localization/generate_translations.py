"""
Regenerates src/lib/translations/{en,es,fr}.ts from localization/ui_strings.csv.

The CSV is the source of truth for every UI string; the .ts files are build
output and must never be hand-edited. Run after ANY change to the CSV:

    python3 localization/generate_translations.py

Rules: rows with no Key, or whose Key is in SKIP_KEYS, are skipped; rows with
an empty English cell are skipped; an empty Spanish/French cell falls back to
the English text; a duplicate Key prints a warning (last one wins, so fix it).
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "localization" / "ui_strings.csv"
OUT_DIR = ROOT / "src" / "lib" / "translations"

# Developer-facing text that intentionally stays English-only.
SKIP_KEYS = {"backend_error_text"}

HEADER = (
    "// Auto-generated from localization/ui_strings.csv — do not hand-edit.\n"
    "// Regenerate with: python3 localization/generate_translations.py\n"
)


def main() -> None:
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    tables = {"en": {}, "es": {}, "fr": {}}
    duplicates = []
    for row in rows:
        key = (row.get("Key") or "").strip()
        english = row.get("English (source)") or ""
        if not key or key in SKIP_KEYS or not english:
            continue
        if key in tables["en"]:
            duplicates.append(key)
        tables["en"][key] = english
        tables["es"][key] = row.get("Spanish") or english
        tables["fr"][key] = row.get("French") or english

    if duplicates:
        print("WARNING duplicate keys:", duplicates)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for locale, table in tables.items():
        lines = [f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}," for k, v in table.items()]
        body = f"{HEADER}export const {locale} = {{\n" + "\n".join(lines) + "\n};\n"
        (OUT_DIR / f"{locale}.ts").write_text(body, encoding="utf-8")

    print(f"Generated {len(tables['en'])} keys per locale.")


if __name__ == "__main__":
    main()
