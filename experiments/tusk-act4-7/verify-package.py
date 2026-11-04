"""Verify a reviewed git-archive ZIP against its fixed Git objects; local extraction only."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import zipfile

revision, archive, new_directory = sys.argv[1:]
def git(*args, **kwargs):
    return subprocess.check_output(['git', *args], **kwargs)
revision = git('rev-parse', '--verify', revision + '^{commit}').decode().strip()
tree = {}
for entry in git('ls-tree', '-rz', '--full-tree', revision).split(b'\0'):
    if entry:
        metadata, raw_name = entry.split(b'\t', 1)
        mode, kind, blob = metadata.decode().split()
        if kind != 'blob' or mode not in ('100644', '100755'):
            raise ValueError('Unsupported archive object')
        tree[raw_name.decode()] = blob
paths = set(tree)
for name in tuple(paths):
    paths.update(str(p) for p in Path(name).parents if str(p) != '.')
attributes = git('check-attr', '--source=' + revision, '-z', '--stdin', 'export-ignore',
                 input=b''.join(p.encode() + b'\0' for p in sorted(paths))).split(b'\0')
ignored = {attributes[i].decode() for i in range(0, len(attributes) - 1, 3)
           if attributes[i + 2] == b'set'}
expected = {p for p in tree if not any(p == q or p.startswith(q + '/') for q in ignored)}
manifest = []
with zipfile.ZipFile(archive) as package:
    assert package.testzip() is None
    files = {n.removeprefix('Paisley/'): n for n in package.namelist() if not n.endswith('/')}
    assert set(files) == expected, (set(files) - expected, expected - set(files))
    for name in sorted(files):
        assert not name.startswith('/') and '..' not in Path(name).parts
        data = package.read(files[name])
        assert data == git('cat-file', 'blob', tree[name]), name
        manifest.append({'file': name, 'sha256': hashlib.sha256(data).hexdigest()})
    target = Path(new_directory)
    target.mkdir(parents=False, exist_ok=False)
    package.extractall(target)
result = {'commit': revision, 'zipSha256': hashlib.sha256(Path(archive).read_bytes()).hexdigest(),
          'files': manifest, 'bytesMatchGit': True, 'exactExportSet': True}
print(json.dumps(result, indent=2))
