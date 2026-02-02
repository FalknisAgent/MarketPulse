# MarketPulse

A stock analysis application with Warren Buffett investment metrics.

## Features

- 📊 **Stock Watchlist** - Track your favorite stocks with real-time quotes
- 📈 **Historical Charts** - Visualize price trends over time
- 🎯 **Buffett Score** - Analyze stocks against Warren Buffett's investment criteria
- 💼 **Portfolio Tracking** - Monitor your holdings and P/L
- 🔒 **Secure** - CSP, CORS, rate limiting, and more

## Tech Stack

- **Frontend**: React, Vite, Recharts, Lucide Icons
- **Backend**: Node.js, Express, Yahoo-Finance2
- **Security**: Helmet, Rate Limiting, CORS

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/MarketPulse.git
cd MarketPulse

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Running Locally

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

Open http://localhost:5173 in your browser.

## Environment Variables

### Client (.env)
```
VITE_API_URL=http://localhost:3001/api
```

### Server (.env)
```
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173
```

## License

MIT
