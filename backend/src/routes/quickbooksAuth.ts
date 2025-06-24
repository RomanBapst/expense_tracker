import { Router } from 'express';
import prisma from '../prisma';

import OAuthClient from 'intuit-oauth'



const router = Router();

const { QB_CLIENT_ID, QB_REDIRECT_URI, QB_CLIENT_SECRET } = process.env
let qboClient = new OAuthClient({
  clientId: QB_CLIENT_ID,
  clientSecret: QB_CLIENT_SECRET,
  environment: "sandbox",
  redirectUri: QB_REDIRECT_URI,
  logging: true,        //NOTE: a "logs" folder will be created/used in the current working directory, this will have oAuthClient-log.log 
});

/**
 * App Variables
 * @type {null}
 */
let oauth2_token_json = null



function createExpensePayload(args: {
  date: string;
  vendorId: string;
  accountId: string; // payment account ID (bank/credit card)
  expenseAccountIds: string[]; // multiple category account IDs
  amounts: number[];           // same length as above
  privateNote?: string;
  paymentType?: 'Cash' | 'CreditCard';
}) {
  if (args.expenseAccountIds.length !== args.amounts.length) {
    throw new Error('expenseAccountIds and amounts must be the same length');
  }

  const lines = args.expenseAccountIds.map((accountId, index) => ({
    Amount: args.amounts[index],
    DetailType: 'AccountBasedExpenseLineDetail',
    AccountBasedExpenseLineDetail: {
      AccountRef: {
        value: accountId
      }
    }
  }));

  return {
    TxnDate: args.date,
    PaymentType: args.paymentType || 'Cash',
    AccountRef: {
      value: args.accountId
    },
    EntityRef: {
      type: 'Vendor',
      value: args.vendorId
    },
    Line: lines,
    ...(args.privateNote && { PrivateNote: args.privateNote })
  };
}

router.get('/api/auth/redirect', async (req, res) => {

  const authUri = qboClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId, OAuthClient.scopes.Profile, OAuthClient.scopes.Email],
    state: 'intuit-test',
  });


  res.send(authUri);
})

router.get('/callback', async (req, res) => {
  try {
    const authResponse = await qboClient.createToken(req.url);
    oauth2_token_json = JSON.stringify(authResponse.json, null, 2);
    qboClient.setToken(authResponse.getToken());
    // redirect only after token is successfully created
    res.redirect('http://localhost/expenses');
  } catch (e) {
    console.error(e);
    res.status(500).send("Error during OAuth callback");
  }
});

router.get('/getCompanyInfo', function (req, res) {
  const companyID = qboClient.getToken().realmId;

  const url =
    qboClient.environment == 'sandbox'
      ? OAuthClient.environment.sandbox
      : OAuthClient.environment.production;

  qboClient
    .makeApiCall({ url: `${url}v3/company/${companyID}/companyinfo/${companyID}` })
    .then(function (authResponse) {
      res.send(authResponse.json);
    })
    .catch(function (e) {
      console.error(e);
    });
});


router.get('/getAccounts', async (req, res) => {
  try {
    const companyID = qboClient.getToken().realmId;

    const baseUrl =
      qboClient.environment === 'sandbox'
        ? OAuthClient.environment.sandbox
        : OAuthClient.environment.production;

    const query = `select * from Account`;
    const encodedQuery = encodeURIComponent(query);
    const url = `${baseUrl}v3/company/${companyID}/query?query=${encodedQuery}`;

    const response = await qboClient.makeApiCall({ url });

    res.send(response.json.QueryResponse.Account || []);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    res.status(500).send({ error: 'Failed to fetch accounts' });
  }
});

router.get('/getVendors', async (req, res) => {
  try {
    const companyID = qboClient.getToken().realmId;

    const baseUrl =
      qboClient.environment === 'sandbox'
        ? OAuthClient.environment.sandbox
        : OAuthClient.environment.production;

    const query = `select * from Vendor`;
    const encodedQuery = encodeURIComponent(query);
    const url = `${baseUrl}v3/company/${companyID}/query?query=${encodedQuery}`;

    const response = await qboClient.makeApiCall({ url });

    res.send(response.json.QueryResponse.Vendor || []);
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).send({ error: 'Failed to fetch vendors' });
  }
});

