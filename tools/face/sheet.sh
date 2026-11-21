#!/bin/sh
# Turnaround sheet (front, 3/4, side, back) of a head, with the game's hair.
# usage: tools/face/sheet.sh VAR GLB HEAD.jpg OUTDIR  -> OUTDIR/sheet_VAR.png     (run from the repo root)
set -e
V=$1; mkdir -p $4/shots
VAR=$V GLB=$2 HEAD=$3 OUT=$4/shots SHOTS='[["front",0,0.85],["q3",0.7,0.9],["side",1.5708,1.0],["back",3.14159,1.0],["close",0,0.5],["q3b",-0.7,0.9]]' node tools/face/view.js
python3 -I -c "
import sys
from PIL import Image
d, v = sys.argv[1], sys.argv[2]; o = Image.new('RGB', (2048, 512))
for k, n in enumerate(['front', 'q3', 'side', 'back']): o.paste(Image.open(f'{d}/shots/{v}_{n}.png'), (k * 512, 0))
o.save(f'{d}/sheet_{v}.png')" $4 $V
