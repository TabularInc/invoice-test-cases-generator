import { v4 as uuidv4 } from 'uuid';
import {
  TestCase,
  TestCaseType,
  TestCaseConfig,
  Invoice,
  BankTransaction,
  Company,
  InvoiceItem,
  GeneratedTestSuite,
  TransactionDirection,
} from './types';
import {
  getRandomSupplier,
  getRandomProducts,
  getRandomGenericDescription,
  getRandomNameVariation,
} from './suppliers';

// Default company (used as customer for payables, as supplier for receivables)
const DEFAULT_COMPANY: Company = {
  name: 'Acme Corporation GmbH',
  address: 'Musterstraße 123, 10115 Berlin, Germany',
  phone: '+49 30 555 1234',
  email: 'accounting@acme-corp.de',
  website: 'www.acme-corp.de',
  bankName: 'Deutsche Bank AG',
  iban: 'DE89370400440532013001',
  vatId: 'DE987654321',
};

// Utility functions
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function generateInvoiceNumber(year: number, sequence: number, direction: TransactionDirection): string {
  const prefix = direction === 'receivables' ? 'INV' : 'BILL';
  return `${prefix}-${year}-${sequence.toString().padStart(4, '0')}`;
}

// Generate invoice items with realistic prices
function generateInvoiceItems(itemCount: number = 3): InvoiceItem[] {
  const products = getRandomProducts(itemCount);
  return products.map((product) => {
    const quantity = randomBetween(1, 10);
    const priceVariation = randomFloat(0.8, 1.2);
    const price = parseFloat((product.basePrice * priceVariation).toFixed(2));
    const tax = randomBetween(0, 2) === 0 ? 0 : 19; // German VAT or exempt
    return {
      name: product.name,
      quantity,
      price,
      tax,
    };
  });
}

// Calculate invoice totals
function calculateInvoiceTotals(items: InvoiceItem[]): {
  subtotal: number;
  taxTotal: number;
  total: number;
} {
  let subtotal = 0;
  let taxTotal = 0;

  for (const item of items) {
    const itemSubtotal = item.quantity * item.price;
    const itemTax = (itemSubtotal * item.tax) / 100;
    subtotal += itemSubtotal;
    taxTotal += itemTax;
  }

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxTotal: parseFloat(taxTotal.toFixed(2)),
    total: parseFloat((subtotal + taxTotal).toFixed(2)),
  };
}

