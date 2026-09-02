# Franks ConnectWise

[![Validate](https://github.com/frankstop/franks-connectwise/actions/workflows/validate.yml/badge.svg)](https://github.com/frankstop/franks-connectwise/actions/workflows/validate.yml)

A small Microsoft Edge extension that streamlines ConnectWise ticket work.

## Features

- Opens today's brown and pink ConnectWise calendar tickets in one native Edge tab group.
- Ignores green calendar activities.
- Renames ticket tabs to the full ticket header shown by ConnectWise.
- Keeps tab names current when ConnectWise navigates within the same tab or overwrites the title.
- Provides settings for TabRename, group name, group color, collapsed state, and active tab behavior.

## Install

1. Download `Franks-ConnectWise-v1.1.0.zip` from the [latest release](https://github.com/frankstop/franks-connectwise/releases/latest).
2. Extract the ZIP to a permanent folder.
3. Open `edge://extensions` in Microsoft Edge.
4. Turn on **Developer mode**.
5. Select **Load unpacked** and choose the extracted `Franks-ConnectWise` folder.
6. Pin the extension to the toolbar if desired.

## Use

Open the ConnectWise **Manage: My Calendar** page, ensure today's events are visible, select the extension, and choose **Open Today's Tickets**. Ticket tabs are renamed automatically when TabRename is enabled.

## Settings

Select **Settings** in the extension popup to configure:

- Automatic ticket tab renaming.
- Tab group name and color.
- Whether the group begins collapsed.
- Whether the calendar remains the active tab.

## Update

Download and extract the newest release over the existing extension folder. Then open `edge://extensions` and select **Reload** for Franks ConnectWise. GitHub-hosted unpacked extensions do not update automatically.

## Troubleshooting

- **No tickets found:** Confirm today's calendar events are rendered on screen.
- **Ticket tabs are not renamed:** Confirm TabRename is enabled and the page contains a `.detailLabel` ticket header.
- **Extension error:** Open `edge://extensions`, locate Franks ConnectWise, and inspect its service worker errors.
- **ConnectWise changed:** DOM classes or menu identifiers may need to be updated in the extension.

## Screenshots

Screenshots are intentionally omitted because ConnectWise pages can expose workplace and customer data.

## Privacy

The extension runs only on `https://na.myconnectwise.net/*`. Settings are saved through Edge's synchronized extension storage. It does not send ticket data, browsing history, credentials, or analytics to this project or any third-party service.

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
