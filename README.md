# Portfolio Manager App

A modern, dark-themed portfolio management application for tracking trading positions, calculating risk/reward metrics, and analyzing closed trades. Built for active traders managing multi-currency portfolios.

---

## Changelog

### v1.0.1 (2026-03-27)
- Multi-currency support (USD / CAD) with live Yahoo Finance exchange rates
- Interactive SVG pie chart showing cash vs. position allocation with hover action menus
- Historical exchange rate lookup for accurate initial equity baseline
- CSV import with collapsible tranche rows and currency auto-detection
- Position currency defaults to initial equity currency on entry
- Cash and Positions Value now show % of current equity
- Per-position native currency display; aggregate columns convert to portfolio currency
- Pie chart hover shows % of equity and position action menu (Edit, Close, + Tranche, Delete)

### v1.0.0 — Initial Release
- Core portfolio tracking (equity, cash, open positions, closed trades)
- Live price fetching via Yahoo Finance (15s market hours / 6h off-hours auto-refresh)
- Tranche-based position tracking (scale-in and partial exits)
- CSV import from TD Direct Investing holdings and order history exports
- Short position support with direction-aware P&L and R-multiple
- Performance stats: win rate, avg R, expectancy, R histogram
- Edit positions with inline tranche editor
- Close positions with partial exit support and CSV fill upload
- Add Tranche form for scaling into existing positions
- Clear all data with confirmation (resets to initial equity prompt)

---

## Features

### Portfolio Summary
- **Initial Equity** — set via Settings with a date; historical USD/CAD rate is looked up for accurate cross-currency baseline
- **Current Equity** — live-updated as position prices refresh; fully currency-aware
- **Cash** — tracks buys/sells including $9.99 commission per trade
- **Positions Value** — total market value of open positions converted to portfolio currency
- **Gain/Loss** — dollar and percent vs. converted initial equity
- **Total Open Risk** — combined stop-to-entry risk across all positions as $ and % of equity
- **Allocation Pie Chart** — visual breakdown of cash vs. each position; hover to see % of equity and action menu

### Positions (Active)
- Long and short positions with per-position native currency (USD or CAD)
- Aggregate columns (Book Cost, Risk $, Size % of Eq, Risk % of Eq) auto-convert to portfolio currency
- Price columns (Entry, Stop, Last Price, R Targets, Open Gain) shown in position native currency
- Currency badge per ticker row
- Click row to expand tranche history breakdown
- Auto-refresh last prices: every 15s during US market hours (9:30–16:00 ET), every 6h otherwise
- Manual price override with live fetch button per row
- Actions: Edit, Close (with partial exit), Delete, + Tranche

### Adding Positions
- **Manual Entry** — ticker, date, type, currency, shares, entry/stop prices, tags, notes
- **CSV Import** — drag-and-drop one or more files; supports TD Direct holdings exports and order history CSVs
  - Order CSV: auto-detects multi-tranche positions, collapsible tranche rows, per-tranche stop price entry
  - Position currency defaults to initial equity currency

### Tranche Management
- **+ Tranche** — scale into an existing position; recalculates blended average entry and updates stop
- **Edit Position** — inline tranche editor with per-tranche date, shares, fill price, stop; delete individual tranches
- **Close Position** — enter exit price, date, reason, and optional share count for partial exits; upload order CSV to auto-fill exit price

### Closed Trades
- Full trade history with P&L ($, %), RR multiple, days held, return on equity
- Direction-aware calculations for short trades
- Performance stats panel: win rate, avg win/loss R, expectancy, avg days held (winners vs. losers), long vs. short P&L
- R-multiple histogram

### Settings
- Portfolio currency (USD / CAD) — switching auto-converts initial equity using live rate
- Initial equity amount and entry date
- Live USD/CAD rate displayed when CAD selected
- Clear all data (danger zone)

---

## Calculations

### Open Positions
| Metric | Formula |
|--------|---------|
| Book Cost | (entry × shares) + $9.99 |
| Initial Risk $ | \|entry − stop\| × shares |
| Initial Risk % | Risk$ / Book Cost |
| Risk % of Equity | Risk$ (converted) / Total Equity |
| Size % of Equity | Book Cost (converted) / Total Equity |
| R Targets | entry ± (N × risk per share) |
| Open Gain $ | (last − entry) × shares (long) / (entry − last) × shares (short) |
| Current R | Open Gain / Initial Risk per share |

### Closed Trades
| Metric | Formula |
|--------|---------|
| P&L $ | dir × (exit − entry) × shares − $19.98 |
| P&L % | P&L$ / Book Cost |
| RR Multiple | dir × (exit − entry) / (entry − stop) |
| Days Held | exit date − entry date |
| Return on Equity | P&L$ / Initial Equity |

*dir = +1 for long, −1 for short*

---

## Tech Stack

- **React 18 + TypeScript** — component architecture and type safety
- **Vite** — build tool and dev server
- **Tailwind CSS** — utility-first dark theme styling
- **Vercel** — hosting and serverless API functions
- **Yahoo Finance API** — live quotes and historical exchange rates (proxied via `/api/quote` and `/api/history`)
- **localStorage** — client-side data persistence

---

## Getting Started

### Prerequisites
- Node.js 18+ ([download here](https://nodejs.org/))
- npm (comes with Node.js)

### Installation

```bash
git clone https://github.com/MackenzieFolk/portfolio-manager.git
cd portfolio-manager
npm install
npm run dev
```

Open `http://localhost:5173/`

> **Note:** Live price fetching requires the Vercel serverless functions. In local dev, prices won't auto-fetch unless you run `vercel dev` instead.

### Production Build

```bash
npm run build
```

---

## Project Structure

```
├── api/
│   ├── quote.ts          # Proxy: live price from Yahoo Finance
│   └── history.ts        # Proxy: historical exchange rate lookup
└── src/
    ├── components/
    │   ├── AddPositionForm.tsx
    │   ├── AddTrancheForm.tsx
    │   ├── ClosePositionForm.tsx
    │   ├── ClosedTradesTable.tsx
    │   ├── CsvImportModal.tsx
    │   ├── EditPositionForm.tsx
    │   ├── PerformanceStats.tsx
    │   ├── PieChart.tsx
    │   ├── PortfolioSummary.tsx
    │   ├── PositionsList.tsx
    │   ├── RHistogram.tsx
    │   └── SettingsModal.tsx
    ├── hooks/
    │   └── usePortfolio.ts   # State management + localStorage
    ├── types/
    │   └── index.ts          # TypeScript types
    ├── utils/
    │   ├── calculations.ts   # Risk, P&L, R-multiple logic
    │   ├── csvImport.ts      # TD Direct CSV parsers
    │   ├── currency.ts       # fmt(), convert(), Currency type
    │   └── fetchQuote.ts     # Yahoo Finance fetch helpers
    ├── App.tsx
    └── main.tsx
```

---

## Data Storage

All data is saved to browser localStorage — no account or backend required.

- Data persists across browser sessions on the same device
- Clearing browser data will delete all records
- Use "Clear All Data" in Settings to reset intentionally

---

## License

MIT — free to use and modify.
