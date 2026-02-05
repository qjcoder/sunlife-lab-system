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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Package, CheckCircle2, Upload, Scan, Hash, Calendar, Box, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Helper function to categorize models
const categorizeModel = (model: any) => {
  if (!model) return 'inverter';
  
  const productLine = (model.productLine || '').toLowerCase();
  const brand = (model.brand || '').toLowerCase();
  const variant = (model.variant || '').toLowerCase();
  const modelCode = (model.modelCode || '').toLowerCase();
  const fullName = `${brand} ${productLine} ${variant} ${modelCode}`.toLowerCase();
  
  // Check for VFD
  if (
    productLine.includes('vfd') || 
    brand.includes('vfd') || 
    variant.includes('vfd') || 
    modelCode.includes('vfd') ||
    fullName.includes('vfd') ||
    modelCode.includes('gd170')
  ) {
    return 'vfd';
  }
  
  // Check for battery
  if (
    productLine.includes('battery') || 
    productLine.includes('batt') || 
    productLine.includes('lithium') ||
    brand.includes('battery') || 
    brand.includes('lithium') ||
    variant.includes('battery') || 
    variant.includes('lithium') ||
    modelCode.includes('battery') ||
    modelCode.includes('lithium') ||
    fullName.includes('battery') ||
    fullName.includes('lithium') ||
    fullName.includes('51.2v') ||
    fullName.includes('48100') ||
    fullName.includes('48314') ||
    fullName.includes('100ah')
  ) {
    return 'battery';
  }
  
  // Everything else is an inverter
  return 'inverter';
};

