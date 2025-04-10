import { Router } from 'express';
import { Prisma } from '@prisma/client';

import { RequestWithFile } from '../multer';

const path = require('path');
const fs = require('fs');

import prisma from '../prisma';

import upload from '../multer';

const router = Router();

router.get('/expenses', async (req, res) => {
  try {
    const { search = '', archived, orderColName = 'title', order = 'asc' } = req.query;

    const sortOrder = order === 'desc' ? 'desc' : 'asc';

    // Set up `orderBy` based on column type
    const orderBy = (() => {
      if (orderColName === 'account') {
        return { account: { name: sortOrder } } as Prisma.ExpenseOrderByWithRelationInput;
      } else if (orderColName === 'author') {
        return { author: { name: sortOrder } } as Prisma.ExpenseOrderByWithRelationInput;
      } else {
        return { [orderColName.toString()]: sortOrder } as Prisma.ExpenseOrderByWithRelationInput;
      }
    })();

    const expenses = await prisma.expense.findMany({
      where: {
        AND: [
          {
            OR: [
              { title: { contains: search.toString(), mode: 'insensitive' } },
              { comment: { contains: search.toString(), mode: 'insensitive' } },
              { author: { name: { contains: search.toString(), mode: 'insensitive' } } },
              { account: { name: { contains: search.toString(), mode: 'insensitive' } } }
            ]
          },
          archived !== undefined ? { archived: archived === 'true' } : {}
        ]
      },
      orderBy,
      include: {
        author: true,
        account: true,
        receipts: {
          select: {
            id: true,
            filename: true
          }
        }
      }
    });

    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'An error occurred while fetching expenses' });
  }
});
// Endpoint to add an expense with an attached file
router.post('/expenses', upload.array('receipts'), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const user = await prisma.user.findFirstOrThrow({
      where: { email: res.locals.user }
    });

    const expenseData: any = {
      title: req.body.title,
      comment: req.body.description,
      createdAt: new Date(req.body.date),
      amount: parseFloat(req.body.amount),
      author: { connect: { id: user.id } },
      receipts: {
        create: files.map(file => ({
          filename: file.filename,
          path: file.path,
        }))
      }
    };

    const expenseAccountId = Number(req.body.expenseAccount);
    if (!isNaN(expenseAccountId)) {
      expenseData.account = { connect: { id: expenseAccountId } };
    }

    const expense = await prisma.expense.create({
      data: expenseData,
      include: { receipts: true }
    });

    res.json(expense);
  } catch (err) {
    console.error("Error adding expense:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});


router.post('/expenses/:id/file', upload.array('files'), async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);

    // Check if the expense exists
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Create Receipt entries for each uploaded file
    const receiptCreates = (req.files as Express.Multer.File[]).map((file) =>
      prisma.receipt.create({
        data: {
          filename: file.filename,
          path: file.path,
          expense: {
            connect: { id: expenseId }
          }
        }
      })
    );

    const newReceipts = await Promise.all(receiptCreates);

    res.json({ success: true, receipts: newReceipts });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/receipt/:id/file', async (req, res) => {
  try {
    // Retrieve the expense ID from the request params
    const expenseId = req.params.id;
    // Retrieve the expense from the database
    const expense = await prisma.receipt.findUnique({
      where: { id: parseInt(expenseId) }
    });
    if (!expense || !expense.path) {
      return res.status(404).json({ error: 'File not found for this expense' });
    }
    const receiptPath = path.resolve(expense.path);
    if (fs.existsSync(receiptPath)) {
      res.sendFile(receiptPath);
    } else {
      res.status(404).json({ error: 'Receipt file not found' });
    }
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Error fetching file' });
  }
});


// GET endpoint to fetch metadata of all receipt files for a specific expense
router.get('/expenses/:id/files', async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);

    const receipts = await prisma.receipt.findMany({
      where: { expenseId }
    });

    if (!receipts || receipts.length === 0) {
      return res.status(404).json({ error: 'No receipt files found for this expense' });
    }

    res.json({ success: true, receipts });
  } catch (error) {
    console.error('Error fetching receipt files:', error);
    res.status(500).json({ error: 'Error fetching receipt files' });
  }
});


router.put('/expenses/:id', upload.array('receipts'), async (req, res) => {
  const expenseId = Number(req.params.id);
  const {
    title,
    description,
    amount,
    date,
    archived,
    expenseAccount,
    removedReceiptIds = '[]'
  } = req.body;

  // Parse the removedReceiptIds JSON string into an array of numbers
  let toRemove: number[];
  try {
    toRemove = JSON.parse(removedReceiptIds);
  } catch {
    return res.status(400).json({ error: 'removedReceiptIds must be a JSON array of IDs' });
  }

  // Fetch existing expense with its receipts
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { receipts: true }
  });
  if (!expense) {
    return res.status(404).json({ error: 'Expense not found' });
  }

  // 1) Remove requested receipts
  for (const rid of toRemove) {
    const receipt = expense.receipts.find(r => r.id === rid);
    if (!receipt) continue;
    const fullPath = path.resolve(receipt.path);
    // delete file from disk
    try { fs.unlinkSync(fullPath); } catch (err) { console.error(`Failed to delete ${fullPath}`, err); }
    // delete record
    await prisma.receipt.delete({ where: { id: rid } });
  }

  // 2) Add any newly uploaded files
  const uploaded = req.files as Express.Multer.File[];
  for (const file of uploaded) {
    await prisma.receipt.create({
      data: {
        filename: file.originalname,
        path: file.path,
        expenseId
      }
    });
  }

  // 3) Build update payload for the expense itself
  const data: any = {
    title,
    comment: description,
    amount: parseFloat(amount),
    createdAt: new Date(date),
  };

  if (expenseAccount) {
    const accId = Number(expenseAccount);
    if (!isNaN(accId)) data.account = { connect: { id: accId } };
  }

  if (archived !== undefined) {
    data.archived = String(archived).toLowerCase() === 'true';
  }

  // 4) Apply the update
  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data,
    include: {
      receipts: true // Include updated receipts in the response
    }
  });

  res.json(updated);
})

router.delete('/expenses/:id', async (req, res) => {
  try {
    const user = await prisma.expense.delete({
      where: {
        id: Number(req.params.id)
      }
    })

    res.json(user)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Check for foreign key constraint violation (P2003)
      if (error.code === 'P2003') {
        return res.status(400).json({
          message: 'Foreign key constraint violation: Cannot delete this expense because it is referenced in another record.'
        });
      }
    }
    // For other errors, return a generic 500 error
    return res.status(500).json({
      message: 'An error occurred while trying to delete the expense.'
    });
  }
})

export default router;