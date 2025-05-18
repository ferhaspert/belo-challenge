import { AppDataSource } from "../config/database";
import { User } from "../models/User";

const user = AppDataSource.getRepository(User);

export const findAllUsers = async () => {
  try {
    return await user.find();
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const findUserById = async (id: string) => {
  try {
    return await user.findOneBy({ id });
  } catch (error) {
    console.error('Error fetching user by id:', error);
    throw error;
  }
};

export const userRepository = {
  findAllUsers,
  findUserById,
};