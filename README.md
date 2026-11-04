# 奇幻数学岛

纯 HTML/CSS/JS 的儿童数学闯关游戏，用 Capacitor 打成 Android APK。没有打包器，源文件就是线上文件。

## 文件与「孪生」约定

页面源文件在项目根目录，`www/` 是 Capacitor 实际打进 APK 的副本，两边必须同步：

| 源文件 | www 副本 | 同步脚本 |
| --- | --- | --- |
| `menu.html` | `www/index.html` | `node .shots/sync_menu_twin.mjs`（期望 diff=1，仅跳转行） |
| `index.html` | `www/game.html` | `node .shots/sync_twin.mjs`（期望 6 处跳转 diff） |
| `pet-care.js` `pet-story.js` `pet-story.css` | `www/` 同名文件 | 上面两个脚本顺带复制，需 `cmp` 一致 |

只改根目录源文件，改完跑同步脚本；不要直接改 `www/`。

## 测试

`.shots/verify_*.mjs` 是基于 Chrome DevTools 协议的验证脚本：静态服务器 `:8000`、Chrome 调试口 `:9333`，从项目根目录用 `node .shots/verify_xxx.mjs` 单个运行；`.shots/_run_suite.sh` 串行跑全套（约 50 分钟）。脚本之间不要并行。截图与日志输出在 `.shots/out/`（已 gitignore）。

## 构建 APK

需要 JDK 21。一键构建（不会安装到手机）：

```
bash build-apk.sh
```

产物在 `android/app/build/outputs/apk/debug/app-debug.apk`。安装到真机：

```
adb -s <设备序列号> install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## 兼容性

目标 WebView 是 Chrome 91，样式里不要用 `:has(`、`@layer`、`color-mix(`、`oklch(`、`paint-order`、`dvh/svh/lvh`（注释里也不行，静态扫描会报）。无限动画只动 `transform` / `opacity`。
