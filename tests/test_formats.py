import json
import unittest
from pathlib import Path

try:
    from jsonschema import Draft202012Validator, FormatChecker
except ImportError:
    Draft202012Validator = None


@unittest.skipIf(Draft202012Validator is None or "date-time" not in FormatChecker.checkers,
                 "Optional development validator jsonschema and rfc3339-validator required")
class PublicFormats(unittest.TestCase):
    def test_schema_and_public_envelope(self):
        schema = json.loads((Path(__file__).resolve().parents[1] / "schemas/diagnostics-v1.schema.json").read_text(encoding="utf-8"))
        Draft202012Validator.check_schema(schema)
        validator = Draft202012Validator(schema, format_checker=FormatChecker())
        envelope = {"schemaVersion": 1, "incidentId": "123e4567-e89b-42d3-a456-426614174000", "source": "Generic",
                    "capturedAt": "2026-10-05T00:00:00Z", "data": {"count": 1}}
        validator.validate(envelope)
        for key, value in [("schemaVersion", 99), ("incidentId", "bad-id"), ("capturedAt", "bad-date")]:
            self.assertFalse(validator.is_valid({**envelope, key: value}), key)


if __name__ == "__main__":
    unittest.main()
