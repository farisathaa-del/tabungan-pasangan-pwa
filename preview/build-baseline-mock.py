#!/usr/bin/env python3
"""
Buat preview/baseline-mock.html = salinan baseline yang mock-nya dipaksa aktif.

Harus dibuat ulang setiap kali blok MOCK MODE di index.html berubah.
Mock di file ini sengaja TANPA syarat ?preview=1, supaya file tersebut tidak
pernah menyentuh Google Apps Script asli walau dibuka langsung tanpa query
param. Melewatkan ?preview=1 di sini berarti perbandingan before/after
pakai data berbeda dan tidak fair.
"""
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = (root / 'index.html').read_text(encoding='utf-8')
base_path = root / 'backup' / 'baseline' / 'index-downloads.html'
out_path = root / 'preview' / 'baseline-mock.html'

m = re.search(r'(<!-- =+\n\s+MOCK MODE.*?</script>)\n</body>', src, re.S)
if not m:
    sys.exit('ERROR: blok MOCK MODE tidak ditemukan di index.html')

mock = m.group(1)
guard = "if (!/[?&]preview=1\\b/.test(location.search)) return;"
if guard not in mock:
    sys.exit(f'ERROR: guard mock tidak ditemukan. Isi blok:\n{mock[:400]}')

mock_forced = mock.replace(guard, '/* mock dipaksa aktif: file perbandingan baseline */')

base = base_path.read_text(encoding='utf-8')
if '</body>' not in base:
    sys.exit('ERROR: baseline tidak punya </body>')

out_path.write_text(base.replace('</body>', mock_forced + '\n</body>'), encoding='utf-8')
print(f'{out_path.relative_to(root)} diperbarui ({out_path.stat().st_size:,} bytes) - mock selalu aktif')