#!/usr/bin/env bash
# 一键构建 debug APK：孪生同步校验 -> cap copy -> gradle assembleDebug。不安装到手机。
set -euo pipefail
cd "$(dirname "$0")"

JDK="${JDK21_HOME:-E:/tools/jdk-21.0.12.1+1}"

node .shots/sync_menu_twin.mjs | tail -1
node .shots/sync_twin.mjs | tail -1
for f in pet-care.js pet-story.js pet-story.css mg-log.js; do
  cmp "$f" "www/$f" || { echo "孪生不一致: $f"; exit 1; }
done

npx cap copy android
(cd android && ./gradlew.bat assembleDebug -Dorg.gradle.java.home="$JDK")

ls -l android/app/build/outputs/apk/debug/app-debug.apk
