import { Router, RequestHandler } from "express";
import { transactionController } from "../controllers/transaction.controller";

const router = Router();
router.get(
  "/users",
  transactionController.getUsers as RequestHandler
);
router.get(
  "/",
  transactionController.getTransactions as RequestHandler
);
router.post(
  "/",
  transactionController.createTransaction as RequestHandler
);
router.patch(
  "/:id/status",
  transactionController.updateTransactionStatus as RequestHandler
);

export default router;
