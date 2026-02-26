# Carbon Cache (Chrome Extension)

Carbon Cache is a Manifest V3 Chrome extension that connects to your Google Drive and Gmail (read-only) to estimate the carbon footprint of your cloud storage and suggest high-impact cleanups.

## Features

- Estimates Google Drive and Gmail storage in GB.
- Computes an annual storage carbon footprint range using:
  - Low: 0.01 kg CO₂e per GB-year
  - Mid: 0.025 kg CO₂e per GB-year
  - High: 0.04 kg CO₂e per GB-year
- Breaks down Gmail vs Drive contributions.
- Shows top 10 largest Drive files with quick "Open" links.
- Counts Gmail emails with large attachments (>10 MB) older than 1 year and suggests a targeted cleanup search.
- Lets you model a personal cleanup (GB cleared) and project community impact for different cohort sizes (100 / 500 / 10,000 users).

## Google Cloud setup

1. Go to the Google Cloud Console and create a new project.
2. Enable APIs:
   - Google Drive API
   - Gmail API
3. Configure the OAuth consent screen (External or Internal) and add the following scopes:
   - `https://www.googleapis.com/auth/drive.metadata.readonly`
   - `https://www.googleapis.com/auth/gmail.readonly`
4. Create OAuth client credentials:
   - Application type: "Chrome app" (or "Web application" with an appropriate redirect URI for `chrome.identity`)
   - Copy the generated client ID.
5. In `manifest.json`, replace `YOUR_CLIENT_ID.apps.googleusercontent.com` under the `oauth2.client_id` field with your client ID.

## Load the extension in Chrome

1. In Chrome, open `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `HackForHumanity` folder.
4. Pin **Carbon Cache** to the toolbar and click its icon.
5. When prompted, sign in and approve the Drive + Gmail read-only scopes.

## Notes & assumptions

- Gmail storage is estimated from a sample of recent messages using the `sizeEstimate` field and total message count, not the official quota.
- Large old Gmail attachments use the search query `has:attachment larger:10M older_than:1y` and are approximate.
- Carbon factors and km-driven equivalence are simple heuristics intended for hackathon-grade, transparent estimates rather than precise lifecycle assessments.
