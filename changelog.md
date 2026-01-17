# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Per-user preference persistence (theme/language) applied early in the render tree and exposed on the profile screen.
- Organization-level BrowserStack credentials with admin-managed toggles in both organization creation and management flows.
- Public environment share language persistence and `?lang=` support to keep public views in the sharer’s language.
- Incremental pagination controls for large scenario tables and store management lists.
- Environment export localization (PDF/Markdown) with translated labels and fallbacks.
- Scenario export PDF layout with a structured table similar to the environment PDF.

### Changed

- Header greeting now reads “Olá {role} {name}” / “Hello {role} {name}” with role-aware labels.
- Public environment view hides redundant headers in scenario and bug sections.
- BrowserStack credentials display moved out of user profile and into organization administration.

### Fixed

- Organization save loading label now uses the global “saving” translation to avoid extra text overlap.
- Scenario edit form now normalizes automation values so “Não automatizado” pre-fills correctly.
