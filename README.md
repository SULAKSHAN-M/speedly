<p align="center">
  <img src="docs/speedly-banner.gif" alt="SPEEDLY — Internet Speed Test and Network Analytics, with gently moving blue waves" width="100%" />
</p>

<h1 align="center">SPEEDLY</h1>
<p align="center"><strong>Real-time Internet Speed Testing &amp; Network Performance Analytics</strong></p>
<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-20232A?style=flat-square&amp;logo=react&amp;logoColor=61DAFB" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&amp;logo=vite&amp;logoColor=white" />
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&amp;logo=javascript&amp;logoColor=black" />
  <img alt="Cloudflare" src="https://img.shields.io/badge/Cloudflare-F38020?style=flat-square&amp;logo=cloudflare&amp;logoColor=white" />
</p>
<p align="center">
  <a href="https://github.com/SULAKSHAN-M/speedly/stargazers"><img alt="Star SPEEDLY" src="https://img.shields.io/badge/Star_this_repository-18181B?style=for-the-badge&amp;logo=github&amp;logoColor=white" /></a>
  <a href="https://github.com/SULAKSHAN-M/speedly/issues"><img alt="Issues" src="https://img.shields.io/badge/Report_an_issue-2563EB?style=for-the-badge&amp;logo=github&amp;logoColor=white" /></a>
</p>

## Overview

**SPEEDLY** is a responsive web application for measuring and understanding internet connection performance. Built with **React + Vite** and powered by the **Cloudflare speedtest library**, it brings together real download and upload measurements, latency analysis, visualizations, historical comparisons, and readable connection-quality summaries.

Unlike a single-number speed meter, SPEEDLY presents a broader view of connection behavior: throughput, responsiveness, stability, and how these measurements may affect everyday tasks. Results are measurements taken from actual network transfers; the application does **not** invent missing readings.

> **Important:** Browser-based network tests are estimates influenced by server conditions, network congestion, device performance, and browser limitations. SPEEDLY is not a certified diagnostic instrument.

## Screenshots

### Main dashboard — light mode
![SPEEDLY light dashboard](docs/screenshots/speedly-dashboard-light.png)

### Main dashboard — dark mode
![SPEEDLY dark dashboard](docs/screenshots/speedly-dashboard-dark.png)

<details>
<summary><strong>More screenshots: analytics, quality, network details, and history</strong></summary>

#### Connection details and live speed measurements
![Connection analytics](docs/screenshots/speedly-connection-details.png)

#### Internet quality and latency
![Quality and latency](docs/screenshots/speedly-quality-analysis.png)

#### Network information and speed trends
![Network information](docs/screenshots/speedly-network-information.png)

#### Saved test history
![Test history](docs/screenshots/speedly-test-history.png)
</details>

## Features

| Area | Capabilities |
| --- | --- |
| **Speed testing** | Real-time download and upload tests; Mbps display; live measurement progress |
| **Latency** | Unloaded and loaded latency, jitter, and responsiveness indicators |
| **Charts** | Download/upload measurement samples and speed trends across saved tests |
| **Quality insights** | Heuristic quality grade and estimates for gaming, streaming, browsing, and video calls |
| **Bufferbloat** | Loaded-vs-idle HTTP latency comparison, with measurement limitations disclosed |
| **History** | Browser-local test history, individual test details, and comparisons |
| **Exports** | CSV export, JSON backup, shareable summaries, and PDF reports |
| **Device/network** | Browser and device information; optional public IP/ISP lookup |
| **Interface** | Responsive layouts, light/dark themes, status indicators, and PWA assets |
| **Reliability** | Upload retry behavior, partial-result handling, and clear incomplete-test states |

### Speed measurements

SPEEDLY displays speed readings in **Mbps (megabits per second)** throughout the interface: live values, results, graphs, history, comparisons, CSV, sharing, and PDF reports. The underlying stored values remain in **bits per second (bps)** for compatibility with previous test history.

| Quantity | Unit | Meaning |
| --- | --- | --- |
| Download/upload speed | Mbps | Megabits per second |
| Transfer volume | MB | Megabytes of data transferred |
| Latency and jitter | ms | Milliseconds |
| Stored bandwidth | bps | Bits per second |

**Conversions:** `1 Mbps = 1,000,000 bps` and `1 MB/s = 8 Mbps`. Decimal formatting (two decimals, or three below 1 Mbps) does not guarantee measurement accuracy.

### Quality and responsiveness

SPEEDLY uses measured bandwidth, latency, jitter, loaded latency, and sample variability to provide **heuristic** grades. Gaming, streaming, video calling, and browsing scores describe estimated suitability, not guaranteed application performance. Bufferbloat analysis is an HTTP latency comparison and **not** a standardized bufferbloat certification. If packet loss is not measured, SPEEDLY shows no invented percentage.

### Privacy and local history

Test history is saved in the browser's **localStorage** for the current origin. An optional public IP/ISP lookup is initiated only when selected and sends a request to an external service. Speed tests transfer actual data and can consume mobile data allowances. Browser storage can be deleted by clearing site data.

## Technology stack

| Technology | Role |
| --- | --- |
| **React** | Interactive user interface and state-driven components |
| **Vite** | Local development server and production build |
| **JavaScript** | Measurement handling, formatting, and application logic |
| **Cloudflare speedtest library** | Real network transfer and latency measurements |
| **CSS** | Responsive dashboard styling and themes |
| **Browser APIs / localStorage** | Browser capabilities and on-device history |

