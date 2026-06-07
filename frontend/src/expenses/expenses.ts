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
  SubAccounts?: any[]
  Child?: any[]
  hasChildren?: boolean
  IsParent?: boolean
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

const round2 = (n: number) => Math.round(n * 100) / 100;

export function createExpensePayload(args: {
  date: string;
  vendorId: string;
  accountId: string; // payment account ID (bank/credit card)
  expenseAccountIds: string[]; // multiple category account IDs
  amounts: number[];           // same length as above (tax-INCLUSIVE / gross amounts)
  privateNote?: string;
  paymentType?: 'Cash' | 'CreditCard';
  taxCodeId?: string;
  taxRatePercent?: number;     // e.g. 20 for 20% VAT
  taxRateRefId?: string;       // QuickBooks TaxRate id backing the tax code
}) {
  if (args.expenseAccountIds.length !== args.amounts.length) {
    throw new Error('expenseAccountIds and amounts must be the same length');
  }

  // We treat the entered amounts as gross (tax inclusive). QuickBooks' own
  // GlobalTaxCalculation=TaxInclusive is unreliable for the Purchase entity, so
  // instead we split each amount into net + VAT ourselves and send the net as the
  // line amount, then pin the exact tax via TxnTaxDetail so the total equals the
  // gross the user entered.
  const rate = args.taxCodeId && args.taxRatePercent ? args.taxRatePercent / 100 : 0;
  const applyTax = rate > 0;

  let totalNet = 0;
  let totalTax = 0;

  const lines = args.expenseAccountIds.map((accountId, index) => {
    const gross = args.amounts[index];
    const net = applyTax ? round2(gross / (1 + rate)) : gross;
    const tax = applyTax ? round2(gross - net) : 0;
    totalNet = round2(totalNet + net);
    totalTax = round2(totalTax + tax);

    return {
      Amount: net,
      DetailType: 'AccountBasedExpenseLineDetail',
      AccountBasedExpenseLineDetail: {
        AccountRef: {
          value: accountId
        },
        ...(args.taxCodeId && { TaxCodeRef: { value: args.taxCodeId } }),
      }
    };
  });

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
    GlobalTaxCalculation: applyTax ? 'TaxExcluded' : 'NotApplicable',
    Line: lines,
    ...(applyTax && {
      TxnTaxDetail: {
        TotalTax: totalTax,
        ...(args.taxRateRefId && {
          TaxLine: [
            {
              Amount: totalTax,
              DetailType: 'TaxLineDetail',
              TaxLineDetail: {
                TaxRateRef: { value: args.taxRateRefId },
                PercentBased: true,
                TaxPercent: args.taxRatePercent,
                NetAmountTaxable: totalNet,
              }
            }
          ]
        }),
      }
    }),
    ...(args.privateNote && { PrivateNote: args.privateNote })
  };
}
