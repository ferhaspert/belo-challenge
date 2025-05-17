# Belo Challenge

A transaction management system built with Node.js, Express, TypeScript, and PostgreSQL.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd belo-challenge
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a PostgreSQL database and update the environment variables:
```bash
cp .env.example .env
```
Edit the `.env` file with your database credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=your_database_name
```

4. Start the application:
```bash
npm run dev
# or
yarn dev
```

The server will start on http://localhost:3000 (or the port specified in your environment variables).

## API Endpoints

### Users
- `GET /users` - Get all users

### Transactions
- `GET /transactions?userId=<uuid>` - Get all transactions for a user
- `POST /transactions` - Create a new transaction
  ```json
  {
    "originId": "uuid",
    "destinationId": "uuid",
    "amount": 100.00
  }
  ```
- `PATCH /transactions/:id/status` - Update transaction status
  ```json
  {
    "status": "confirmed" // or "rejected"
  }
  ```

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the project
- `npm run start` - Start the production server
- `npm run lint` - Run linter
- `npm run test` - Run tests

## Project Structure

```
src/
├── config/         # Configuration files
├── models/         # Database models
├── routes/         # API routes
└── index.ts        # Application entry point
```