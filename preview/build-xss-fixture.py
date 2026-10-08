#!/usr/bin/env python3
"""
Buat fixture uji XSS: dua salinan app dengan love-note BERBAHAYA.
  preview/xss-lama.html  = baseline  (sebelum escapeHtml)
  preview/xss-baru.html  = index.html (sesudah escapeHtml)

Keduanya memakai data yang sama persis, jadi perbedaannya murni efek
perbaikan. Payload mengikuti batas nyata di UI: maxlength="40" pada
kolom love-note.
"""
import re
import subprocess
import sys
from pathlib import Path

PAYLOAD = '<img src=x onerror="window.__XSS=1">'          # 34 karakter
EVIL_ID = "x1'),window.__XSSID=1);//"                        # patah onclick

root = Path(__file__).resolve().parent.parent
src = (root / 'index.html').read_text(encoding='utf-8')
m = re.search(r'(<!-- =+\n\s+MOCK MODE.*?</script>)\n</body>', src, re.S)
if not m:
    sys.exit('ERROR: blok MOCK MODE tidak ditemukan')
mock = m.group(1)

# 1. paksa mock aktif
guard = "if (!/[?&]preview=1\\b/.test(location.search)) return;"
if guard not in mock:
    sys.exit('ERROR: guard mock tidak ditemukan')
mock = mock.replace(guard, '/* mock aktif: fixture uji XSS */')

# 2. ganti catatan bersih dengan payload + id yang merusak atribut
notes_line = re.search(r'^.*var notes = \[[^\n]*\][;,]\s*$', mock, re.M)
if not notes_line:
    sys.exit('ERROR: baris "var notes = ..." tidak ditemukan di mock')
mock = mock.replace(
    notes_line.group(0),
    "    var notes = [" + ", ".join([f"'{PAYLOAD}'"] * 6) + "];",
)

id_line = "id: 'mock-' + back + '-' + w + u,"
if id_line not in mock:
    sys.exit('ERROR: baris id mock tidak ditemukan')
mock = mock.replace(
    id_line,
    "id: (w === 1 && ui === 0 ? window.__EVIL_ID : 'mock-') + back + '-' + w + u,",
)

evil = f"\n<script>window.__EVIL_ID = {EVIL_ID!r};</script>\n"

def check_syntax(html: str, name: str) -> None:
    """Pastikan setiap <script> inline valid. Tanpa ini, blok yang gagal parse
    akan membuat app jatuh ke backend GAS asli tanpa satu pun tanda."""
    blocks = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S)
    bad = 0
    for i, code in enumerate(blocks):
        tmp = Path(f'/tmp/opencode/xss-check-{i}.js')
        tmp.parent.mkdir(parents=True, exist_ok=True)
        tmp.write_text(code, encoding='utf-8')
        r = subprocess.run(['node', '--check', str(tmp)], capture_output=True, text=True)
        if r.returncode != 0:
            bad += 1
            print(f'  SYNTAX ERROR {name} blok {i}:\n{r.stderr[:500]}')
    if bad:
        sys.exit(f'ERROR: {bad} blok script tidak valid di {name} - fixture tidak dipakai')


def build(html_path: Path, out_path: Path):
    text = html_path.read_text(encoding='utf-8')
    if '</body>' not in text:
        sys.exit(f'ERROR: {html_path.name} tidak punya </body>')
    out = text.replace('</body>', mock + evil + '</body>')
    check_syntax(out, out_path.name)
    out_path.write_text(out, encoding='utf-8')
    print(f'  {out_path.relative_to(root)}  ({out_path.stat().st_size:,} bytes, sintaks OK)')

print('fixture uji XSS dibuat:')
build(root / 'backup' / 'baseline' / 'index-downloads.html', root / 'preview' / 'xss-lama.html')
build(root / 'index.html', root / 'preview' / 'xss-baru.html')
print(f'  payload note : {PAYLOAD}  ({len(PAYLOAD)} karakter, maxlength UI 40)')
print(f'  payload id   : {EVIL_ID}')