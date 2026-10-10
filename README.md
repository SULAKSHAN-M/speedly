# SPEEDLY

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=180&color=0:0F172A,50:1E3A8A,100:2563EB&text=SPEEDLY&fontColor=FFFFFF&fontSize=54&fontAlignY=38&desc=Internet%20Speed%20Test%20%26%20Network%20Analytics&descAlignY=60&animation=fadeIn" alt="SPEEDLY banner" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare" />
</p>

<p align="center">
  <a href="https://github.com/SULAKSHAN-M/speedly-react/stargazers"><img src="https://img.shields.io/github/stars/SULAKSHAN-M/speedly-react?style=social" alt="GitHub stars" /></a>
  <a href="https://github.com/SULAKSHAN-M/speedly-react/forks"><img src="https://img.shields.io/github/forks/SULAKSHAN-M/speedly-react?style=social" alt="GitHub forks" /></a>
</p>

<p align="center"><strong>Measure smarter. Understand your connection.</strong></p>

SPEEDLY is a modern, responsive internet speed testing application built with React and Vite, powered by the Cloudflare speedtest library. It measures real network performance and presents results through an accessible analytics dashboard.

## Features

- Real download and upload speed measurements in Mbps
- Live measurement progress and phase-aware status
- Latency, jitter and loaded-latency analysis
- Internet quality scoring for gaming, streaming, browsing and video calls
- Speed measurement charts and historical trends
- Local browser test history and device comparisons
- CSV export, JSON backup, shareable results and PDF reports
- Light and dark themes with responsive layouts
- Optional public IP and ISP information
- Progressive Web App assets
- Partial-result handling and upload retry support

## Technology

| Technology | Purpose |
| --- | --- |
| React | Component-based interface |
| Vite | Development and production builds |
| JavaScript | Application and measurement logic |
| Cloudflare speedtest | Network transfer measurements |
| CSS | Responsive interface and themes |
| Browser localStorage | Local test history |

## Getting Started

**Prerequisites:** Node.js and npm.

```bash
git clone https://github.com/SULAKSHAN-M/speedly-react.git
cd speedly-react
npm install
npm run dev
```

Open http://localhost:5173 (or the URL displayed by Vite).

## Testing and Build

```bash
npm test
npm run build
```

## Measurement Accuracy

All measured speeds are stored internally in bits per second (bps) and displayed in megabits per second (Mbps).

- **1 Mbps = 1,000,000 bits/s**
- **1 MB/s = 8 Mbps**
- Transfer volumes are displayed in megabytes (MB).
- Display precision does not imply guaranteed measurement accuracy.
- Quality scores are heuristic estimates, not certifications.
- Network interruptions can cause incomplete results; missing measurements are not fabricated.
- Browser history remains in localStorage for the same origin.

## Updating an Existing Installation

Replace the project files, then run:

```bash
npm install
npm run dev
```

If a cached PWA version persists, hard refresh using **Ctrl + Shift + R**.

## Contributing

Contributions, bug reports and feature suggestions are welcome. Open an issue to discuss significant changes before submitting a pull request.

## Support the Project

If SPEEDLY is useful, please consider giving the repository a star.

[![Star SPEEDLY](https://img.shields.io/badge/Star-SPEEDLY-FACC15?style=for-the-badge&logo=github&logoColor=black)](https://github.com/SULAKSHAN-M/speedly-react)

## Developer

**SULAKSHAN M**

[GitHub](https://github.com/SULAKSHAN-M)

---

<p align="center">Developed by <strong>SULAKSHAN M</strong></p>
