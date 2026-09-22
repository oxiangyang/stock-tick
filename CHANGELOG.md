# Changelog

All notable changes to this project will be documented in this file.

## v0.0.4

### Features

- Replaced Sina quote and stock-search APIs with East Money for A-share, Beijing Stock Exchange and Hong Kong search support.
- Added Tencent quote fallback with per-symbol recovery, failure counters and a 30-second circuit breaker after three consecutive primary-source failures.
- Added on-demand order-book snapshots for displayed stocks, limit monitoring and lock-up alerts while hiding unavailable depth data.

### Improvements

- Split East Money and Tencent integrations into dedicated provider modules.
- Added a 3-second timeout for East Money quote, depth and search requests.
- Hardened Tencent response mapping and empty order-book validation.

## v0.0.3

### Features

- **Lock-up order alerts now auto-dismiss after 5 seconds**: Limit-up/down lock anomaly notifications flash briefly and disappear on their own instead of piling up in the notification center. Implemented via a progress-style notification that closes when its timer resolves. Other messages (price alarms, add/remove confirmations) keep their original behavior.

### Bug Fixes

- **`addStock` crash on empty API response**: When the quote API returned an empty array, validating the result threw a TypeError. Now guarded with optional chaining so it surfaces a friendly "fetch failed" message instead.
- **Config write during stock-list reads**: `getStocks()` used to write sanitized codes back to config on every (high-frequency) read, which could trigger a config-change → refresh loop. Reads are now pure; invalid codes are cleaned once on activation.
- **Duplicate static getter**: Removed a duplicated `INDUSTRY_CODE_LIST` definition in the stock home panel.

### Improvements

- **HTTP status checks**: Market requests now throw on non-2xx responses instead of parsing error pages as quotes.
- **Refresh concurrency guard**: Overlapping refreshes are skipped so slow networks don't stack up requests against the 5s timer.
- **Auction-time weekday check**: Morning/afternoon auction helpers now also verify it's a weekday.
- **Internal cleanup**: Extracted shared quote-timestamp formatting and code-order merge helpers to remove duplication.
- **Tooling**: Added ESLint config and a `node:test` suite covering pure utility functions, plus `lint`/`test` npm scripts.

## v0.0.2

### Bug Fixes

- **Status bar hover tooltip 3-second delay not working in some editors**: The `configurationDefaults` approach (`workbench.hover.delay: 3000`) only worked in editors like Kiro that properly process extension defaults. In Qoder and similar editors, tooltips appeared immediately on mouse-over with no delay. Now the extension explicitly sets `workbench.hover.delay` via `config.update()` on activation and restores the user's original value on deactivation, ensuring the 3-second tooltip delay works consistently across all editors.

## v0.0.1

- Initial release