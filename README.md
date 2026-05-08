# Stock Tick

Real-time stock market in your VS Code status bar. Supports A-share and HK stocks.

![VS Code](https://img.shields.io/badge/VS%20Code-^1.74.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

### Status Bar Quotes
Auto-refreshes every 5 seconds during trading hours. Two display modes:

- **Normal mode**: `贵州茅台 1800.00 ↗1.23%`
- **Mini mode**: `1800.00 ↗ +1.23%` / `51.08 ↘ -3.31%` — price, arrow, and change rate only

### Stock Management
- Add stocks by code or Chinese name (A-share and HK stocks supported)
- Remove single stocks or clear all
- Custom display order — put the most important ones first

### Stock Detail Panel
Built-in Webview panel with:
- **A-share Overview**: major indices + sector performance at a glance
- **Stock Detail**: intraday chart, price, change, volume, market cap, PE/PB and more

### Price Alarm
Set "above" or "below" target price alerts. Triggers a notification and auto-deletes — no repeated interruptions.

### Limit-up/down Monitoring (A-share only)
- Show locked-in order amount directly in the status bar
- Auto-notify on limit anomalies: new limit-up/down, broken limit, large order changes

### Visibility Control
- Toggle show/hide with shortcut: `Cmd+Alt+S` (macOS) / `Ctrl+Alt+S` (Windows/Linux)
- Auto-hide outside trading hours via `autoHideByMarket` config

---

## Installation

**Option 1 — Marketplace**
Search `Stock Tick` or `stock-tick` in the VS Code Extensions panel.

**Option 2 — VSIX**
Download the latest `.vsix` from [GitHub Releases](https://github.com/yangzw1024/stock-tick/releases), then install via Extensions panel → `Install from VSIX`.

---

## Usage

1. Click the stock info in the status bar (defaults to Shanghai Composite Index)
2. Select **添加股票 (Add Stock)**, enter a code or name:
   - A-share: `sh600519`, `sz000001`, or `贵州茅台`
   - HK stock: `hk00700`, or `腾讯控股`
3. The status bar starts showing live quotes. Click it anytime to manage stocks.

---

## Configuration

Search `@ext:yangzw1024.stock-tick` in VS Code Settings to see all options.

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `stocks` | array | `["sh000001"]` | Stock code list |
| `maxDisplayCount` | number | `5` | Max stocks shown in status bar |
| `miniMode` | boolean | `false` | Mini mode: show price and change rate only |
| `showMiniName` | boolean | `false` | Show abbreviated name (first 2 chars by default) |
| `stockMiniNames` | object | `{}` | Custom name map, e.g. `{"sh601318": "平安"}` |
| `showChangeValue` | boolean | `false` | Also show change value |
| `showLockCount` | boolean | `false` | Show locked-in order amount (A-share only) |
| `enableLockTip` | boolean | `false` | Notify on limit anomalies (A-share only) |
| `autoHideByMarket` | boolean | `false` | Auto-hide status bar outside trading hours |

---

## Supported Markets

| Market | Code Format | Support |
| --- | --- | --- |
| Shanghai (A-share) | `sh` + 6 digits, e.g. `sh600519` | ✅ Full |
| Shenzhen (A-share) | `sz` + 6 digits, e.g. `sz000001` | ✅ Full |
| Beijing (A-share) | `bj` + 6 digits | ⚠️ Basic quotes, some features limited |
| Hong Kong | `hk` + 5 digits, e.g. `hk00700` | ✅ Quotes + price alarms |
| US stocks / Futures | — | ❌ Not supported |

---

## FAQ

**Stock search fails?**
Make sure your network can reach Sina and Tencent market APIs, or enter the full code directly (e.g. `sh600519`, `hk00700`).

**Status bar too crowded?**
Reduce `maxDisplayCount`, enable `miniMode` or `showMiniName` to compress width, or reorder stocks to show the most important ones first.

**Auto-hide not working?**
Trading hours are weekdays 9:15–11:30 and 13:00–15:00. After manually toggling visibility, restart VS Code to resume auto mode.

---

## Development

```bash
git clone git@github.com:yangzw1024/stock-tick.git
cd stock-tick
# Open in VS Code, press F5 to start debugging
```

```bash
# Package
npm install -g @vscode/vsce
vsce package
```

Issues and suggestions welcome via [GitHub Issues](https://github.com/yangzw1024/stock-tick/issues).

---

<div align="center">
  <p>For informational purposes only. Not financial advice.</p>
  <p>
    <a href="https://github.com/yangzw1024/stock-tick">⭐ Star</a> ·
    <a href="https://github.com/yangzw1024/stock-tick/issues">🐛 Issues</a> ·
    <a href="https://github.com/yangzw1024/stock-tick/blob/main/CHANGELOG.md">📝 Changelog</a> ·
    <a href="https://github.com/yangzw1024/stock-tick/blob/main/LICENSE">📜 MIT License</a>
  </p>
</div>
