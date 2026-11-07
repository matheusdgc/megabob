"""Package the production build for itch.io using only the Python standard library."""

import hashlib
import json
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "dist"
OUTPUT = ROOT / "release"


def verify():
    """Make sure the archive is exactly the build used by the browser smoke test."""
    files = {path.relative_to(BUILD).as_posix(): path for path in BUILD.rglob("*") if path.is_file()}
    with ZipFile(OUTPUT / "megabob-html5.zip") as bundle:
        if "index.html" not in files or set(bundle.namelist()) != files.keys():
            raise SystemExit("Archive inventory differs from dist/. Run npm run package:itch.")
        for name, path in files.items():
            if bundle.read(name) != path.read_bytes():
                raise SystemExit(f"Archive differs from dist/: {name}. Run npm run package:itch.")
    print("Archive contents match dist/.")


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

    OUTPUT.mkdir(exist_ok=True)
    archive = OUTPUT / "megabob-html5.zip"
    with ZipFile(archive, "w", compression=ZIP_DEFLATED, compresslevel=6) as bundle:
        for path in files:
            bundle.write(path, path.relative_to(BUILD).as_posix())
    with ZipFile(archive) as bundle:
        if "index.html" not in bundle.namelist() or bundle.testzip() is not None:
            raise SystemExit("Archive verification failed.")

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
    if sys.argv[1:] == ["--verify"]:
        verify()
    else:
        main()
