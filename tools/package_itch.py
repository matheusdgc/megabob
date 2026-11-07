"""Package the production build for itch.io using only the Python standard library."""

import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "dist"
OUTPUT = ROOT / "release"


def _patch_index(html: str) -> str:
    """Remove type="module" and crossorigin from <script> tags.

    itch.io embeds the game inside a sandboxed <iframe> that lacks the
    Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy headers
    required for ES modules with crossorigin. Stripping those two
    attributes makes the browser load the bundle as a classic script,
    which works inside the sandbox.
    """
    import re
    patched = re.sub(r'\s+type="module"', "", html)
    patched = re.sub(r'\s+crossorigin(?:="[^"]*")?', "", patched)
    if patched == html:
        print("WARNING: index.html had no type=\"module\" attribute — check the build.")
    return patched


def main():
    if not (BUILD / "index.html").is_file():
        raise SystemExit("Missing dist/index.html. Run npm run build first.")
    files = sorted(path for path in BUILD.rglob("*") if path.is_file())
    total = sum(path.stat().st_size for path in files)
    if len(files) > 1000 or total > 500_000_000:
        raise SystemExit("Build exceeds itch.io HTML5 file count or extracted size limits.")
    for path in files:
        name = path.relative_to(BUILD).as_posix()
        if len(name) > 240 or path.stat().st_size > 200_000_000:
            raise SystemExit(f"File exceeds itch.io HTML5 limits: {name}")

    # Read index.html once so we can patch it without modifying dist/
    index_html = _patch_index((BUILD / "index.html").read_text(encoding="utf-8"))

    OUTPUT.mkdir(exist_ok=True)
    archive = OUTPUT / "megabob-html5.zip"
    with ZipFile(archive, "w", compression=ZIP_DEFLATED, compresslevel=6) as bundle:
        for path in files:
            arcname = path.relative_to(BUILD).as_posix()
            if arcname == "index.html":
                bundle.writestr(arcname, index_html)
            else:
                bundle.write(path, arcname)
    with ZipFile(archive) as bundle:
        if "index.html" not in bundle.namelist() or bundle.testzip() is not None:
            raise SystemExit("Archive verification failed.")
        # Verify the patch landed in the zip
        zipped_html = bundle.read("index.html").decode("utf-8")
        if 'type="module"' in zipped_html or "crossorigin" in zipped_html:
            raise SystemExit('Patch failed: index.html in zip still has type="module" or crossorigin.')
    print("✔ index.html patched: type=\"module\" and crossorigin removed.")

    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (OUTPUT / "megabob-html5.zip.sha256").write_text(
        f"{digest}  {archive.name}\n", encoding="utf-8"
    )
    report = {
        "archive": archive.name,
        "files": len(files),
        "extractedBytes": total,
        "archiveBytes": archive.stat().st_size,
        "sha256": digest,
        "embed": {"width": 960, "height": 540},
    }
    (OUTPUT / "itch-build.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
