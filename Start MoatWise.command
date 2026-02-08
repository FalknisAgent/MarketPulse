#!/bin/bash

# MoatWise Launcher
# Double-click this file to start the app!

# Get the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🚀 Starting MoatWise..."
echo "📂 Project Directory: $DIR"

# Check for Node.js
if ! command -v node &> /dev/null; then
    # Try sourcing fnm or nvm if available
    if [ -f "$HOME/.local/bin/fnm" ]; then
        eval "$($HOME/.local/bin/fnm env)"
    elif [ -f "$HOME/.nvm/nvm.sh" ]; then
        source "$HOME/.nvm/nvm.sh"
    fi
fi

if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js not found. Please install Node.js."
    exit 1
fi

# Kill any existing processes on ports 3001 (Server) and 5173 (Client)
echo "🧹 Cleaning up old processes..."
lsof -ti :3001 | xargs kill -9 2>/dev/null
lsof -ti :5173 | xargs kill -9 2>/dev/null

# Start Backend
echo "backend: Starting server on port 3001..."
cd "$DIR/server"
npm run dev &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for backend..."
sleep 3

# Start Frontend
echo "frontend: Starting client..."
cd "$DIR/client"
npm run dev &
CLIENT_PID=$!

# Wait a moment for Vite to start
sleep 2

# Open in Chrome
echo "🌐 Opening App..."
open "http://localhost:5173"

# Keep the terminal window open
wait
