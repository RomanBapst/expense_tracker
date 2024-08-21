export interface Expense {
    id: Number,
    title: string,
    comment: string,
    amount: string
    createdAt: string,
    receiptPath: string | undefined
    receiptFilename: string | undefined
    archived: boolean
    author : Author
    accountId: Number
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