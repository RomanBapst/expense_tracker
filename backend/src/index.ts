import express from 'express'
import { Request as JWTRequest } from "express-jwt";
import { Prisma } from '@prisma/client';
import myCors from './cors';
import expenseRoute from './routes/expenseRoute';
import quickbooksAuth from './routes/quickbooksAuth';
import { checkJwt } from "./authz";
import prisma from './prisma';
import upload from './multer';

export interface RequestWithFiles extends Express.Request {
  files: Express.Multer.File[];
}

const app = express()

//use cors middleware
app.use(myCors);

app.use(express.json())
app.use("/", quickbooksAuth);
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


app.use("/", expenseRoute);


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

    let data: any = {
      name: req.body.name,
      email: req.body.email
    }

    const user = await prisma.user.create({
      data: data
    })

    res.json(user)

  } catch (error) {
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
  } catch (error) {

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
    const accountData: any = {};

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

  const { title, refundUserId } = req.body

  account.name = title
  account.refundUserId = Number(refundUserId)

  const ret = await prisma.expenseAccount.update({
    where: {
      id: Number(req.params.id)
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
  } catch (error) {

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