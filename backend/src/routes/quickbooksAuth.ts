import { Router } from 'express';
import prisma from '../prisma';

import OAuthClient from 'intuit-oauth'

const router = Router();

const { QB_CLIENT_ID, QB_REDIRECT_URI, QB_CLIENT_SECRET, QB_ENVIRONMENT } = process.env

// Use frontend callback URL for OAuth
const frontendCallbackUrl = process.env.FRONTEND_URL 
  ? `${process.env.FRONTEND_URL}/quickbooks-callback`
  : 'http://localhost:5173/quickbooks-callback';

let qboClient = new OAuthClient({
  clientId: QB_CLIENT_ID,
  clientSecret: QB_CLIENT_SECRET,
  environment: QB_ENVIRONMENT,
  redirectUri: frontendCallbackUrl,
  logging: true,        //NOTE: a "logs" folder will be created/used in the current working directory, this will have oAuthClient-log.log 
});

/**
 * Token Management Functions
 */
async function saveTokenToDatabase(token: any) {
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + token.expires_in);
  
  await prisma.quickBooksToken.upsert({
    where: { realmId: token.realmId },
    update: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: expiresAt,
      updatedAt: new Date(),
    },
    create: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: expiresAt,
      realmId: token.realmId,
      environment: "sandbox", // or get from config
    },
  });
}

async function loadTokenFromDatabase(realmId?: string) {
  try {
    const tokenRecord = await prisma.quickBooksToken.findFirst({
      where: realmId ? { realmId } : {},
      orderBy: { updatedAt: 'desc' }
    });
    
    if (!tokenRecord) return null;
    
    // Check if token is expired
    if (new Date() > tokenRecord.expiresAt) {
      // Token is expired, try to refresh
      if (tokenRecord.refreshToken) {
        try {
          const refreshResponse = await qboClient.refreshUsingToken(tokenRecord.refreshToken);
          const newToken = refreshResponse.getToken();
          await saveTokenToDatabase(newToken);
          return newToken;
        } catch (error) {
          console.error('Failed to refresh token:', error);
          // Delete expired token
          await prisma.quickBooksToken.delete({ where: { id: tokenRecord.id } });
          return null;
        }
      } else {
        // No refresh token, delete expired token
        await prisma.quickBooksToken.delete({ where: { id: tokenRecord.id } });
        return null;
      }
    }
    
    // Return valid token
    return {
      access_token: tokenRecord.accessToken,
      refresh_token: tokenRecord.refreshToken,
      token_type: tokenRecord.tokenType,
      expires_in: Math.floor((tokenRecord.expiresAt.getTime() - new Date().getTime()) / 1000),
      realmId: tokenRecord.realmId,
    };
  } catch (error) {
    console.error('Error loading token from database:', error);
    return null;
  }
}

async function initializeQboClient() {
  const token = await loadTokenFromDatabase();
  
  if (token) {
    qboClient.setToken(token);
  }
}

// Initialize the client with stored token on startup
initializeQboClient();

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

  res.json({ authUrl: authUri });
})

