#!/usr/bin/env bash
cd /e/mathgame/mathgame || exit 1
for n in chest_layout chest_claim chest result result_center egg_stage egg_interact materials scheme_a game_static egg_companion polish story egg_align; do
  echo "=== $n ==="
  timeout 600 node .shots/verify_$n.mjs 2>&1 | cut -c1-260 | grep -E "^FAIL|pass=|Error|超时" | tail -12
  echo "exit=${PIPESTATUS[0]}"
done
echo "=== ALL DONE ==="
