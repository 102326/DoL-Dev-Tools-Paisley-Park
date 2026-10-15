"""Patch four reviewed optional lookups in the fixed Cheat Extended asset."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import zipfile

SOURCE_SHA256 = "16da93387fc026ef6a5fe402e032bd4fd3794cae6487f959b9b85b701d02ac1e"
MEMBERS = {
    "scripts/CE_sideBarIcon.js": ("3c94f6df02f1e9871af3c0ef1590f048d5f46672d0d58257784a833d7c869743", ("Simple Frameworks",)),
    "scripts/CE_tattoo.js": ("a82ae8a87f36b81b21432b5a27594fecf32a8e0ea96e19e3da9c52f4ef63a2bc", ("maplebirch", "Simple Frameworks")),
    "scripts/CE_TimeTravelPlus.js": ("2ae4a19bbb958b283276f9b187caa2748ab40b3a329e01260c583a833c2fd8f5", ("Simple Frameworks",)),
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def patch(source, output):
    if output.exists():
        raise ValueError("Output already exists; preserve the existing package")
    if source.stat().st_size > 16 * 1024 * 1024:
        raise ValueError("Input is not the reviewed release asset")
    data = source.read_bytes()
    if sha(data) != SOURCE_SHA256:
        raise ValueError("Input SHA-256 differs from the reviewed 1.20.3 release asset; re-review instead of applying")
    buffer = io.BytesIO()
    changes = []
    with zipfile.ZipFile(io.BytesIO(data)) as original, zipfile.ZipFile(buffer, "w") as result:
        if len(original.namelist()) != len(set(original.namelist())):
            raise ValueError("Duplicate archive member")
        result.comment = original.comment
        for info in original.infolist():
            content = original.read(info.filename)
            if info.filename in MEMBERS:
                expected, names = MEMBERS[info.filename]
                if sha(content) != expected:
                    raise ValueError("Reviewed member differs: " + info.filename)
                before = sha(content)
                for name in names:
                    optional = b"?." if info.filename.endswith("CE_TimeTravelPlus.js") else b"."
                    lookup = b"window.modUtils" + optional + b"getAnyModByNameNoAlias" + (b"?." if optional == b"?." else b"") + b"('" + name.encode() + b"')"
                    exists = b"window.modUtils" + optional + b"getModListNameNoAlias" + (b"?." if optional == b"?." else b"") + b"().includes('" + name.encode() + b"')"
                    if content.count(lookup) != 1:
                        raise ValueError("Reviewed lookup count differs: " + info.filename)
                    content = content.replace(lookup, b"(" + exists + b" ? " + lookup + b" : undefined)", 1)
                changes.append({"member": info.filename, "before": before, "after": sha(content), "lookups": len(names)})
            result.writestr(info, content)
    if len(changes) != len(MEMBERS):
        raise ValueError("Reviewed members missing")
    output_data = buffer.getvalue()
    with zipfile.ZipFile(io.BytesIO(output_data)) as checked:
        if checked.testzip() is not None:
            raise ValueError("Output CRC check failed")
    with output.open("xb") as target:
        target.write(output_data)
    return {"sourceSha256": SOURCE_SHA256, "outputSha256": sha(output_data), "bytes": len(output_data),
            "upstreamVersion": "1.20.3.1", "localModification": "optional strict-name probe guards; boot unchanged", "changes": changes}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(patch(args.source, args.output), ensure_ascii=False, indent=2))
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        parser.exit(1, str(error) + "\n")
