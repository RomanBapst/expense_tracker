export interface Expense {
    id: Number,
    title: string,
    comment: string,
    amount: string
    createdAt: string,
    receiptPath: string | undefined
    receiptFilename: string | undefined
    receipts: Array<object>
    archived: boolean
    author : Author
    accountId: Number
    account: Account | undefined
    qbExpenseId: string | undefined
  }

export interface Author {
  id: number,
  email: string,
  name: string
}

export interface Account {
  id: number,
  name: string,
  refundUserId: number | undefined
}

export interface QBAccount {
  id: Number,
  name: string
  type: string
}


export interface QBVendor {
  id: Number,
  name: string
}

export interface QBExpenseDetails {
  Id: string;
  TxnDate: string;
  PaymentType: string;
  AccountRef: {
    value: string;
    name: string;
  };
  EntityRef: {
    value: string;
    name: string;
  };
  Line: Array<{
    Amount: number;
    DetailType: string;
    AccountBasedExpenseLineDetail: {
      AccountRef: {
        value: string;
        name: string;
      };
    };
  }>;
  PrivateNote?: string;
}

export function createExpensePayload(args: {
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
