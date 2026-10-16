"""Independently check the fixed input and complete patched member bytes."""
import hashlib
import io
import json
from pathlib import Path
import sys
import zipfile

# Reviewed identities, not a receipt supplied by the candidate or a call to patch.py.
SOURCE_SHA256 = "16da93387fc026ef6a5fe402e032bd4fd3794cae6487f959b9b85b701d02ac1e"
MEMBERS = {
    "scripts/CE_sideBarIcon.js": ("3c94f6df02f1e9871af3c0ef1590f048d5f46672d0d58257784a833d7c869743", ("Simple Frameworks",)),
    "scripts/CE_tattoo.js": ("a82ae8a87f36b81b21432b5a27594fecf32a8e0ea96e19e3da9c52f4ef63a2bc", ("maplebirch", "Simple Frameworks")),
    "scripts/CE_TimeTravelPlus.js": ("2ae4a19bbb958b283276f9b187caa2748ab40b3a329e01260c583a833c2fd8f5", ("Simple Frameworks",)),
}


def verify(source, patched):
    if any(p.stat().st_size > 16 * 1024 * 1024 for p in (source, patched)):
        raise ValueError("Archive size exceeds the reviewed bound")
    raw = source.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_SHA256:
        raise ValueError("Source SHA-256 differs from the reviewed release asset")
    changed = []
    with zipfile.ZipFile(io.BytesIO(raw)) as before, zipfile.ZipFile(patched) as after:
        names = before.namelist()
        if len(names) != len(set(names)) or names != after.namelist():
            raise ValueError("Archive member list differs or contains duplicates")
        if not set(MEMBERS).issubset(names):
            raise ValueError("Reviewed members missing")
        for name in names:
            old = before.read(name)  # ZipFile.read also checks each member CRC.
            expected = old
            if name in MEMBERS:
                digest, frameworks = MEMBERS[name]
                if hashlib.sha256(old).hexdigest() != digest:
                    raise ValueError("Reviewed original member SHA-256 differs: " + name)
                suffix = b"?." if name.endswith("CE_TimeTravelPlus.js") else b"."
                call = b"?." if suffix == b"?." else b""
                for framework in frameworks:
                    argument = b"('" + framework.encode() + b"')"
                    lookup = b"window.modUtils" + suffix + b"getAnyModByNameNoAlias" + call + argument
                    listed = b"window.modUtils" + suffix + b"getModListNameNoAlias" + call + b"().includes" + argument
                    if expected.count(lookup) != 1:
                        raise ValueError("Reviewed lookup count differs: " + name)
                    expected = expected.replace(lookup, b"(" + listed + b" ? " + lookup + b" : undefined)", 1)
            # Check advertised size before reading the candidate; do not inflate arbitrary payloads.
            if after.getinfo(name).file_size != len(expected) or after.read(name) != expected:
                raise ValueError("Complete expected member bytes differ: " + name)
            if name in MEMBERS:
                changed.append({"name": name, "before": old.decode("utf-8-sig"), "after": expected.decode("utf-8-sig")})
    return changed


if __name__ == "__main__":
    try:
        if len(sys.argv) != 3:
            raise ValueError("Provide original ZIP and patched ZIP")
        print(json.dumps(verify(Path(sys.argv[1]), Path(sys.argv[2]))))
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        sys.exit(str(error))
