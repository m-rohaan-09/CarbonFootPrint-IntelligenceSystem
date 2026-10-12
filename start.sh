#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ── Pre-requisite checks ──────────────────────────────
echo -e "${YELLOW}[0/5] Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed. Install via: https://nodejs.org/${NC}"
    exit 1
fi
echo "  Node.js: $(node -v)"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}ERROR: npm is not installed. It should come with Node.js.${NC}"
    exit 1
fi
echo "  npm: $(npm -v)"

PYTHON_CMD=""
PYTHON_AVAILABLE=0
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    PYTHON_AVAILABLE=1
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
    PYTHON_AVAILABLE=1
fi

if [ "$PYTHON_AVAILABLE" -eq 1 ]; then
    echo "  $($PYTHON_CMD --version 2>&1)"
else
    echo -e "${YELLOW}WARNING: Python not found. ML service will not run (JS fallback will be used).${NC}"
fi
echo ""

# ── Install backend dependencies ──────────────────────
echo -e "${YELLOW}[1/5] Installing backend dependencies...${NC}"
cd "$SCRIPT_DIR/backend" && npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to install backend dependencies.${NC}"
    exit 1
fi
echo "  Backend dependencies installed."
echo ""

# ── Install frontend dependencies ─────────────────────
echo -e "${YELLOW}[2/5] Installing frontend dependencies...${NC}"
cd "$SCRIPT_DIR/frontend" && npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to install frontend dependencies.${NC}"
    exit 1
fi
echo "  Frontend dependencies installed."
echo ""

# ── Install Python ML dependencies ────────────────────
if [ "$PYTHON_AVAILABLE" -eq 1 ]; then
    echo -e "${YELLOW}[3/5] Installing Python ML dependencies...${NC}"
    cd "$SCRIPT_DIR/backend/ml"
    $PYTHON_CMD -m pip install -r requirements.txt --quiet 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "  Trying with --user flag..."
        $PYTHON_CMD -m pip install -r requirements.txt --user --quiet 2>/dev/null
    fi
    echo "  Python ML dependencies installed."
else
    echo -e "${YELLOW}[3/5] Skipping Python ML setup (Python not found).${NC}"
fi
echo ""

# ── Create .env if missing ────────────────────────────
echo -e "${YELLOW}[4/5] Checking environment configuration...${NC}"
if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
    echo "  Creating default .env file..."
    cat > "$SCRIPT_DIR/backend/.env" << 'EOF'
PORT=5000
JWT_SECRET=cfis-dev-secret-change-in-production
JWT_REFRESH_SECRET=cfis-dev-refresh-secret-change-in-production
ML_PORT=5001
NODE_ENV=development
EOF
    echo "  Default .env created. Edit backend/.env for production use."
else
    echo "  .env file already exists."
fi
echo ""

# ── Start all services ────────────────────────────────
echo -e "${YELLOW}[5/5] Starting services...${NC}"
echo ""

ML_PID=""
if [ "$PYTHON_AVAILABLE" -eq 1 ]; then
    echo -e "${GREEN}Starting Python ML Service on port 5001...${NC}"
    cd "$SCRIPT_DIR/backend/ml" && $PYTHON_CMD app.py &
    ML_PID=$!
    sleep 3
fi

echo -e "${GREEN}Starting Backend on port 5000...${NC}"
cd "$SCRIPT_DIR/backend" && node server.js &
BACKEND_PID=$!

sleep 2

echo -e "${GREEN}Starting Frontend on port 3000...${NC}"
cd "$SCRIPT_DIR/frontend" && npm start &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  CFIS is running!${NC}"
echo -e "${GREEN}  Backend    → http://localhost:5000${NC}"
echo -e "${GREEN}  Frontend   → http://localhost:3000${NC}"
if [ "$PYTHON_AVAILABLE" -eq 1 ]; then
echo -e "${GREEN}  ML Service → http://localhost:5001${NC}"
fi
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Default login: admin@cfis.com / Admin@1234"
echo ""
echo "  Press Ctrl+C to stop all services"
echo ""

cleanup() {
    echo ""
    echo "Stopping services..."
    [ -n "$ML_PID" ] && kill "$ML_PID" 2>/dev/null
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    exit 0
}

trap cleanup INT TERM
wait
