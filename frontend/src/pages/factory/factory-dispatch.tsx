import { useState, useRef, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth-store';
import { getDealerInvoicePrefix } from '@/lib/invoice-utils';
import { createDispatch } from '@/api/dispatch-api';
import { listDealers } from '@/api/dealer-api';
import { listModels } from '@/api/model-api';
import { getFactoryStock } from '@/api/stock-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Loader2, Scan, Upload, X, Truck, Hash, Building2, Box, CheckCircle2, Sun, Battery, Gauge, FileDown, Search } from 'lucide-react';
import { cn, PAGE_HEADING_FIRST, PAGE_HEADING_SECOND, PAGE_SUBHEADING_CLASS, categorizeModel, getModelDisplayName, getVariantDisplay, sortModelsByPowerAndActive, extractPowerRating } from '@/lib/utils';
import { downloadDispatchPdf } from '@/lib/dispatch-pdf';

const CATEGORY_OPTIONS: { key: 'inverter' | 'battery' | 'vfd'; label: string; icon: typeof Sun; activeClass: string }[] = [
  { key: 'inverter', label: 'Inverters', icon: Sun, activeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 hover:from-amber-600 hover:to-orange-600' },
  { key: 'battery', label: 'Batteries', icon: Battery, activeClass: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-emerald-500 hover:from-emerald-600 hover:to-green-600' },
  { key: 'vfd', label: 'VFD', icon: Gauge, activeClass: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white border-violet-500 hover:from-violet-600 hover:to-purple-600' },
];

const dispatchSchema = z.object({
  dispatchNumber: z.string().optional(),
  dealer: z.string().min(1, 'Dealer name is required'),
  dispatchDate: z.string().min(1, 'Dispatch date is required'),
  remarks: z.string().optional(),
});

type DispatchFormData = z.infer<typeof dispatchSchema>;

const alnum = (s: string) => (s || '').replace(/\W/g, '');
const firstN = (s: string, n: number) => alnum(s).slice(0, n);
const lastN = (s: string, n: number) => alnum(s).slice(-n);

export default function FactoryDispatch() {
  const { user } = useAuth();
  const [dispatchMode, setDispatchMode] = useState<'single' | 'bulk'>('single');
  const [dispatchCategoryFilter, setDispatchCategoryFilter] = useState<'inverter' | 'battery' | 'vfd'>('inverter');
  const [selectedDispatchModel, setSelectedDispatchModel] = useState<string>('');
  const [dispatchModelSearch, setDispatchModelSearch] = useState('');
  const [dispatchModelListOpen, setDispatchModelListOpen] = useState(false);
  const [availableSerialSearch, setAvailableSerialSearch] = useState('');
  const [availableSerialListOpen, setAvailableSerialListOpen] = useState(false);
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [scannerMode, setScannerMode] = useState(false);
  const [scannerInput, setScannerInput] = useState('');
  const [bulkSerialText, setBulkSerialText] = useState('');
  const [bulkScannerMode, setBulkScannerMode] = useState(false);
  const queryClient = useQueryClient();
  const scannerRef = useRef<HTMLInputElement>(null);
  const bulkSerialRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dispatchPrefix = getDealerInvoicePrefix(user?.name);

  const { data: stock } = useQuery({
    queryKey: ['factory-stock'],
    queryFn: getFactoryStock,
  });

  const { data: models } = useQuery({
    queryKey: ['inverter-models'],
    queryFn: listModels,
  });

  const { data: dealers = [] } = useQuery({
    queryKey: ['dealers'],
    queryFn: listDealers,
  });

  const categorizedModels = useMemo(() => {
    if (!models || !Array.isArray(models)) return { inverter: [], battery: [], vfd: [] };
    const inverter: typeof models = [];
    const battery: typeof models = [];
    const vfd: typeof models = [];
    models.forEach((m) => {
      const cat = categorizeModel(m);
      if (cat === 'battery') battery.push(m);
      else if (cat === 'vfd') vfd.push(m);
      else inverter.push(m);
    });
    return {
      inverter: sortModelsByPowerAndActive(inverter, extractPowerRating),
      battery: sortModelsByPowerAndActive(battery, extractPowerRating),
      vfd: sortModelsByPowerAndActive(vfd, extractPowerRating),
    };
  }, [models]);

  const filteredDispatchModels = useMemo(() => {
    const list = categorizedModels[dispatchCategoryFilter];
    if (!dispatchModelSearch.trim()) return list;
    const q = dispatchModelSearch.toLowerCase().trim();
    return list.filter(
      (m) =>
        getModelDisplayName(m).toLowerCase().includes(q) ||
        (getVariantDisplay(m) && getVariantDisplay(m).toLowerCase().includes(q)) ||
        (m.modelCode && m.modelCode.toLowerCase().includes(q))
    );
  }, [categorizedModels, dispatchCategoryFilter, dispatchModelSearch]);

  // Get current date/time for dispatch date
  const getCurrentDateTime = () => {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const defaultDispatchNumber = (serials: string[], dateStr: string) => {
    const d = (dateStr || getCurrentDateTime()).trim();
    const [y, m, day] = d.split('-');
    const ddmmyy = day && m && y ? `${day}${m}${y.slice(-2)}` : '';
    if (serials.length === 0) return `${dispatchPrefix}${ddmmyy}0001`;
    if (serials.length === 1) {
      const suffix = lastN(serials[0], 4) || serials[0].slice(-4) || '0001';
      return `${dispatchPrefix}${ddmmyy}${suffix}`;
    }
    const first = firstN(serials[0], 3) || '001';
    const last = lastN(serials[serials.length - 1], 3) || '999';
    return `${dispatchPrefix}${ddmmyy}${first}${last}`;
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue,
  } = useForm<DispatchFormData>({
    resolver: zodResolver(dispatchSchema),
    defaultValues: {
      dispatchDate: getCurrentDateTime(),
    },
  });

  useEffect(() => {
    if (scannerMode && scannerRef.current) {
      scannerRef.current.focus();
    }
  }, [scannerMode]);

  useEffect(() => {
    if (bulkScannerMode && bulkSerialRef.current) {
      bulkSerialRef.current.focus();
    }
  }, [bulkScannerMode]);

  // Handle Excel/CSV file upload for serial numbers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');

    const applySerialNumbers = (serialNumbers: string[]) => {
      if (serialNumbers.length === 0) {
        toast.error('No serial numbers found in file');
        return;
      }
      const isRegistered = (serial: string) =>
        Array.isArray(stock?.availableInverters) &&
        stock.availableInverters.some((item) => item && item.serialNumber === serial);
      const validSerials = serialNumbers.filter((s) => isRegistered(s));
      const rejectedCount = serialNumbers.length - validSerials.length;

      if (dispatchMode === 'bulk') {
        if (validSerials.length === 0) {
          toast.error(
            `All ${serialNumbers.length} serial(s) rejected — none are registered in available stock.`
          );
          return;
        }
        setBulkSerialText(validSerials.join('\n'));
        if (rejectedCount > 0) {
          toast.warning(
            `Loaded ${validSerials.length} registered serial(s). ${rejectedCount} rejected (not in available stock).`
          );
        } else {
          toast.success(`Loaded ${validSerials.length} serial number(s) from file (all verified).`);
        }
      } else {
        if (validSerials.length === 0) {
          toast.error('No valid serial numbers found in available stock');
          return;
        }
        const newSerials = [...new Set([...selectedSerials, ...validSerials])];
        setSelectedSerials(newSerials);
        toast.success(
          rejectedCount > 0
            ? `Added ${validSerials.length} serial(s). ${rejectedCount} rejected (not in stock).`
            : `Added ${validSerials.length} serial numbers from file`
        );
      }
    };

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const ab = event.target?.result as ArrayBuffer;
          if (!ab) return;
          const wb = XLSX.read(ab, { type: 'array' });
          const firstSheetName = wb.SheetNames[0];
          const sheet = wb.Sheets[firstSheetName];
          if (!sheet) {
            toast.error('No sheet found in Excel file');
            return;
          }
          const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][];
          const serialNumbers: string[] = [];
          const headerLike = /serial|number/i;
          rows.forEach((row, index) => {
            const firstCell = row && row[0] != null ? String(row[0]).trim() : '';
            if (!firstCell) return;
            if (index === 0 && headerLike.test(firstCell)) return;
            serialNumbers.push(firstCell);
          });
          applySerialNumbers(serialNumbers);
        } catch {
          toast.error('Failed to parse Excel file');
        }
      };
      reader.onerror = () => toast.error('Failed to read file');
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;
        const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
        const serialNumbers: string[] = [];
        const headerLike = /serial|number/i;
        lines.forEach((line, index) => {
          if (index === 0 && headerLike.test(line)) return;
          const parts = line.split(',').map((p) => p.trim());
          const serial = parts[0] || line;
          if (serial && serial.length > 0) serialNumbers.push(serial);
        });
        applySerialNumbers(serialNumbers);
      };
      reader.onerror = () => toast.error('Failed to read file');
      reader.readAsText(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const mutation = useMutation({
    mutationFn: createDispatch,
    onSuccess: (data) => {
      toast.success('Dispatch created successfully');
      if (data?.dispatch) {
        downloadDispatchPdf({
          dispatchNumber: data.dispatch.dispatchNumber,
          dealer: data.dispatch.dealer,
          dispatchDate: data.dispatch.dispatchDate,
          remarks: data.dispatch.remarks,
          serialNumbers: data.dispatch.inverterUnits ?? [],
        });
      }
      toast.success(data?.dispatch ? 'Dispatch created. PDF downloaded.' : 'Dispatch created successfully.');
      reset();
      setValue('dispatchDate', getCurrentDateTime());
      setSelectedSerials([]);
      setScannerInput('');
      setBulkSerialText('');
      queryClient.invalidateQueries({ queryKey: ['factory-stock'] });
      queryClient.invalidateQueries({ queryKey: ['dealer-stock'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create dispatch');
    },
  });

  const bulkSerialsFromText = useMemo(() => {
    return bulkSerialText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [bulkSerialText]);

  const onSubmit = (data: DispatchFormData) => {
    const serials = dispatchMode === 'bulk' ? bulkSerialsFromText : selectedSerials;
    if (serials.length === 0) {
      toast.error(dispatchMode === 'bulk' ? 'Enter or upload at least one serial number' : 'Please select at least one inverter');
      return;
    }
    if (dispatchMode === 'bulk') {
      const validSerials = serials.filter((serial) =>
        stock?.availableInverters?.some((item) => item && item.serialNumber === serial)
      );
      const invalid = serials.filter((s) => !validSerials.includes(s));
      if (validSerials.length === 0) {
        toast.error('No valid serial numbers found in available stock');
        return;
      }
      if (invalid.length > 0) {
        toast.warning(`${invalid.length} serial(s) not in stock and will be skipped`);
      }
      const dispatchNumber = defaultDispatchNumber(validSerials, data.dispatchDate || getCurrentDateTime());
      mutation.mutate({
        ...data,
        dispatchNumber,
        dispatchDate: data.dispatchDate || getCurrentDateTime(),
        serialNumbers: validSerials,
      });
    } else {
      const dispatchNumber = defaultDispatchNumber(selectedSerials, data.dispatchDate || getCurrentDateTime());
      mutation.mutate({
        ...data,
        dispatchNumber,
        dispatchDate: data.dispatchDate || getCurrentDateTime(),
        serialNumbers: selectedSerials,
      });
    }
  };

  const dispatchDate = watch('dispatchDate') || getCurrentDateTime();
  const serialsForPreview = dispatchMode === 'bulk' ? bulkSerialsFromText : selectedSerials;
  const dispatchNumberPreview = serialsForPreview.length > 0 ? defaultDispatchNumber(serialsForPreview, dispatchDate) : null;

  const removeSerial = (serial: string) => {
    setSelectedSerials((prev) => prev.filter((s) => s !== serial));
  };

  // Filter available products by category and optional model (for add-by-serial validation)
  const filteredAvailableItems = useMemo(() => {
    if (!stock?.availableInverters || !Array.isArray(stock.availableInverters)) return [];
    return stock.availableInverters.filter((item) => {
      if (!item) return false;
      const model = typeof item.inverterModel === 'object' ? item.inverterModel : null;
      const modelId = model && '_id' in model ? (model as { _id: string })._id : null;
      if (categorizeModel(model) !== dispatchCategoryFilter) return false;
      if (selectedDispatchModel && modelId !== selectedDispatchModel) return false;
      return true;
    });
  }, [stock?.availableInverters, dispatchCategoryFilter, selectedDispatchModel]);

  // Available serials for dropdown: filter by search, exclude already selected
  const filteredAvailableSerials = useMemo(() => {
    const items = filteredAvailableItems;
    const q = (availableSerialSearch || '').toLowerCase().trim();
    const serials = items
      .map((item) => item?.serialNumber)
      .filter((s): s is string => Boolean(s) && !selectedSerials.includes(s));
    const unique = Array.from(new Set(serials));
    if (!q) return unique.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return unique.filter((s) => s.toLowerCase().includes(q)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [filteredAvailableItems, availableSerialSearch, selectedSerials]);

  const addSerialFromInput = () => {
    const serial = scannerInput.trim();
    if (!serial) return;
    const available = filteredAvailableItems.find((item) => item.serialNumber === serial);
    if (available) {
      setSelectedSerials((prev) => {
        if (prev.includes(serial)) {
          toast.info(`${serial} is already selected`);
          return prev;
        }
        toast.success(`Added ${serial} to dispatch`);
        return [...prev, serial];
      });
    } else {
      toast.error(`Serial number ${serial} not found in selected category stock`);
    }
    setScannerInput('');
    setTimeout(() => scannerRef.current?.focus(), 100);
  };

  const handleSerialKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSerialFromInput();
    }
  };

  // Single source: same PDF; openForPrint = open for print only; alsoOpenForPrint = download and open for print.
  const handleDispatchPdf = (openForPrint: boolean, alsoOpenForPrint?: boolean) => {
    const dealer = watch('dealer')?.trim() || '';
    const dispatchDateVal = watch('dispatchDate') || getCurrentDateTime();
    const serials = dispatchMode === 'bulk' ? bulkSerialsFromText : selectedSerials;
    if (!dealer) {
      toast.error(openForPrint ? 'Enter dealer name before printing' : 'Enter dealer name before downloading PDF');
      return;
    }
    if (serials.length === 0) {
      toast.error(
        openForPrint
          ? (dispatchMode === 'bulk' ? 'Enter or upload at least one serial number before printing' : 'Add at least one serial number before printing')
          : (dispatchMode === 'bulk' ? 'Enter or upload at least one serial number before downloading PDF' : 'Add at least one serial number before downloading PDF')
      );
      return;
    }
    const dispNum = serials.length > 0 ? defaultDispatchNumber(serials, dispatchDateVal) : '—';
    const details = {
      dispatchNumber: dispNum,
      dealer,
      dispatchDate: dispatchDateVal,
      remarks: watch('remarks')?.trim(),
      serialNumbers: serials,
    };
    downloadDispatchPdf(details, openForPrint, alsoOpenForPrint);
    if (openForPrint) {
      toast.success('Opening dispatch details for print');
    } else if (alsoOpenForPrint) {
      toast.success('Dispatch PDF downloaded and opened for print');
    } else {
      toast.success('Dispatch details PDF downloaded');
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-muted/30">
      <header className="shrink-0 border-b bg-card py-2 px-4 sm:px-5">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0">
            <h1 className="inline text-xl sm:text-2xl"><span className={PAGE_HEADING_FIRST}>Product </span><span className={PAGE_HEADING_SECOND}>Dispatch</span></h1>
            <p className="text-sm text-muted-foreground">Dispatch products to dealers</p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-3 sm:p-4">
        <div className="shrink-0 flex gap-2 mb-3">
          <Button
            variant={dispatchMode === 'single' ? 'default' : 'outline'}
            size="sm"
            className="font-semibold text-sm"
            onClick={() => setDispatchMode('single')}
          >
            Single Dispatch
          </Button>
          <Button
            variant={dispatchMode === 'bulk' ? 'default' : 'outline'}
            size="sm"
            className="font-semibold text-sm"
            onClick={() => setDispatchMode('bulk')}
          >
            Bulk Dispatch
          </Button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden min-w-0">
      <div className="max-w-4xl w-full flex-1 min-h-0 flex flex-col min-w-0">
        <Card className="flex flex-col overflow-hidden flex-1 min-h-0 min-w-0">
          <CardHeader className={cn(
            'shrink-0 flex flex-row items-start justify-between gap-3 space-y-0 px-4 sm:px-5',
            dispatchMode === 'bulk' ? 'gap-4 pb-4 pt-6 px-6 sm:px-8' : 'py-3'
          )}>
            <div className={cn('min-w-0', dispatchMode === 'bulk' ? 'space-y-2' : 'space-y-0.5')}>
              <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <Box className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {dispatchMode === 'single' ? 'Single Dispatch' : 'Bulk Dispatch'}
              </CardTitle>
              <CardDescription className={dispatchMode === 'bulk' ? 'text-base' : 'text-sm'}>
                {dispatchMode === 'single'
                  ? 'Quick single product entry. Use scanner or type serial.'
                  : 'Enter or upload serial numbers, one per line.'}
              </CardDescription>
            </div>
            <div className="flex gap-2 shrink-0">
              {dispatchMode === 'single' ? (
                <Button
                  type="button"
                  variant={scannerMode ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    !scannerMode &&
                      'border-emerald-500/60 text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500 hover:text-emerald-800'
                  )}
                  onClick={() => {
                    setScannerMode(!scannerMode);
                    if (!scannerMode) setTimeout(() => scannerRef.current?.focus(), 100);
                  }}
                >
                  <Scan className="h-3.5 w-3.5 mr-1.5" />
                  {scannerMode ? 'Scanner ON' : 'Enable Scanner'}
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={bulkScannerMode ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      !bulkScannerMode &&
                        'border-emerald-500/60 text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500 hover:text-emerald-800'
                    )}
                    onClick={() => {
                      setBulkScannerMode(!bulkScannerMode);
                      if (!bulkScannerMode) setTimeout(() => bulkSerialRef.current?.focus(), 100);
                    }}
                  >
                    <Scan className="h-3.5 w-3.5 mr-2" />
                    {bulkScannerMode ? 'Scanner ON' : 'Scanner'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-blue-500/60 text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500 hover:text-blue-800"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5 mr-2" />
                    Upload Excel
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-amber-500/60 text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 dark:border-amber-400/50 dark:text-amber-300 dark:bg-amber-500/20 dark:hover:bg-amber-500/30"
                onClick={() => handleDispatchPdf(false, true)}
                disabled={!watch('dealer')?.trim() || (dispatchMode === 'bulk' ? bulkSerialsFromText.length === 0 : selectedSerials.length === 0)}
              >
                <FileDown className="h-3.5 w-3.5 mr-1.5" />
                Download PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className={cn(
            'flex-1 min-h-0 overflow-hidden flex flex-col',
            dispatchMode === 'bulk' ? 'pt-0 px-6 pb-6 sm:px-8 sm:pb-8' : 'pt-0 px-4 pb-4 sm:px-5 sm:pb-4'
          )}>
            <form onSubmit={handleSubmit(onSubmit)} className={cn(
              'flex flex-col h-full min-h-0',
              dispatchMode === 'bulk' ? 'gap-0' : 'gap-3 sm:gap-4'
            )}>
              <datalist id="dispatch-dealer-list">
                {dealers.filter((d) => d.name?.trim()).map((d) => (
                  <option key={d.id} value={d.name.trim()} />
                ))}
              </datalist>
              {dispatchMode === 'bulk' ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,380px),1fr] grid-rows-[1fr] gap-6 lg:gap-8 flex-1 min-h-0 overflow-hidden">
                    {/* Left: Category, Model, Dealer, Dispatch Date */}
                    <div className="flex flex-col min-h-0 overflow-y-auto space-y-4 lg:space-y-5 px-4 sm:px-6 lg:pl-0 lg:pr-8 lg:border-r lg:border-border">
                      <div className="space-y-3 shrink-0">
                        <Label className="block text-base font-semibold text-foreground">Product category</Label>
                        <div className="flex flex-wrap gap-2">
                          {CATEGORY_OPTIONS.map(({ key, label, icon: Icon, activeClass }) => (
                            <Button
                              key={key}
                              type="button"
                              variant={dispatchCategoryFilter === key ? 'default' : 'outline'}
                              size="sm"
                              className={cn('capitalize gap-1.5', dispatchCategoryFilter === key && activeClass)}
                              onClick={() => {
                                setDispatchCategoryFilter(key);
                                setSelectedDispatchModel('');
                                setDispatchModelSearch('');
                              }}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3 shrink-0">
                        <Label className="block text-base font-semibold text-foreground">Model</Label>
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="Search or select model..."
                            value={
                              (() => {
                                const sel = models?.find((m) => m._id === selectedDispatchModel);
                                if (!sel) return dispatchModelSearch;
                                const name = getModelDisplayName(sel);
                                const variant = getVariantDisplay(sel);
                                return variant ? `${name} ${variant}` : name;
                              })()
                            }
                            onChange={(e) => setDispatchModelSearch(e.target.value)}
                            onFocus={() => setDispatchModelListOpen(true)}
                            onBlur={() => setTimeout(() => setDispatchModelListOpen(false), 150)}
                            readOnly={!!selectedDispatchModel}
                            className={cn(
                              'pl-9 pr-9 h-11 text-base bg-background',
                              selectedDispatchModel && 'cursor-default'
                            )}
                          />
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                          {selectedDispatchModel && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDispatchModel('');
                                setDispatchModelSearch('');
                                setDispatchModelListOpen(true);
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                              aria-label="Clear selection"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        {!selectedDispatchModel && dispatchModelListOpen && (
                          <div className="max-h-[6rem] overflow-y-auto rounded-xl p-2 space-y-2.5 border border-border bg-card shadow-lg z-10">
                            {filteredDispatchModels.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-6 text-center">No models</p>
                            ) : (
                              filteredDispatchModels.map((model) => (
                                <button
                                  key={model._id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedDispatchModel(model._id);
                                    setDispatchModelSearch('');
                                    setDispatchModelListOpen(false);
                                  }}
                                  className="w-full flex items-center justify-between gap-2 text-left px-4 py-3 rounded-xl border-2 border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                  <span className="text-sm font-medium truncate">
                                  {[getModelDisplayName(model), getVariantDisplay(model)].filter(Boolean).join(' ')}
                                </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                        {selectedDispatchModel && (() => {
                          const stockCount = filteredAvailableItems.length;
                          if (!models?.find((m) => m._id === selectedDispatchModel)) return null;
                          return (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 shrink-0">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                              {stockCount} in stock for this model
                            </p>
                          );
                        })()}
                      </div>
                      {/* Available serials dropdown with search (Bulk dispatch) */}
                      {selectedDispatchModel && (
                        <div className="space-y-2 shrink-0">
                          <Label className="block text-base font-semibold text-foreground">Available serials</Label>
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="Search and add serials..."
                              value={availableSerialSearch}
                              onChange={(e) => setAvailableSerialSearch(e.target.value)}
                              onFocus={() => setAvailableSerialListOpen(true)}
                              onBlur={() => setTimeout(() => setAvailableSerialListOpen(false), 180)}
                              className="pl-9 h-10 text-sm border border-border bg-background"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                          </div>
                          {availableSerialListOpen && (
                            <div className="max-h-[6rem] overflow-y-auto rounded-lg border border-border p-2 space-y-1 shadow-lg z-10 bg-card mt-1">
                              {(() => {
                                const alreadyInBulk = new Set(bulkSerialsFromText);
                                const list = filteredAvailableItems
                                  .map((item) => item?.serialNumber)
                                  .filter((s): s is string => Boolean(s) && !alreadyInBulk.has(s));
                                const unique = Array.from(new Set(list));
                                const q = (availableSerialSearch || '').toLowerCase().trim();
                                const filtered = q
                                  ? unique.filter((s) => s.toLowerCase().includes(q))
                                  : unique;
                                const sorted = filtered.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                                if (sorted.length === 0) {
                                  return (
                                    <p className="text-xs text-muted-foreground py-3 text-center">
                                      {q ? 'No matching serials' : 'No available serials (or all already in list)'}
                                    </p>
                                  );
                                }
                                return sorted.map((serial) => (
                                  <button
                                    key={serial}
                                    type="button"
                                    onClick={() => {
                                      setBulkSerialText((prev) => (prev.trim() ? `${prev.trim()}\n${serial}` : serial));
                                      setAvailableSerialSearch('');
                                      setAvailableSerialListOpen(false);
                                      toast.success(`Added ${serial} to list`);
                                    }}
                                    className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-md border border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50 transition-all text-sm font-mono"
                                  >
                                    <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="truncate">{serial}</span>
                                  </button>
                                ));
                              })()}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">Select a serial to add it to the list.</p>
                        </div>
                      )}
                    </div>
                    {/* Right: Serial Numbers, then Dealer Name & Dispatch Date */}
                    <div className="flex flex-col min-h-0 overflow-hidden space-y-3 px-4 sm:px-6 lg:pl-6 lg:pr-4">
                      <div className="flex items-center justify-between gap-2 shrink-0">
                        <Label htmlFor="bulkSerialNumbers" className="block text-base font-semibold text-foreground">Serial Numbers</Label>
                        <span className="text-sm text-muted-foreground tabular-nums shrink-0">
                          {bulkSerialsFromText.length} line{bulkSerialsFromText.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <textarea
                        ref={bulkSerialRef}
                        id="bulkSerialNumbers"
                        value={bulkSerialText}
                        onChange={(e) => setBulkSerialText(e.target.value)}
                        className={cn(
                          'min-h-[80px] max-h-[180px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y overflow-auto',
                          bulkScannerMode && 'border-primary ring-primary/20'
                        )}
                        placeholder="One serial per line, or upload Excel/CSV"
                        autoFocus={bulkScannerMode}
                      />
                      <p className="text-xs text-muted-foreground shrink-0">
                        Upload Excel or CSV with serials in the first column, or use scanner.
                      </p>
                      <div className="grid grid-cols-1 gap-3 shrink-0 pt-1 border-t border-border">
                        <div className="space-y-2">
                          <Label htmlFor="bulk-dealer" className="block text-sm font-semibold text-foreground">Dealer Name</Label>
                          <Input
                            id="bulk-dealer"
                            {...register('dealer')}
                            list="dispatch-dealer-list"
                            className="h-10 text-sm bg-background"
                            placeholder="Enter or select dealer name"
                          />
                          {errors.dealer && <p className="text-xs text-destructive mt-0.5">{errors.dealer.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bulk-dispatchDate" className="block text-sm font-semibold text-foreground">Dispatch Date</Label>
                          <Input
                            id="bulk-dispatchDate"
                            type="date"
                            {...register('dispatchDate')}
                            defaultValue={getCurrentDateTime()}
                            className="h-10 text-sm bg-background"
                          />
                          {errors.dispatchDate && <p className="text-xs text-destructive mt-0.5">{errors.dispatchDate.message}</p>}
                          <p className="text-xs text-muted-foreground">Defaults to today.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 pt-4">
                    <Button
                      type="submit"
                      disabled={mutation.isPending || bulkSerialsFromText.length === 0}
                      className="w-full h-12 text-base"
                    >
                      {mutation.isPending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          Dispatching...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                          Dispatch {bulkSerialsFromText.length || 0} product{bulkSerialsFromText.length !== 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
              <>
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,1fr),1fr] gap-4 lg:gap-6 flex-1 min-h-0 content-start">
                {/* Left: Product category, Dealer, Dispatch Date */}
                <div className="space-y-3 lg:pr-5 lg:border-r lg:border-border min-w-0">
                  <div className="space-y-2">
                    <Label className="block text-sm font-semibold text-foreground">Product category</Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_OPTIONS.map(({ key, label, icon: Icon, activeClass }) => (
                        <Button
                          key={key}
                          type="button"
                          variant={dispatchCategoryFilter === key ? 'default' : 'outline'}
                          size="default"
                          className={cn(
                            'capitalize text-sm gap-1.5',
                            dispatchCategoryFilter === key && activeClass
                          )}
                          onClick={() => {
                            setDispatchCategoryFilter(key);
                            setSelectedDispatchModel('');
                            setDispatchModelSearch('');
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dealer" className="block text-sm font-semibold text-foreground">
                      Dealer Name
                    </Label>
                    <Input
                      id="dealer"
                      {...register('dealer')}
                      list="dispatch-dealer-list"
                      className="h-11 text-base border border-border bg-background focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Enter or select dealer name"
                    />
                    {errors.dealer && (
                      <p className="text-xs text-destructive mt-0.5">{errors.dealer.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dispatchDate" className="block text-sm font-semibold text-foreground">
                      Dispatch Date
                    </Label>
                    <Input
                      id="dispatchDate"
                      type="date"
                      {...register('dispatchDate')}
                      defaultValue={getCurrentDateTime()}
                      className="h-11 text-base border border-border bg-background"
                    />
                    {errors.dispatchDate && (
                      <p className="text-xs text-destructive mt-0.5">{errors.dispatchDate.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Defaults to today. Change if needed.</p>
                  </div>
                </div>

                {/* Right: Serial Number */}
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="serialInput" className="block text-sm font-semibold text-foreground">
                    Serial Number
                    {scannerMode && (
                      <span className="text-muted-foreground font-normal ml-1">(Enter to submit)</span>
                    )}
                  </Label>
                  <div className="relative">
                    <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      ref={scannerRef}
                      id="serialInput"
                      value={scannerInput}
                      onChange={(e) => setScannerInput(e.target.value)}
                      onKeyDown={handleSerialKeyDown}
                      placeholder={scannerMode ? 'Scan then Enter' : 'Enter serial number'}
                      autoFocus={scannerMode}
                      className={cn('pl-9 h-11 text-base', scannerMode && 'border-primary ring-primary/20')}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Scan or type serial and press Enter to add to dispatch.</p>

                  {/* Model selection (same as Product Serial Entry) */}
                  <div className="space-y-2">
                    <Label className="block text-sm font-semibold text-foreground">Model</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search or select model..."
                        value={
                          (() => {
                            const sel = models?.find((m) => m._id === selectedDispatchModel);
                            if (!sel) return dispatchModelSearch;
                            const name = getModelDisplayName(sel);
                            const variant = getVariantDisplay(sel);
                            return variant ? `${name} ${variant}` : name;
                          })()
                        }
                        onChange={(e) => setDispatchModelSearch(e.target.value)}
                        onFocus={() => setDispatchModelListOpen(true)}
                        onBlur={() => setTimeout(() => setDispatchModelListOpen(false), 150)}
                        readOnly={!!selectedDispatchModel}
                        className={cn(
                          'pl-9 pr-9 h-11 text-base bg-background border border-border',
                          selectedDispatchModel && 'cursor-default'
                        )}
                      />
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      {selectedDispatchModel && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDispatchModel('');
                            setDispatchModelSearch('');
                            setDispatchModelListOpen(true);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                          aria-label="Clear selection"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {!selectedDispatchModel && dispatchModelListOpen && (
                      <div className="max-h-[6rem] overflow-y-auto rounded-lg border border-border p-2 space-y-1 shadow-lg z-10 bg-background">
                        {filteredDispatchModels.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-3 text-center">No models</p>
                        ) : (
                          filteredDispatchModels.map((model) => (
                            <button
                              key={model._id}
                              type="button"
                              onClick={() => {
                                setSelectedDispatchModel(model._id);
                                setDispatchModelSearch('');
                                setDispatchModelListOpen(false);
                              }}
                              className="w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-lg border border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-sm"
                            >
                              <span className="font-medium truncate">
                              {[getModelDisplayName(model), getVariantDisplay(model)].filter(Boolean).join(' ')}
                            </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                    {selectedDispatchModel && (() => {
                      const selectedModel = models?.find((m) => m._id === selectedDispatchModel);
                      const stockCount = filteredAvailableItems.length;
                      if (!selectedModel) return null;
                      return (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                          {stockCount} in stock for this model
                        </p>
                      );
                    })()}
                  </div>

                  {/* Available serials dropdown with search (Single dispatch, when model selected) */}
                  {selectedDispatchModel && (
                    <div className="space-y-2">
                      <Label className="block text-sm font-semibold text-foreground">Available serials</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Search and select serial..."
                          value={availableSerialSearch}
                          onChange={(e) => setAvailableSerialSearch(e.target.value)}
                          onFocus={() => setAvailableSerialListOpen(true)}
                          onBlur={() => setTimeout(() => setAvailableSerialListOpen(false), 180)}
                          className="pl-9 h-10 text-sm border border-border bg-background"
                        />
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                      {availableSerialListOpen && (
                        <div className="max-h-[6rem] overflow-y-auto rounded-lg border border-border p-2 space-y-1 shadow-lg z-10 bg-background mt-1">
                          {filteredAvailableSerials.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-3 text-center">
                              {availableSerialSearch.trim() ? 'No matching serials' : 'No available serials (or all already added)'}
                            </p>
                          ) : (
                            filteredAvailableSerials.map((serial) => (
                              <button
                                key={serial}
                                type="button"
                                onClick={() => {
                                  setSelectedSerials((prev) => (prev.includes(serial) ? prev : [...prev, serial]));
                                  setAvailableSerialSearch('');
                                  setAvailableSerialListOpen(false);
                                  toast.success(`Added ${serial}`);
                                }}
                                className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-md border border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50 transition-all text-sm font-mono"
                              >
                                <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="truncate">{serial}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">Select a serial to add it to dispatch.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Below serial number: Dispatch Number only */}
              <div className="shrink-0">
                <Label className="block text-sm font-semibold text-foreground mb-2">Dispatch Number</Label>
                <div className="h-11 px-4 flex items-center text-base rounded-md border border-border bg-muted/50 text-foreground font-medium">
                  {dispatchNumberPreview ?? '—'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Auto-generated. Add serials to generate.</p>
              </div>

              <div className="shrink-0 pt-1">
                <Button
                  type="submit"
                  disabled={mutation.isPending || selectedSerials.length === 0}
                  className="w-full h-11 text-base font-semibold"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                      Create Dispatch
                    </>
                  )}
                </Button>
              </div>
              </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
        </div>
      </div>
    </div>
  );
}