## Getting started

### Requirements

- Node.js and npm compatible with the project's `package.json`
- A modern browser with an active internet connection

### Installation

```bash
git clone https://github.com/SULAKSHAN-M/speedly.git
cd speedly
npm install
npm run dev
```

Open **http://localhost:5173** (or the local URL Vite prints in your terminal).

### Tests and production build

```bash
npm test
npm run build
```

The production output is normally written to `dist/`. Deploy that output to a static hosting provider configured for Vite apps. Verify the available scripts in `package.json` if your local project differs.

## How a speed test works

1. **Start:** Begin a test from the main dashboard.
2. **Measure:** Cloudflare transfer and latency probes collect actual network samples.
3. **Update:** The dashboard displays progress and speed readings as the test proceeds.
4. **Complete or partially complete:** Results are displayed when available; failed or interrupted phases are not replaced with fabricated values.
5. **Review:** Examine the metrics, charts, quality indicators, and comparisons.
6. **Save and export:** Review browser-local history or generate available exports and reports.

The measurement is affected by Wi-Fi conditions, VPNs, firewalls, extensions, device load, and the route to Cloudflare. Different speed-test services may return different results.

## Release notes — Mbps & interface cleanup

This update builds on **v4.4** and includes:

- Consistent **Mbps** labels for live values, results, charts, history, comparisons, sharing, CSV, and PDF reports.
- Existing bps storage retained for compatibility with older local history.
- Redundant **LIVE NETWORK TESTING** header badge removed; the responsive **INTERNET PERFORMANCE TEST** status banner remains.
- Duplicate **Test completed** message removed.
- Redundant **Measuring upload…** summary hint removed when the hero already shows the upload phase.
- Main headline returns to **download speed** after completion instead of remaining on upload speed.
- Existing upload retries, partial-result behavior, quality grading, reporting, PWA assets, and **Developed by SULAKSHAN M** branding preserved.

## Troubleshooting

| Problem | Suggested action |
| --- | --- |
| `npm` command not found | Install Node.js and reopen the terminal. |
| Dependencies fail to install | Check Node.js version, connection, and `package.json`; rerun `npm install`. |
| Test does not complete | Retry; check VPN, firewall, browser extensions, network restrictions, and Cloudflare connectivity. |
| Upload test fails | The app may show a partial result; retry under a stable connection. |
| Old UI appears after updating | Restart Vite, then hard-refresh with `Ctrl + Shift + R`; check PWA/service-worker cache if needed. |
| Previous tests are missing | Confirm the same browser profile and site origin are being used and localStorage was not cleared. |
| Different results across tests | Network conditions, server routes, and background traffic vary over time. |

### Updating an existing installation

Replace or pull the updated project files, then run:

```bash
npm install
npm run dev
```

For production, run `npm run build` again and redeploy `dist/`.

## Project structure

A typical Vite/React project contains the following entries; exact names may vary in your checkout:

```text
speedly/
├── docs/
│   ├── speedly-banner.svg
│   └── screenshots/
│       ├── speedly-dashboard-light.png
│       ├── speedly-dashboard-dark.png
│       ├── speedly-connection-details.png
│       ├── speedly-quality-analysis.png
│       ├── speedly-network-information.png
│       └── speedly-test-history.png
├── public/              # Static assets (if present)
├── src/                 # React application source
├── index.html
├── package.json
├── vite.config.*         # Vite config (if present)
└── README.md
```

## Contributing

Bug reports, suggestions, and improvements are welcome. Please [open an issue](https://github.com/SULAKSHAN-M/speedly/issues) with reproduction steps and relevant browser details before proposing major changes. Pull requests should explain the change and include validation results where possible.

## Roadmap ideas

Potential enhancements, **not claims about existing features**:

- More detailed latency distributions and test consistency statistics
- Multi-run comparisons with median results
- Network-change detection where browser capabilities permit
- Expanded accessibility and internationalization

## Developer

**SULAKSHAN M**  
GitHub: [@SULAKSHAN-M](https://github.com/SULAKSHAN-M)

---

<p align="center">
  Built to make network performance easier to understand.<br />
  <strong>If SPEEDLY is useful, <a href="https://github.com/SULAKSHAN-M/speedly/stargazers">give the project a star</a>.</strong>
</p>


## README banner and screenshot troubleshooting

The animated banner is a **repository-hosted GIF** at `docs/speedly-banner.gif`. It uses subtle moving waves—not blinking text. A static alternative is provided at `docs/speedly-banner.png`, alongside the original vector `docs/speedly-banner.svg`.

If the banner or screenshots do not load on GitHub:

1. Verify that `README.md` is in the repository root and the `docs/` folder is alongside it.
2. Confirm that `docs/speedly-banner.gif` is committed to the **same branch** as the displayed README.
3. Check that filename capitalization matches the README exactly.
4. Open [`docs/speedly-banner.gif`](docs/speedly-banner.gif) directly to confirm the file is uploaded.
5. If necessary, replace `docs/speedly-banner.gif` in the header with `docs/speedly-banner.png` for a static header.

GitHub does not display ZIP archives as inline README images. Extract the package and commit the actual `docs/` directory.
