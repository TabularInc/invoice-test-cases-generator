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
} from './types';
import {
  getRandomSupplier,
  getRandomProducts,
  getRandomGenericDescription,
} from './suppliers';

// Default customer company
const DEFAULT_CUSTOMER: Company = {
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

function generateInvoiceNumber(year: number, sequence: number): string {
  return `INV-${year}-${sequence.toString().padStart(4, '0')}`;
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
  invoiceSequence: number
): Invoice {
  const daysDiff = Math.floor(
    (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const randomDays = randomBetween(0, daysDiff);
  const invoiceDate = addDays(dateRange.start, randomDays);
  const dueDate = addDays(invoiceDate, randomBetween(14, 30)); // Payment terms 14-30 days

  const items = generateInvoiceItems(randomBetween(1, 5));
  const { subtotal, taxTotal, total } = calculateInvoiceTotals(items);

  return {
    id: uuidv4(),
    number: generateInvoiceNumber(invoiceDate.getFullYear(), invoiceSequence),
    date: formatDate(invoiceDate),
    dueDate: formatDate(dueDate),
    supplier,
    customer,
    items,
    subtotal,
    taxTotal,
    total,
    currency: 'EUR',
    note: 'Thank you for your business. Payment due within the specified terms.',
  };
}

// Generate transaction based on test case type
function generateTransaction(
  invoice: Invoice,
  type: TestCaseType
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

  // Format counterparty name for bank statement (uppercase, abbreviations)
  counterparty = invoice.supplier.name.toUpperCase().replace('GMBH', 'GMBH').replace('Ltd', 'LTD');

  switch (type) {
    case 'perfect_match':
      // Transaction 1-7 days after invoice date
      transactionDate = addDays(invoiceDate, randomBetween(1, 7));
      amount = -invoice.total;
      description = `${invoice.number} Payment`;
      metadata.matchingFields = ['counterparty', 'amount', 'invoice_number', 'date_proximity'];
      break;

    case 'discount_1_percent':
      transactionDate = addDays(invoiceDate, randomBetween(1, 5)); // Early payment
      amount = -parseFloat((invoice.total * 0.99).toFixed(2));
      description = `${invoice.number} Payment 1% early discount`;
      metadata.adjustedAmount = -amount;
      metadata.discountPercent = 1;
      metadata.adjustmentReason = '1% early payment discount';
      metadata.matchingFields = ['counterparty', 'invoice_number', 'date_proximity'];
      metadata.mismatchedFields = ['amount (1% discount applied)'];
      break;

    case 'discount_2_percent':
      transactionDate = addDays(invoiceDate, randomBetween(1, 5));
      amount = -parseFloat((invoice.total * 0.98).toFixed(2));
      description = `${invoice.number} Payment 2% early discount`;
      metadata.adjustedAmount = -amount;
      metadata.discountPercent = 2;
      metadata.adjustmentReason = '2% early payment discount';
      metadata.matchingFields = ['counterparty', 'invoice_number', 'date_proximity'];
      metadata.mismatchedFields = ['amount (2% discount applied)'];
      break;

    case 'discount_3_percent':
      transactionDate = addDays(invoiceDate, randomBetween(1, 5));
      amount = -parseFloat((invoice.total * 0.97).toFixed(2));
      description = `${invoice.number} Payment 3% early discount`;
      metadata.adjustedAmount = -amount;
      metadata.discountPercent = 3;
      metadata.adjustmentReason = '3% early payment discount';
      metadata.matchingFields = ['counterparty', 'invoice_number', 'date_proximity'];
      metadata.mismatchedFields = ['amount (3% discount applied)'];
      break;

    case 'fx_gain':
      transactionDate = addDays(invoiceDate, randomBetween(3, 14));
      // FX gain: paid less EUR (favorable rate, 1-5% less)
      const gainRate = randomFloat(0.95, 0.99);
      amount = -parseFloat((invoice.total * gainRate).toFixed(2));
      description = `${invoice.number} FX Payment`;
      metadata.adjustedAmount = -amount;
      metadata.fxRate = gainRate;
      metadata.adjustmentReason = `FX gain (rate: ${gainRate.toFixed(4)})`;
      metadata.matchingFields = ['counterparty', 'invoice_number'];
      metadata.mismatchedFields = ['amount (FX gain)'];
      break;

    case 'fx_loss':
      transactionDate = addDays(invoiceDate, randomBetween(3, 14));
      // FX loss: paid more EUR (unfavorable rate, 1-5% more)
      const lossRate = randomFloat(1.01, 1.05);
      amount = -parseFloat((invoice.total * lossRate).toFixed(2));
      description = `${invoice.number} FX Payment`;
      metadata.adjustedAmount = -amount;
      metadata.fxRate = lossRate;
      metadata.adjustmentReason = `FX loss (rate: ${lossRate.toFixed(4)})`;
      metadata.matchingFields = ['counterparty', 'invoice_number'];
      metadata.mismatchedFields = ['amount (FX loss)'];
      break;

    case 'partial_match_no_description':
      transactionDate = addDays(invoiceDate, randomBetween(1, 10));
      amount = -invoice.total;
      description = getRandomGenericDescription();
      metadata.matchingFields = ['counterparty', 'amount', 'date_proximity'];
      metadata.mismatchedFields = ['description (no invoice number)'];
      break;

    case 'partial_match_amount_mismatch':
      transactionDate = addDays(invoiceDate, randomBetween(1, 10));
      // Small random difference (bank fees, rounding) - 0.1% to 1%
      const mismatchFactor = randomFloat(0.99, 1.01);
      amount = -parseFloat((invoice.total * mismatchFactor).toFixed(2));
      description = `${invoice.number} Payment`;
      metadata.adjustedAmount = -amount;
      metadata.adjustmentReason = 'Unknown amount difference (possible fees or rounding)';
      metadata.matchingFields = ['counterparty', 'invoice_number', 'date_proximity'];
      metadata.mismatchedFields = ['amount (small unexplained difference)'];
      break;

    case 'partial_match_date_far':
      // Transaction 30-60 days after invoice - unusually late payment
      transactionDate = addDays(invoiceDate, randomBetween(30, 60));
      amount = -invoice.total;
      description = `${invoice.number} Late Payment`;
      metadata.matchingFields = ['counterparty', 'amount', 'invoice_number'];
      metadata.mismatchedFields = ['date (30+ days after invoice)'];
      break;

    default:
      transactionDate = addDays(invoiceDate, randomBetween(1, 7));
      amount = -invoice.total;
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
  dateRange: { start: Date; end: Date },
  customer: Company,
  invoiceSequence: number
): TestCase {
  const supplier = getRandomSupplier();
  const invoice = generateInvoice(dateRange, supplier, customer, invoiceSequence);
  const { transaction, metadata } = generateTransaction(invoice, type);

  return {
    id: uuidv4(),
    type,
    invoice,
    transaction,
    metadata,
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
  dateRange: { start: string; end: string },
  customerCompany?: Partial<Company>
): GeneratedTestSuite {
  const customer: Company = {
    ...DEFAULT_CUSTOMER,
    ...customerCompany,
  };

  const parsedDateRange = {
    start: new Date(dateRange.start),
    end: new Date(dateRange.end),
  };

  const testCases: TestCase[] = [];
  let invoiceSequence = randomBetween(100, 999); // Start with random sequence number

  for (const config of configs) {
    for (let i = 0; i < config.quantity; i++) {
      const testCase = generateTestCase(
        config.type,
        parsedDateRange,
        customer,
        invoiceSequence++
      );
      testCases.push(testCase);
    }
  }

  const csvContent = generateCSV(testCases);

  return {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
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
  // Extract invoice number as integer
  const invoiceNumber = parseInt(invoice.number.replace(/\D/g, ''), 10);

  return {
    company: {
      logo: '', // Will use default or can be customized
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
