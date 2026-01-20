import { useState, useCallback } from 'react';
import {
  TestCaseType,
  TestCaseConfig,
  GeneratedTestSuite,
  TEST_CASE_CONFIGS,
  TransactionDirection,
  Invoice,
} from '../shared/types';
import {
  generateInvoicePDF,
  generateAllInvoicesZip,
  downloadBlob,
  downloadCSV,
  downloadJSON,
} from './utils/pdfGenerator';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  FileText,
  Zap,
  ChevronDown,
  Package,
  FileSpreadsheet,
  FolderArchive,
  Code,
  Minus,
  Plus,
  Loader2,
  RotateCcw,
  Sparkles,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

type TestCaseCategory = 'matches' | 'discounts' | 'fx' | 'partial';

const CATEGORY_LABELS: Record<TestCaseCategory, string> = {
  matches: 'Perfect Matches',
  discounts: 'Discount Cases',
  fx: 'FX Adjustments',
  partial: 'Partial Matches',
};

const TEST_CASE_CATEGORIES: Record<TestCaseCategory, TestCaseType[]> = {
  matches: ['perfect_match', 'group_payment'],
  discounts: ['discount_1_percent', 'discount_2_percent', 'discount_3_percent'],
  fx: ['fx_gain', 'fx_loss'],
  partial: ['partial_match_no_description', 'partial_match_amount_mismatch', 'partial_match_date_far'],
};

const getBadgeVariant = (type: TestCaseType): 'success' | 'warning' | 'info' | 'destructive' => {
  if (type === 'perfect_match') return 'success';
  if (type.startsWith('discount')) return 'warning';
  if (type.startsWith('fx')) return 'info';
  return 'destructive';
};

// Quick configuration presets
const QUICK_CONFIGS: { label: string; description: string; cases: Map<TestCaseType, number> }[] = [
  {
    label: 'Basic Mix',
    description: '5 of each type',
    cases: new Map([
      ['perfect_match', 5],
      ['discount_2_percent', 5],
      ['fx_gain', 5],
      ['partial_match_no_description', 5],
    ]),
  },
  {
    label: 'All Types',
    description: '2 of every type',
    cases: new Map([
      ['perfect_match', 2],
      ['discount_1_percent', 2],
      ['discount_2_percent', 2],
      ['discount_3_percent', 2],
      ['fx_gain', 2],
      ['fx_loss', 2],
      ['partial_match_no_description', 2],
      ['partial_match_amount_mismatch', 2],
      ['partial_match_date_far', 2],
    ]),
  },
  {
    label: 'Perfect Only',
    description: '10 perfect matches',
    cases: new Map([['perfect_match', 10]]),
  },
  {
    label: 'Discounts Focus',
    description: '5 of each discount',
    cases: new Map([
      ['discount_1_percent', 5],
      ['discount_2_percent', 5],
      ['discount_3_percent', 5],
    ]),
  },
  {
    label: 'FX Cases',
    description: '5 gains, 5 losses',
    cases: new Map([
      ['fx_gain', 5],
      ['fx_loss', 5],
    ]),
  },
  {
    label: 'Partial Matches',
    description: '5 of each partial',
    cases: new Map([
      ['partial_match_no_description', 5],
      ['partial_match_amount_mismatch', 5],
      ['partial_match_date_far', 5],
    ]),
  },
];

// Get date 1 month ago
function getDefaultStartDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().split('T')[0];
}

