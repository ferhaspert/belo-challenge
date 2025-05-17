import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './User';

export enum TransactionStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    REJECTED = 'rejected'
}

@Entity()
export class Transaction {
    @PrimaryGeneratedColumn()
    id!: string;

    @ManyToOne(() => User, user => user.sentTransactions)
    origin!: User;

    @ManyToOne(() => User, user => user.receivedTransactions)
    destination!: User;

    @Column('decimal', { precision: 10, scale: 2 })
    amount!: number;

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING
    })
    status!: TransactionStatus;

    @CreateDateColumn()
    createdAt!: Date;

    constructor(
        origin: User,
        destination: User,
        amount: number,
        status: TransactionStatus = TransactionStatus.PENDING,
        createdAt: Date = new Date()
    ) {
        this.origin = origin;
        this.destination = destination;
        this.amount = amount;
        this.status = status;
        this.createdAt = createdAt;
    }
} 