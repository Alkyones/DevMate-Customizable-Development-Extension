# DevMate — Chrome Extension for Developer Diagnostics

DevMate is a lightweight Chrome extension designed to speed up common developer workflows by exposing browser storage, captured network requests, and credential utilities in a compact popup UI.

This repository contains the extension source used for local development and packaging.

## Key features

- Quick inspection and editing of the active tab's Local Storage and IndexedDB entries.
- Capture, inspect, modify, and replay Fetch requests recorded in the page context.
- Manage a set of useful links (persisted using IndexedDB) for fast navigation.
- Save and reuse credentials (username, password, email generation helper) for testing.
- Clean, compact popup UI intended for rapid developer access.

## Installation (Developer / Local)

1. Open Chrome and navigate to chrome://extensions.
2. Enable "Developer mode" (top-right toggle).
3. Click "Load unpacked" and select the repository root folder (this project). The extension will load into Chrome for testing.
4. Open the extension popup on any tab to use the tools.

Notes:
- The extension is developed for Chromium-based browsers (Chrome, Edge, Brave). Functionality may vary in other browsers.
- To apply CSS or UI changes, reload the extension from the chrome://extensions page and re-open the popup.

## Usage

- Show Local Storage: Inspect and edit key/value pairs for the active tab.
- Useful Links: Add and manage quick links persisted in IndexedDB.
- Fetch Inspector: Capture outgoing fetch requests; inspect headers/body, modify and replay.
- Credentials: Save, generate, and copy test credentials for rapid form filling.

Screenshots and examples are available in the `assets/` folder.

## Configuration

- No external configuration required. Data is stored locally in the browser (IndexedDB / localStorage) while the extension is installed.

## Development notes

- Source files of interest:
  - `popup.html` — extension popup markup.
  - `css/link.css` — main popup stylesheet (recent UI fixes applied here).
  - `scripts/` — contains `popup.js` and helper modules.
- To test UI/CSS changes, update the files in this repository, reload the extension in chrome://extensions, and re-open the popup.

## Changelog

- v1.1.0 — 2025-10-31
  - UI: Toolbar buttons now render with consistent height for a more even appearance.
  - UI: Labels that exceed the available width now truncate with an ellipsis to prevent wrapping and inconsistent heights.
  - UI: Increased vertical spacing between input rows and result/list panels to reduce visual crowding.
  - UI: Added top margin for internal lists within input panels.
  - Bugfix: Fixed an issue affecting fetch body editing/replay.

## Contributing

Contributions are welcome. Typical workflow:

1. Fork the repository and create a feature branch.
2. Make changes and verify behavior by loading the unpacked extension in Chrome.
3. Open a pull request with a description of the changes and rationale.

Please keep changes focused and include a short verification note describing how to test the change locally.

## License

This project includes a `LICENSE` file in the repository root. Please follow the license terms when using or contributing to the project.

## Contact

For questions or issues, open an issue in the repository or reach out to the maintainers via the repository contact information.

---

Revision: v1.1.0 — updated 2025-10-31
# DevMate Customizable Development Extension
Multi-Browser extension for developers.
- Multi browser support (Chrome Native)
- Quick access to active tab's local storage and variable assignments.
- Custom initialization for useful URLs using IndexedDB.
- Manipulation over Fetches and requests.
- Customable credentials for quick access to URLs and Fetches using IndexedDB.
- Readable Fetches real time, that allows user to modify and copy.
- Username, Password, Email generation.

## Release v1.1.0 — 2025-10-31

What's new in this release:

- UI polish: toolbar buttons now render at a consistent height so the top row looks even across all buttons.
- Labels that are too long will truncate with an ellipsis to avoid wrapping and changing button height.
- Improved spacing: input rows and generated/result panels have increased vertical spacing so rows and results are not cramped.
- Internal lists inside input panels now have additional top margin for clearer separation from input controls.
- Fetch body edit bug fixed.


# Upcoming Releases
- Postman integration that allows user fetches and requests to insert specific workspace after manipulation.
- Desktop release.
- CRUD with User credentials that allows user to fetch requests or access URLs with their security credentials.

# Local Storage Access
-Main goal is to provide developers quick access to local storage and allow them to modify the environment according to requirements.
![preview](/assets/localstorage.png)

# Useful Links
-Providing developers and users to add and modify their own URL map to access them fast and easy.
![preview](/assets/usefullinks.png)

# Credentials
-Saving and transferring credentials to save time and effort.
![preview](/assets/creedentials.png)

# Fetches
-In this extension fetches can be read and copied, It provides developers to acquire fetch information faster.
  - You can capture fetches live time and replay the request or you can modify and replay the requests

![preview](/assets/fetches.png)


