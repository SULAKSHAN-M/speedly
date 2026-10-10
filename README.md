# Speedly — Mbps & Interface Cleanup

Speedly is a Vite + React internet speed test powered by the Cloudflare speedtest library.

## What's updated from v4.4

- **Mbps (megabits/second)** for every speed reading: live download and upload, latest results, graphs, browser history, comparison tables, CSV export, sharing, and PDF reports. The stored data remains in **bits per second** for compatibility with prior test history. 1 Mbps = 1,000,000 bits/s; 1 MB/s = 8 Mbps.
- Removed the redundant **LIVE NETWORK TESTING** badge from the site header; the responsive red / green **INTERNET PERFORMANCE TEST** status banner remains.
- Removed duplicated **Test completed** messaging (one completion status is shown).
- Removed the extra **Measuring upload…** hint in the summary when the live hero already shows the upload phase.
- After a test completes, the main headline displays download speed again instead of leaving the upload measurement under the **Your internet speed is** title.
- Kept v4.4 upload retry, partial-result handling, test-history storage key, quality grading, PDF reporting, PWA assets, and **Developed by SULAKSHAN M** branding.

## Run locally

```powershell
npm install
npm run dev
```

Go to <http://localhost:5173>.

## Validate

```powershell
npm test
npm run build
```

## Measurement notes

- Results are derived from real completed Cloudflare transfers and recorded in **bps**. Changing units does not change the actual connection speed or measurement process.
- Displaying 2 or 3 decimal places is not a guarantee of that accuracy; quality labels are heuristic.
- A test can still be incomplete if a firewall, extension, network, or Cloudflare upload endpoint interrupts the measurement. The app never fabricates missing results.
- Transfer volumes and data budgets use **MB** (megabytes), while speeds use **Mbps** (megabits/second).
- Old history remains available in the same browser origin / localStorage. To update an existing install, replace the project files, run `npm install`, restart Vite, then hard refresh (Ctrl+Shift+R) if PWA cache keeps an old shell.