export default function InverterRegistration() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [serialCount, setSerialCount] = useState(0);
  const [scannerMode, setScannerMode] = useState(false);
  const [bulkScannerMode, setBulkScannerMode] = useState(false);
  const [selectedSingleCategory, setSelectedSingleCategory] = useState<string>('inverter');
  const [selectedBulkCategory, setSelectedBulkCategory] = useState<string>('inverter');
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

  // Filter models by selected category
  const filteredModels = useMemo(() => {
    if (!models || !Array.isArray(models)) return [];
    let filtered = models.filter((model) => model.active !== false);
    
    // Filter by category if one is selected
    const selectedCategory = mode === 'single' ? selectedSingleCategory : selectedBulkCategory;
    if (selectedCategory) {
      filtered = filtered.filter((model) => categorizeModel(model) === selectedCategory);
    }
    
    return filtered;
  }, [models, mode, selectedSingleCategory, selectedBulkCategory]);

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

  // Handle Excel/CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Parse CSV/Excel (simple CSV parser)
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const serialNumbers: string[] = [];

      lines.forEach((line, index) => {
        // Skip header row if it looks like a header
        if (index === 0 && (line.toLowerCase().includes('serial') || line.toLowerCase().includes('number'))) {
          return;
        }
        
        // Extract serial number (first column or whole line)
        const parts = line.split(',').map(p => p.trim());
        const serial = parts[0] || line;
        if (serial && serial.length > 0) {
          serialNumbers.push(serial);
        }
      });

      if (serialNumbers.length === 0) {
        toast.error('No serial numbers found in file');
        return;
      }

      // Set serial numbers in bulk form
      const serialNumbersText = serialNumbers.join('\n');
      setValueBulk('serialNumbers', serialNumbersText);
      setSerialCount(serialNumbers.length);
      toast.success(`Loaded ${serialNumbers.length} serial numbers from file`);
    };

    reader.onerror = () => {
      toast.error('Failed to read file');
    };

    // Read as text (CSV)
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">Product Serial Entry</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">Register new product serial numbers</p>
        </div>
        
        {/* Stock Summary Card */}
        <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Factory Stock</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {totalStock.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {factoryStock?.availableInverters?.length || 0} units available
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button
          variant={mode === 'single' ? 'default' : 'outline'}
          onClick={() => setMode('single')}
        >
          Single Registration
        </Button>
        <Button
          variant={mode === 'bulk' ? 'default' : 'outline'}
          onClick={() => setMode('bulk')}
        >
          Bulk Registration
        </Button>
      </div>

      {mode === 'single' ? (
        <Card className="border-2 border-blue-200/60 dark:border-blue-800/60 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 dark:from-blue-600 dark:via-indigo-600 dark:to-purple-600 border-b-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDMuMzE0LTIuNjg2IDYtNiA2cy02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNnoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
            <CardTitle className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30">
                  <Box className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-white block">Single Registration</span>
                  <span className="text-blue-100 text-sm font-medium">Quick single product entry</span>
                </div>
              </div>
              <Button
                type="button"
                variant={scannerMode ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  "font-semibold transition-all duration-300",
                  scannerMode 
                    ? "bg-white text-green-600 hover:bg-green-50 shadow-xl border-2 border-white" 
                    : "bg-white/20 backdrop-blur-md text-white border-2 border-white/30 hover:bg-white/30"
                )}
                onClick={() => {
                  setScannerMode(!scannerMode);
                  if (!scannerMode) {
                    setTimeout(() => singleSerialRef.current?.focus(), 100);
                  }
                }}
              >
                <Scan className="h-4 w-4 mr-2" />
                {scannerMode ? 'Scanner ON' : 'Enable Scanner'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 pb-8 px-8">
            <form onSubmit={handleSingleSubmit(onSingleSubmit)} className="space-y-7">
              <div className="space-y-2">
                <Label htmlFor="serialNumber" className="text-sm font-semibold flex items-center gap-2">
                  <Hash className="h-4 w-4 text-slate-500" />
                  Serial Number
                  {scannerMode && <span className="text-xs font-normal text-muted-foreground">(Press Enter to auto-submit)</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="serialNumber"
                    {...((): any => {
                      const { ref, ...rest } = registerSingle('serialNumber');
                      return {
                        ...rest,
                        ref: (e: HTMLInputElement | null) => {
                          ref(e);
                          if (singleSerialRef) {
                            (singleSerialRef as any).current = e;
                          }
                        }
                      };
                    })()}
                    onKeyDown={handleSingleScannerInput}
                    placeholder={scannerMode ? "Scan serial number and press Enter" : "Enter serial number"}
                    autoFocus={scannerMode}
                    className={`pl-10 h-11 ${scannerMode ? 'border-green-500 focus:ring-green-500' : ''}`}
                  />
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
                {singleErrors.serialNumber && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                    <span className="text-destructive">⚠</span>
                    {singleErrors.serialNumber.message}
                  </p>
                )}
              </div>

              {/* Product Model Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Product Model
                </Label>
                
                {/* Category Selection Buttons */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setSelectedSingleCategory('inverter')}
                    className={cn(
                      "px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all duration-200",
                      selectedSingleCategory === 'inverter'
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                    )}
                  >
                    Inverters
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSingleCategory('battery')}
                    className={cn(
                      "px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all duration-200",
                      selectedSingleCategory === 'battery'
                        ? "bg-green-600 text-white border-green-600 shadow-md"
                        : "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40"
                    )}
                  >
                    Batteries
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSingleCategory('vfd')}
                    className={cn(
                      "px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all duration-200",
                      selectedSingleCategory === 'vfd'
                        ? "bg-orange-600 text-white border-orange-600 shadow-md"
                        : "bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40"
                    )}
                  >
                    VFD
                  </button>
                </div>
                
                {filteredModels.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                    <Package className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">
                      No models found
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {filteredModels.map((model) => {
                      // Display name without brand - just productLine and variant
                      let displayName = '';
                      if (model.productLine && model.variant) {
                        displayName = `${model.productLine} ${model.variant}`.trim();
                      } else if (model.modelName) {
                        // Fallback: remove brand from modelName if it exists
                        const brand = (model.brand || '').trim();
                        displayName = model.modelName.replace(new RegExp(`^${brand}\\s+`, 'i'), '').trim();
                      } else {
                        displayName = model.modelCode || 'Unknown Model';
                      }
                      const isSelected = selectedSingleModel === model._id;
                      const category = categorizeModel(model);
                      
                      // Color schemes based on category
                      const colorSchemes = {
                        inverter: {
                          selected: 'bg-blue-500 text-white shadow-md border-blue-600',
                          unselected: 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40',
                        },
                        battery: {
                          selected: 'bg-green-500 text-white shadow-md border-green-600',
                          unselected: 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40',
                        },
                        vfd: {
                          selected: 'bg-orange-500 text-white shadow-md border-orange-600',
                          unselected: 'bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40',
                        },
                      };
                      
                      const colors = colorSchemes[category as keyof typeof colorSchemes] || colorSchemes.inverter;
                      
                      return (
                        <button
                          key={model._id}
                          type="button"
                          onClick={() => setValueSingle('inverterModel', model._id)}
                          className={cn(
                            "px-2 py-1 rounded-md border font-medium text-[10px] sm:text-[11px] transition-all duration-200 text-center leading-tight",
                            isSelected 
                              ? colors.selected + " scale-105"
                              : colors.unselected + " hover:scale-102"
                          )}
                        >
                          {displayName}
                        </button>
                      );
                    })}
                  </div>
                )}
                {selectedSingleModel && (() => {
                  const selectedModel = models?.find(m => m._id === selectedSingleModel);
                  const stockCount = selectedModel ? (modelStockCounts[selectedModel._id] || 0) : 0;
                  
                  if (!selectedModel) return null;
                  
                  return (
                    <div className="flex items-center gap-2 p-3 rounded-xl text-sm bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 shadow-sm">
                      <div className="p-1.5 bg-green-500 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-green-700 dark:text-green-400 font-bold">
                        {stockCount} unit{stockCount !== 1 ? 's' : ''} available in factory
                      </span>
                    </div>
                  );
                })()}
                {singleErrors.inverterModel && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">{singleErrors.inverterModel.message}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="manufacturingDate" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  Manufacturing Date
                </Label>
                <Input
                  id="manufacturingDate"
                  type="date"
                  {...registerSingle('manufacturingDate')}
                  defaultValue={getCurrentDateTime()}
                  key={`single-date-${new Date().toDateString()}`}
                  className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                />
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <span className="text-blue-600 dark:text-blue-400 text-base">ℹ️</span>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                    Automatically set to current date. You can change if needed.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t-2 border-slate-200 dark:border-slate-700">
                <Button 
                  type="submit" 
                  disabled={singleMutation.isPending}
                  className="w-full h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
                >
                  {singleMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Registering Product...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Register Product
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Box className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-xl font-bold">Bulk Registration</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={bulkScannerMode ? 'default' : 'outline'}
                  size="sm"
                  className={bulkScannerMode ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                  onClick={() => {
                    setBulkScannerMode(!bulkScannerMode);
                    if (!bulkScannerMode) {
                      setTimeout(() => bulkSerialRef.current?.focus(), 100);
                    }
                  }}
                >
                  <Scan className="h-4 w-4 mr-2" />
                  {bulkScannerMode ? 'Scanner ON' : 'Scanner'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Excel/CSV
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleBulkSubmit(onBulkSubmit)} className="space-y-6">
              {/* Product Model Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Product Model
                </Label>
                
                {/* Category Selection Buttons */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setSelectedBulkCategory('inverter')}
                    className={cn(
                      "px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all duration-200",
                      selectedBulkCategory === 'inverter'
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                    )}
                  >
                    Inverters
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBulkCategory('battery')}
                    className={cn(
                      "px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all duration-200",
                      selectedBulkCategory === 'battery'
                        ? "bg-green-600 text-white border-green-600 shadow-md"
                        : "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40"
                    )}
                  >
                    Batteries
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBulkCategory('vfd')}
                    className={cn(
                      "px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all duration-200",
                      selectedBulkCategory === 'vfd'
                        ? "bg-orange-600 text-white border-orange-600 shadow-md"
                        : "bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40"
                    )}
                  >
                    VFD
                  </button>
                </div>
                
                {filteredModels.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                    <Package className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">
                      {selectedBulkCategory ? `No ${selectedBulkCategory} models found` : 'No models found'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {filteredModels.map((model) => {
                      // Display name without brand - just productLine and variant
                      let displayName = '';
                      if (model.productLine && model.variant) {
                        displayName = `${model.productLine} ${model.variant}`.trim();
                      } else if (model.modelName) {
                        // Fallback: remove brand from modelName if it exists
                        const brand = (model.brand || '').trim();
                        displayName = model.modelName.replace(new RegExp(`^${brand}\\s+`, 'i'), '').trim();
                      } else {
                        displayName = model.modelCode || 'Unknown Model';
                      }
                      const isSelected = selectedBulkModel === model._id;
                      const category = categorizeModel(model);
                      
                      // Color schemes based on category
                      const colorSchemes = {
                        inverter: {
                          selected: 'bg-blue-500 text-white shadow-md border-blue-600',
                          unselected: 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40',
                        },
                        battery: {
                          selected: 'bg-green-500 text-white shadow-md border-green-600',
                          unselected: 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40',
                        },
                        vfd: {
                          selected: 'bg-orange-500 text-white shadow-md border-orange-600',
                          unselected: 'bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40',
                        },
                      };
                      
                      const colors = colorSchemes[category as keyof typeof colorSchemes] || colorSchemes.inverter;
                      
                      return (
                        <button
                          key={model._id}
                          type="button"
                          onClick={() => setValueBulk('inverterModel', model._id)}
                          className={cn(
                            "px-2 py-1 rounded-md border font-medium text-[10px] sm:text-[11px] transition-all duration-200 text-center leading-tight",
                            isSelected 
                              ? colors.selected + " scale-105"
                              : colors.unselected + " hover:scale-102"
                          )}
                        >
                          {displayName}
                        </button>
                      );
                    })}
                  </div>
                )}
                {selectedBulkModel && (() => {
                  const selectedModel = models?.find(m => m._id === selectedBulkModel);
                  const stockCount = selectedModel ? (modelStockCounts[selectedModel._id] || 0) : 0;
                  
                  if (!selectedModel) return null;
                  
                  return (
                    <div className="flex items-center gap-3 p-3 rounded-xl text-sm bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 shadow-sm">
                      <div className="p-1.5 bg-green-500 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-green-700 dark:text-green-400 font-bold">
                        {stockCount} unit{stockCount !== 1 ? 's' : ''} available in factory
                      </span>
                    </div>
                  );
                })()}
                {bulkErrors.inverterModel && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">{bulkErrors.inverterModel.message}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bulkSerialNumbers" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Hash className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    Serial Numbers
                    {bulkScannerMode && (
                      <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">
                        Scanner Active
                      </span>
                    )}
                  </Label>
                  <div className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                      {serialCount} serial number{serialCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="relative group">
                  <textarea
                    id="bulkSerialNumbers"
                    {...registerBulk('serialNumbers', {
                      onChange: (e) => {
                        const value = e.target.value;
                        const serials = value.split('\n').filter((s: string) => s.trim().length > 0);
                        setSerialCount(serials.length);
                      },
                    })}
                    onKeyDown={handleBulkScannerInput}
                    className={cn(
                      "flex min-h-[400px] w-full rounded-xl border-2 bg-background px-4 py-3 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300",
                      bulkScannerMode
                        ? 'border-green-500 focus:ring-green-500 focus:border-green-600 bg-green-50/50 dark:bg-green-950/20'
                        : 'border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-purple-500/20 hover:border-slate-400 dark:hover:border-slate-500'
                    )}
                    placeholder={bulkScannerMode 
                      ? "Scan serial number and press Enter to add to list...\n(Each scan will automatically move to next line)"
                      : "SLI6K-0001\nSLI6K-0002\nSLI6K-0003\n...\n(Enter serial numbers, one per line - unlimited)\n\nOr upload Excel/CSV file with serial numbers in first column"
                    }
                    rows={20}
                    autoFocus={bulkScannerMode}
                  />
                </div>
                {bulkErrors.serialNumbers && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">{bulkErrors.serialNumbers.message}</p>
                  </div>
                )}
                <div className="flex items-start gap-2 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <span className="text-blue-600 dark:text-blue-400 text-lg">💡</span>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                    <strong>Tip:</strong> Upload Excel/CSV file with serial numbers in the first column, or use scanner mode for quick entry
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="bulkManufacturingDate" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  Manufacturing Date
                </Label>
                <Input
                  id="bulkManufacturingDate"
                  type="date"
                  {...registerBulk('manufacturingDate')}
                  defaultValue={getCurrentDateTime()}
                  key={`bulk-date-${getCurrentDateTime()}`}
                  className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                />
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <span className="text-blue-600 dark:text-blue-400 text-base">ℹ️</span>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                    Automatically set to current date. You can change if needed.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t-2 border-slate-200 dark:border-slate-700">
                <Button 
                  type="submit" 
                  disabled={bulkMutation.isPending || serialCount === 0}
                  className="w-full h-14 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Registering {serialCount || 0} Product{serialCount !== 1 ? 's' : ''}...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Register {serialCount || 0} Product{serialCount !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
