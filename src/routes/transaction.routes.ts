import { Router, RequestHandler } from "express";
import { AppDataSource } from "../config/database";
import { Transaction, TransactionStatus } from "../models/Transaction";
import { User } from "../models/User";

const router = Router();
const transactionRepository = AppDataSource.getRepository(Transaction);
const userRepository = AppDataSource.getRepository(User);

const getTransactionStatus = (origin: User, destination: User, amount: number) => {
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

// Create new transaction
router.post("/", (async (req, res) => {
  console.log("req.body", req.body);
  try {
    const { originId, destinationId, amount } = req.body;

    if (!originId || !destinationId || !amount) {
      return res
        .status(400)
        .json({ message: "Origin ID, destination ID and amount are required" });
    }

    const origin = await userRepository.findOneBy({ id: originId });
    console.log("origin", origin);
    const destination = await userRepository.findOneBy({ id: destinationId });
    console.log("destination", destination);

    if (!origin || !destination) {
      return res
        .status(404)
        .json({ message: "Origin or destination user not found" });
    }

    if (origin.balance < amount) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    // Start a transaction
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const status = getTransactionStatus(origin, destination, amount);
      const transaction = new Transaction(origin, destination, amount, status);
      const savedTransaction = await queryRunner.manager.save(
        Transaction,
        transaction
      );

      origin.balance -= amount;
      destination.balance += amount;
      await queryRunner.manager.save(User, [origin, destination]);

      // Commit the transaction
      await queryRunner.commitTransaction();
      res.status(201).json(savedTransaction);
    } catch (error) {
      // Rollback in case of error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  } catch (error) {
    res.status(500).json({ message: "Error creating transaction", error });
  }
}) as RequestHandler);

// Update transaction status
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

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (!Object.values(TransactionStatus).includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    transaction.status = status;
    const updatedTransaction = await transactionRepository.save(transaction);
    res.json(updatedTransaction);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating transaction status", error });
  }
}) as RequestHandler);

export default router;
