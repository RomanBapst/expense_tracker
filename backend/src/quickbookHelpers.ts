export function createExpensePayload(args: {
  date: string;             // e.g. "2025-06-20"
  vendorId: string;         // QuickBooks Vendor ID
  paymentAccountId: string; // Bank/CreditCard account ID from which payment is made
  expenseAccountId: string; // Expense category account ID
  amount: number;
  privateNote?: string;
  paymentType?: "Cash" | "CreditCard"; // optional, default "Cash"
}) {
  return {
    TxnDate: args.date,
    PaymentType: args.paymentType || "Cash",
    AccountRef: {
      value: args.paymentAccountId
    },
    EntityRef: {
      type: "Vendor",
      value: args.vendorId
    },
    Line: [
      {
        Amount: args.amount,
        DetailType: "AccountBasedExpenseLineDetail",
        AccountBasedExpenseLineDetail: {
          AccountRef: {
            value: args.expenseAccountId
          }
        }
      }
    ],
    ...(args.privateNote && { PrivateNote: args.privateNote })
  };
}
