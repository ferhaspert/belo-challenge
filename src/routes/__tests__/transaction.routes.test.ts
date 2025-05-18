import { Request, Response } from 'express';
import { Transaction, TransactionStatus } from '../../models/Transaction';
import { User } from '../../models/User';
import { transactionController } from '../../controllers/transaction.controller';
import { userRepository } from '../../repositories/user.reposotory';
import { transactionRepository } from '../../repositories/transaction.repository';
import { AppDataSource } from '../../config/database';

jest.mock('../../repositories/user.reposotory');
jest.mock('../../repositories/transaction.repository');
jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn((entity) => {
      if (entity?.name === 'User') {
        return {
          find: jest.fn(),
          findOneBy: jest.fn(),
          save: jest.fn(),
        };
      }
      if (entity?.name === 'Transaction') {
        return {
          find: jest.fn(),
          save: jest.fn(),
          findOne: jest.fn(),
        };
      }
      return null;
    }),
    createQueryRunner: jest.fn(() => ({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn().mockImplementation((entity, data) => Promise.resolve(data)),
      },
    })),
  },
}));

describe('Transaction Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockQueryRunner: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn().mockImplementation((entity, data) => Promise.resolve(data)),
      },
    };

    (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

    mockRequest = {
      query: {},
      body: {},
      params: {},
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('GET /users', () => {
    it('should return all users', async () => {
      const mockUsers = [
        { id: '1', name: 'User 1', email: 'user1@test.com', balance: 1000 },
        { id: '2', name: 'User 2', email: 'user2@test.com', balance: 2000 },
      ];

      (userRepository.findAllUsers as jest.Mock).mockResolvedValue(mockUsers);

      await transactionController.getUsers(mockRequest as Request, mockResponse as Response);

      expect(userRepository.findAllUsers).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockUsers);
    });

    it('should handle errors when fetching users', async () => {
      const error = new Error('Database error');
      (userRepository.findAllUsers as jest.Mock).mockRejectedValue(error);

      await transactionController.getUsers(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Error fetching users',
        error,
      });
    });
  });

  describe('GET /transactions', () => {
    it('should return transactions for a user', async () => {
      const userId = '123';
      const mockTransactions = [
        {
          id: '1',
          amount: 100,
          status: TransactionStatus.CONFIRMED,
          origin: { id: userId },
          destination: { id: '456' },
        },
      ];

      mockRequest.query = { userId };
      (transactionRepository.find as jest.Mock).mockResolvedValue(mockTransactions);

      await transactionController.getTransactions(mockRequest as Request, mockResponse as Response);

      expect(transactionRepository.find).toHaveBeenCalledWith({
        where: [{ origin: { id: userId } }, { destination: { id: userId } }],
        relations: ['origin', 'destination'],
        order: { createdAt: 'DESC' },
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockTransactions);
    });

    it('should return 400 if userId is not provided', async () => {
      await transactionController.getTransactions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'User ID is required',
      });
    });
  });

  describe('POST /transactions', () => {
    const mockOrigin = new User('Origin User', 'origin@test.com', 1000);
    mockOrigin.id = '123';
    mockOrigin.sentTransactions = [];
    mockOrigin.receivedTransactions = [];
    mockOrigin.createdAt = new Date();
    mockOrigin.updatedAt = new Date();

    const mockDestination = new User('Destination User', 'destination@test.com', 500);
    mockDestination.id = '456';
    mockDestination.sentTransactions = [];
    mockDestination.receivedTransactions = [];
    mockDestination.createdAt = new Date();
    mockDestination.updatedAt = new Date();

    beforeEach(() => {
      mockRequest.body = {
        originId: mockOrigin.id,
        destinationId: mockDestination.id,
        amount: 100,
      };
    });

    it('should create a confirmed transaction for amount <= 50000', async () => {
      (userRepository.findUserById as jest.Mock)
        .mockResolvedValueOnce(mockOrigin)
        .mockResolvedValueOnce(mockDestination);

      const mockTransaction = new Transaction(
        mockOrigin,
        mockDestination,
        100,
        TransactionStatus.CONFIRMED
      );

      mockQueryRunner.manager.save
        .mockResolvedValueOnce(mockTransaction)
        .mockResolvedValueOnce([mockOrigin, mockDestination]);

      await transactionController.createTransaction(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockTransaction);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should create a pending transaction for amount > 50000', async () => {
      mockRequest.body.amount = 60000;
      mockOrigin.balance = 100000;
      (userRepository.findUserById as jest.Mock).mockClear();
      (userRepository.findUserById as jest.Mock)
        .mockResolvedValueOnce(mockOrigin)
        .mockResolvedValueOnce(mockDestination);

      const mockTransaction = new Transaction(
        mockOrigin,
        mockDestination,
        60000,
        TransactionStatus.PENDING
      );
      (transactionRepository.save as jest.Mock).mockResolvedValue(mockTransaction);

      await transactionController.createTransaction(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockTransaction);
    });

    it('should return 400 if required fields are missing', async () => {
      mockRequest.body = {};

      await transactionController.createTransaction(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Origin ID, destination ID and amount are required',
      });
    });

    it('should return 404 if users are not found', async () => {
      (userRepository.findUserById as jest.Mock).mockResolvedValue(null);

      await transactionController.createTransaction(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Origin or destination user not found',
      });
    });

    it('should return 400 if origin has insufficient funds', async () => {
      const poorOrigin = new User('Poor User', 'poor@test.com', 50);
      poorOrigin.id = mockOrigin.id;
      poorOrigin.sentTransactions = [];
      poorOrigin.receivedTransactions = [];
      poorOrigin.createdAt = new Date();
      poorOrigin.updatedAt = new Date();

      (userRepository.findUserById as jest.Mock)
        .mockResolvedValueOnce(poorOrigin)
        .mockResolvedValueOnce(mockDestination);

      await transactionController.createTransaction(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Insufficient funds',
      });
    });

    it('should prevent parallel transaction processing', async () => {
      (userRepository.findUserById as jest.Mock)
        .mockResolvedValueOnce(mockOrigin)
        .mockResolvedValueOnce(mockDestination);

      const firstRequest = transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      );

      const secondRequest = transactionController.createTransaction(
        mockRequest as Request,
        mockResponse as Response
      );

      await Promise.all([firstRequest, secondRequest]);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Another transaction is being processed. Please try again later.',
      });
    });
  });

  describe('PATCH /transactions/:id/status', () => {
    const mockTransaction = {
      id: '123',
      amount: 100,
      status: TransactionStatus.PENDING,
      origin: { id: '1', balance: 1000 },
      destination: { id: '2', balance: 500 },
    };

    beforeEach(() => {
      mockRequest.params = { id: mockTransaction.id };
      mockRequest.body = { status: TransactionStatus.CONFIRMED };
    });

    it('should update transaction status to confirmed', async () => {
      (transactionRepository.findOne as jest.Mock).mockResolvedValue(mockTransaction);
      
      const updatedTransaction = {
        ...mockTransaction,
        status: TransactionStatus.CONFIRMED,
      };

      mockQueryRunner.manager.save
        .mockResolvedValueOnce([mockTransaction.origin, mockTransaction.destination])
        .mockResolvedValueOnce(updatedTransaction);

      await transactionController.updateTransactionStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TransactionStatus.CONFIRMED,
        })
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should return 404 if transaction is not found', async () => {
      (transactionRepository.findOne as jest.Mock).mockResolvedValue(null);

      await transactionController.updateTransactionStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Transaction not found',
      });
    });

    it('should return 400 if status is invalid', async () => {
      mockRequest.body.status = 'invalid_status';

      await transactionController.updateTransactionStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Status must be either "confirmed" or "rejected"',
      });
    });

    it('should return 400 if transaction is not pending', async () => {
      (transactionRepository.findOne as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.CONFIRMED,
      });

      await transactionController.updateTransactionStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Transaction was already confirmed and cannot be modified',
      });
    });
  });
}); 