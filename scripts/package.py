"""Build the Chrome Web Store upload: dist/stream-shield-x-<version>.zip with manifest.json at the root."""
import json
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
RUNTIME = [
    'manifest.json', 'settings.js', 'shield.js', 'shield.css', 'background.js',
    'popup.html', 'popup.css', 'popup.js',
]

version = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))['version']
out = ROOT / 'dist' / f'stream-shield-x-{version}.zip'
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in RUNTIME:
        archive.write(ROOT / name, name)
    for icon in sorted((ROOT / 'icons').glob('*.png')):
        archive.write(icon, f'icons/{icon.name}')
print(out.relative_to(ROOT))
