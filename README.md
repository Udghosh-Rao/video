# Lecture Library

A static, no-account lecture site built on the official YouTube IFrame Player API.
Plain HTML, CSS and JavaScript: no backend, no build step, no dependencies, no environment variables.

## Files

    index.html   page structure
    style.css    design
    script.js    lecture list, player, search, progress
    README.md    this file

## Run locally

Open `index.html` in a browser, or serve the folder (YouTube's player works best from http/https, not file://):

    cd lecture-library
    python3 -m http.server 8000      # then visit http://localhost:8000

## Deploy to GitHub Pages

1. Create a GitHub repository (e.g. `lecture-library`) and upload the four files to the repository root.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then **Save**.
4. After a minute the site is live at `https://YOUR-USERNAME.github.io/lecture-library/`.

All paths are relative and routing uses the URL hash (`#/lecture/3`), so no server configuration is needed.

## Edit lecture titles

Open `script.js` and replace the strings in the `TITLES` array, in order. Titles are placeholders ("Lecture 1" ...)
because they cannot be read from YouTube without an API key. The `VIDEO_IDS` array holds the ten IDs; leave it unchanged.

## How it works

- **One player only.** The YouTube API loads when a visitor first opens a lecture. A single player is created and reused; switching lectures *cues* the next video and never starts it.
- **No autoplay, no looping, no refresh.** Playback begins only when the visitor presses play (or clicks "Resume from ..."). Next/Previous do not start playback. Leaving the lecture page pauses the player so nothing plays out of sight.
- **Progress (optional).** Last lecture, playback position (saved every 5 seconds while the visitor is watching, and on pause/close) and completed lectures are kept in `localStorage` under `lectureLibrary.v1`. Clearing site data resets it. Progress only reads the player's position; it never triggers playback.
- **Errors.** Removed/private videos, embedding disabled by the owner, invalid IDs, player load failure and a 15-second ready timeout each show a clear message with a link to watch on YouTube (and a retry button for network problems).
- **Privacy.** No accounts, emails, cookies set by this site, or analytics. Once a lecture is opened, YouTube's own player and privacy policy apply.

## Compliance note

This site uses standard YouTube embedding and leaves it to YouTube to decide what counts as a valid view, how engagement is measured and whether anything is monetisable. It does not guarantee that embedded views count toward monetisation.

## Manual test checklist

- [ ] Home shows 10 cards with thumbnails, numbers and "Watch Lecture" buttons
- [ ] Each lecture opens in the embedded player and plays only after pressing play
- [ ] Previous/Next and the playlist move between lectures; ends are disabled
- [ ] Search by `3`, `lecture 7` or a title; clear button and Esc clear it; nonsense shows the empty state
- [ ] Watch 30 seconds, reload, reopen the lecture: "Resume from 0:30" appears
- [ ] "Mark as completed" shows a Done badge in the grid and playlist
- [ ] Temporarily change one ID in `VIDEO_IDS` to `AAAAAAAAAAA` to see the unavailable-video message (then restore it)
- [ ] Narrow the window below 760px: menu button, stacked player and playlist
- [ ] Block `youtube.com` (or go offline) to see the load-failure message and retry
