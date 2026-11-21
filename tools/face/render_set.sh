#!/bin/sh
# Render what fit_head.py / the texture transfer need for one head: a front beauty shot (stock texture, no hair) and two
# UV passes (eyeballs hidden / shown), all with the same camera.
# usage: tools/face/render_set.sh VAR GLB OUTDIR UVCODE.png UVCODE_FULL.png     (run from the repo root, one at a time)
set -e
V=$1; G=$2; O=$3; mkdir -p $O/b $O/uv $O/uvf
SH='[["front",0,0.85]]'
VAR=$V GLB=$G OUT=$O/b SIZE=1024 NOHAIR=1 SHOTS="$SH" node tools/face/view.js
VAR=$V GLB=$G OUT=$O/uv SIZE=1024 UVPASS=$4 SHOTS="$SH" node tools/face/view.js
VAR=$V GLB=$G OUT=$O/uvf SIZE=1024 UVPASS=$5 SHOTS="$SH" node tools/face/view.js