function App() {
  const [selectedCases, setSelectedCases] = useState<Map<TestCaseType, number>>(new Map());
  const [direction, setDirection] = useState<TransactionDirection>('payables');
  const [dateRange, setDateRange] = useState({
    start: getDefaultStartDate(),
    end: new Date().toISOString().split('T')[0],
  });
  const [generatedSuite, setGeneratedSuite] = useState<GeneratedTestSuite | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  const updateCaseQuantity = useCallback((type: TestCaseType, quantity: number) => {
    setSelectedCases((prev) => {
      const updated = new Map(prev);
      if (quantity <= 0) {
        updated.delete(type);
      } else {
        updated.set(type, quantity);
      }
      return updated;
    });
    setGeneratedSuite(null); // Clear results when config changes
  }, []);

  const getTotalCases = useCallback(() => {
    let total = 0;
    selectedCases.forEach((qty) => (total += qty));
    return total;
  }, [selectedCases]);

  const toggleExpanded = (id: string) => {
    setExpandedCases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const applyQuickConfig = (cases: Map<TestCaseType, number>) => {
    setSelectedCases(new Map(cases));
    setGeneratedSuite(null); // Clear results when config changes
  };

  const clearAll = () => {
    setSelectedCases(new Map());
    setGeneratedSuite(null);
    setExpandedCases(new Set());
    setDirection('payables');
  };

  const handleGenerate = async () => {
    if (selectedCases.size === 0) {
      return;
    }

    setIsGenerating(true);

    try {
      const configs: TestCaseConfig[] = [];
      selectedCases.forEach((quantity, type) => {
        const config = TEST_CASE_CONFIGS[type];
        configs.push({
          type,
          label: config.label,
          description: config.description,
          quantity,
        });
      });

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cases: configs,
          direction,
          dateRange,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate test cases');
      }

      const suite: GeneratedTestSuite = await response.json();
      setGeneratedSuite(suite);
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate test cases. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!generatedSuite) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${dateStr}_bank_transactions_${generatedSuite.direction}_${generatedSuite.id.slice(0, 8)}.csv`;
    downloadCSV(generatedSuite.csvContent, filename);
  };

  const handleDownloadAllPDFs = async () => {
    if (!generatedSuite) return;
    const invoices = generatedSuite.cases.map((tc) => tc.invoice);
    const zipBlob = await generateAllInvoicesZip(invoices);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${dateStr}_invoices_${generatedSuite.direction}_${generatedSuite.id.slice(0, 8)}.zip`;
    downloadBlob(zipBlob, filename);
  };

  const handleDownloadSinglePDF = (testCaseId: string) => {
    if (!generatedSuite) return;
    const testCase = generatedSuite.cases.find((tc) => tc.id === testCaseId);
    if (!testCase) return;
    const pdfBlob = generateInvoicePDF(testCase.invoice);
    const filename = `${testCase.invoice.number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
    downloadBlob(pdfBlob, filename);
  };

  const handleDownloadGroupInvoicePDF = (invoice: Invoice) => {
    const pdfBlob = generateInvoicePDF(invoice);
    const filename = `${invoice.number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
    downloadBlob(pdfBlob, filename);
  };

  const handleDownloadJSON = () => {
    if (!generatedSuite) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${dateStr}_test_suite_${generatedSuite.direction}_${generatedSuite.id.slice(0, 8)}.json`;
    downloadJSON(generatedSuite, filename);
  };

  const handleDownloadAll = async () => {
    if (!generatedSuite) {
      console.error('No generated suite available');
      return;
    }

    setIsDownloading(true);

    setTimeout(async () => {
      try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        zip.file('bank_transactions.csv', generatedSuite.csvContent);
        zip.file('test_suite_metadata.json', JSON.stringify(generatedSuite, null, 2));

        for (const tc of generatedSuite.cases) {
          try {
            // For group payments, generate PDFs for all invoices in the group
            if (tc.type === 'group_payment' && tc.invoices) {
              for (const invoice of tc.invoices) {
                const pdfBlob = generateInvoicePDF(invoice);
                const fileName = `invoices/${invoice.number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
                zip.file(fileName, pdfBlob);
              }
            } else {
              const pdfBlob = generateInvoicePDF(tc.invoice);
              const fileName = `invoices/${tc.invoice.number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
              zip.file(fileName, pdfBlob);
            }
          } catch (pdfError) {
            console.error(`Error generating PDF for ${tc.invoice.number}:`, pdfError);
          }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `${dateStr}_test_suite_${generatedSuite.direction}_${generatedSuite.id.slice(0, 8)}.zip`;

        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      } catch (error) {
        console.error('Download error:', error);
        alert('Failed to generate download. Please try again.');
      } finally {
        setIsDownloading(false);
      }
    }, 50);
  };

	return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25">
              <FileText className="h-5 w-5 text-white" />
            </div>
			<div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                Invoice Test Cases Generator
              </h1>
              <p className="text-sm text-slate-500">
                Generate matching bank transactions & invoices for AI testing
              </p>
            </div>
          </div>
          {(getTotalCases() > 0 || generatedSuite) && (
            <Button type="button" variant="outline" size="sm" onClick={clearAll} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Configuration Section */}
        <section className="space-y-6">
          {/* Direction Toggle */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">Transaction Type</h3>
                  <p className="text-sm text-slate-500">Choose between outgoing payments or incoming receipts</p>
                </div>
                <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => { setDirection('payables'); setGeneratedSuite(null); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      direction === 'payables'
                        ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Payables
                    <span className="text-xs text-slate-400">(Bills)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDirection('receivables'); setGeneratedSuite(null); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      direction === 'receivables'
                        ? 'bg-white text-green-600 shadow-sm border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    Receivables
                    <span className="text-xs text-slate-400">(Invoices)</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Config + Date Range Row */}
          <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
            {/* Quick Config */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  Quick Configurations
                </CardTitle>
                <CardDescription>Click to quickly set up common test scenarios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {QUICK_CONFIGS.map((config) => (
                    <Button
                      key={config.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickConfig(config.cases)}
                      className="h-auto flex-col items-start gap-0 px-4 py-2 hover:bg-blue-50 hover:border-blue-200"
                    >
                      <span className="font-medium text-slate-700">{config.label}</span>
                      <span className="text-xs text-slate-500">{config.description}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Date Range */}
            <Card className="lg:w-64">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Date Range
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4 lg:flex-col">
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="start-date" className="text-xs text-slate-500">
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => { setDateRange((prev) => ({ ...prev, start: e.target.value })); setGeneratedSuite(null); }}
                  />
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="end-date" className="text-xs text-slate-500">
                    End Date
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => { setDateRange((prev) => ({ ...prev, end: e.target.value })); setGeneratedSuite(null); }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Case Types */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Test Case Types</CardTitle>
                  <CardDescription>Select quantities for each test case type</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-slate-500">Total:</span>
                    <span className="text-2xl font-bold text-blue-600">{getTotalCases()}</span>
                  </div>
                  <Button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating || getTotalCases() === 0}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
			</div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {(Object.keys(TEST_CASE_CATEGORIES) as TestCaseCategory[]).map((category) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                      {CATEGORY_LABELS[category]}
                    </h3>
                    <div className="space-y-2">
                      {TEST_CASE_CATEGORIES[category].map((type) => {
                        const config = TEST_CASE_CONFIGS[type];
                        const quantity = selectedCases.get(type) || 0;
                        return (
                          <div
                            key={type}
                            className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-all ${
                              quantity > 0
                                ? 'border-blue-200 bg-blue-50/50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <p className="text-sm text-slate-700 truncate flex-1" title={config.label}>
                              {config.label}
                            </p>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-500 hover:text-slate-700"
                                onClick={() => updateCaseQuantity(type, quantity - 1)}
                                disabled={quantity <= 0}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={quantity}
                                onChange={(e) =>
                                  updateCaseQuantity(type, parseInt(e.target.value) || 0)
                                }
                                className="h-7 w-12 text-center text-sm px-1 border-slate-200"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-500 hover:text-slate-700"
                                onClick={() => updateCaseQuantity(type, quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Results Section */}
        {generatedSuite ? (
          <section className="space-y-6">
            {/* Results Header with Downloads */}
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">
                        Generated Results
                      </h2>
                      <Badge variant={generatedSuite.direction === 'payables' ? 'info' : 'success'}>
                        {generatedSuite.direction === 'payables' ? (
                          <><ArrowUpRight className="h-3 w-3 mr-1" /> Payables</>
                        ) : (
                          <><ArrowDownLeft className="h-3 w-3 mr-1" /> Receivables</>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">
                      {generatedSuite.cases.length} test cases ready for download
				</p>
			</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={handleDownloadAll}
                      disabled={isDownloading}
                      className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Package className="h-4 w-4" />
                      )}
                      {isDownloading ? 'Generating...' : 'Download Bundle'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleDownloadCSV} className="gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV
                    </Button>
                    <Button type="button" variant="outline" onClick={handleDownloadAllPDFs} className="gap-2">
                      <FolderArchive className="h-4 w-4" />
                      PDFs
                    </Button>
                    <Button type="button" variant="outline" onClick={handleDownloadJSON} className="gap-2">
                      <Code className="h-4 w-4" />
                      JSON
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CSV Preview and Test Cases Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* CSV Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">CSV Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 overflow-x-auto max-h-[400px]">
                    <pre className="text-xs text-slate-600 font-mono whitespace-pre">
                      {generatedSuite.csvContent}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              {/* Test Cases List */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Test Cases ({generatedSuite.cases.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                  {generatedSuite.cases.map((tc) => (
                    <Collapsible
                      key={tc.id}
                      open={expandedCases.has(tc.id)}
                      onOpenChange={() => toggleExpanded(tc.id)}
                    >
                      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                        <CollapsibleTrigger asChild>
                          <button className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <Badge variant={getBadgeVariant(tc.type)} className="text-[10px] mb-1">
                                {TEST_CASE_CONFIGS[tc.type].label}
                              </Badge>
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {tc.invoice.number}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {tc.invoice.supplier.name}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-mono font-medium text-slate-900">
                                €{tc.invoice.total.toFixed(2)}
                              </div>
                              {tc.metadata.adjustedAmount !== tc.invoice.total && (
                                <div className="text-xs font-mono text-amber-600">
                                  → €{Math.abs(tc.transaction.amount_eur).toFixed(2)}
                                </div>
                              )}
                            </div>
                            <ChevronDown
                              className={`h-4 w-4 text-slate-400 transition-transform shrink-0 ${
                                expandedCases.has(tc.id) ? 'rotate-180' : ''
                              }`}
                            />
				</button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t border-slate-100 px-3 py-3 space-y-3 bg-slate-50">
                            {/* For group payments, show all invoices */}
                            {tc.type === 'group_payment' && tc.invoices ? (
                              <div className="space-y-2">
                                <p className="font-semibold text-slate-500 text-xs">
                                  Invoices ({tc.invoices.length})
                                </p>
                                <div className="space-y-1">
                                  {tc.invoices.map((inv) => (
                                    <div
                                      key={inv.id}
                                      className="flex items-center justify-between text-xs bg-white rounded border border-slate-200 px-2 py-1"
                                    >
                                      <span className="font-mono text-slate-700">{inv.number}</span>
                                      <span className="text-slate-500">{inv.date}</span>
                                      <span className="font-mono font-medium text-slate-900">
                                        €{inv.total.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <p className="font-semibold text-slate-500 mb-1">Invoice</p>
                                  <p className="text-slate-700">Date: {tc.invoice.date}</p>
                                  <p className="text-slate-700">Due: {tc.invoice.dueDate}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-500 mb-1">Transaction</p>
                                  <p className="text-slate-700">Date: {tc.transaction.date}</p>
                                  <p className="text-slate-700 truncate" title={tc.transaction.description}>
                                    {tc.transaction.description}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Transaction info for group payments */}
                            {tc.type === 'group_payment' && (
                              <div className="text-xs border-t border-slate-200 pt-2">
                                <p className="font-semibold text-slate-500 mb-1">Transaction</p>
                                <p className="text-slate-700">Date: {tc.transaction.date}</p>
                                <p className="text-slate-700 truncate" title={tc.transaction.description}>
                                  {tc.transaction.description}
				</p>
			</div>
                            )}

                            <div className="flex flex-wrap gap-1">
                              {tc.metadata.matchingFields.map((field) => (
                                <Badge key={field} variant="success" className="text-[10px]">
                                  {field}
                                </Badge>
                              ))}
                              {tc.metadata.mismatchedFields.map((field) => (
                                <Badge key={field} variant="warning" className="text-[10px]">
                                  {field}
                                </Badge>
                              ))}
                            </div>

                            {tc.metadata.adjustmentReason && (
                              <p className="text-xs text-slate-500">{tc.metadata.adjustmentReason}</p>
                            )}

                            {tc.type === 'group_payment' && tc.invoices ? (
                              <div className="space-y-1">
                                {tc.invoices.map((inv) => (
                                  <Button
                                    key={inv.id}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadGroupInvoicePDF(inv);
                                    }}
                                    className="w-full gap-2 text-xs"
                                  >
                                    <FileText className="h-3 w-3" />
                                    Download {inv.number}
                                  </Button>
                                ))}
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadSinglePDF(tc.id);
                                }}
                                className="w-full gap-2 text-xs"
                              >
                                <FileText className="h-3 w-3" />
                                Download PDF
                              </Button>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </CardContent>
              </Card>
            </div>
          </section>
        ) : (
          <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
            <CardContent className="py-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No test cases generated yet</p>
              <p className="text-sm text-slate-400 mt-1">
                Select a quick configuration or customize your test cases above, then click Generate
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
	);
}

export default App;