router.get('/callback', async (req, res) => {
  try {
    // Get the full callback URL from the frontend
    const callbackUrl = req.query.callbackUrl as string;
    
    if (!callbackUrl) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing callback URL" 
      });
    }
    
    const authResponse = await qboClient.createToken(callbackUrl);
    const token = authResponse.getToken();
    console.log('Token received from QuickBooks:', token);

    await saveTokenToDatabase(token);
    console.log('Token saved to database');

    qboClient.setToken(token);
    
    // Return success instead of redirecting
    res.json({ 
      success: true, 
      message: 'QuickBooks authentication successful',
      realmId: token.realmId 
    });
  } catch (e) {
    console.error('QuickBooks callback error:', e);
    res.status(500).json({ 
      success: false, 
      error: "Error during OAuth callback",
      details: e.message || e.toString()
    });
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

    let allAccounts: any[] = [];
    let startPosition = 1;
    const maxResults = 1000; // QuickBooks max per page

    while (true) {
      const query = `select * from Account STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;
      const encodedQuery = encodeURIComponent(query);
      const url = `${baseUrl}v3/company/${companyID}/query?query=${encodedQuery}`;

      const response = await qboClient.makeApiCall({ url });
      const accounts = response.json.QueryResponse.Account || [];

      allAccounts = allAccounts.concat(accounts);

      if (accounts.length < maxResults) {
        break; // No more pages
      }
      startPosition += maxResults;
    }

    res.send(allAccounts);
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

router.get('/getTaxCodes', async (req, res) => {
  try {
    const companyID = qboClient.getToken().realmId;

    const baseUrl =
      qboClient.environment === 'sandbox'
        ? OAuthClient.environment.sandbox
        : OAuthClient.environment.production;

    const runQuery = async (q: string) => {
      const url = `${baseUrl}v3/company/${companyID}/query?query=${encodeURIComponent(q)}`;
      const r = await qboClient.makeApiCall({ url });
      return r.json.QueryResponse;
    };

    const allCodes = (await runQuery('select * from TaxCode')).TaxCode || [];
    const allRates = (await runQuery('select * from TaxRate')).TaxRate || [];

    // Map TaxRate Id -> percent (RateValue), so we can resolve a code's purchase rate.
    const rateById: Record<string, number> = {};
    for (const r of allRates) {
      rateById[r.Id] = Number(r.RateValue);
    }

    const activeCodes = allCodes.filter((c: any) => c.Active !== false);

    // Build a clean shape that includes the purchase rate so the frontend can do
    // tax-inclusive math. The first purchase TaxRateDetail is the applicable rate.
    const toShape = (c: any) => {
      const detail = c.PurchaseTaxRateList?.TaxRateDetail?.[0];
      const taxRateRefId = detail?.TaxRateRef?.value;
      return {
        Id: c.Id,
        Name: c.Name,
        TaxRateRefId: taxRateRefId,
        RatePercent: taxRateRefId != null ? (rateById[taxRateRefId] ?? null) : null,
      };
    };

    console.log('All QB tax codes:', JSON.stringify(allCodes.map((c: any) => ({
      Id: c.Id,
      Name: c.Name,
      Active: c.Active,
      hasPurchaseRates: !!(c.PurchaseTaxRateList?.TaxRateDetail?.length),
      ...toShape(c),
    })), null, 2));

    // Prefer codes that have a usable purchase rate; fall back to all active codes
    // so the dropdown never silently empties.
    const purchaseCodes = activeCodes
      .filter((c: any) => c.PurchaseTaxRateList?.TaxRateDetail?.length > 0)
      .map(toShape);

    res.send(purchaseCodes.length > 0 ? purchaseCodes : activeCodes.map(toShape));
  } catch (error) {
    console.error("Error fetching tax codes:", error);
    res.status(500).send({ error: 'Failed to fetch tax codes' });
  }
});

router.get('/api/qb/status', async (req, res) => {
  try {
    const realmId = qboClient.getToken().realmId;
    
    if (!realmId) {
      return res.json({ connected: false });
    }
    
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
    
    // Check if the expense already has QuickBooks data
    if (localExpenseId) {
      const existingExpense = await prisma.expense.findUnique({
        where: { id: Number(localExpenseId) },
        select: { qbExpenseId: true, qbQbId: true, qbEntityType: true }
      });
      
      if (existingExpense && (existingExpense.qbExpenseId || existingExpense.qbQbId)) {
        return res.status(409).json({ 
          error: 'Expense already synced to QuickBooks',
          details: {
            qbExpenseId: existingExpense.qbExpenseId,
            qbQbId: existingExpense.qbQbId,
            qbEntityType: existingExpense.qbEntityType
          }
        });
      }
    }
    
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
        data: {
          qbExpenseId: String(qbExpenseId),
          qbQbId: String(qbExpenseId),
          qbEntityType: 'Expense',
        },
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

router.post('/createTransfer', async (req, res) => {
  try {
    const { fromAccountId, toAccountId, amount, date, localExpenseId, description } = req.body;
    
    // Check if the expense already has QuickBooks data
    if (localExpenseId) {
      const existingExpense = await prisma.expense.findUnique({
        where: { id: Number(localExpenseId) },
        select: { qbExpenseId: true, qbQbId: true, qbEntityType: true }
      });
      
      if (existingExpense && (existingExpense.qbExpenseId || existingExpense.qbQbId)) {
        return res.status(409).json({ 
          error: 'Expense already synced to QuickBooks',
          details: {
            qbExpenseId: existingExpense.qbExpenseId,
            qbQbId: existingExpense.qbQbId,
            qbEntityType: existingExpense.qbEntityType
          }
        });
      }
    }
    
    const realmId = qboClient.getToken().realmId;
    if (!realmId) {
      return res.status(500).json({ error: 'No realmId in QuickBooks token' });
    }

    const baseUrl =
      qboClient.environment === 'sandbox'
        ? OAuthClient.environment.sandbox
        : OAuthClient.environment.production;

    const url = `${baseUrl}v3/company/${realmId}/transfer`;

    // Build the Transfer payload according to QuickBooks API
    const transferPayload = {
      Amount: parseFloat(amount),
      TxnDate: date || new Date().toISOString().split('T')[0],
      FromAccountRef: { value: fromAccountId },
      ToAccountRef: { value: toAccountId },
      ...(description && { PrivateNote: description }),
    };

    console.log('QuickBooks Transfer payload:', transferPayload);

    const response = await qboClient.makeApiCall({
      url,
      method: 'POST',
      body: transferPayload,
    });

    // Extract the QuickBooks transfer id from the response
    const qbTransferId = response.json?.Transfer?.Id;

    // If we have both a local expense id and a QuickBooks id, update the local record
    if (localExpenseId && qbTransferId) {
      await prisma.expense.update({
        where: { id: Number(localExpenseId) },
        data: {
          qbQbId: String(qbTransferId),
          qbEntityType: 'Transfer',
        },
      });
    }

    return res.json(response.json);
  } catch (err) {
    console.error('QuickBooks Transfer API error:', err.response?.body || err.message || err);
    return res.status(400).json({ error: err.response?.body || err.message || 'Bad Request' });
  }
});

// Endpoint to fetch QuickBooks transfer details
router.get('/qb-transfer/:id/details', async (req, res) => {
  try {
    const expenseId = Number(req.params.id);
    // Get the expense to find its qbQbId
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { qbQbId: true }
    });
    if (!expense?.qbQbId) {
      return res.status(404).json({ error: 'Transfer not synced to QuickBooks' });
    }
    const realmId = qboClient.getToken().realmId;
    if (!realmId) {
      return res.status(500).json({ error: 'No realmId in QuickBooks token' });
    }
    const baseUrl = qboClient.environment === 'sandbox'
      ? OAuthClient.environment.sandbox
      : OAuthClient.environment.production;
    const url = `${baseUrl}v3/company/${realmId}/transfer/${expense.qbQbId}`;
    const response = await qboClient.makeApiCall({ url });
    res.json(response.json);
  } catch (err) {
    console.error('Failed to fetch QuickBooks transfer details:', err);
    res.status(500).json({ error: 'Failed to fetch QuickBooks transfer details' });
  }
});

export default router;