# Twitch Chat Commands Gallery

A compact web page for displaying Twitch chat commands with descriptions, preview images, optional sound effects, copy buttons, and channel currency costs.

The project is built with plain HTML, CSS, and JavaScript. Command data lives in `commands.json`, so the command list can be updated without editing the page markup.

## Live Site

The project is available at:

https://16bither0.github.io/sfx/

## Features

- Search commands by name or description.
- Display each command in a compact list row.
- Show a thumbnail for each command.
- Fall back to `avatar.png` when a command has no custom image.
- Show the command cost in channel currency, `PX`.
- Preview optional audio files directly from the list.
- Display audio playback progress around the play button.
- Copy a command to the clipboard with visual feedback.

## Project Structure

```text
.
+-- audio/
+-- image/
+-- avatar.png
+-- commands.json
+-- index.html
+-- script.js
+-- style.css
+-- README.md
```

## Running Locally

Because the page loads `commands.json` with `fetch`, open it through a local static server instead of double-clicking `index.html`.

Example:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

## Commands Data

Commands are configured in `commands.json`.

Each entry supports:

- `command`: Twitch chat command text.
- `description`: Short description shown in the list.
- `coins`: Command cost in channel pixels. Defaults to `1000` if omitted.
- `audio`: Optional audio preview object, or `null`.
- `image`: Optional thumbnail object, or `null`.

Example:

```json
{
  "command": "!sfxExample",
  "description": "SFX - Example sound",
  "coins": 1000,
  "audio": {
    "src": "audio/example.mp3"
  },
  "image": {
    "src": "image/example.png",
    "alt": "Thumbnail for !sfxExample"
  }
}
```

If `image` is `null`, the page uses `avatar.png` as the fallback thumbnail:

```json
{
  "command": "!example",
  "description": "Command without custom thumbnail",
  "coins": 1000,
  "audio": null,
  "image": null
}
```
