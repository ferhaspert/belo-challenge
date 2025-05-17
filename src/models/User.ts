import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Transaction } from './Transaction';

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    name!: string;

    @Column({ unique: true })
    email!: string;

    @Column('decimal', { 
        precision: 19,  // Total number of digits
        scale: 4,      // Number of decimal places
        default: 0,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number(value)
        }
    })
    balance!: number;

    @OneToMany(() => Transaction, transaction => transaction.origin)
    sentTransactions!: Transaction[];

    @OneToMany(() => Transaction, transaction => transaction.destination)
    receivedTransactions!: Transaction[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

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