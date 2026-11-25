"""Return byte identities for an explicitly selected local ZIP without extraction."""
import base64
import hashlib
import io
import json
from pathlib import PurePosixPath
import re
import stat
import sys
import zipfile


def manifest(data, selected):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        members = []
        selected_bytes = None
        seen = set()
        total = 0
        if len(archive.infolist()) > 4096:
            raise ValueError('member limit')
        for entry in archive.infolist():
            name = entry.orig_filename
            parts = name.rstrip('/').split('/')
            identity = name.rstrip('/').casefold()
            mode = stat.S_IFMT(entry.external_attr >> 16)
            if (name != entry.filename or PurePosixPath(name).is_absolute()
                    or re.search(r'[\\:\x00-\x1f\x7f]', name)
                    or any(p in ('', '.', '..') for p in parts) or identity in seen
                    or mode == stat.S_IFLNK or entry.flag_bits & 1):
                raise ValueError('unsupported member')
            seen.add(identity)
            if entry.is_dir():
                continue
            total += entry.file_size
            if entry.file_size > 64 * 1024**2 or total > 256 * 1024**2:
                raise ValueError('uncompressed limit')
            if name == selected and entry.file_size > 1024**2:
                raise ValueError('representative script limit')
            digest = hashlib.sha256()
            with archive.open(entry) as stream:
                while True:
                    chunk = stream.read(256 * 1024)
                    if not chunk:
                        break
                    digest.update(chunk)
            members.append({'name': name, 'size': entry.file_size, 'sha256': digest.hexdigest()})
            if name == selected:
                selected_bytes = base64.b64encode(archive.read(entry)).decode('ascii')
        if selected_bytes is None:
            raise ValueError('missing script')
        return {'members': sorted(members, key=lambda m: m['name']), 'selected': selected_bytes}


if __name__ == '__main__':
    try:
        limit = 64 * 1024**2
        data = sys.stdin.buffer.read(limit + 1)
        if len(data) > limit:
            raise ValueError('zip limit')
        print(json.dumps(manifest(data, sys.argv[1]), ensure_ascii=True))
    except Exception:
        sys.exit(1)
