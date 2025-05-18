import { AppDataSource } from "../config/database";
import { Transaction } from "../models/Transaction";

const transaction = AppDataSource.getRepository(Transaction);

export const findOne = async (where: any) => {
    return await transaction.findOne(where);
}

export const find = async (where: any) => {
    return await transaction.find(where);
}

export const save = async (t: Transaction) => {
    return transaction.save(t);
}

export const transactionRepository = {
  findOne,
  find,
  save,
};