import { Hono } from "hono";
import { cors } from "hono/cors";
import { generateTestSuite, invoiceToPDFData } from "../shared/generator";
import { GenerationRequest, TestCase, TEST_CASE_CONFIGS } from "../shared/types";

const app = new Hono<{ Bindings: Env }>();

// Enable CORS
app.use("*", cors());

// Health check
app.get("/api/", (c) => c.json({ status: "ok", name: "Invoice Test Cases Generator API" }));

// Get available test case types
app.get("/api/test-case-types", (c) => {
  return c.json(TEST_CASE_CONFIGS);
});

// Generate test cases
app.post("/api/generate", async (c) => {
  try {
    const body = await c.req.json<GenerationRequest>();

    if (!body.cases || body.cases.length === 0) {
      return c.json({ error: "No test cases specified" }, 400);
    }

    if (!body.dateRange || !body.dateRange.start || !body.dateRange.end) {
      return c.json({ error: "Date range is required" }, 400);
    }

    const direction = body.direction || 'payables';

    const testSuite = generateTestSuite(
      body.cases,
      direction,
      body.dateRange,
      body.myCompany
    );

    return c.json(testSuite);
  } catch (error) {
    console.error("Generation error:", error);
    return c.json({ error: "Failed to generate test cases" }, 500);
  }
});

// Get invoice PDF data (returns data structure for client-side PDF generation)
app.get("/api/invoice-pdf-data/:testCaseId", async (c) => {
  // This would typically look up from storage, but for now we expect the client to send the data
  return c.json({ error: "Test case not found", hint: "Use the /api/invoice-pdf-data POST endpoint with invoice data" }, 404);
});

// Convert invoice to PDF data format
app.post("/api/invoice-pdf-data", async (c) => {
  try {
    const body = await c.req.json<{ invoice: TestCase["invoice"] }>();

    if (!body.invoice) {
      return c.json({ error: "Invoice data is required" }, 400);
    }

    const pdfData = invoiceToPDFData(body.invoice);
    return c.json(pdfData);
  } catch (error) {
    console.error("PDF data conversion error:", error);
    return c.json({ error: "Failed to convert invoice to PDF data" }, 500);
  }
});

// Batch convert all invoices to PDF data
app.post("/api/batch-invoice-pdf-data", async (c) => {
  try {
    const body = await c.req.json<{ testCases: TestCase[] }>();

    if (!body.testCases || body.testCases.length === 0) {
      return c.json({ error: "Test cases are required" }, 400);
    }

    const pdfDataList = body.testCases.map((tc) => ({
      testCaseId: tc.id,
      invoiceNumber: tc.invoice.number,
      pdfData: invoiceToPDFData(tc.invoice),
    }));

    return c.json({ invoices: pdfDataList });
  } catch (error) {
    console.error("Batch PDF data conversion error:", error);
    return c.json({ error: "Failed to convert invoices to PDF data" }, 500);
  }
});

export default app;
