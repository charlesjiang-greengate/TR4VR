#!/bin/sh
# Full geometry fit for one head: render, fit, re-render, refine the inner face twice.
# usage: tools/face/reshape.sh VAR PHOTO WORKDIR UVCODE.png UVCODE_FULL.png TASK [extra fit_head options]
#   -> WORKDIR/VAR.glb (+ WORKDIR/r3 = renders of the result, used by the texture transfer). Run from the repo root.
set -e
V=$1; PH=$2; W=$3; UC=$4; UF=$5; TASK=$6; shift 6
tools/face/render_set.sh $V $PWD/assets/char2/$V.glb $W/r0 $UC $UF
python3 -I tools/face/fit_head.py assets/char2/$V.glb $W/r0 $V $PH $W/${V}_1.glb task=$TASK "$@"
tools/face/render_set.sh $V $W/${V}_1.glb $W/r1 $UC $UF
python3 -I tools/face/fit_head.py $W/${V}_1.glb $W/r1 $V $PH $W/${V}_2.glb task=$TASK "$@" inner=0.72 gain=0.9
tools/face/render_set.sh $V $W/${V}_2.glb $W/r2 $UC $UF
python3 -I tools/face/fit_head.py $W/${V}_2.glb $W/r2 $V $PH $W/$V.glb task=$TASK "$@" inner=0.72 gain=0.9
tools/face/render_set.sh $V $W/$V.glb $W/r3 $UC $UF
