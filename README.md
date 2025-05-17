# Belo Challenge

A transaction management system built with Node.js, Express, TypeScript, and PostgreSQL.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd belo-challenge
```

2. Install dependencies:
```bash
npm install
```

3. Create a PostgreSQL database and update the environment variables:
```bash
cp .env.example .env
```
Edit the `.env` file with the database credentials:
```
DB_URL=url
```

4. Start the application:
```bash
npm run dev
```

The server will start on http://localhost:3000 (or the port specified in your environment variables).