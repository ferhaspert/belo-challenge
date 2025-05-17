import { Router, RequestHandler } from "express";
import { AppDataSource } from "../config/database";
import { Transaction, TransactionStatus } from "../models/Transaction";
import { User } from "../models/User";

const router = Router();
const transactionRepository = AppDataSource.getRepository(Transaction);
const userRepository = AppDataSource.getRepository(User);

// TODO seria bueno imeplementar un semafoto real para controlar el flujo de transacciones
// Aca solo agregue una variable pero no es suficiente en un entorno real
let isProcessingTransaction = false;

const getTransactionStatus = (amount: number) => {
  if (amount > 50000) {
    return TransactionStatus.PENDING;
  }
  return TransactionStatus.CONFIRMED;
};

router.get("/users", (async (_req, res) => {
  try {
    const users = await userRepository.find();
    return res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
}) as RequestHandler);

router.get("/", (async (req, res) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const transactions = await transactionRepository.find({
      where: [{ origin: { id: userId } }, { destination: { id: userId } }],
      relations: ["origin", "destination"],
      order: { createdAt: "DESC" },
    });
    return res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching transactions", error });
  }
}) as RequestHandler);

router.post("/", (async (req, res) => {
  console.log("req.body", req.body);
  
  // Check if another transaction is being processed
  if (isProcessingTransaction) {
    return res.status(409).json({ 
      message: "Another transaction is being processed. Please try again later." 
    });
  }

  try {
    isProcessingTransaction = true;
    const { originId, destinationId, amount } = req.body;

    if (!originId || !destinationId || !amount) {
      isProcessingTransaction = false;
      return res
        .status(400)
        .json({ message: "Origin ID, destination ID and amount are required" });
    }

    const origin = await userRepository.findOneBy({ id: originId });
    const destination = await userRepository.findOneBy({ id: destinationId });

    if (!origin || !destination) {
      isProcessingTransaction = false;
      return res
        .status(404)
        .json({ message: "Origin or destination user not found" });
    }

    if (Number(origin.balance) < Number(amount)) {
      isProcessingTransaction = false;
      return res.status(400).json({ message: "Insufficient funds" });
    }

    const status = getTransactionStatus(amount);
    console.log("status", status);
    const transaction = new Transaction(origin, destination, amount, status);

    if (status === TransactionStatus.CONFIRMED) {
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const savedTransaction = await queryRunner.manager.save(
          Transaction,
          transaction
        );
        origin.balance -= Number(amount);
        destination.balance += Number(amount);
        await queryRunner.manager.save(User, [origin, destination]);
        await queryRunner.commitTransaction();
        res.status(201).json(savedTransaction);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } else {
      console.log("transaction", transaction);
      const savedTransaction = await transactionRepository.save(transaction);
      console.log("savedTransaction", savedTransaction);
      res.status(201).json(savedTransaction);
    }
  } catch (error) {
    res.status(500).json({ message: "Error creating transaction", error });
  } finally {
    isProcessingTransaction = false;
  }
}) as RequestHandler);

router.patch("/:id/status", (async (req, res) => {
  const validStatuses = [
    TransactionStatus.CONFIRMED,
    TransactionStatus.REJECTED,
  ];
  if (!req.body.status || !validStatuses.includes(req.body.status)) {
    return res
      .status(400)
      .json({ message: 'Status must be either "confirmed" or "rejected"' });
  }
  try {
    const { status } = req.body;
    const transaction = await transactionRepository.findOne({
      where: { id: req.params.id },
      relations: ["origin", "destination"],
    });
    console.log("transaction", transaction);

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (!Object.values(TransactionStatus).includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      return res.status(400).json({
        message: `Transaction was already ${transaction.status} and cannot be modified`,
      });
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (
        status === TransactionStatus.CONFIRMED &&
        transaction.status === TransactionStatus.PENDING
      ) {
        const origin = transaction.origin;
        const destination = transaction.destination;
        const amount = transaction.amount;

        console.log("origin.balance", origin.balance);
        console.log("amount", amount);
        if (Number(origin.balance) < Number(amount)) {
          console.log("origin.balance < amount", Number(origin.balance) < Number(amount));
          await queryRunner.rollbackTransaction();
          return res.status(400).json({ message: "Insufficient funds" });
        }

        origin.balance -= Number(amount);
        destination.balance += Number(amount);
        await queryRunner.manager.save(User, [origin, destination]);
      }

      transaction.status = status;
      const updatedTransaction = await queryRunner.manager.save(
        Transaction,
        transaction
      );

      await queryRunner.commitTransaction();
      res.json(updatedTransaction);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating transaction status", error });
  }
}) as RequestHandler);

export default router;
