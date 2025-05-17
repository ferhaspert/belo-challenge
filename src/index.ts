import 'dotenv/config';
import 'reflect-metadata';
import express from 'express';
import { AppDataSource } from './config/database';
import routes from './routes';

const app = express();
const port = process.env.PORT || 3000;

// Initialize database connection
AppDataSource.initialize()
    .then(() => {
        console.log('Database connection established');
    })
    .catch((error) => {
        console.error('Error during database initialization:', error);
    });

// Middleware
app.use(express.json());

// Routes
app.use('/api', routes);

app.get('/', (_req, res) => {
    res.send('Hello from TypeScript + Express!');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});