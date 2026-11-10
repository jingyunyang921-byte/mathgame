#!/bin/bash
# 真机回归：按顺序跑能连真机的闸门（PET_DEVICE=1），每个闸门限时，输出存 .shots/out/device_suite/。
# 用法：bash .shots/_run_device_suite.sh [备份文件]   （先 node .shots/_backup_device_save.mjs；设备串号取唯一在线设备）
cd "$(dirname "$0")/.." || exit 1
SER=$(adb devices | awk 'NR>1 && $2=="device"{print $1; exit}')
export ANDROID_SERIAL="$SER"
BK="${1:-.shots/out/device_save_backup_pre_regression.json}"
OUT=.shots/out/device_suite; mkdir -p "$OUT"; : > "$OUT/_summary.txt"
SKIP=" verify_gift_story_device verify_tts_bundled_device "
LIST=$( (grep -lE "PET_DEVICE|9222" .shots/verify_*.mjs; ls .shots/verify_lose_scene.mjs .shots/verify_review_intro.mjs) | sed 's#.shots/##; s#\.mjs$##' | sort -u)
fwd() {
  local pid; pid=$(adb -s "$SER" shell pidof com.mathgame.app | tr -d '\r')
  [ -n "$pid" ] && adb -s "$SER" forward tcp:9222 "localabstract:webview_devtools_remote_$pid" >/dev/null
}
run() {
  local name=$1; shift
  adb -s "$SER" shell input keyevent KEYCODE_WAKEUP; fwd
  PET_DEVICE=1 node --input-type=module -e "import { petBrowser } from './.shots/pet_browser.mjs'; const b = await petBrowser(); await b.nav(b.menu); await b.sleep(1200); await b.close();" >/dev/null 2>&1
  local t0=$(date +%s)
  PET_DEVICE=1 timeout "${GATE_TIMEOUT:-420}" node ".shots/$name.mjs" "$@" > "$OUT/$name.txt" 2>&1
  local rc=$?; local dt=$(( $(date +%s) - t0 ))
  local fails; fails=$(grep -c "FAIL" "$OUT/$name.txt")
  echo "$name rc=$rc fail_lines=$fails ${dt}s | $(tail -n 1 "$OUT/$name.txt" | cut -c1-120)" >> "$OUT/_summary.txt"
}
for g in $LIST; do
  case "$SKIP" in *" $g "*) continue;; esac
  run "$g"
done
GATE_TIMEOUT=900 run verify_gift_story_device "$BK"
echo DONE >> "$OUT/_summary.txt"
