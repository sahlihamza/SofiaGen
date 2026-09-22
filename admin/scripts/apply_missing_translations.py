import json
from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
src_dir = root / 'src'

def collect_keys():
    keys = set()
    pattern = re.compile(r"t\(\s*['\"]([A-Za-z0-9_.-]+?)['\"]\s*\)")
    for path in src_dir.rglob('*'):
        if path.suffix.lower() not in {'.js', '.jsx', '.ts', '.tsx'}:
            continue
        text = path.read_text(encoding='utf-8', errors='ignore')
        for match in pattern.finditer(text):
            keys.add(match.group(1))
    return keys


def humanize(key: str) -> str:
    if '.' in key:
        key = key.split('.')[-1]
    key = re.sub(r'([a-z0-9])([A-Z])', r'\1 \2', key)
    key = key.replace('_', ' ').replace('-', ' ')
    return ' '.join(word.capitalize() for word in key.split())


def patch_translations():
    keys = collect_keys()
    en_path = root / 'src' / 'utils' / 'translation' / 'en.json'
    fr_path = root / 'src' / 'utils' / 'translation' / 'fr.json'
    en = json.loads(en_path.read_text(encoding='utf-8'))
    fr = json.loads(fr_path.read_text(encoding='utf-8'))
    missing = sorted(k for k in keys if k not in en or k not in fr)
    for key in sorted(keys):
        if key not in en:
            en[key] = humanize(key)
        if key not in fr:
            fr[key] = humanize(key)
    en_path.write_text(json.dumps(en, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    fr_path.write_text(json.dumps(fr, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'Patched {len(missing)} missing translation keys; en.json now has {len(en)} keys, fr.json now has {len(fr)} keys.')

if __name__ == '__main__':
    patch_translations()
