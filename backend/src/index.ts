import { PrismaClient, Prisma } from '@prisma/client'
import express from 'express'
import cors from 'cors';
import { Request as JWTRequest } from "express-jwt";

import { checkJwt } from "./authz";

import multer from 'multer';
import exp from 'constants';
import { error } from 'console';
import { connect } from 'http2';

const path = require('path');
const fs = require('fs');


// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directory to save uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Append timestamp to the file name
  }
});


const upload = multer({ storage }); // Specify upload directory

// Extend JWTRequest to include file property
interface RequestWithFile extends JWTRequest {
  file?: Express.Multer.File;
}

const prisma = new PrismaClient()
const app = express()



const options: cors.CorsOptions = {
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'X-Access-Token',
    'Authorization'
  ],
  credentials: true,
  methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
  origin: ["http://localhost:" + process.env.FRONTEND_PORT, "http://localhost"],
  preflightContinue: false,
};

//use cors middleware
app.use(cors(options));

app.use(express.json())
app.use(
  checkJwt,
  function (req: JWTRequest, res: express.Response, next) {

    res.locals.user = req.auth?.email
    res.locals.auth = req.auth

    console.log(req.auth)

    prisma.user.findFirstOrThrow({
      where: {
        email: req.auth?.email
      }
    }).then((user) => {
      console.log(user)

      if (req.auth?.email != user.email) {
        return res.sendStatus(401);
      }
      next()
    }).catch((error) => {
      console.log(error)
    })
  }
);



app.get('/employees', async (_req, res) => {
  prisma.employee.findMany({
    include: { department: true }
  }).then((employees) => {
    res.json(employees)
  }).catch((error) => {
    console.log(error)
  })
})

app.get('/departments', async (_req: JWTRequest, res) => {

  prisma.department.findMany().then((departments) => {
    res.json(departments)
  }).catch((error) => {
    console.log(error)
  })
})

app.get('/users', async (req, res) => {
  prisma.user.findMany().then((users) => {
    res.json(users)
  }).catch((error) => {
    console.log(error)
    res.status(500).json({ success: false, error: 'Internal server error' });
  })

})

app.post('/users', upload.single('receipt'), async (req, res) => {
try {

  let data : any = {
    name: req.body.name,
    email : req.body.email
  }

  const user = await prisma.user.create({
    data: data
  })

  res.json(user)

} catch(error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
}

})


app.delete('/users/:id', async (req, res) => {
 try {
  const user = await prisma.user.delete({
    where: {
      id: Number(req.params.id)
    }
  })

  res.json(user)
  } catch(error) {

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Check for foreign key constraint violation (P2003)
      if (error.code === 'P2003') {
        return res.status(400).json({
          message: 'Foreign key constraint violation: Cannot delete this user because it is referenced in another record.'
        });
      }
    }
    // For other errors, return a generic 500 error
    return res.status(500).json({
      message: 'An error occurred while trying to delete the expense.'
    });
  }
})

app.get('/expenses', async (req, res) => {

  prisma.expense.findMany({
    include: {
      author: true,
      account: true,
    }
  }).then((expenses) => {
    res.json(expenses)
  }).catch((error) => {
    console.log(error)
  })
})

