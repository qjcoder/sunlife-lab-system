import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth-store';
import { getDealerInvoicePrefix } from '@/lib/invoice-utils';
import { sellInverter, bulkSellInverters } from '@/api/sale-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Hash, FileText, Calendar, User, Phone, ShoppingCart, X, Loader2, CheckCircle2, Scan, Upload } from 'lucide-react';
import { cn, PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from '@/lib/utils';

const singleSaleSchema = z.object({
  serialNumber: z.string().min(1, 'Serial number is required'),
  saleInvoiceNo: z.string().optional(),
  saleDate: z.string().min(1, 'Sale date is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerContact: z.string().optional(),
});

type SingleSaleFormData = z.infer<typeof singleSaleSchema>;

type BulkSaleDetails = {
  saleInvoiceNo: string;
  saleDate: string;
  customerName: string;
  customerContact: string;
};

const defaultBulkDetails = (): BulkSaleDetails => ({
  saleInvoiceNo: '',
  saleDate: '',
  customerName: '',
  customerContact: '',
});

export default function DealerSales() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [bulkSerials, setBulkSerials] = useState<string[]>([]);
  const [bulkSaleDetails, setBulkSaleDetails] = useState<BulkSaleDetails>(defaultBulkDetails);
  const [bulkManualSerial, setBulkManualSerial] = useState('');
  const [scannerMode, setScannerMode] = useState(false);
  const [scannerInput, setScannerInput] = useState('');
  const [singleScannerMode, setSingleScannerMode] = useState(false);
  const scannerRef = useRef<HTMLInputElement>(null);
  const singleSerialRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const scannerInputRef = useRef<string>('');
  const queryClient = useQueryClient();
  const invoicePrefix = getDealerInvoicePrefix(user?.name);

  useEffect(() => {
    if (mode === 'bulk' && scannerMode && scannerRef.current) {
      scannerRef.current.focus();
    }
  }, [mode, scannerMode]);

  useEffect(() => {
    if (mode === 'bulk' && !bulkSaleDetails.saleDate) {
      setBulkSaleDetails((prev) => ({ ...prev, saleDate: getCurrentDate() }));
    }
  }, [mode]);

  scannerInputRef.current = scannerInput;

  useEffect(() => {
    if (mode !== 'bulk' || !scannerMode) return;
    const ms = 400;
    const t = setTimeout(() => {
      const serial = (scannerInputRef.current || '').trim();
      if (!serial) return;
      setBulkSerials((prev) => [...prev, serial]);
      setScannerInput('');
      scannerInputRef.current = '';
      toast.success('Serial added to list');
      scannerRef.current?.focus();
    }, ms);
    return () => clearTimeout(t);
  }, [mode, scannerMode, scannerInput]);

  useEffect(() => {
    if (mode === 'single' && singleScannerMode && singleSerialRef.current) {
      singleSerialRef.current.focus();
    }
  }, [mode, singleScannerMode]);

  const getCurrentDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<SingleSaleFormData>({
    resolver: zodResolver(singleSaleSchema),
    defaultValues: { saleDate: getCurrentDate() },
  });

  const singleMutation = useMutation({
    mutationFn: sellInverter,
    onSuccess: () => {
      toast.success('Sale recorded successfully');
      reset();
      queryClient.invalidateQueries({ queryKey: ['dealer-stock'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record sale');
    },
  });

  const bulkMutation = useMutation({
    mutationFn: bulkSellInverters,
    onSuccess: () => {
      toast.success('Sale recorded successfully');
      setBulkSerials([]);
      setBulkSaleDetails({ ...defaultBulkDetails(), saleDate: getCurrentDate() });
      queryClient.invalidateQueries({ queryKey: ['dealer-stock'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record sales');
    },
  });

  const onSingleSubmit = (data: SingleSaleFormData) => {
    const invoice = defaultInvoiceSingle(data.serialNumber, data.saleDate);
    singleMutation.mutate({ ...data, saleInvoiceNo: invoice });
  };

  const addBulkSerial = (serial: string) => {
    const s = serial.trim();
    if (s) {
      setBulkSerials((prev) => [...prev, s]);
      toast.success('Serial added to list');
    }
  };

  const removeBulkSerial = (index: number) => {
    setBulkSerials((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBulkSaleDetails = (field: keyof BulkSaleDetails, value: string) => {
    setBulkSaleDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleBulkScannerInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scannerMode) {
      e.preventDefault();
      const serial = scannerInput.trim();
      if (serial) {
        setBulkSerials((prev) => [...prev, serial]);
        setScannerInput('');
        toast.success('Serial added to list');
        setTimeout(() => scannerRef.current?.focus(), 50);
      }
    }
  };

  /** Only serial numbers from file: one per line (or first column). One customer for all. */
  const handleBulkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = (file.name || '').toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.txt') && !fileName.endsWith('.text')) {
      toast.error('Please use a CSV or plain text file (one serial number per line, or one column). Excel .xlsx is not parsed.');
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const serials: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(',').map((p) => p.trim());
        const serial = (parts[0] ?? line).trim();
        if (!serial) continue;
        if (i === 0 && (serial.toLowerCase().includes('serial') || serial.toLowerCase().includes('number'))) continue;
        if (serial.length < 2 || serial.startsWith('PK') || serial.includes('.xml')) continue;
        serials.push(serial);
      }

      if (serials.length === 0) {
        toast.error('No serial numbers found. Use CSV or text with one serial per line (or one column).');
        return;
      }
      setBulkSerials((prev) => [...prev, ...serials]);
      setBulkSaleDetails((prev) => ({ ...prev, saleDate: prev.saleDate || getCurrentDate() }));
      toast.success(`Loaded ${serials.length} serial(s). Enter customer details once below.`);
    };
    reader.onerror = () => toast.error('Failed to read file');
    reader.readAsText(file);
    if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
  };

  /** Alphanumeric only from string; then take first or last N chars */
  const alnum = (s: string) => (s || '').replace(/\W/g, '');
  const lastN = (s: string, n: number) => alnum(s).slice(-n);
  const firstN = (s: string, n: number) => alnum(s).slice(0, n);

  /** Invoice: dealer prefix + date (ddmmyy) + last 4 of serial. Single sale. */
  const defaultInvoiceSingle = (serial: string, dateStr: string) => {
    const d = dateStr.trim() || getCurrentDate();
    const [y, m, day] = d.split('-');
    const ddmmyy = day && m && y ? `${day}${m}${y.slice(-2)}` : '';
    const suffix = lastN(serial, 4) || serial.slice(-4) || '0001';
    return `${invoicePrefix}${ddmmyy}${suffix}`;
  };

  /** Invoice for bulk: dealer prefix + date + first 3 of first serial + last 3 of last serial. */
  const defaultInvoiceBulk = (serials: string[], dateStr: string) => {
    const d = dateStr.trim() || getCurrentDate();
    const [y, m, day] = d.split('-');
    const ddmmyy = day && m && y ? `${day}${m}${y.slice(-2)}` : '';
    if (serials.length === 0) return `${invoicePrefix}${ddmmyy}0001`;
    if (serials.length === 1) return defaultInvoiceSingle(serials[0], dateStr);
    const first = firstN(serials[0], 3) || '001';
    const last = lastN(serials[serials.length - 1], 3) || '999';
    return `${invoicePrefix}${ddmmyy}${first}${last}`;
  };

  const onBulkSubmit = () => {
    const serials = bulkSerials.filter(Boolean);
    if (serials.length === 0) {
      toast.error('Add at least one serial number (scan, upload, or type).');
      return;
    }
    const saleDate = bulkSaleDetails.saleDate?.trim() || getCurrentDate();
    const customerName = (bulkSaleDetails.customerName || '').trim();
    if (!customerName) {
      toast.error('Customer name is required');
      return;
    }
    const invoice = defaultInvoiceBulk(serials, saleDate);
    const sales = serials.map((serialNumber) => ({
      serialNumber,
      saleInvoiceNo: invoice,
      saleDate,
      customerName,
      customerContact: bulkSaleDetails.customerContact?.trim() || undefined,
    }));
    bulkMutation.mutate({ sales });
  };

  const singleSerial = watch('serialNumber');
  const singleDate = watch('saleDate') || getCurrentDate();
  const singleInvoicePreview = singleSerial?.trim() ? defaultInvoiceSingle(singleSerial, singleDate) : null;
  const bulkInvoicePreview = bulkSerials.length > 0 ? defaultInvoiceBulk(bulkSerials, bulkSaleDetails.saleDate || getCurrentDate()) : null;

  return (
    <div className="space-y-8 min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className={PAGE_HEADING_CLASS}>Sales</h1>
        <p className={PAGE_SUBHEADING_CLASS}>Record inverter sales to customers</p>
      </div>

      {/* Mode Switcher */}
      <div className="flex gap-2 p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg w-fit">
        <Button
          variant={mode === 'single' ? 'default' : 'ghost'}
          onClick={() => setMode('single')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-semibold transition-all duration-300",
            mode === 'single' 
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl scale-105' 
              : 'hover:bg-slate-100 dark:hover:bg-slate-700'
          )}
        >
          Single Sale
        </Button>
        <Button
          variant={mode === 'bulk' ? 'default' : 'ghost'}
          onClick={() => setMode('bulk')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-semibold transition-all duration-300",
            mode === 'bulk' 
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl scale-105' 
              : 'hover:bg-slate-100 dark:hover:bg-slate-700'
          )}
        >
          Bulk Sale
        </Button>
      </div>

      {mode === 'single' ? (
        <Card className="border-2 border-green-200/60 dark:border-green-800/60 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 dark:from-green-600 dark:via-emerald-600 dark:to-teal-600 border-b-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDMuMzE0LTIuNjg2IDYtNiA2cy02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNnoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
            <CardTitle className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold text-white block">Single Sale</span>
                <span className="text-green-100 text-sm font-medium">Record one sale at a time</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 pb-8 px-8">
            <form onSubmit={handleSubmit(onSingleSubmit)} className="space-y-7">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="serialNumber" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Hash className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    Serial Number
                  </Label>
                  <Button
                    type="button"
                    variant={singleScannerMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSingleScannerMode(!singleScannerMode);
                      if (!singleScannerMode) setTimeout(() => singleSerialRef.current?.focus(), 100);
                    }}
                    className={cn(singleScannerMode && 'bg-green-600 hover:bg-green-700')}
                  >
                    <Scan className="h-3.5 w-3.5 mr-1" />
                    {singleScannerMode ? 'Scanner ON' : 'Scanner'}
                  </Button>
                </div>
                <Input
                  id="serialNumber"
                  {...(function () {
                    const { ref: regRef, ...rest } = register('serialNumber');
                    return {
                      ...rest,
                      ref: (el: HTMLInputElement | null) => {
                        regRef(el);
                        singleSerialRef.current = el;
                      },
                    };
                  })()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && singleScannerMode) {
                      e.preventDefault();
                      document.getElementById('saleDate')?.focus();
                    }
                  }}
                  className={cn("h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300", singleScannerMode && 'border-green-500 ring-2 ring-green-500/20')}
                  placeholder={singleScannerMode ? 'Scan or type serial, then Enter' : 'Enter serial number'}
                />
                {errors.serialNumber && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.serialNumber.message}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  Invoice Number
                </Label>
                <div className="h-12 px-4 flex items-center text-base border-2 border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-medium">
                  {singleInvoicePreview ?? '—'}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Auto-generated ({invoicePrefix} + date + last 4 digits of serial)</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="saleDate" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                    <Calendar className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  </div>
                  Sale Date
                </Label>
                <Input
                  id="saleDate"
                  type="date"
                  {...register('saleDate')}
                  defaultValue={getCurrentDate()}
                  className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                />
                {errors.saleDate && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.saleDate.message}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="customerName" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Customer Name
                </Label>
                <Input
                  id="customerName"
                  {...register('customerName')}
                  className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                  placeholder="Enter customer name"
                />
                {errors.customerName && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.customerName.message}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="customerContact" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Phone className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  </div>
                  Customer Contact (Optional)
                </Label>
                <Input
                  id="customerContact"
                  {...register('customerContact')}
                  className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                  placeholder="Phone number or email"
                />
              </div>

              <div className="pt-6 border-t-2 border-slate-200 dark:border-slate-700">
                <Button
                  type="submit"
                  disabled={singleMutation.isPending}
                  className="w-full h-14 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
                >
                  {singleMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Recording Sale...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                      Record Sale
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-green-200/60 dark:border-green-800/60 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 dark:from-green-600 dark:via-emerald-600 dark:to-teal-600 border-b-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDMuMzE0LTIuNjg2IDYtNiA2cy02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNnoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
            <CardTitle className="flex items-center justify-between relative z-10 flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-white block">Bulk Sale</span>
                  <span className="text-green-100 text-sm font-medium">Record multiple sales at once</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setScannerMode(!scannerMode);
                    if (!scannerMode) setTimeout(() => scannerRef.current?.focus(), 100);
                  }}
                  className={cn(
                    "bg-white/20 backdrop-blur-md text-white border-2 border-white/30 hover:bg-white/30 font-semibold transition-all duration-300",
                    scannerMode && "bg-green-700 border-white/60"
                  )}
                >
                  <Scan className="h-3.5 w-3.5 mr-2" />
                  {scannerMode ? 'Scanner ON' : 'Scanner'}
                </Button>
                <input
                  type="file"
                  ref={bulkFileInputRef}
                  accept=".csv,.txt,text/plain"
                  className="hidden"
                  onChange={handleBulkFileUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => bulkFileInputRef.current?.click()}
                  className="bg-white/20 backdrop-blur-md text-white border-2 border-white/30 hover:bg-white/30 font-semibold transition-all duration-300"
                >
                  <Upload className="h-3.5 w-3.5 mr-2" />
                  Upload Excel/CSV
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 pb-8 px-8">
            <div className="space-y-6">
              {scannerMode && (
                <Card className="border-2 border-green-400 bg-green-50/50 dark:bg-green-950/20 dark:border-green-700">
                  <CardContent className="py-4">
                    <Label htmlFor="bulk-scanner-input" className="text-sm font-semibold flex items-center gap-2 text-green-800 dark:text-green-200 mb-2">
                      <Scan className="h-3.5 w-3.5" />
                      Scanner mode – scan or type serial number; row is added automatically or press Enter
                    </Label>
                    <Input
                      id="bulk-scanner-input"
                      ref={scannerRef}
                      value={scannerInput}
                      onChange={(e) => setScannerInput(e.target.value)}
                      onKeyDown={handleBulkScannerInput}
                      placeholder="Scan or type serial number (row added automatically or press Enter)"
                      className="h-12 border-2 border-green-400 focus:ring-green-500 focus:border-green-500"
                      autoFocus={scannerMode}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Serial numbers list – one sale, one purchaser */}
              {bulkSerials.length > 0 && (
                <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      Serial numbers ({bulkSerials.length}) – same purchaser
                    </CardTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">All units for one sale. Enter customer details once below.</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <ul className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-800/30">
                      {bulkSerials.map((serial, index) => (
                        <li key={`${index}-${serial}`} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/50">
                          <span className="font-mono text-sm truncate">{serial}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBulkSerial(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                    <div className="pt-2">
                      <Input
                        value={bulkManualSerial}
                        onChange={(e) => setBulkManualSerial(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addBulkSerial(bulkManualSerial);
                            setBulkManualSerial('');
                          }
                        }}
                        placeholder="Type serial and press Enter to add"
                        className="h-10 text-sm border border-slate-300 dark:border-slate-600"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Single set of sale details for all serials */}
              {(bulkSerials.length > 0 || !scannerMode) && (
                <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Sale details (one customer for all units)</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-3">
                      <Label className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <FileText className="h-3.5 w-3.5 text-emerald-600" />
                        Invoice Number
                      </Label>
                      <div className="h-12 px-4 flex items-center text-base border-2 border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-medium">
                        {bulkInvoicePreview ?? '—'}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Auto-generated ({invoicePrefix} = dealer name + date + first & last serial digits)</p>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Calendar className="h-3.5 w-3.5 text-teal-600" />
                        Sale Date
                      </Label>
                      <Input
                        type="date"
                        value={bulkSaleDetails.saleDate || getCurrentDate()}
                        onChange={(e) => updateBulkSaleDetails('saleDate', e.target.value)}
                        className="h-12 text-base border-2"
                      />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                      <Label className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <User className="h-3.5 w-3.5 text-blue-600" />
                        Customer Name
                      </Label>
                      <Input
                        value={bulkSaleDetails.customerName}
                        onChange={(e) => updateBulkSaleDetails('customerName', e.target.value)}
                        className="h-12 text-base border-2"
                        placeholder="Enter customer name (same for all units)"
                      />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                      <Label className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Phone className="h-3.5 w-3.5 text-purple-600" />
                        Customer Contact (Optional)
                      </Label>
                      <Input
                        value={bulkSaleDetails.customerContact}
                        onChange={(e) => updateBulkSaleDetails('customerContact', e.target.value)}
                        className="h-12 text-base border-2"
                        placeholder="Phone number or email"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {bulkSerials.length === 0 && !scannerMode && (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 px-6">
                  <ShoppingCart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium mb-2">
                    Use <strong>Scanner</strong> to scan serials, <strong>Upload Excel/CSV</strong>, or type below and press Enter
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 mb-4">
                    All serials are one sale to one customer – enter customer details once below after adding serials.
                  </p>
                  <Input
                    value={bulkManualSerial}
                    onChange={(e) => setBulkManualSerial(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addBulkSerial(bulkManualSerial);
                        setBulkManualSerial('');
                      }
                    }}
                    placeholder="Type serial and press Enter to add"
                    className="max-w-sm mx-auto h-11 border-2 border-slate-300 dark:border-slate-600"
                  />
                </div>
              )}

              {bulkSerials.length > 0 && (
                <div className="pt-6 border-t-2 border-slate-200 dark:border-slate-700">
                  <Button
                    onClick={onBulkSubmit}
                    disabled={bulkMutation.isPending}
                    className="w-full h-14 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
                  >
                    {bulkMutation.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                        Recording sale...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                        Record sale ({bulkSerials.length} unit{bulkSerials.length !== 1 ? 's' : ''})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
