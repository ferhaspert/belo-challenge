import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';

export const AppDataSource = new DataSource({
    type: 'postgres',
    // url: 'postgresql://postgres:4qH9BN8XF78H7Ql3@db.awvkoxcccxujvpdnhfky.supabase.co:5432/postgres',
    url: 'postgresql://postgres.awvkoxcccxujvpdnhfky:4qH9BN8XF78H7Ql3@aws-0-us-east-2.pooler.supabase.com:6543/postgres',
    synchronize: true, // Set to false in production
    logging: true,
    entities: [User, Transaction],
    subscribers: [],
    migrations: [],
    ssl: { rejectUnauthorized: false },
}); 
