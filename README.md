# YouTube Clickbait Filter (Firefox Browser Extension)

## Description

This Firefox browser extension helps you curate your YouTube feed by identifying and either graying out or completely hiding videos with clickbait titles. The detection is based on various configurable criteria, including keywords, title formatting (ALL CAPS, excessive capitalization), emoji count, and repetitive punctuation.

## Features

*   **Clickbait Detection:**
    *   Matches against a default list of common clickbait keywords/phrases (e.g., "SHOCKING", "YOU WON'T BELIEVE").
    *   Allows users to add and manage their own custom list of keywords.
    *   Detects titles written in ALL CAPS.
    *   Detects titles with excessive capitalization (e.g., more than 50% of words capitalized, configurable).
    *   Identifies titles with an excessive number of emojis (e.g., more than 3 emojis, configurable).
    *   Recognizes titles with repetitive punctuation (e.g., "!!!", "???").
*   **User-Selectable Actions:**
    *   **Gray Out:** Visually de-emphasizes the video thumbnail and title (reduces opacity, applies grayscale, changes title font color). The video remains clickable.
    *   **Hide:** Completely removes the video from view in the feed.
*   **Popup Interface:**
    *   Toggle the filter on/off.
    *   Choose between "Gray Out" and "Hide" actions.
    *   Manage custom keywords (add/remove).
    *   Adjust sensitivity thresholds for emoji count and capitalization percentage.
    *   View a list of recently hidden videos (if "Hide" action is active for the current session) and unhide them individually.
    *   An "Open Settings in New Tab" link in the popup for a more persistent view of the settings page.

## File Structure

```
.
├── manifest.json                 # Extension manifest
├── background.js                 # Background script for initialization
├── clickbait_detector.js         # Core logic for detecting clickbait
├── content_script.js             # Script injected into YouTube pages
├── README.md                     # This file
├── icons/                        # Directory for extension icons
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
└── popup/                        # Directory for popup UI
    ├── popup.html                # HTML structure for the popup
    ├── popup.css                 # CSS styles for the popup
    └── popup.js                  # JavaScript logic for the popup
```

## How to Load and Test in Firefox

1.  **Download the Code:**
    *   Ensure all the files listed above are downloaded into a single directory on your computer. You can clone the repository if it's in one, or download the individual files.

2.  **Open Firefox:**
    *   Navigate to `about:debugging` in the address bar.

3.  **Load Temporary Add-on:**
    *   Click on "This Firefox" (or "This Nightly", etc.) on the left sidebar.
    *   Click the "Load Temporary Add-on..." button.
    *   Navigate to the directory where you saved the extension files and select the `manifest.json` file.

4.  **Test:**
    *   The extension icon should appear in your Firefox toolbar. Click it to open the popup and configure settings.
    *   Navigate to `youtube.com` and observe the extension in action.
    *   Check the Browser Console (Ctrl+Shift+J or Cmd+Shift+J) and the Extension Console (from `about:debugging` -> find the extension -> "Inspect") for any errors or log messages.

5.  **Making Changes:**
    *   If you modify the code (e.g., `content_script.js`), you'll need to reload the extension from the `about:debugging` page. Click the "Reload" button for the temporary add-on.

## Usage Notes

*   **Popup Behavior:** Standard browser extension popups (opened by clicking the toolbar icon) are designed to close automatically when you click outside of them. For more complex settings adjustments where you might need the interface to stay open, use the "Open Settings in New Tab" link found at the bottom of the popup. This will open the settings interface in a regular browser tab.

## Development Notes

*   The extension uses `browser.storage.local` to save settings.
*   Content scripts interact with YouTube's DOM, which can change. Selectors may need updates if YouTube alters its page structure significantly.
*   The `MutationObserver` API is used in `content_script.js` to efficiently detect dynamically loaded videos.

```
