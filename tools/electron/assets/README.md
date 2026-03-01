# 应用图标资源

Electron 打包需要以下图标文件，请在此目录放置：

| 文件名               | 用途               | 尺寸要求                              |
| -------------------- | ------------------ | ------------------------------------- |
| `icon.png`           | Linux / 窗口图标   | 512x512 或 1024x1024 PNG              |
| `icon.ico`           | Windows 安装包图标 | 包含 16/32/48/64/128/256 多尺寸的 ICO |
| `icon.icns`          | macOS 应用图标     | macOS ICNS 格式                       |
| `dmg-background.png` | macOS DMG 安装背景 | 540x380 PNG（可选）                   |

## ⚠️ 打包前必须生成图标

当前只有 `icon.svg`
源文件，**打包前必须生成 PNG/ICO/ICNS 文件**，否则 electron-builder 会报错。

## 生成步骤

### 方法一：使用 electron-icon-builder（推荐）

1. 先用任意工具将 `icon.svg` 转换为 1024x1024 的 PNG：

   ```bash
   # 使用 sharp-cli
   npx sharp-cli -i icon.svg -o icon.png resize 1024 1024
   # 或使用 Inkscape
   inkscape icon.svg --export-type=png --export-width=1024 --export-height=1024 -o icon.png
   ```

2. 使用 electron-icon-builder 生成全平台图标：
   ```bash
   npx electron-icon-builder --input=icon.png --output=./
   ```
   这会自动生成 `icons/` 目录下的 `icon.ico`、`icon.icns`
   和各尺寸 PNG。将生成的文件移到本目录即可。

### 方法二：在线工具

1. 上传 SVG 到 https://www.electron.build/icons 或 https://icon.kitchen
2. 下载生成的 PNG/ICO/ICNS 文件放到本目录
