# Franks ConnectWise

[![Validate](https://github.com/frankstop/franks-connectwise/actions/workflows/validate.yml/badge.svg)](https://github.com/frankstop/franks-connectwise/actions/workflows/validate.yml)

A configurable Microsoft Edge extension that streamlines ConnectWise ticket work and opens links by drawing over them.

## Features

- Opens selected ConnectWise calendar entry types in one native Edge tab group.
- Includes Service and Project entries by default, with optional Meeting, Activity, and Misc/Travel entries.
- Renames ticket tabs to the full ticket header shown by ConnectWise.
- Optionally uses description-only ticket titles for each individual Edge tab group.
- Keeps tab names current when ConnectWise navigates within the same tab or overwrites the title.
- Opens every link inside a rectangle you draw on any normal webpage.
- Removes duplicate destinations and organizes selected links in a native Edge tab group.
- Includes bright, dark, and system-matched themes.
- Lets you independently enable and configure each major behavior.

## Install

1. Download `Franks-ConnectWise-v1.2.2.zip` from the [latest release](https://github.com/frankstop/franks-connectwise/releases/latest).
2. Extract the ZIP to a permanent folder.
3. Open `edge://extensions` in Microsoft Edge.
4. Turn on **Developer mode**.
5. Select **Load unpacked** and choose the extracted `Franks-ConnectWise` folder.
6. Pin the extension to the toolbar if desired.

## Use

Open the ConnectWise **Manage: My Calendar** page, ensure today's events are visible, select the extension, and choose **Open Today's Tickets**. Ticket tabs are renamed automatically when TabRename is enabled.

From any tab inside an Edge tab group, open the extension and select **Use description-only ticket titles** to shorten Service and Project ticket tabs in that group. Each group keeps its own title mode for the current browser session. Full ticket headers remain the default. Tabs outside that group and non-ConnectWise tabs are not changed.

To open links from any normal webpage, press `Command+Shift+X` on macOS or `Ctrl+Shift+X` on Windows/Linux, then drag a rectangle over the links. Press `Esc` or the shortcut again to cancel. The shortcut can be changed at `edge://extensions/shortcuts`.

## Settings

Select **Settings** in the extension popup to configure:

- Bright, dark, or system-matched appearance.
- Calendar ticket opening and automatic ticket tab renaming.
- Calendar entry types: Service, Project, Meeting, Activity, and Misc/Travel.
- Ticket group name, color, collapsed state, and active-tab behavior.
- Region link selection, duplicate removal, and background opening.
- Region tab grouping, group name, color, and collapsed state.

## Update

Download and extract the newest release over the existing extension folder. Then open `edge://extensions` and select **Reload** for Franks ConnectWise. GitHub-hosted unpacked extensions do not update automatically.

## Troubleshooting

- **No selected calendar entries found:** Confirm today's entries are rendered and their types are enabled in Settings.
- **Ticket tabs are not renamed:** Confirm TabRename is enabled and the page contains a `.detailLabel` ticket header.
- **Description-only toggle is unavailable:** Open the extension from a tab inside the Edge tab group you want to configure, and confirm TabRename is enabled globally in Settings.
- **Region selection does not start:** Confirm it is enabled in Settings, use a normal webpage, and check `edge://extensions/shortcuts` for a shortcut conflict.
- **A link was not included:** Make sure the rectangle touches the visible link. Links in protected or inaccessible cross-origin frames cannot be selected.
- **Extension error:** Open `edge://extensions`, locate Franks ConnectWise, and inspect its service worker errors.
- **ConnectWise changed:** DOM classes or menu identifiers may need to be updated in the extension.

## Screenshots

Screenshots are intentionally omitted because ConnectWise pages can expose workplace and customer data.

## Privacy

The always-on ConnectWise content script runs only on `https://na.myconnectwise.net/*`. The region selector runs on the active page only when its shortcut is pressed. Global settings are saved through Edge's synchronized extension storage. Per-group title preferences use session storage and are removed when their tab groups close. The extension does not send ticket data, selected links, browsing history, credentials, or analytics to this project or any third-party service.

Never include customer names, ticket contents, screenshots, credentials, or internal-only information in public issues or pull requests.

## Development

Requires Node.js 20 or newer for local validation. The extension itself has no third-party runtime dependencies.

```sh
npm test
npm run package
```

The packaged extension and checksum are written to `dist/`. Version tags matching `vX.Y.Z` publish those files through GitHub Releases.

## Contributing

Bug reports and focused pull requests are welcome. Keep changes compatible with Manifest V3 and test runtime changes in Microsoft Edge. See [CONTRIBUTING.md](CONTRIBUTING.md) before sharing workplace-derived details.

## License

[MIT](LICENSE)
