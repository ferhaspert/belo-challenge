import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Transaction } from './Transaction';

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    name!: string;

    @Column({ unique: true })
    email!: string;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    balance!: number;

    @OneToMany(() => Transaction, transaction => transaction.origin)
    sentTransactions!: Transaction[];

    @OneToMany(() => Transaction, transaction => transaction.destination)
    receivedTransactions!: Transaction[];

    constructor(
        name: string,
        email: string,
        balance: number = 0
    ) {
        this.name = name;
        this.email = email;
        this.balance = balance;
    }
}