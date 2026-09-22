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

if __name__ == '__main__':
    keys = collect_keys()
    en_path = root / 'src' / 'utils' / 'translation' / 'en.json'
    fr_path = root / 'src' / 'utils' / 'translation' / 'fr.json'
    en = json.loads(en_path.read_text(encoding='utf-8'))
    fr = json.loads(fr_path.read_text(encoding='utf-8'))
    missing_en = sorted(k for k in keys if k not in en)
    missing_fr = sorted(k for k in keys if k not in fr)
    print(json.dumps({
        'usedKeysCount': len(keys),
        'missingEnCount': len(missing_en),
        'missingFrCount': len(missing_fr),
        'missingEn': missing_en,
        'missingFr': missing_fr,
    }, indent=2, ensure_ascii=False))
