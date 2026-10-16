"""Synthetic archive checks; not a rerun against the real CE release asset."""
import hashlib
import importlib.util
import os
from pathlib import Path
import subprocess
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parents[1]
RECIPE = ROOT / "examples/cheat-extended-optional-probe"
SPEC = importlib.util.spec_from_file_location("ce_verify", RECIPE / "verify.py")
verifier = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(verifier)
sha = lambda value: hashlib.sha256(value).hexdigest()


class ArchiveVerificationTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(prefix="ce-byte-check-")
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.source, self.output = self.root / "source.zip", self.root / "patched.zip"
        self.old = {"boot.json": b"{}", "LICENSE.txt": b"synthetic license", "other.js": b"// unchanged"}
        self.expected = dict(self.old)
        self.members = {}
        for name, (_, frameworks) in verifier.MEMBERS.items():
            optional = "?." if name.endswith("CE_TimeTravelPlus.js") else "."
            call = "?." if optional == "?." else ""
            before, after = "const marker=0;\n", "const marker=0;\n"
            for index, framework in enumerate(frameworks):
                query = "window.modUtils" + optional + "getAnyModByNameNoAlias" + call + "('" + framework + "')"
                exists = "window.modUtils" + optional + "getModListNameNoAlias" + call + "().includes('" + framework + "')"
                before += "const item" + str(index) + "=" + query + ";\n"
                after += "const item" + str(index) + "=(" + exists + " ? " + query + " : undefined);\n"
            self.old[name], self.expected[name] = before.encode(), after.encode()
            self.members[name] = (sha(before.encode()), frameworks)
        self.write(self.source, self.old)
        self.write(self.output, self.expected)

    def write(self, dest, members):
        with zipfile.ZipFile(dest, "w") as archive:
            for name, data in members.items():
                archive.writestr(name, data)

    def reviewed_fixture(self):
        # Only this unit test substitutes identities. The real CLI has no bypass/profile flag.
        return patch.multiple(verifier, SOURCE_SHA256=sha(self.source.read_bytes()), MEMBERS=self.members)

    def test_complete_expected_bytes_and_other_members_are_accepted(self):
        with self.reviewed_fixture():
            files = verifier.verify(self.source, self.output)
        self.assertEqual({f["name"] for f in files}, set(self.members))
        self.assertTrue(all(f["after"].encode() == self.expected[f["name"]] for f in files))

    def test_extra_or_same_size_logic_in_an_allowed_script_is_rejected(self):
        member = next(iter(self.members))
        for body in [self.expected[member] + b"globalThis.extra=true;", self.expected[member].replace(b"marker=0", b"marker=1")]:
            with self.subTest(body=body):
                self.write(self.output, {**self.expected, member: body})
                with self.reviewed_fixture(), self.assertRaisesRegex(ValueError, "Complete expected member bytes"):
                    verifier.verify(self.source, self.output)

    def test_original_member_identity_is_checked_independently(self):
        member = next(iter(self.members))
        self.write(self.source, {**self.old, member: self.old[member] + b"// altered"})
        with self.reviewed_fixture(), self.assertRaisesRegex(ValueError, "original member SHA-256"):
            verifier.verify(self.source, self.output)

    def test_unrelated_member_and_extra_output_member_are_rejected(self):
        self.write(self.output, {**self.expected, "other.js": b"// different"})
        with self.reviewed_fixture(), self.assertRaisesRegex(ValueError, "Complete expected member bytes"):
            verifier.verify(self.source, self.output)
        self.write(self.output, {**self.expected, "unexpected.js": b"// extra"})
        with self.reviewed_fixture(), self.assertRaisesRegex(ValueError, "member list"):
            verifier.verify(self.source, self.output)

    def test_unreviewed_source_is_rejected_before_typescript_is_loaded(self):
        with self.assertRaisesRegex(ValueError, "Source SHA-256"):
            verifier.verify(self.source, self.output)
        result = subprocess.run(["node", str(RECIPE / "verify.cjs"), str(self.source), str(self.output), str(self.root / "absent-typescript")], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Source SHA-256", result.stderr)
        self.assertNotIn("Cannot find module", result.stderr)
        # A GUI/login shell may reorder PATH. The explicit toolkit override must win.
        env = {**os.environ, "DOL_PYTHON": sys.executable, "PATH": str(self.root)}
        selected = subprocess.run([shutil.which("node"), str(RECIPE / "verify.cjs"), str(self.source), str(self.output), str(self.root / "absent-typescript")], env=env, capture_output=True, text=True)
        self.assertNotEqual(selected.returncode, 0)
        self.assertIn("Source SHA-256", selected.stderr)
        invalid = subprocess.run([shutil.which("node"), str(RECIPE / "verify.cjs"), str(self.source), str(self.output), str(self.root / "absent-typescript")], env={**os.environ, "DOL_PYTHON": str(self.root / "absent-python")}, capture_output=True, text=True)
        self.assertNotEqual(invalid.returncode, 0)
        self.assertIn("ENOENT", invalid.stderr)  # Do not silently fall back after a stale override.


if __name__ == "__main__":
    unittest.main()