// Endpoint to add an expense with an attached file
app.post('/expenses', upload.single('receipt'), async (req, res) => {
  try {
    // Type cast the request to RequestWithFile
    const reqWithFile = req as RequestWithFile;

    const user = await prisma.user.findFirstOrThrow({
      where: {
        email: res.locals.user
      }
    });

    console.log("Found user " + user.email);


    const expenseData: any = {
      title: req.body.title,
      comment: req.body.description,
      createdAt: new Date(req.body.date),
      amount: parseFloat(req.body.amount),
      author: {
        connect: { id: user.id }
      },
    };
    const expenseAccountId = Number(req.body.expenseAccount);
    if (!isNaN(expenseAccountId)) {
      expenseData.account = {
        connect: { id: expenseAccountId }
      };
    }

    // If a file was uploaded, add file details to expenseData
    if (reqWithFile.file) {
      expenseData.receiptFilename = reqWithFile.file.filename;
      expenseData.receiptPath = reqWithFile.file.path;
    }

    const expense = await prisma.expense.create({
      data: expenseData,
      include: {
        author: true,
        account: true
      }
    });

    res.json(expense);
  } catch (error) {
    console.error('Error adding expense:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/expenses/:id/file', upload.single('file'), async (req, res) => {
  try {
    // Get the expense ID from the request params
    const expenseId = req.params.id;
    // Retrieve the expense from the database
    const expense = await prisma.expense.findUnique({
      where: { id: parseInt(expenseId) }
    });
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    // Update the expense record with the file details
    const updatedExpense = await prisma.expense.update({
      where: { id: parseInt(expenseId) },
      data: {
        receiptFilename: req.file.filename,
        receiptPath: req.file.path
      }
    });
    res.json({ success: true, updatedExpense });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET endpoint to fetch the file for a specific expense
app.get('/expenses/:id/file', async (req, res) => {
  try {
    // Retrieve the expense ID from the request params
    const expenseId = req.params.id;
    // Retrieve the expense from the database
    const expense = await prisma.expense.findUnique({
      where: { id: parseInt(expenseId) }
    });
    if (!expense || !expense.receiptFilename || !expense.receiptPath) {
      return res.status(404).json({ error: 'File not found for this expense' });
    }
    const receiptPath = path.resolve(expense.receiptPath);
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

app.put('/expenses/:id', upload.single('receipt'), async (req, res) => {
  const id = Number(req.params.id)

  const expense = await prisma.expense.findUnique({
    where: {
      id: id
    }
  });

  const { title, description, amount, date, archived, removeReceipt} = req.body

  let expenseData: any = {
    title: title,
    comment: description,
    amount: parseFloat(amount),
    createdAt: new Date(date),
  };

    const expenseAccountId = Number(req.body.expenseAccount);
    if (!isNaN(expenseAccountId)) {
      expenseData.account = {
        connect: { id: expenseAccountId }
      };
    }

  if (archived !== undefined) {
    expenseData.archived = archived.toLowerCase() === 'true'
  }

  if (removeReceipt && expense.receiptPath) {

    const rootDir = process.cwd();
    const pathToFile = path.join(rootDir, expense.receiptPath)

    fs.unlink(pathToFile, (err) => {

      if (err) {
        console.log(`Èrror deleting file ${expenseData.receiptPath}`)
        res.status(500).json({ error: 'Error deleting receipt file' });
        return;
      }

    })

    expenseData.receiptFilename = null;
    expenseData.receiptPath = null;
  }

  // Type cast the request to RequestWithFile
  const reqWithFile = req as RequestWithFile;

  // If a file was uploaded, add file details to expenseData
  if (reqWithFile.file) {
    expenseData.receiptFilename = reqWithFile.file.filename;
    expenseData.receiptPath = reqWithFile.file.path;
  }


  const user = await prisma.expense.update({
    where: {
      id : Number(req.params.id)
    },
    data: expenseData
  })
  res.json(user)
})

app.delete('/expenses/:id', async (req, res) => {
  try {
  const user = await prisma.expense.delete({
    where: {
      id: Number(req.params.id)
    }
  })

  res.json(user)
  } catch(error) {
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


app.get('/account', async (req, res) => {
  prisma.expenseAccount.findMany().then((accounts) => {
    console.log(accounts)
    res.json(accounts)
  }).catch((error) => {
    console.log(error)
    res.status(500).json({ success: false, error: 'Internal server error' });
  })
})

app.post('/account', upload.single(''), async (req, res) => {
  try {
    console.log("Headers:", req.headers);   // Log the request headers
    console.log("Body:", req.body);         // Lo
    const { title, refundUserId } = req.body;
    const accountData : any = { };

    accountData.name = title

    console.log(refundUserId)

    if (refundUserId) {
      accountData.refundUserId = Number(refundUserId);
    }

    const account = await prisma.expenseAccount.create({
      data: accountData
    });
    
    res.json(account);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
})
app.put('/account/:id', upload.single(''), async (req, res) => {
  const id = Number(req.params.id)

  let account = await prisma.expenseAccount.findUnique({
    where: {
      id: id
    }
  });

  const { title, refundUserId} = req.body

  account.name = title
  account.refundUserId = Number(refundUserId)

  const ret = await prisma.expenseAccount.update({
    where: {
      id : Number(req.params.id)
    },
    data: account
  })
  res.json(ret)
})

app.delete('/account/:id', async (req, res) => {
 try {
  const user = await prisma.expenseAccount.delete({
    where: {
      id: Number(req.params.id)
    }
  })

  res.json(user)
  } catch(error) {

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Check for foreign key constraint violation (P2003)
      if (error.code === 'P2003') {
        return res.status(400).json({
          message: 'Foreign key constraint violation: Cannot delete this expense account because it is referenced in another record.'
        });
      }
    }
    // For other errors, return a generic 500 error
    return res.status(500).json({
      message: 'An error occurred while trying to delete this expense account.'
    });
  }
})


app.get('/isAdmin', async (req, res) => {
  const namespace = 'https://www.darakuta.com/api/role'
  const roles = res.locals.auth[namespace]

  res.status(200).json({ isAdmin: roles.includes('Admin') })
});



const server = app.listen(80, () =>
  console.log(`
🚀 Server ready at: http://localhost:80`),
)