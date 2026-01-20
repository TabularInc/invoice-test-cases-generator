import { useState, useCallback } from 'react';
import {
  TestCaseType,
  TestCaseConfig,
  GeneratedTestSuite,
  TEST_CASE_CONFIGS,
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
} from 'lucide-react';

type TestCaseCategory = 'matches' | 'discounts' | 'fx' | 'partial';

const CATEGORY_LABELS: Record<TestCaseCategory, string> = {
  matches: 'Perfect Matches',
  discounts: 'Discount Cases',
  fx: 'FX Adjustments',
  partial: 'Partial Matches',
};

const TEST_CASE_CATEGORIES: Record<TestCaseCategory, TestCaseType[]> = {
  matches: ['perfect_match'],
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
  };

  const clearAll = () => {
    setSelectedCases(new Map());
    setGeneratedSuite(null);
    setExpandedCases(new Set());
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
    const filename = `bank_transactions_${generatedSuite.id.slice(0, 8)}.csv`;
    downloadCSV(generatedSuite.csvContent, filename);
  };

  const handleDownloadAllPDFs = async () => {
    if (!generatedSuite) return;
    const invoices = generatedSuite.cases.map((tc) => tc.invoice);
    const zipBlob = await generateAllInvoicesZip(invoices);
    const filename = `invoices_${generatedSuite.id.slice(0, 8)}.zip`;
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

  const handleDownloadJSON = () => {
    if (!generatedSuite) return;
    const filename = `test_suite_${generatedSuite.id.slice(0, 8)}.json`;
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
            const pdfBlob = generateInvoicePDF(tc.invoice);
            const fileName = `invoices/${tc.invoice.number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
            zip.file(fileName, pdfBlob);
          } catch (pdfError) {
            console.error(`Error generating PDF for ${tc.invoice.number}:`, pdfError);
          }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const filename = `test_suite_complete_${generatedSuite.id.slice(0, 8)}.zip`;

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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/25">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Invoice Test Cases Generator</h1>
              <p className="text-sm text-muted-foreground">
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
      <main className="container mx-auto px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            {/* Quick Config */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
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
                      className="h-auto flex-col items-start gap-0 px-3 py-2"
                    >
                      <span className="font-medium">{config.label}</span>
                      <span className="text-xs text-muted-foreground">{config.description}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Date Range & Test Cases in a row on larger screens */}
            <div className="grid gap-6 xl:grid-cols-[200px_1fr]">
              {/* Date Range */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Date Range</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date" className="text-xs">
                      Start Date
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date" className="text-xs">
                      End Date
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Test Case Types */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Test Case Types</CardTitle>
                  <CardDescription>Select quantities for each test case type</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {(Object.keys(TEST_CASE_CATEGORIES) as TestCaseCategory[]).map((category) => (
                    <div key={category} className="space-y-3">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {CATEGORY_LABELS[category]}
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {TEST_CASE_CATEGORIES[category].map((type) => {
                          const config = TEST_CASE_CONFIGS[type];
                          const quantity = selectedCases.get(type) || 0;
                          return (
                            <div
                              key={type}
                              className={`flex items-center justify-between gap-2 rounded-lg border p-2 transition-all ${
                                quantity > 0
                                  ? 'border-primary/50 bg-primary/5'
                                  : 'hover:border-muted-foreground/30'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate" title={config.label}>
                                  {config.label}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
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
                                  className="h-7 w-12 text-center text-sm px-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
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
                </CardContent>
              </Card>
            </div>

            {/* Generate Button */}
            <Card>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground text-sm">Total:</span>
                  <span className="text-2xl font-bold text-primary">{getTotalCases()}</span>
                  <span className="text-muted-foreground text-sm">test cases</span>
                </div>
                <Button
                  type="button"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isGenerating || getTotalCases() === 0}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Generate Test Cases
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Download Options - Always visible when results exist */}
            {generatedSuite ? (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Downloads</CardTitle>
                    <CardDescription>{generatedSuite.cases.length} test cases generated</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      type="button"
                      onClick={handleDownloadAll}
                      disabled={isDownloading}
                      className="w-full gap-2 h-auto py-3"
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Package className="h-4 w-4" />
                      )}
                      <div className="text-left">
                        <div className="font-medium">
                          {isDownloading ? 'Generating...' : 'Download Bundle'}
                        </div>
                        <div className="text-xs opacity-80">CSV + PDFs + JSON</div>
                      </div>
                    </Button>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadCSV}
                        className="gap-1 text-xs"
                      >
                        <FileSpreadsheet className="h-3 w-3" />
                        CSV
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadAllPDFs}
                        className="gap-1 text-xs"
                      >
                        <FolderArchive className="h-3 w-3" />
                        PDFs
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadJSON}
                        className="gap-1 text-xs"
                      >
                        <Code className="h-3 w-3" />
                        JSON
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* CSV Preview */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">CSV Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border bg-muted/50 p-3 overflow-x-auto max-h-48">
                      <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre">
                        {generatedSuite.csvContent}
                      </pre>
                    </div>
                  </CardContent>
                </Card>

                {/* Test Cases List */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      Test Cases ({generatedSuite.cases.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                    {generatedSuite.cases.map((tc) => (
                      <Collapsible
                        key={tc.id}
                        open={expandedCases.has(tc.id)}
                        onOpenChange={() => toggleExpanded(tc.id)}
                      >
                        <div className="rounded-lg border overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <button className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors">
                              <div className="flex-1 min-w-0">
                                <Badge variant={getBadgeVariant(tc.type)} className="text-[10px] mb-1">
                                  {TEST_CASE_CONFIGS[tc.type].label}
                                </Badge>
                                <p className="text-sm font-medium truncate">{tc.invoice.number}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {tc.invoice.supplier.name}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-mono font-medium">
                                  €{tc.invoice.total.toFixed(2)}
                                </div>
                                {tc.metadata.adjustedAmount !== tc.invoice.total && (
                                  <div className="text-xs font-mono text-amber-500">
                                    → €{Math.abs(tc.transaction.amount_eur).toFixed(2)}
                                  </div>
                                )}
                              </div>
                              <ChevronDown
                                className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${
                                  expandedCases.has(tc.id) ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t px-3 py-3 space-y-3 bg-muted/30">
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <p className="font-semibold text-muted-foreground mb-1">Invoice</p>
                                  <p>Date: {tc.invoice.date}</p>
                                  <p>Due: {tc.invoice.dueDate}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-muted-foreground mb-1">Transaction</p>
                                  <p>Date: {tc.transaction.date}</p>
                                  <p className="truncate" title={tc.transaction.description}>
                                    {tc.transaction.description}
                                  </p>
                                </div>
                              </div>

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
                                <p className="text-xs text-muted-foreground">
                                  {tc.metadata.adjustmentReason}
                                </p>
                              )}

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
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="h-full min-h-[400px] flex items-center justify-center bg-slate-50/50">
                <CardContent className="text-center py-12">
                  <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-slate-600">
                    Configure test cases and click Generate
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Results will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
