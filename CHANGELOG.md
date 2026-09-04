# Changelog

All notable changes to this project are documented here.

## [1.2.2] - 2026-09-04

### Added

- A popup toggle for description-only Service and Project ticket titles in the active tab group, resolving issue #1.
- Independent, session-scoped title preferences for each open Edge tab group.
- Immediate title updates when group preferences change or ConnectWise tabs move between groups.

### Preserved

- Full ticket headers remain the default, and the global TabRename setting remains the master switch.

## [1.2.1] - 2026-09-04

### Fixed

- Calendar ticket launching now includes blue Service entries by default, fixing issue #2.
- Calendar selectors are built only from validated, user-selected entry types.

### Added

- Settings for Service, Project, Meeting, Activity, and Misc/Travel calendar entries.
- Service and Project migration defaults for existing installations.

## [1.2.0] - 2026-09-04

### Added

- Region Link Opener: draw a rectangle over links to open them in Edge tabs.
- Configurable region-link duplicate filtering, background opening, tab grouping, group title, color, and collapsed state.
- Independent enable switches for the calendar ticket opener and region selector.
- Bright, dark, and system-matched themes with a refreshed high-contrast interface.

### Changed

- Franks ConnectWise now combines the ConnectWise ticket workflow and general-purpose region link selection in one extension.

## [1.1.0] - 2026-09-02

### Added

- TabRename automatically names ticket tabs from the ConnectWise `.detailLabel` header.
- TabRename follows in-page ticket navigation and restores overwritten titles.
- An enabled-by-default setting controls automatic tab renaming.
- Automated validation, packaging, checksums, and GitHub Releases.

### Preserved

- Selected calendar entry collection and native Edge tab grouping.

## [1.0.0] - 2026-08-31

- Initial calendar ticket launcher.