router.get('/api/qb/status', async (req, res) => {
  try {
    const realmId = qboClient.getToken().realmId;
    if (!realmId) return res.json({ connected: false });
    // Make a lightweight call to verify token is valid
    const baseUrl = qboClient.environment === 'sandbox'
      ? OAuthClient.environment.sandbox
      : OAuthClient.environment.production;
    const url = `${baseUrl}v3/company/${realmId}/companyinfo/${realmId}`;
    const result = await qboClient.makeApiCall({ url });
    // If we got CompanyInfo, consider connected
    if (result?.json?.CompanyInfo) {
      return res.json({ connected: true });
    }
    return res.json({ connected: false });
  } catch (err) {
    console.error('QB status check failed:', err);
    // If refresh-token expired or other error, signal disconnected
    return res.json({ connected: false });
  }
});


router.post('/createExpense', async (req, res) => {
  try {
    const payload = req.body;
    const { localExpenseId, ...qbPayload } = payload; // The local expense id should be sent from the frontend
    const realmId = qboClient.getToken().realmId;
    if (!realmId) {
      return res.status(500).json({ error: 'No realmId in QuickBooks token' });
    }

    const baseUrl =
      qboClient.environment === 'sandbox'
        ? OAuthClient.environment.sandbox
        : OAuthClient.environment.production;

    const url = `${baseUrl}v3/company/${realmId}/purchase`;

    console.log("making request with payload", JSON.stringify(qbPayload, null, 2));

    const response = await qboClient.makeApiCall({
      url,
      method: 'POST',
      body: qbPayload,
    });

    // Extract the QuickBooks expense id from the response
    const qbExpenseId = response.json?.Purchase?.Id;

    // If we have both a local expense id and a QuickBooks id, update the local record
    if (localExpenseId && qbExpenseId) {
      await prisma.expense.update({
        where: { id: Number(localExpenseId) },
        data: { qbExpenseId: String(qbExpenseId) },
      });
    }

    return res.json(response.json);
  } catch (err) {
    console.error('QuickBooks API error:', err.response?.body || err.message || err);
    return res.status(400).json({ error: err.response?.body || err.message || 'Bad Request' });
  }
});

// Endpoint to update an Expense with the QuickBooks expense id
router.post('/expenses/:id/qb-id', async (req, res) => {
  const expenseId = Number(req.params.id);
  const { qbExpenseId } = req.body;
  if (!qbExpenseId) {
    return res.status(400).json({ error: 'Missing qbExpenseId' });
  }
  try {
    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: { qbExpenseId },
    });
    res.json({ success: true, expense: updated });
  } catch (err) {
    console.error('Failed to update qbExpenseId:', err);
    res.status(500).json({ error: 'Failed to update qbExpenseId' });
  }
});

// Endpoint to fetch QuickBooks expense details
router.get('/qb-expense/:id/details', async (req, res) => {
  try {
    const expenseId = Number(req.params.id);
    
    // Get the expense to find its qbExpenseId
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { qbExpenseId: true }
    });
    
    if (!expense?.qbExpenseId) {
      return res.status(404).json({ error: 'Expense not synced to QuickBooks' });
    }
    
    const realmId = qboClient.getToken().realmId;
    if (!realmId) {
      return res.status(500).json({ error: 'No realmId in QuickBooks token' });
    }
    
    const baseUrl = qboClient.environment === 'sandbox'
      ? OAuthClient.environment.sandbox
      : OAuthClient.environment.production;
    
    const url = `${baseUrl}v3/company/${realmId}/purchase/${expense.qbExpenseId}`;
    
    const response = await qboClient.makeApiCall({ url });
    
    res.json(response.json);
  } catch (err) {
    console.error('Failed to fetch QuickBooks expense details:', err);
    res.status(500).json({ error: 'Failed to fetch QuickBooks expense details' });
  }
});

export default router;