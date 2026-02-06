import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth-store';
import { getDealerInvoicePrefix } from '@/lib/invoice-utils';
import { createDispatch } from '@/api/dispatch-api';
import { getFactoryStock } from '@/api/stock-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Scan, Upload, X, Truck, Hash, Building2, Package } from 'lucide-react';
import { PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from '@/lib/utils';

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
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [scannerMode, setScannerMode] = useState(false);
  const [scannerInput, setScannerInput] = useState('');
  const queryClient = useQueryClient();
  const scannerRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dispatchPrefix = getDealerInvoicePrefix(user?.name);

  const { data: stock, isLoading: stockLoading, error: stockError } = useQuery({
    queryKey: ['factory-stock'],
    queryFn: getFactoryStock,
  });

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

  // Auto-focus scanner input when scanner mode is enabled
  useEffect(() => {
    if (scannerMode && scannerRef.current) {
      scannerRef.current.focus();
    }
  }, [scannerMode]);

  // Handle scanner input - add serial to selection on Enter
  const handleScannerInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scannerMode) {
      e.preventDefault();
      const serial = scannerInput.trim();
      if (serial) {
        // Check if serial exists in available stock
        const availableSerial = stock?.availableInverters?.find(
          item => item.serialNumber === serial
        );
        
        if (availableSerial) {
          if (!selectedSerials.includes(serial)) {
            setSelectedSerials([...selectedSerials, serial]);
            toast.success(`Added ${serial} to dispatch`);
          } else {
            toast.info(`${serial} is already selected`);
          }
        } else {
          toast.error(`Serial number ${serial} not found in available stock`);
        }
        
        // Clear and refocus for next scan
        setScannerInput('');
        setTimeout(() => {
          scannerRef.current?.focus();
        }, 100);
      }
    }
  };

  // Handle Excel/CSV file upload for serial numbers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Parse CSV/Excel
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const serialNumbers: string[] = [];

      lines.forEach((line, index) => {
        // Skip header row
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

      // Validate serials against available stock
      const validSerials = serialNumbers.filter(serial => {
        if (!stock || !stock.availableInverters || !Array.isArray(stock.availableInverters)) return false;
        return stock.availableInverters.some(item => item && item.serialNumber === serial);
      });

      if (validSerials.length === 0) {
        toast.error('No valid serial numbers found in available stock');
        return;
      }

      // Add valid serials to selection (avoid duplicates)
      const newSerials = [...new Set([...selectedSerials, ...validSerials])];
      setSelectedSerials(newSerials);
      toast.success(`Added ${validSerials.length} serial numbers from file`);
    };

    reader.onerror = () => {
      toast.error('Failed to read file');
    };

    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const mutation = useMutation({
    mutationFn: createDispatch,
    onSuccess: () => {
      toast.success('Dispatch created successfully');
      reset();
      setValue('dispatchDate', getCurrentDateTime());
      setSelectedSerials([]);
      setScannerInput('');
      queryClient.invalidateQueries({ queryKey: ['factory-stock'] });
      queryClient.invalidateQueries({ queryKey: ['dealer-stock'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create dispatch');
    },
  });

  const onSubmit = (data: DispatchFormData) => {
    if (selectedSerials.length === 0) {
      toast.error('Please select at least one inverter');
      return;
    }
    const dispatchNumber = defaultDispatchNumber(selectedSerials, data.dispatchDate || getCurrentDateTime());
    mutation.mutate({
      ...data,
      dispatchNumber,
      dispatchDate: data.dispatchDate || getCurrentDateTime(),
      serialNumbers: selectedSerials,
    });
  };

  const dispatchDate = watch('dispatchDate') || getCurrentDateTime();
  const dispatchNumberPreview = selectedSerials.length > 0 ? defaultDispatchNumber(selectedSerials, dispatchDate) : null;

  const toggleSerial = (serial: string) => {
    setSelectedSerials((prev) =>
      prev.includes(serial) ? prev.filter((s) => s !== serial) : [...prev, serial]
    );
  };

  const removeSerial = (serial: string) => {
    setSelectedSerials((prev) => prev.filter((s) => s !== serial));
  };

  return (
    <div className="space-y-8 min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className={PAGE_HEADING_CLASS}>Product Dispatch</h1>
        <p className={PAGE_SUBHEADING_CLASS}>Dispatch products to dealers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Dispatch Information</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={scannerMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setScannerMode(!scannerMode);
                    if (!scannerMode) {
                      setTimeout(() => scannerRef.current?.focus(), 100);
                    }
                  }}
                >
                  <Scan className="h-4 w-4 mr-2" />
                  {scannerMode ? 'Scanner ON' : 'Scanner'}
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
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {scannerMode && (
                <div className="space-y-2 p-4 bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
                  <Label htmlFor="scannerInput" className="text-sm font-semibold flex items-center gap-2">
                    <Scan className="h-4 w-4 text-green-600" />
                    Scanner Mode - Scan Serial Number
                  </Label>
                  <Input
                    ref={scannerRef}
                    id="scannerInput"
                    value={scannerInput}
                    onChange={(e) => setScannerInput(e.target.value)}
                    onKeyDown={handleScannerInput}
                    placeholder="Scan serial number and press Enter"
                    autoFocus
                    className="h-11 border-green-300 focus:ring-green-500"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>💡</span>
                    Press Enter after scanning to add serial number to dispatch list
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Hash className="h-4 w-4 text-slate-500" />
                  Dispatch Number
                </Label>
                <div className="h-11 px-4 flex items-center text-base border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-medium">
                  {dispatchNumberPreview ?? '—'}
                </div>
                <p className="text-xs text-muted-foreground">Auto-generated ({dispatchPrefix} + date + first & last serial digits). Add serials to generate.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dealer" className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  Dealer Name
                </Label>
                <Input id="dealer" {...register('dealer')} className="h-11" placeholder="Enter dealer name" />
                {errors.dealer && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                    <span>⚠</span>
                    {errors.dealer.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dispatchDate">Dispatch Date</Label>
                <Input
                  id="dispatchDate"
                  type="date"
                  {...register('dispatchDate')}
                  defaultValue={getCurrentDateTime()}
                />
                {errors.dispatchDate && (
                  <p className="text-sm text-destructive">{errors.dispatchDate.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Automatically set to current date. You can change if needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Input id="remarks" {...register('remarks')} />
              </div>

              <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-500" />
                  Selected Products: <span className="text-primary font-bold">{selectedSerials.length}</span>
                </Label>
                {selectedSerials.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 mt-2">
                    <div className="flex flex-wrap gap-2">
                      {selectedSerials.map((serial) => (
                        <span
                          key={serial}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-md text-xs font-medium shadow-sm"
                        >
                          {serial}
                          <button
                            type="button"
                            onClick={() => removeSerial(serial)}
                            className="hover:bg-white/20 rounded p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">No products selected. Use scanner or upload file to add products.</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button 
                  type="submit" 
                  disabled={mutation.isPending || selectedSerials.length === 0}
                  className="w-full h-11 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <Truck className="h-4 w-4 mr-2" />
                      Create Dispatch ({selectedSerials.length} product{selectedSerials.length !== 1 ? 's' : ''})
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Products</CardTitle>
          </CardHeader>
          <CardContent>
            {stockLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : stockError ? (
              <p className="text-destructive">Failed to load factory stock</p>
            ) : !stock || !stock.availableInverters || !Array.isArray(stock.availableInverters) || stock.availableInverters.length === 0 ? (
              <p className="text-muted-foreground">No products available</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {stock.availableInverters.map((item) => {
                  if (!item || !item.serialNumber) return null;
                  return (
                    <div
                      key={item.serialNumber}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                        selectedSerials.includes(item.serialNumber)
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => toggleSerial(item.serialNumber)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSerials.includes(item.serialNumber)}
                        onChange={() => toggleSerial(item.serialNumber)}
                        className="cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{item.serialNumber}</p>
                        <p className="text-sm opacity-80">
                          {item.inverterModel?.brand || ''} {item.inverterModel?.modelCode || ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
