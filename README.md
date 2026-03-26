# Portfolio Manager App

A modern, dark-themed portfolio management application for tracking trading positions, calculating risk/reward metrics, and analyzing closed trades.

## Features

- 📊 **Real-time Portfolio Tracking** - Monitor your equity, cash, and positions in one view
- 📝 **Position Entry** - Add positions with ticker, entry date, type (long/short), shares, entry price, and stop price
- 🎯 **Automatic Calculations** - Calculates book cost, initial risk ($&%), and 2-5R target prices
- ❌ **Position Closing** - Close positions with exit price, date, and reason
- 📈 **Trade Analytics** - View detailed closed trade history with P&L, RR multiple, return on equity, and days held
- 💾 **Auto-Save** - All data persists to browser localStorage
- 🌙 **Dark Theme** - Easy on the eyes professional trading interface

## Calculations

### For each open position:
- **Book Cost** = (entry price × shares) + $9.99 commission
- **Initial Risk ($)** = (entry price - stop price) × shares
- **Initial Risk (%)** = Risk$ / Book Cost
- **Risk % of Equity** = Risk$ / Total Equity
- **R Targets** = entry price + (R × risk per share) for 2R, 3R, 4R, 5R

### For each closed trade:
- **P&L ($)** = (exit price - entry price) × shares - $19.98 total commission
- **P&L (%)** = P&L$ / Book Cost
- **RR Multiple** = (exit price - entry price) / (entry price - stop price)
- **Days Held** = exit date - entry date
- **Return on Equity (%)** = P&L$ / Initial Equity

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- localStorage (data persistence)

## Getting Started

### Prerequisites
- Node.js 16+ ([download here](https://nodejs.org/))
- npm (comes with Node.js)

### Installation

1. Clone or download this repository
2. Navigate to the project directory:
   ```bash
   cd "Portfolio manager app"
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser to `http://localhost:5173/`

## Usage

1. **Initial Setup**: Click "Settings" and enter your starting equity (e.g., $10,000)
2. **Add Position**: Click "Add New Position" and fill in:
   - Ticker symbol
   - Entry date
   - Type (Long or Short)
   - Number of shares
   - Entry price
   - Stop loss price
   - Entry reason (optional)
3. **View Calculations**: Preview shows all calculated metrics in real-time
4. **Close Position**: Click the "Close" button on any position, enter:
   - Exit price
   - Exit date
   - Exit reason (optional)
5. **View History**: Switch to "Closed Trades" tab to see all closed positions with analytics

## Data Storage

All data is saved to your browser's localStorage. This means:
- ✅ Data persists across browser sessions
- ✅ No login required
- ⚠️ Data is local to this browser/device only
- ⚠️ Clearing browser data will delete your records

**Tip**: Regularly export your data or use a database backend for production use.

## Building for Production

```bash
npm run build
```

This creates an optimized `dist/` folder ready for deployment to services like Vercel, Netlify, or a web server.

## Project Structure

```
src/
├── components/          # React components
│   ├── AddPositionForm.tsx
│   ├── ClosePositionForm.tsx
│   ├── ClosedTradesTable.tsx
│   ├── PortfolioSummary.tsx
│   ├── PositionsList.tsx
│   └── SettingsModal.tsx
├── hooks/
│   └── usePortfolio.ts  # State management
├── types/
│   └── index.ts        # TypeScript types
├── utils/
│   └── calculations.ts # All calculation logic
├── App.tsx             # Main app component
└── main.tsx            # Entry point
```

## Future Enhancements

- Backend integration for data persistence
- Export to CSV/Excel
- Performance charts and statistics
- Win rate, Profit factor calculations
- Position tags and filtering
- Real-time price data integration
- Mobile app version

## License

MIT - Free to use and modify

## Support

Questions or issues? Feel free to reach out or create an issue.

---

**Happy Trading! 📈**