// Generate a single invoice
function generateInvoice(
  dateRange: { start: Date; end: Date },
  supplier: Company,
  customer: Company,
  invoiceSequence: number,
  direction: TransactionDirection
): Invoice {
  const daysDiff = Math.floor(
    (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const randomDays = randomBetween(0, daysDiff);
  const invoiceDate = addDays(dateRange.start, randomDays);
  const dueDate = addDays(invoiceDate, randomBetween(14, 30)); // Payment terms 14-30 days

  const items = generateInvoiceItems(randomBetween(1, 5));
  const { subtotal, taxTotal, total } = calculateInvoiceTotals(items);

  const note = direction === 'receivables'
    ? 'Thank you for your business. Payment due within the specified terms.'
    : 'Please process payment by the due date. Thank you.';

  return {
    id: uuidv4(),
    number: generateInvoiceNumber(invoiceDate.getFullYear(), invoiceSequence, direction),
    date: formatDate(invoiceDate),
    dueDate: formatDate(dueDate),
    supplier,
    customer,
    items,
    subtotal,
    taxTotal,
    total,
    currency: 'EUR',
    note,
  };
}

// Generate transaction based on test case type and direction
function generateTransaction(
  invoice: Invoice,
  type: TestCaseType,
  direction: TransactionDirection
): { transaction: BankTransaction; metadata: TestCase['metadata'] } {
  const invoiceDate = new Date(invoice.date);
  let transactionDate: Date;
  let amount: number;
  let description: string;
  let counterparty: string;
  const metadata: TestCase['metadata'] = {
    originalAmount: invoice.total,
    adjustedAmount: invoice.total,
    matchingFields: [],
    mismatchedFields: [],
  };

  // For payables: counterparty is the supplier (we pay them)
  // For receivables: counterparty is the customer (they pay us)
  const counterpartyCompany = direction === 'payables' ? invoice.supplier : invoice.customer;
  // Use random name variation for more realistic bank transaction matching scenarios
  counterparty = getRandomNameVariation(counterpartyCompany);

  // Amount sign: negative for payables (money out), positive for receivables (money in)
  const amountSign = direction === 'payables' ? -1 : 1;

  switch (type) {
    case 'perfect_match':
      transactionDate = addDays(invoiceDate, randomBetween(1, 7));
      amount = amountSign * invoice.total;
      description = `${invoice.number} Payment`;
      metadata.matchingFields = ['counterparty', 'amount', 'invoice_number', 'date_proximity'];
      break;

    case 'discount_1_percent':
      transactionDate = addDays(invoiceDate, randomBetween(1, 5));
      amount = amountSign * parseFloat((invoice.total * 0.99).toFixed(2));
      description = `${invoice.number} Payment 1% early discount`;
      metadata.adjustedAmount = Math.abs(amount);
      metadata.discountPercent = 1;
      metadata.adjustmentReason = '1% early payment discount';
      metadata.matchingFields = ['counterparty', 'invoice_number', 'date_proximity'];
      metadata.mismatchedFields = ['amount (1% discount applied)'];
      break;

    case 'discount_2_percent':
      transactionDate = addDays(invoiceDate, randomBetween(1, 5));
      amount = amountSign * parseFloat((invoice.total * 0.98).toFixed(2));
      description = `${invoice.number} Payment 2% early discount`;
      metadata.adjustedAmount = Math.abs(amount);
      metadata.discountPercent = 2;
      metadata.adjustmentReason = '2% early payment discount';
      metadata.matchingFields = ['counterparty', 'invoice_number', 'date_proximity'];
      metadata.mismatchedFields = ['amount (2% discount applied)'];
      break;

    case 'discount_3_percent':
      transactionDate = addDays(invoiceDate, randomBetween(1, 5));
      amount = amountSign * parseFloat((invoice.total * 0.97).toFixed(2));
      description = `${invoice.number} Payment 3% early discount`;
      metadata.adjustedAmount = Math.abs(amount);
      metadata.discountPercent = 3;
      metadata.adjustmentReason = '3% early payment discount';
      metadata.matchingFields = ['counterparty', 'invoice_number', 'date_proximity'];
      metadata.mismatchedFields = ['amount (3% discount applied)'];
      break;

    case 'fx_gain':
      transactionDate = addDays(invoiceDate, randomBetween(3, 14));
      const gainRate = randomFloat(0.95, 0.99);
      // FX gain for payables = paid less, for receivables = received more
      const gainMultiplier = direction === 'payables' ? gainRate : (2 - gainRate);
      amount = amountSign * parseFloat((invoice.total * gainMultiplier).toFixed(2));
      description = `${invoice.number} FX Payment`;
      metadata.adjustedAmount = Math.abs(amount);
      metadata.fxRate = gainRate;
      metadata.adjustmentReason = `FX gain (rate: ${gainRate.toFixed(4)})`;
      metadata.matchingFields = ['counterparty', 'invoice_number'];
      metadata.mismatchedFields = ['amount (FX gain)'];
      break;

    case 'fx_loss':
      transactionDate = addDays(invoiceDate, randomBetween(3, 14));
      const lossRate = randomFloat(1.01, 1.05);
      // FX loss for payables = paid more, for receivables = received less
      const lossMultiplier = direction === 'payables' ? lossRate : (2 - lossRate);
      amount = amountSign * parseFloat((invoice.total * lossMultiplier).toFixed(2));
      description = `${invoice.number} FX Payment`;
      metadata.adjustedAmount = Math.abs(amount);
      metadata.fxRate = lossRate;
      metadata.adjustmentReason = `FX loss (rate: ${lossRate.toFixed(4)})`;
      metadata.matchingFields = ['counterparty', 'invoice_number'];
      metadata.mismatchedFields = ['amount (FX loss)'];
      break;

    case 'partial_match_no_description':
      transactionDate = addDays(invoiceDate, randomBetween(1, 10));
      amount = amountSign * invoice.total;
      description = getRandomGenericDescription();
      metadata.matchingFields = ['counterparty', 'amount', 'date_proximity'];
      metadata.mismatchedFields = ['description (no invoice number)'];
      break;

    case 'partial_match_amount_mismatch':
      transactionDate = addDays(invoiceDate, randomBetween(1, 10));
      const mismatchFactor = randomFloat(0.99, 1.01);
      amount = amountSign * parseFloat((invoice.total * mismatchFactor).toFixed(2));
      description = `${invoice.number} Payment`;
      metadata.adjustedAmount = Math.abs(amount);
      metadata.adjustmentReason = 'Unknown amount difference (possible fees or rounding)';
      metadata.matchingFields = ['counterparty', 'invoice_number', 'date_proximity'];
      metadata.mismatchedFields = ['amount (small unexplained difference)'];
      break;

    case 'partial_match_date_far':
      transactionDate = addDays(invoiceDate, randomBetween(30, 60));
      amount = amountSign * invoice.total;
      description = `${invoice.number} Late Payment`;
      metadata.matchingFields = ['counterparty', 'amount', 'invoice_number'];
      metadata.mismatchedFields = ['date (30+ days after invoice)'];
      break;

    case 'group_payment':
      // This case is handled separately by generateGroupPaymentTestCase
      transactionDate = addDays(invoiceDate, randomBetween(1, 7));
      amount = amountSign * invoice.total;
      description = `${invoice.number} Payment`;
      metadata.matchingFields = ['counterparty', 'amount', 'invoice_number', 'date_proximity'];
      break;

    default:
      transactionDate = addDays(invoiceDate, randomBetween(1, 7));
      amount = amountSign * invoice.total;
      description = `${invoice.number} Payment`;
      metadata.matchingFields = ['counterparty', 'amount', 'invoice_number', 'date_proximity'];
  }

  const transaction: BankTransaction = {
    date: formatDate(transactionDate),
    counterparty,
    description,
    amount_eur: amount,
  };

  return { transaction, metadata };
}

// Generate a single test case
function generateTestCase(
  type: TestCaseType,
  direction: TransactionDirection,
  dateRange: { start: Date; end: Date },
  ourCompany: Company,
  invoiceSequence: number
): TestCase {
  const otherParty = getRandomSupplier();

  // For payables: other party is supplier, we are customer
  // For receivables: we are supplier, other party is customer
  const supplier = direction === 'payables' ? otherParty : ourCompany;
  const customer = direction === 'payables' ? ourCompany : otherParty;

  const invoice = generateInvoice(dateRange, supplier, customer, invoiceSequence, direction);
  const { transaction, metadata } = generateTransaction(invoice, type, direction);

  return {
    id: uuidv4(),
    type,
    direction,
    invoice,
    transaction,
    metadata,
  };
}

// Generate a group payment test case (one transaction for multiple invoices)
function generateGroupPaymentTestCase(
  direction: TransactionDirection,
  dateRange: { start: Date; end: Date },
  ourCompany: Company,
  startingSequence: number
): { testCase: TestCase; invoicesGenerated: number } {
  const otherParty = getRandomSupplier();

  // For payables: other party is supplier, we are customer
  // For receivables: we are supplier, other party is customer
  const supplier = direction === 'payables' ? otherParty : ourCompany;
  const customer = direction === 'payables' ? ourCompany : otherParty;

  // Generate 2-3 invoices from the same counterparty
  const invoiceCount = randomBetween(2, 3);
  const invoices: Invoice[] = [];

  for (let i = 0; i < invoiceCount; i++) {
    const invoice = generateInvoice(dateRange, supplier, customer, startingSequence + i, direction);
    invoices.push(invoice);
  }

  // Calculate total amount
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const amountSign = direction === 'payables' ? -1 : 1;

  // Find the latest invoice date and add a few days for the transaction
  const latestInvoiceDate = invoices.reduce((latest, inv) => {
    const invDate = new Date(inv.date);
    return invDate > latest ? invDate : latest;
  }, new Date(invoices[0].date));

  const transactionDate = addDays(latestInvoiceDate, randomBetween(1, 7));

  // Create description with all invoice numbers
  const invoiceNumbers = invoices.map(inv => inv.number).join(', ');
  const description = `Batch Payment: ${invoiceNumbers}`;

  // Format counterparty name with random variation
  const counterpartyCompany = direction === 'payables' ? supplier : customer;
  const counterparty = getRandomNameVariation(counterpartyCompany);

  const transaction: BankTransaction = {
    date: formatDate(transactionDate),
    counterparty,
    description,
    amount_eur: parseFloat((amountSign * totalAmount).toFixed(2)),
  };

  const metadata: TestCase['metadata'] = {
    originalAmount: parseFloat(totalAmount.toFixed(2)),
    adjustedAmount: parseFloat(totalAmount.toFixed(2)),
    matchingFields: ['counterparty', 'total_amount', 'invoice_numbers', 'date_proximity'],
    mismatchedFields: [],
    groupedInvoiceCount: invoiceCount,
    adjustmentReason: `Group payment covering ${invoiceCount} invoices`,
  };

  return {
    testCase: {
      id: uuidv4(),
      type: 'group_payment',
      direction,
      invoice: invoices[0], // Primary invoice for display
      invoices, // All invoices in the group
      transaction,
      metadata,
    },
    invoicesGenerated: invoiceCount,
  };
}

// Generate CSV content from transactions
function generateCSV(testCases: TestCase[]): string {
  const header = 'date;counterparty;description;amount_eur';
  const rows = testCases.map((tc) => {
    const { date, counterparty, description, amount_eur } = tc.transaction;
    return `${date};${counterparty};${description};${amount_eur}`;
  });

  // Sort by date
  rows.sort((a, b) => {
    const dateA = a.split(';')[0];
    const dateB = b.split(';')[0];
    return dateA.localeCompare(dateB);
  });

  return [header, ...rows].join('\n');
}

// Main generation function
export function generateTestSuite(
  configs: TestCaseConfig[],
  direction: TransactionDirection,
  dateRange: { start: string; end: string },
  companyOverrides?: Partial<Company>
): GeneratedTestSuite {
  const ourCompany: Company = {
    ...DEFAULT_COMPANY,
    ...companyOverrides,
  };

  const parsedDateRange = {
    start: new Date(dateRange.start),
    end: new Date(dateRange.end),
  };

  const testCases: TestCase[] = [];
  let invoiceSequence = randomBetween(100, 999);

  for (const config of configs) {
    for (let i = 0; i < config.quantity; i++) {
      if (config.type === 'group_payment') {
        // Group payments generate multiple invoices per test case
        const { testCase, invoicesGenerated } = generateGroupPaymentTestCase(
          direction,
          parsedDateRange,
          ourCompany,
          invoiceSequence
        );
        testCases.push(testCase);
        invoiceSequence += invoicesGenerated;
      } else {
        const testCase = generateTestCase(
          config.type,
          direction,
          parsedDateRange,
          ourCompany,
          invoiceSequence++
        );
        testCases.push(testCase);
      }
    }
  }

  const csvContent = generateCSV(testCases);

  return {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    direction,
    cases: testCases,
    csvContent,
  };
}

// Convert invoice to PDF package format
export function invoiceToPDFData(invoice: Invoice): {
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
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    tax: number;
  }>;
  qr: {
    data: string;
    width: number;
  };
  note: string;
} {
  const invoiceNumber = parseInt(invoice.number.replace(/\D/g, ''), 10);

  return {
    company: {
      logo: '',
      name: invoice.supplier.name,
      address: invoice.supplier.address,
      phone: invoice.supplier.phone,
      email: invoice.supplier.email,
      website: invoice.supplier.website,
      bank: `${invoice.supplier.bankName}\nIBAN: ${invoice.supplier.iban}\nVAT ID: ${invoice.supplier.vatId}`,
    },
    customer: {
      name: invoice.customer.name,
      address: invoice.customer.address,
      phone: invoice.customer.phone,
      email: invoice.customer.email,
    },
    invoice: {
      number: invoiceNumber,
      date: invoice.date,
      dueDate: invoice.dueDate,
      status: 'Due',
      locale: 'en-US',
      currency: invoice.currency,
    },
    items: invoice.items,
    qr: {
      data: `Invoice: ${invoice.number}\nAmount: ${invoice.currency} ${invoice.total}\nIBAN: ${invoice.supplier.iban}`,
      width: 100,
    },
    note: invoice.note,
  };
}
