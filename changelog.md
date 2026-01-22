# Changelog

All notable changes to this project are documented in this file.

The format follows the principles of
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] – 2026-01-21

### Added

- [**QM-43**](https://qualitydigital.atlassian.net/browse/QM-43) – Added support for **editing environments**, including **test suite selection**, in QA Manager.

### Changed

- [**QM-44**](https://qualitydigital.atlassian.net/browse/QM-44) – Improved the positioning of the **“Go” button** in the test suite registration flow to enhance usability.
- [**QM-42**](https://qualitydigital.atlassian.net/browse/QM-42) – Refactored internal models to improve **data structure consistency, maintainability, and reliability**.

### Fixed

- [**QM-46**](https://qualitydigital.atlassian.net/browse/QM-46) – Prevented **multiple Firestore reads and duplicated listeners** during navigation.
- [**QM-47**](https://qualitydigital.atlassian.net/browse/QM-47) – Reduced excessive **Firestore read consumption** caused by organization activity logs.
- [**QM-45**](https://qualitydigital.atlassian.net/browse/QM-45) – Fixed an issue where **Slack notifications** were not delivered correctly.

## [1.2.0] – 2026-01-17

### Added

- [**QM-29**](https://qualitydigital.atlassian.net/browse/QM-29) – Added **pagination** to the scenarios table.
- [**QM-14**](https://qualitydigital.atlassian.net/browse/QM-14) – Added a **scenario details modal**.
- [**QM-12**](https://qualitydigital.atlassian.net/browse/QM-12) – Added **anchor support** when editing test scenarios.
- [**QM-26**](https://qualitydigital.atlassian.net/browse/QM-26) – Enabled **result sharing** (public link, PDF, and Markdown) after environment completion.
- [**QM-34**](https://qualitydigital.atlassian.net/browse/QM-34) – Added **BrowserStack credentials configuration** per organization.
- [**QM-35**](https://qualitydigital.atlassian.net/browse/QM-35) – Persisted **theme and language preferences** in Firebase.

### Changed

- [**QM-25**](https://qualitydigital.atlassian.net/browse/QM-25) – Improved responsiveness for **large screens (1920px and above)**.
- [**QM-30**](https://qualitydigital.atlassian.net/browse/QM-30) – Removed the **profile photo upload** feature.
- [**QM-37**](https://qualitydigital.atlassian.net/browse/QM-37) – Removed the **organization logo upload** feature.

### Fixed

- [**QM-33**](https://qualitydigital.atlassian.net/browse/QM-33) – Fixed the save button getting stuck in a loading state and displaying i18n keys on error.
- [**QM-32**](https://qualitydigital.atlassian.net/browse/QM-32) – Fixed missing i18n labels and values in **PDF and Markdown exports**.
- [**QM-36**](https://qualitydigital.atlassian.net/browse/QM-36) – Fixed an error when adding users by email that returned an undefined response.
- [**QM-28**](https://qualitydigital.atlassian.net/browse/QM-28) – Fixed the scenario **criticality filter** displaying i18n keys.
- [**QM-27**](https://qualitydigital.atlassian.net/browse/QM-27) – Fixed missing i18n translation in the **“Moment”** field.
- [**QM-31**](https://qualitydigital.atlassian.net/browse/QM-31) – Fixed user role labels being displayed without translation.

## [1.1.0] – 2025-12-05

### Added

- [**QM-8**](https://qualitydigital.atlassian.net/browse/QM-8) – Added translations for the `environmentPage`.
- [**QM-7**](https://qualitydigital.atlassian.net/browse/QM-7) – Added translations for the `homepage`.
- [**QM-6**](https://qualitydigital.atlassian.net/browse/QM-6) – Added translations for the `adminStorePage`.
- [**QM-5**](https://qualitydigital.atlassian.net/browse/QM-5) – Added translations for the `adminPage`.
- [**QM-4**](https://qualitydigital.atlassian.net/browse/QM-4) – Added translations for the `forbiddenPage`.
- [**QM-3**](https://qualitydigital.atlassian.net/browse/QM-3) – Added translations for the **login flow**.
