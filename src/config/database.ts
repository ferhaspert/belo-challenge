import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';

export const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DB_URL,
    synchronize: true,
    logging: true,
    entities: [User, Transaction],
    subscribers: [],
    migrations: [],
    ssl: { rejectUnauthorized: false },
}); 
