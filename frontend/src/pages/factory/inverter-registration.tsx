import { useState, useRef, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createInverter, bulkCreateInverters } from '@/api/inverter-api';
import { listModels } from '@/api/model-api';
import { getFactoryStock } from '@/api/stock-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Package, CheckCircle2, Upload, Scan, Hash, Box, Loader2, Search, X, Sun, Battery, Gauge } from 'lucide-react';
import { cn, PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS, getModelDisplayName, extractPowerRating, sortModelsByPowerAndActive, categorizeModel } from '@/lib/utils';

const singleSchema = z.object({
  serialNumber: z.string().min(1, 'Serial number is required'),
  inverterModel: z.string().min(1, 'Model is required'),
  manufacturingDate: z.string().optional(),
});

const bulkSchema = z.object({
  inverterModel: z.string().min(1, 'Model is required'),
  serialNumbers: z.string().min(1, 'At least one serial number is required'),
  manufacturingDate: z.string().optional(),
});

type SingleFormData = z.infer<typeof singleSchema>;
type BulkFormData = z.infer<typeof bulkSchema>;

const CATEGORY_OPTIONS: { key: 'inverter' | 'battery' | 'vfd'; label: string; icon: typeof Sun; activeClass: string }[] = [
  { key: 'inverter', label: 'Inverters', icon: Sun, activeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 hover:from-amber-600 hover:to-orange-600' },
  { key: 'battery', label: 'Batteries', icon: Battery, activeClass: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-emerald-500 hover:from-emerald-600 hover:to-green-600' },
  { key: 'vfd', label: 'VFD', icon: Gauge, activeClass: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white border-violet-500 hover:from-violet-600 hover:to-purple-600' },
];

export default function InverterRegistration() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [serialCount, setSerialCount] = useState(0);
  const [scannerMode, setScannerMode] = useState(false);
  const [bulkScannerMode, setBulkScannerMode] = useState(false);
  const [selectedSingleCategory, setSelectedSingleCategory] = useState<'inverter' | 'battery' | 'vfd'>('inverter');
  const [selectedBulkCategory, setSelectedBulkCategory] = useState<'inverter' | 'battery' | 'vfd'>('inverter');
  const [singleModelSearch, setSingleModelSearch] = useState('');
  const [bulkModelSearch, setBulkModelSearch] = useState('');
  const [singleModelListOpen, setSingleModelListOpen] = useState(false);
  const [bulkModelListOpen, setBulkModelListOpen] = useState(false);
  const queryClient = useQueryClient();
  const singleSerialRef = useRef<HTMLInputElement>(null);
  const bulkSerialRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: models } = useQuery({
    queryKey: ['inverter-models'],
    queryFn: () => listModels(),
  });

  const { data: factoryStock } = useQuery({
    queryKey: ['factory-stock'],
    queryFn: getFactoryStock,
  });

  // Calculate stock count per model
  const modelStockCounts = useMemo(() => {
    if (!factoryStock?.availableInverters || !models) return {};
    
    const counts: Record<string, number> = {};
    
    factoryStock.availableInverters.forEach((item) => {
      if (!item || !item.inverterModel) return;
      const modelId = typeof item.inverterModel === 'object' 
        ? item.inverterModel._id 
        : item.inverterModel;
      if (modelId) {
        counts[modelId] = (counts[modelId] || 0) + 1;
      }
    });
    
    return counts;
  }, [factoryStock, models]);

  // Calculate total stock
  const totalStock = useMemo(() => {
    return Object.values(modelStockCounts).reduce((sum, count) => sum + count, 0);
  }, [modelStockCounts]);

  // Get current date/time for manufacturing date
  const getCurrentDateTime = () => {
    const now = new Date();
    // Get local date in YYYY-MM-DD format (not UTC)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const {
    register: registerSingle,
    handleSubmit: handleSingleSubmit,
    formState: { errors: singleErrors },
    reset: resetSingle,
    watch: watchSingle,
    setValue: setValueSingle,
  } = useForm<SingleFormData>({
    resolver: zodResolver(singleSchema),
    defaultValues: {
      manufacturingDate: getCurrentDateTime(),
    },
  });

  const {
    register: registerBulk,
    handleSubmit: handleBulkSubmit,
    formState: { errors: bulkErrors },
    reset: resetBulk,
    watch: watchBulk,
    setValue: setValueBulk,
  } = useForm<BulkFormData>({
    resolver: zodResolver(bulkSchema),
    defaultValues: {
      manufacturingDate: getCurrentDateTime(),
    },
  });

  const selectedSingleModel = watchSingle('inverterModel');
  const selectedBulkModel = watchBulk('inverterModel');

  // Group models by category; sort each category: active first, then power higher to lower (discontinued at end)
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
  const filteredSingleModels = useMemo(() => {
    const list = categorizedModels[selectedSingleCategory];
    if (!singleModelSearch.trim()) return list;
    const q = singleModelSearch.toLowerCase().trim();
    return list.filter(
      (m) =>
        getModelDisplayName(m).toLowerCase().includes(q) ||
        (m.modelCode && m.modelCode.toLowerCase().includes(q))
    );
  }, [categorizedModels, selectedSingleCategory, singleModelSearch]);

  const filteredBulkModels = useMemo(() => {
    const list = categorizedModels[selectedBulkCategory];
    if (!bulkModelSearch.trim()) return list;
    const q = bulkModelSearch.toLowerCase().trim();
    return list.filter(
      (m) =>
        getModelDisplayName(m).toLowerCase().includes(q) ||
        (m.modelCode && m.modelCode.toLowerCase().includes(q))
    );
  }, [categorizedModels, selectedBulkCategory, bulkModelSearch]);

  // Update manufacturing date to current date on component mount and when mode changes
  useEffect(() => {
    const currentDate = getCurrentDateTime();
    setValueSingle('manufacturingDate', currentDate);
    setValueBulk('manufacturingDate', currentDate);
  }, [mode, setValueSingle, setValueBulk]);

  // Auto-focus scanner input when scanner mode is enabled
  useEffect(() => {
    if (scannerMode && singleSerialRef.current) {
      singleSerialRef.current.focus();
    }
  }, [scannerMode]);

  useEffect(() => {
    if (bulkScannerMode && bulkSerialRef.current) {
      bulkSerialRef.current.focus();
    }
  }, [bulkScannerMode]);

  // Sync refs with react-hook-form
  useEffect(() => {
    const serialInput = document.getElementById('serialNumber') as HTMLInputElement;
    if (serialInput && singleSerialRef) {
      (singleSerialRef as any).current = serialInput;
    }
  }, [scannerMode]);

  useEffect(() => {
    const bulkTextarea = document.getElementById('bulkSerialNumbers') as HTMLTextAreaElement;
    if (bulkTextarea && bulkSerialRef) {
      (bulkSerialRef as any).current = bulkTextarea;
    }
  }, [bulkScannerMode]);

  // Handle scanner input for single registration
  const handleSingleScannerInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scannerMode) {
      e.preventDefault();
      const serialNumber = e.currentTarget.value.trim();
      if (serialNumber && selectedSingleModel) {
        // Auto-submit when Enter is pressed
        handleSingleSubmit((data) => {
          singleMutation.mutate({
            ...data,
            manufacturingDate: getCurrentDateTime(),
          });
        })();
        // Clear and refocus for next scan
        e.currentTarget.value = '';
        setTimeout(() => {
          singleSerialRef.current?.focus();
        }, 100);
      }
    }
  };

  // Handle scanner input for bulk registration
  const handleBulkScannerInput = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && bulkScannerMode) {
      e.preventDefault();
      const currentValue = bulkSerialRef.current?.value || '';
      const newSerial = e.currentTarget.value.trim();
      
      if (newSerial) {
        // Add new serial number and move to next line
        const updatedValue = currentValue 
          ? `${currentValue}\n${newSerial}`
          : newSerial;
        
        setValueBulk('serialNumbers', updatedValue);
        const serials = updatedValue.split('\n').filter((s) => s.trim().length > 0);
        setSerialCount(serials.length);
        
        // Clear input and refocus for next scan
        if (bulkSerialRef.current) {
          bulkSerialRef.current.value = '';
          setTimeout(() => {
            bulkSerialRef.current?.focus();
          }, 100);
        }
      }
    }
  };

  // Handle Excel or CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');

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
          if (serialNumbers.length === 0) {
            toast.error('No serial numbers found in Excel (use first column)');
            return;
          }
          const serialNumbersText = serialNumbers.join('\n');
          setValueBulk('serialNumbers', serialNumbersText);
          setSerialCount(serialNumbers.length);
          toast.success(`Loaded ${serialNumbers.length} serial numbers from Excel`);
        } catch (err) {
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
          if (serial) serialNumbers.push(serial);
        });
        if (serialNumbers.length === 0) {
          toast.error('No serial numbers found in file');
          return;
        }
        const serialNumbersText = serialNumbers.join('\n');
        setValueBulk('serialNumbers', serialNumbersText);
        setSerialCount(serialNumbers.length);
        toast.success(`Loaded ${serialNumbers.length} serial numbers from file`);
      };
      reader.onerror = () => toast.error('Failed to read file');
      reader.readAsText(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const singleMutation = useMutation({
    mutationFn: createInverter,
    onSuccess: () => {
      toast.success('Inverter registered successfully');
      resetSingle();
      setValueSingle('manufacturingDate', getCurrentDateTime());
      if (scannerMode && singleSerialRef.current) {
        singleSerialRef.current.focus();
      }
      queryClient.invalidateQueries({ queryKey: ['factory-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inverter-models'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to register inverter');
      if (scannerMode && singleSerialRef.current) {
        singleSerialRef.current.focus();
      }
    },
  });

  const bulkMutation = useMutation({
    mutationFn: bulkCreateInverters,
    onSuccess: () => {
      toast.success('Inverters registered successfully');
      resetBulk();
      setValueBulk('manufacturingDate', getCurrentDateTime());
      setSerialCount(0);
      if (bulkScannerMode && bulkSerialRef.current) {
        bulkSerialRef.current.focus();
      }
      queryClient.invalidateQueries({ queryKey: ['factory-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inverter-models'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to register inverters');
    },
  });

  const onSingleSubmit = (data: SingleFormData) => {
    singleMutation.mutate({
      ...data,
      manufacturingDate: data.manufacturingDate || getCurrentDateTime(),
    });
  };

  const onBulkSubmit = (data: BulkFormData) => {
    const serialNumbers = data.serialNumbers
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (serialNumbers.length === 0) {
      toast.error('Please enter at least one serial number');
      return;
    }

    // Find the selected model to get its modelCode
    const selectedModel = models?.find((m) => m._id === data.inverterModel);
    if (!selectedModel) {
      toast.error('Selected model not found');
      return;
    }

    // Backend expects modelCode and serialNumbers array
    bulkMutation.mutate({
      modelCode: selectedModel.modelCode,
      serialNumbers,
    });
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-muted/30">
      <header className="shrink-0 border-b bg-card">
        <div className="px-4 py-2 sm:px-5 sm:py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <h1 className={PAGE_HEADING_CLASS}>Product Serial Entry</h1>
            <p className={PAGE_SUBHEADING_CLASS}>Register new product serial numbers</p>
          </div>
          <Card className="w-full sm:w-auto">
            <CardContent className="px-3 py-2 sm:px-4 sm:py-2 flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-0">
                <p className="text-xs font-medium text-muted-foreground">Total Factory Stock</p>
                <p className="text-base sm:text-lg font-bold tabular-nums text-foreground leading-tight">{totalStock.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">units available</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-3 sm:p-4">
        <div className="shrink-0 flex gap-3 mb-4">
          <Button variant={mode === 'single' ? 'default' : 'outline'} size="default" className="font-semibold" onClick={() => setMode('single')}>
            Single Registration
          </Button>
          <Button variant={mode === 'bulk' ? 'default' : 'outline'} size="default" className="font-semibold" onClick={() => setMode('bulk')}>
            Bulk Registration
          </Button>
        </div>

        {mode === 'single' ? (
          <Card className="max-w-4xl flex-1 min-h-0 flex flex-col overflow-hidden flex-shrink-0">
            <CardHeader className="shrink-0 flex flex-row items-start justify-between gap-3 space-y-0 pb-4 pt-5 px-4 sm:px-6">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                  <Box className="h-5 w-5 text-muted-foreground shrink-0" />
                  Single Registration
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">Quick single product entry. Use scanner or type serial.</CardDescription>
              </div>
              <Button
                type="button"
                variant={scannerMode ? 'default' : 'outline'}
                size="default"
                className={cn(
                  !scannerMode &&
                    'border-emerald-500/60 text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500 hover:text-emerald-800'
                )}
                onClick={() => {
                  setScannerMode(!scannerMode);
                  if (!scannerMode) setTimeout(() => singleSerialRef.current?.focus(), 100);
                }}
              >
                <Scan className="h-4 w-4 mr-2" />
                {scannerMode ? 'Scanner ON' : 'Enable Scanner'}
              </Button>
            </CardHeader>
            <CardContent className="shrink-0 pt-0 px-4 pb-5 sm:px-6 sm:pb-6">
              <form onSubmit={handleSingleSubmit(onSingleSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,360px),1fr] gap-5 lg:gap-7">
                  {/* Left: Category, Model, Manufacturing Date */}
                  <div className="space-y-5 lg:pr-6 lg:border-r lg:border-border">
                    <div className="space-y-2.5">
                      <Label className="block text-base font-semibold text-foreground">Product category</Label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORY_OPTIONS.map(({ key, label, icon: Icon, activeClass }) => (
                          <Button
                            key={key}
                            type="button"
                            variant={selectedSingleCategory === key ? 'default' : 'outline'}
                            size="default"
                            className={cn(
                              'capitalize text-sm gap-1.5',
                              selectedSingleCategory === key && activeClass
                            )}
                            onClick={() => {
                              setSelectedSingleCategory(key);
                              setValueSingle('inverterModel', '');
                            }}
                          >
                            <Icon className="h-4 w-4" />
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <Label className="block text-base font-semibold text-foreground">Model</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Search or select model..."
                          value={
                            (() => {
                              const sel = models?.find((m) => m._id === selectedSingleModel);
                              return sel ? getModelDisplayName(sel) : singleModelSearch;
                            })()
                          }
                          onChange={(e) => setSingleModelSearch(e.target.value)}
                          onFocus={() => setSingleModelListOpen(true)}
                          onBlur={() => setTimeout(() => setSingleModelListOpen(false), 150)}
                          readOnly={!!selectedSingleModel}
                          className={cn(
                            'pl-9 pr-10 h-11 text-base bg-background',
                            selectedSingleModel && 'cursor-default'
                          )}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        {selectedSingleModel && (
                          <button
                            type="button"
                            onClick={() => {
                              setValueSingle('inverterModel', '');
                              setSingleModelSearch('');
                              setSingleModelListOpen(true);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                            aria-label="Clear selection"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {!selectedSingleModel && singleModelListOpen && (
                        <div className="max-h-[220px] overflow-y-auto rounded-lg border border-border p-2 space-y-2">
                          {filteredSingleModels.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">No models</p>
                          ) : (
                            filteredSingleModels.map((model) => (
                              <button
                                key={model._id}
                                type="button"
                                onClick={() => setValueSingle('inverterModel', model._id)}
                                className="w-full flex items-center justify-between gap-2 text-left px-4 py-2.5 rounded-lg border-2 border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-sm"
                              >
                                <span className="font-medium truncate">{getModelDisplayName(model)}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                      {selectedSingleModel && (() => {
                        const selectedModel = models?.find((m) => m._id === selectedSingleModel);
                        const stockCount = selectedModel ? (modelStockCounts[selectedModel._id] || 0) : 0;
                        if (!selectedModel) return null;
                        return (
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1.5">
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            {stockCount} in stock
                          </p>
                        );
                      })()}
                      {singleErrors.inverterModel && (
                        <p className="text-sm text-destructive mt-1">{singleErrors.inverterModel.message}</p>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="manufacturingDate" className="block text-base font-semibold text-foreground">
                        Manufacturing Date
                      </Label>
                      <Input
                        id="manufacturingDate"
                        type="date"
                        {...registerSingle('manufacturingDate')}
                        defaultValue={getCurrentDateTime()}
                        key={`single-date-${new Date().toDateString()}`}
                        className="h-11"
                      />
                      <CardDescription className="mt-1.5 text-sm text-muted-foreground">Defaults to today. Change if needed.</CardDescription>
                    </div>
                  </div>

                  {/* Right: Serial Number */}
                  <div className="space-y-2.5">
                    <Label htmlFor="serialNumber" className="block text-base font-semibold text-foreground">
                      Serial Number
                      {scannerMode && (
                        <span className="text-muted-foreground font-normal ml-1.5">(Enter to submit)</span>
                      )}
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="serialNumber"
                        {...((): any => {
                          const { ref, ...rest } = registerSingle('serialNumber');
                          return {
                            ...rest,
                            ref: (e: HTMLInputElement | null) => {
                              ref(e);
                              if (singleSerialRef) (singleSerialRef as any).current = e;
                            },
                          };
                        })()}
                        onKeyDown={handleSingleScannerInput}
                        placeholder={scannerMode ? 'Scan then Enter' : 'Enter serial number'}
                        autoFocus={scannerMode}
                        className={cn('pl-9 h-11 text-base', scannerMode && 'border-primary ring-primary/20')}
                      />
                    </div>
                    {singleErrors.serialNumber && (
                      <p className="text-sm text-destructive mt-1">{singleErrors.serialNumber.message}</p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 pt-4">
                  <Button type="submit" disabled={singleMutation.isPending} className="w-full h-11 text-base">
                    {singleMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Register Product
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-4xl flex-1 min-h-0 flex flex-col overflow-hidden flex-shrink-0">
            <CardHeader className="shrink-0 flex flex-row items-start justify-between gap-4 space-y-0 pb-4 pt-6 px-6 sm:px-8">
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                  <Box className="h-5 w-5 text-muted-foreground shrink-0" />
                  Bulk Registration
                </CardTitle>
                <CardDescription className="text-base">Enter or upload serial numbers, one per line.</CardDescription>
              </div>
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
                  <Scan className="h-4 w-4 mr-2" />
                  {bulkScannerMode ? 'Scanner ON' : 'Scanner'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-blue-500/60 text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500 hover:text-blue-800"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Excel
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-hidden pt-0 px-6 pb-6 sm:px-8 sm:pb-8 flex flex-col">
              <form onSubmit={handleBulkSubmit(onBulkSubmit)} className="flex-1 min-h-0 flex flex-col">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,380px),1fr] grid-rows-[1fr] gap-6 lg:gap-8 flex-1 min-h-0">
                  {/* Left: Category, Model, Manufacturing Date */}
                  <div className="flex flex-col min-h-0 space-y-4 lg:space-y-5 lg:pr-8 lg:border-r lg:border-border">
                    <div className="space-y-3 shrink-0">
                      <Label className="block text-base font-semibold text-foreground">Product category</Label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORY_OPTIONS.map(({ key, label, icon: Icon, activeClass }) => (
                          <Button
                            key={key}
                            type="button"
                            variant={selectedBulkCategory === key ? 'default' : 'outline'}
                            size="sm"
                            className={cn('capitalize gap-1.5', selectedBulkCategory === key && activeClass)}
                            onClick={() => {
                              setSelectedBulkCategory(key);
                              setValueBulk('inverterModel', '');
                            }}
                          >
                            <Icon className="h-4 w-4" />
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
                              const sel = models?.find((m) => m._id === selectedBulkModel);
                              return sel ? getModelDisplayName(sel) : bulkModelSearch;
                            })()
                          }
                          onChange={(e) => setBulkModelSearch(e.target.value)}
                          onFocus={() => setBulkModelListOpen(true)}
                          onBlur={() => setTimeout(() => setBulkModelListOpen(false), 150)}
                          readOnly={!!selectedBulkModel}
                          className={cn(
                            'pl-9 pr-10 h-11 text-base bg-background',
                            selectedBulkModel && 'cursor-default'
                          )}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        {selectedBulkModel && (
                          <button
                            type="button"
                            onClick={() => {
                              setValueBulk('inverterModel', '');
                              setBulkModelSearch('');
                              setBulkModelListOpen(true);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                            aria-label="Clear selection"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {!selectedBulkModel && bulkModelListOpen && (
                        <div className="max-h-[220px] overflow-y-auto rounded-xl p-2 space-y-2.5 border border-border bg-card">
                          {filteredBulkModels.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6 text-center">No models</p>
                          ) : (
                            filteredBulkModels.map((model) => (
                              <button
                                key={model._id}
                                type="button"
                                onClick={() => setValueBulk('inverterModel', model._id)}
                                className="w-full flex items-center justify-between gap-2 text-left px-4 py-3 rounded-xl border-2 border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              >
                                <span className="text-sm font-medium truncate">{getModelDisplayName(model)}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                      {selectedBulkModel && (() => {
                        const selectedModel = models?.find((m) => m._id === selectedBulkModel);
                        const stockCount = selectedModel ? (modelStockCounts[selectedModel._id] || 0) : 0;
                        if (!selectedModel) return null;
                        return (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 shrink-0">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                            {stockCount} in stock
                          </p>
                        );
                      })()}
                      {bulkErrors.inverterModel && (
                        <p className="text-sm text-destructive mt-1 shrink-0">{bulkErrors.inverterModel.message}</p>
                      )}
                    </div>

                    <div className="space-y-3 shrink-0">
                      <Label htmlFor="bulkManufacturingDate" className="block text-base font-semibold text-foreground">
                        Manufacturing Date
                      </Label>
                      <Input
                        id="bulkManufacturingDate"
                        type="date"
                        {...registerBulk('manufacturingDate')}
                        defaultValue={getCurrentDateTime()}
                        key={`bulk-date-${getCurrentDateTime()}`}
                        className="h-11"
                      />
                      <CardDescription className="mt-1.5 text-muted-foreground">Defaults to today.</CardDescription>
                    </div>
                  </div>

                  {/* Right: Serial Numbers */}
                  <div className="flex flex-col min-h-0 space-y-3">
                    <div className="flex items-center justify-between gap-2 shrink-0">
                      <Label htmlFor="bulkSerialNumbers" className="block text-base font-semibold text-foreground">
                        Serial Numbers
                      </Label>
                      <span className="text-sm text-muted-foreground tabular-nums shrink-0">
                        {serialCount} line{serialCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <textarea
                      id="bulkSerialNumbers"
                      {...registerBulk('serialNumbers', {
                        onChange: (e) => {
                          const serials = e.target.value.split('\n').filter((s: string) => s.trim().length > 0);
                          setSerialCount(serials.length);
                        },
                      })}
                      onKeyDown={handleBulkScannerInput}
                      className={cn(
                        'flex-1 min-h-[120px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none overflow-auto',
                        bulkScannerMode && 'border-primary ring-primary/20'
                      )}
                      placeholder="One serial per line, or upload Excel/CSV"
                      autoFocus={bulkScannerMode}
                    />
                    {bulkErrors.serialNumbers && (
                      <p className="text-sm text-destructive mt-1 shrink-0">{bulkErrors.serialNumbers.message}</p>
                    )}
                    <CardDescription className="mt-1.5 text-muted-foreground shrink-0">
                      Upload Excel or CSV with serials in the first column, or use scanner.
                    </CardDescription>
                  </div>
                </div>

                <div className="shrink-0 pt-4">
                  <Button
                    type="submit"
                    disabled={bulkMutation.isPending || serialCount === 0}
                    className="w-full h-12 text-base"
                  >
                    {bulkMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Register {serialCount || 0} product{serialCount !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
