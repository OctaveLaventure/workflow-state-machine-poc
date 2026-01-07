# Basic React/Node/TypeScript App

This project consists of a Client (Vite + React + TypeScript) and a Server (Node + Express + TypeScript).

## Structure

- `client/`: Frontend application
- `server/`: Backend application

## Getting Started

### Prerequisites

- Yarn

### Setup

1. Install dependencies in `client`:
   ```bash
   cd client
   yarn install
   ```

2. Install dependencies in `server`:
   ```bash
   cd server
   yarn install
   ```

## Running the App

You can use the VS Code Tasks directly to start both services.

- **Start Client**: Runs the frontend dev server.
- **Start Server**: Runs the backend dev server.

Or manually:

### Client
```bash
cd client
yarn dev
```

### Server
```bash
cd server
yarn dev
```

## API Proxy

The client is configured to proxy requests to `/api` to the server at `http://localhost:3000`.
