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
