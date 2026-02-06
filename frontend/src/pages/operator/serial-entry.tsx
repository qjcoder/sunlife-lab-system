import { useState, useRef, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  createSingleSerialEntry, 
  createBulkSerialEntry, 
  getSerialEntryHistory,
  type DuplicateInfo,
  type RejectedSerial 
} from '@/api/operator-api';
import { listModels } from '@/api/model-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Package, CheckCircle2, Upload, Scan, Hash, Calendar, Box, Loader2, 
  X, AlertCircle, History, User, Clock 
} from 'lucide-react';
import { cn, PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from '@/lib/utils';

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

export default function OperatorSerialEntry() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [serialCount, setSerialCount] = useState(0);
  const [scannerMode, setScannerMode] = useState(false);
  const [bulkScannerMode, setBulkScannerMode] = useState(false);
  const [duplicateDialog, setDuplicateDialog] = useState<DuplicateInfo | null>(null);
  const [bulkResult, setBulkResult] = useState<{
    accepted: string[];
    rejected: RejectedSerial[];
    summary: { total: number; accepted: number; rejected: number };
  } | null>(null);
  const [selectedModelForHistory, setSelectedModelForHistory] = useState<string | null>(null);
  const singleSerialRef = useRef<HTMLInputElement>(null);
  const bulkSerialRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: models } = useQuery({
    queryKey: ['inverter-models'],
    queryFn: () => listModels(),
  });

  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['operator-serial-history', selectedModelForHistory],
    queryFn: () => getSerialEntryHistory(selectedModelForHistory!),
    enabled: !!selectedModelForHistory,
  });

  const getCurrentDateTime = () => {
    const now = new Date();
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

  const filteredModels = useMemo(() => {
    if (!models) return [];
    return models;
  }, [models]);

  useEffect(() => {
    const currentDate = getCurrentDateTime();
    setValueSingle('manufacturingDate', currentDate);
    setValueBulk('manufacturingDate', currentDate);
  }, [mode, setValueSingle, setValueBulk]);

  useEffect(() => {
    if (selectedBulkModel) {
      setSelectedModelForHistory(selectedBulkModel);
    }
  }, [selectedBulkModel]);

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

  const handleSingleScannerInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scannerMode) {
      e.preventDefault();
      const serialNumber = e.currentTarget.value.trim();
      if (serialNumber && selectedSingleModel) {
        handleSingleSubmit((data) => {
          singleMutation.mutate({
            ...data,
            manufacturingDate: getCurrentDateTime(),
          });
        })();
        e.currentTarget.value = '';
        setTimeout(() => {
          singleSerialRef.current?.focus();
        }, 100);
      }
    }
  };

  const handleBulkScannerInput = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && bulkScannerMode) {
      e.preventDefault();
      const currentValue = bulkSerialRef.current?.value || '';
      const newSerial = e.currentTarget.value.trim();
      
      if (newSerial) {
        const updatedValue = currentValue 
          ? `${currentValue}\n${newSerial}`
          : newSerial;
        
        setValueBulk('serialNumbers', updatedValue);
        const serials = updatedValue.split('\n').filter((s) => s.trim().length > 0);
        setSerialCount(serials.length);
        
        if (bulkSerialRef.current) {
          bulkSerialRef.current.value = '';
          setTimeout(() => {
            bulkSerialRef.current?.focus();
          }, 100);
        }
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const serialNumbers: string[] = [];

      lines.forEach((line, index) => {
        if (index === 0 && (line.toLowerCase().includes('serial') || line.toLowerCase().includes('number'))) {
          return;
        }
        
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

      const serialNumbersText = serialNumbers.join('\n');
      setValueBulk('serialNumbers', serialNumbersText);
      setSerialCount(serialNumbers.length);
      toast.success(`Loaded ${serialNumbers.length} serial numbers from file`);
    };

    reader.onerror = () => {
      toast.error('Failed to read file');
    };

    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const singleMutation = useMutation({
    mutationFn: createSingleSerialEntry,
    onSuccess: () => {
      toast.success('Serial number entered successfully');
      resetSingle();
      setValueSingle('manufacturingDate', getCurrentDateTime());
      if (scannerMode && singleSerialRef.current) {
        singleSerialRef.current.focus();
      }
      if (selectedSingleModel) {
        refetchHistory();
      }
    },
    onError: (error: any) => {
      if (error.response?.status === 409 && error.response?.data?.duplicate) {
        setDuplicateDialog(error.response.data.existingSerial);
      } else {
        toast.error(error.response?.data?.message || 'Failed to enter serial number');
      }
      if (scannerMode && singleSerialRef.current) {
        singleSerialRef.current.focus();
      }
    },
  });

  const bulkMutation = useMutation({
    mutationFn: createBulkSerialEntry,
    onSuccess: (data) => {
      toast.success(`Bulk entry completed: ${data.summary.accepted} accepted, ${data.summary.rejected} rejected`);
      setBulkResult({
        accepted: data.accepted,
        rejected: data.rejected,
        summary: data.summary,
      });
      resetBulk();
      setValueBulk('manufacturingDate', getCurrentDateTime());
      setSerialCount(0);
      if (bulkScannerMode && bulkSerialRef.current) {
        bulkSerialRef.current.focus();
      }
      if (selectedBulkModel) {
        refetchHistory();
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process bulk entry');
    },
  });

  const onSingleSubmit = (data: SingleFormData) => {
    singleMutation.mutate({
      serialNumber: data.serialNumber,
      inverterModel: data.inverterModel,
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

    bulkMutation.mutate({
      inverterModel: data.inverterModel,
      serialNumbers,
      manufacturingDate: data.manufacturingDate || getCurrentDateTime(),
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      {/* Main Content - Left 2 columns */}
      <div className="lg:col-span-2 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className={PAGE_HEADING_CLASS}>Product Serial Entry</h1>
            <p className={PAGE_SUBHEADING_CLASS}>Enter product serial numbers</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === 'single' ? 'default' : 'outline'}
            onClick={() => {
              setMode('single');
              setBulkResult(null);
            }}
            className="font-semibold"
          >
            Single Entry
          </Button>
          <Button
            variant={mode === 'bulk' ? 'default' : 'outline'}
            onClick={() => {
              setMode('bulk');
              setBulkResult(null);
            }}
            className="font-semibold"
          >
            Bulk Entry
          </Button>
        </div>

        {/* Single Entry Form */}
        {mode === 'single' && (
          <Card className="border-2 border-blue-200/60 dark:border-blue-800/60 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 dark:from-blue-600 dark:via-indigo-600 dark:to-purple-600 border-b-0">
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                  <Box className="h-6 w-6" />
                  <span>Single Serial Entry</span>
                </div>
                <Button
                  type="button"
                  variant={scannerMode ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    scannerMode 
                      ? "bg-white text-green-600 hover:bg-green-50" 
                      : "bg-white/20 backdrop-blur-md text-white border-white/30 hover:bg-white/30"
                  )}
                  onClick={() => setScannerMode(!scannerMode)}
                >
                  <Scan className="h-4 w-4 mr-2" />
                  {scannerMode ? 'Scanner Active' : 'Enable Scanner'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Model Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Product Model
                </Label>
                {filteredModels.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed">
                    <Package className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No models found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                    {filteredModels.map((model) => {
                      const displayName = model.modelName || `${model.brand} ${model.productLine} ${model.variant}`.trim();
                      const isSelected = selectedSingleModel === model._id;
                      return (
                        <button
                          key={model._id}
                          type="button"
                          onClick={() => setValueSingle('inverterModel', model._id)}
                          className={cn(
                            "px-3 py-2 rounded-lg border-2 font-semibold text-xs transition-all",
                            isSelected
                              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                              : "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:from-blue-100 hover:to-blue-200"
                          )}
                        >
                          {displayName}
                        </button>
                      );
                    })}
                  </div>
                )}
                {singleErrors.inverterModel && (
                  <p className="text-sm text-destructive">{singleErrors.inverterModel.message}</p>
                )}
              </div>

              {/* Serial Number Input */}
              <div className="space-y-2">
                <Label htmlFor="serialNumber" className="text-sm font-bold flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Serial Number
                </Label>
                <Input
                  id="serialNumber"
                  {...registerSingle('serialNumber', {
                    onChange: (e) => {
                      registerSingle('serialNumber').onChange(e);
                    }
                  })}
                  ref={(e) => {
                    const { ref } = registerSingle('serialNumber');
                    ref(e);
                    if (e) {
                      (singleSerialRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                    }
                  }}
                  onKeyDown={handleSingleScannerInput}
                  placeholder={scannerMode ? "Scan serial number and press Enter" : "Enter serial number"}
                  autoFocus={scannerMode}
                  className={cn("h-12", scannerMode && 'border-green-500 focus:ring-green-500')}
                />
                {singleErrors.serialNumber && (
                  <p className="text-sm text-destructive">{singleErrors.serialNumber.message}</p>
                )}
              </div>

              {/* Manufacturing Date */}
              <div className="space-y-2">
                <Label htmlFor="manufacturingDate" className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Manufacturing Date
                </Label>
                <Input
                  id="manufacturingDate"
                  type="date"
                  {...registerSingle('manufacturingDate')}
                  className="h-12"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="button"
                onClick={handleSingleSubmit(onSingleSubmit)}
                disabled={singleMutation.isPending}
                className="w-full h-12 font-bold text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {singleMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Enter Serial Number
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Bulk Entry Form */}
        {mode === 'bulk' && (
          <Card className="border-2 border-green-200/60 dark:border-green-800/60 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 dark:from-green-600 dark:via-emerald-600 dark:to-teal-600 border-b-0">
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                  <Box className="h-6 w-6" />
                  <span>Bulk Serial Entry</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={bulkScannerMode ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      bulkScannerMode 
                        ? "bg-white text-green-600 hover:bg-green-50" 
                        : "bg-white/20 backdrop-blur-md text-white border-white/30 hover:bg-white/30"
                    )}
                    onClick={() => setBulkScannerMode(!bulkScannerMode)}
                  >
                    <Scan className="h-4 w-4 mr-2" />
                    {bulkScannerMode ? 'Scanner Active' : 'Enable Scanner'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-white/20 backdrop-blur-md text-white border-white/30 hover:bg-white/30"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Excel/CSV
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Model Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Product Model
                </Label>
                {filteredModels.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed">
                    <Package className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No models found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                    {filteredModels.map((model) => {
                      const displayName = model.modelName || `${model.brand} ${model.productLine} ${model.variant}`.trim();
                      const isSelected = selectedBulkModel === model._id;
                      return (
                        <button
                          key={model._id}
                          type="button"
                          onClick={() => setValueBulk('inverterModel', model._id)}
                          className={cn(
                            "px-3 py-2 rounded-lg border-2 font-semibold text-xs transition-all",
                            isSelected
                              ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg"
                              : "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:from-green-100 hover:to-green-200"
                          )}
                        >
                          {displayName}
                        </button>
                      );
                    })}
                  </div>
                )}
                {bulkErrors.inverterModel && (
                  <p className="text-sm text-destructive">{bulkErrors.inverterModel.message}</p>
                )}
              </div>

              {/* Serial Numbers Textarea */}
              <div className="space-y-2">
                <Label htmlFor="bulkSerialNumbers" className="text-sm font-bold flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Serial Numbers ({serialCount} entered)
                </Label>
                <textarea
                  id="bulkSerialNumbers"
                  {...registerBulk('serialNumbers', {
                    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => {
                      registerBulk('serialNumbers').onChange(e);
                      const value = e.target.value;
                      const serials = value.split('\n').filter((s: string) => s.trim().length > 0);
                      setSerialCount(serials.length);
                    }
                  })}
                  ref={(e) => {
                    const { ref } = registerBulk('serialNumbers');
                    ref(e);
                    if (e) {
                      (bulkSerialRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
                    }
                  }}
                  onKeyDown={handleBulkScannerInput}
                  className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  placeholder={bulkScannerMode
                    ? "Scan serial number and press Enter to add to list...\n(Each scan will automatically move to next line)"
                    : "SLI6K-0001\nSLI6K-0002\nSLI6K-0003\n...\n(Enter serial numbers, one per line - unlimited)\n\nOr upload Excel/CSV file with serial numbers in first column"
                  }
                  rows={15}
                  autoFocus={bulkScannerMode}
                />
                {bulkErrors.serialNumbers && (
                  <p className="text-sm text-destructive">{bulkErrors.serialNumbers.message}</p>
                )}
              </div>

              {/* Manufacturing Date */}
              <div className="space-y-2">
                <Label htmlFor="bulkManufacturingDate" className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Manufacturing Date
                </Label>
                <Input
                  id="bulkManufacturingDate"
                  type="date"
                  {...registerBulk('manufacturingDate')}
                  className="h-12"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="button"
                onClick={handleBulkSubmit(onBulkSubmit)}
                disabled={bulkMutation.isPending}
                className="w-full h-12 font-bold text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {bulkMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Enter Serial Numbers
                  </>
                )}
              </Button>

              {/* Bulk Result Summary */}
              {bulkResult && (
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">Entry Summary</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBulkResult(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold text-blue-600">{bulkResult.summary.total}</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Accepted</p>
                      <p className="text-2xl font-bold text-green-600">{bulkResult.summary.accepted}</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Rejected</p>
                      <p className="text-2xl font-bold text-red-600">{bulkResult.summary.rejected}</p>
                    </div>
                  </div>

                  {/* Accepted/Rejected Dropdowns */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-green-700 dark:text-green-400">
                        Accepted Serials ({bulkResult.accepted.length})
                      </Label>
                      <Select>
                        <SelectTrigger className="h-auto max-h-32 overflow-y-auto">
                          <SelectValue placeholder="View accepted serials" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {bulkResult.accepted.map((serial, idx) => (
                            <SelectItem key={idx} value={serial}>
                              {serial}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-red-700 dark:text-red-400">
                        Rejected Serials ({bulkResult.rejected.length})
                      </Label>
                      <Select>
                        <SelectTrigger className="h-auto max-h-32 overflow-y-auto">
                          <SelectValue placeholder="View rejected serials" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {bulkResult.rejected.map((rejected, idx) => (
                            <SelectItem key={idx} value={rejected.serialNumber}>
                              <div className="flex flex-col">
                                <span>{rejected.serialNumber}</span>
                                <span className="text-xs text-muted-foreground">
                                  {rejected.message}
                                  {rejected.enteredBy && ` by ${rejected.enteredBy}`}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* History Panel - Right Side */}
      <div className="lg:col-span-1">
        <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-lg sticky top-6">
          <CardHeader className="bg-gradient-to-r from-slate-500 via-slate-600 to-slate-700 dark:from-slate-600 dark:via-slate-700 dark:to-slate-800 border-b-0">
            <CardTitle className="flex items-center gap-3 text-white">
              <History className="h-5 w-5" />
              <span>Entry History</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {selectedBulkModel ? (
              historyData ? (
                <div className="space-y-4">
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Entries</p>
                    <p className="text-2xl font-bold">{historyData.totalEntries}</p>
                  </div>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {historyData.history.map((dateGroup) => (
                      <div key={dateGroup.date} className="border rounded-lg p-3 bg-white dark:bg-slate-900">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-sm">{dateGroup.date}</p>
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
                            {dateGroup.count} entries
                          </span>
                        </div>
                        <div className="space-y-1">
                          {dateGroup.entries.map((entry, idx) => (
                            <div key={idx} className="text-xs p-2 bg-slate-50 dark:bg-slate-800/50 rounded flex items-center justify-between">
                              <span className="font-mono">{entry.serialNumber}</span>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>{entry.enteredBy}</span>
                                <Clock className="h-3 w-3 ml-2" />
                                <span>{entry.enteredTime}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Loading history...</p>
                </div>
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a model to view entry history</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Duplicate Notification Dialog */}
      <Dialog open={!!duplicateDialog} onOpenChange={(open) => !open && setDuplicateDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Serial Number Already Exists
            </DialogTitle>
            <DialogDescription>
              This serial number was already entered by another operator.
            </DialogDescription>
          </DialogHeader>
          {duplicateDialog && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border-2 border-red-200 dark:border-red-800">
                <p className="font-mono font-bold text-lg mb-3">{duplicateDialog.serialNumber}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">Entered by:</span>
                    <span>{duplicateDialog.enteredBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">Date:</span>
                    <span>{duplicateDialog.enteredDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">Time:</span>
                    <span>{duplicateDialog.enteredTime}</span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setDuplicateDialog(null)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
