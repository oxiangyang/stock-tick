# Changelog

All notable changes to this project will be documented in this file.

## v0.0.2

### Bug Fixes

- **Status bar hover tooltip 3-second delay not working in some editors**: The `configurationDefaults` approach (`workbench.hover.delay: 3000`) only worked in editors like Kiro that properly process extension defaults. In Qoder and similar editors, tooltips appeared immediately on mouse-over with no delay. Now the extension explicitly sets `workbench.hover.delay` via `config.update()` on activation and restores the user's original value on deactivation, ensuring the 3-second tooltip delay works consistently across all editors.

## v0.0.1

- Initial release