# Invoice Test Cases Generator

A powerful tool for generating test cases to validate invoice-to-bank-transaction matching AI systems. Generate realistic bank transaction CSVs and corresponding invoice PDFs with various matching scenarios.

## Features

### Test Case Types

#### Perfect Matches
- Transaction perfectly matches invoice (same supplier, amount, date close by, invoice number in description)

#### Discount Cases
- **1% Early Payment Discount** - Transaction amount is 1% less due to early payment discount
- **2% Early Payment Discount** - Transaction amount is 2% less due to early payment discount
- **3% Early Payment Discount** - Transaction amount is 3% less due to early payment discount

#### FX Adjustments
- **FX Gain** - Foreign exchange conversion resulted in paying less EUR than expected
- **FX Loss** - Foreign exchange conversion resulted in paying more EUR than expected

#### Partial Matches
- **Missing Description** - Transaction matches but description is generic (no invoice number)
- **Amount Mismatch** - Small unexplained amount difference (rounding, fees)
- **Date Far Apart** - Transaction date is unusually far from invoice date (30+ days)

## Output Formats

### Bank Transactions CSV
```csv
date;counterparty;description;amount_eur
2025-11-15;TECHSOLUTIONS GMBH;INV-2025-0892 Payment 2% early discount;-9800.0
2025-10-10;V PAY;Selfmade München;-24.46
```

### Invoice PDFs
Professional PDF invoices with:
- Supplier and customer details
- Line items with quantities, prices, and tax
- Payment terms and bank details
- Invoice number and dates

### JSON Metadata
Complete test suite data including:
- Invoice details
- Transaction details
- Matching metadata (which fields match/mismatch)
- Adjustment reasons (discounts, FX rates, etc.)

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173/`

### Build

```bash
npm run build
```

### Deploy to Cloudflare Workers

```bash
npm run deploy
```

## Usage

1. **Configure Date Range**: Set the date range for invoice and transaction dates
2. **Select Test Cases**: Choose the types and quantities of test cases to generate
3. **Generate**: Click "Generate Test Cases" to create the test suite
4. **Download**: Download the complete bundle (CSV + PDFs + JSON) or individual files

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Hono (Cloudflare Workers)
- **PDF Generation**: jsPDF with jspdf-autotable
- **Styling**: Custom CSS with CSS Variables

## API Endpoints

### `GET /api/`
Health check endpoint

### `GET /api/test-case-types`
Returns available test case types and their descriptions

### `POST /api/generate`
Generate test cases

**Request Body:**
```json
{
  "cases": [
    { "type": "perfect_match", "quantity": 5 },
    { "type": "discount_2_percent", "quantity": 3 }
  ],
  "dateRange": {
    "start": "2025-01-01",
    "end": "2025-12-31"
  },
  "customerCompany": {
    "name": "Your Company Name"
  }
}
```

## Extending the Generator

To add new test case types:

1. Add the type to `TestCaseType` in `src/shared/types.ts`
2. Add configuration to `TEST_CASE_CONFIGS` in `src/shared/types.ts`
3. Add generation logic in `generateTransaction()` in `src/shared/generator.ts`
4. Add the type to a category in `TEST_CASE_CATEGORIES` in `src/react-app/App.tsx`

## License

MIT
