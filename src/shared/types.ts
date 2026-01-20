// Transaction Direction - Payables (money going out) vs Receivables (money coming in)
export type TransactionDirection = 'payables' | 'receivables';

// Test Case Types
export type TestCaseType =
  | 'perfect_match'
  | 'discount_1_percent'
  | 'discount_2_percent'
  | 'discount_3_percent'
  | 'fx_gain'
  | 'fx_loss'
  | 'partial_match_no_description'
  | 'partial_match_amount_mismatch'
  | 'partial_match_date_far'
  | 'group_payment';

export interface TestCaseConfig {
  type: TestCaseType;
  label: string;
  description: string;
  quantity: number;
}

export interface Company {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  bankName: string;
  iban: string;
  vatId: string;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  tax: number;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  supplier: Company;
  customer: Company;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  note: string;
}

export interface BankTransaction {
  date: string;
  counterparty: string;
  description: string;
  amount_eur: number;
}

export interface TestCase {
  id: string;
  type: TestCaseType;
  direction: TransactionDirection;
  invoice: Invoice;
  invoices?: Invoice[]; // For group payments - multiple invoices
  transaction: BankTransaction;
  metadata: {
    originalAmount: number;
    adjustedAmount: number;
    adjustmentReason?: string;
    discountPercent?: number;
    fxRate?: number;
    matchingFields: string[];
    mismatchedFields: string[];
    groupedInvoiceCount?: number; // For group payments
  };
}

export interface GenerationRequest {
  cases: TestCaseConfig[];
  direction: TransactionDirection;
  dateRange: {
    start: string;
    end: string;
  };
  customerCompany?: Partial<Company>;
}

export interface GeneratedTestSuite {
  id: string;
  createdAt: string;
  direction: TransactionDirection;
  cases: TestCase[];
  csvContent: string;
}

// PDF Invoice package data structure
export interface PDFInvoiceData {
  company: {
    logo: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    bank: string;
  };
  customer: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  invoice: {
    number: number;
    date: string;
    dueDate: string;
    status: string;
    locale: string;
    currency: string;
    path?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    tax: number;
  }>;
  qr?: {
    data: string;
    width: number;
  };
  note: string;
}

export const TEST_CASE_CONFIGS: Record<TestCaseType, { label: string; description: string }> = {
  perfect_match: {
    label: 'Perfect Match',
    description: 'Transaction perfectly matches invoice (same supplier, amount, date close by, invoice number in description)',
  },
  discount_1_percent: {
    label: '1% Early Payment Discount',
    description: 'Transaction amount is 1% less due to early payment discount',
  },
  discount_2_percent: {
    label: '2% Early Payment Discount',
    description: 'Transaction amount is 2% less due to early payment discount',
  },
  discount_3_percent: {
    label: '3% Early Payment Discount',
    description: 'Transaction amount is 3% less due to early payment discount',
  },
  fx_gain: {
    label: 'FX Gain',
    description: 'Foreign exchange conversion resulted in paying less EUR than expected',
  },
  fx_loss: {
    label: 'FX Loss',
    description: 'Foreign exchange conversion resulted in paying more EUR than expected',
  },
  partial_match_no_description: {
    label: 'Partial Match - Missing Description',
    description: 'Transaction matches but description is generic (no invoice number)',
  },
  partial_match_amount_mismatch: {
    label: 'Partial Match - Amount Mismatch',
    description: 'Small unexplained amount difference (rounding, fees)',
  },
  partial_match_date_far: {
    label: 'Partial Match - Date Far Apart',
    description: 'Transaction date is unusually far from invoice date (30+ days)',
  },
  group_payment: {
    label: 'Group Payment',
    description: 'Single transaction covering 2-3 invoices from the same supplier/customer',
  },
};
