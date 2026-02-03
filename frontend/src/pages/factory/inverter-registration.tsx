import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, CheckCircle2, XCircle } from 'lucide-react';

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

export default function InverterRegistration() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [serialCount, setSerialCount] = useState(0);
  const queryClient = useQueryClient();

  const { data: models } = useQuery({
    queryKey: ['inverter-models'],
    queryFn: listModels,
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

  const {
    control: controlSingle,
    register: registerSingle,
    handleSubmit: handleSingleSubmit,
    formState: { errors: singleErrors },
    reset: resetSingle,
    watch: watchSingle,
  } = useForm<SingleFormData>({
    resolver: zodResolver(singleSchema),
  });

  const {
    control: controlBulk,
    register: registerBulk,
    handleSubmit: handleBulkSubmit,
    formState: { errors: bulkErrors },
    reset: resetBulk,
    watch: watchBulk,
  } = useForm<BulkFormData>({
    resolver: zodResolver(bulkSchema),
  });

  const selectedSingleModel = watchSingle('inverterModel');
  const selectedBulkModel = watchBulk('inverterModel');

  const singleMutation = useMutation({
    mutationFn: createInverter,
    onSuccess: () => {
      toast.success('Inverter registered successfully');
      resetSingle();
      queryClient.invalidateQueries({ queryKey: ['factory-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inverter-models'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to register inverter');
    },
  });

  const bulkMutation = useMutation({
    mutationFn: bulkCreateInverters,
    onSuccess: () => {
      toast.success('Inverters registered successfully');
      resetBulk();
      queryClient.invalidateQueries({ queryKey: ['factory-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inverter-models'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to register inverters');
    },
  });

  const onSingleSubmit = (data: SingleFormData) => {
    singleMutation.mutate(data);
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
          <h1 className="text-3xl font-bold">Register Inverters</h1>
          <p className="text-muted-foreground">Register new inverter units</p>
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
        <Card>
          <CardHeader>
            <CardTitle>Single Registration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSingleSubmit(onSingleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input id="serialNumber" {...registerSingle('serialNumber')} />
                {singleErrors.serialNumber && (
                  <p className="text-sm text-destructive">{singleErrors.serialNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="inverterModel">Model</Label>
                <Controller
                  name="inverterModel"
                  control={controlSingle}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="inverterModel">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models?.map((model) => {
                          const stockCount = modelStockCounts[model._id] || 0;
                          const isOutOfStock = stockCount === 0;
                          const displayName = model.modelName || `${model.brand} ${model.productLine} ${model.variant}`.trim();
                          return (
                            <SelectItem key={model._id} value={model._id}>
                              {displayName} {isOutOfStock ? '(Out of Stock)' : `(${stockCount} in stock)`}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
                {selectedSingleModel && (() => {
                  const selectedModel = models?.find(m => m._id === selectedSingleModel);
                  const stockCount = selectedModel ? (modelStockCounts[selectedModel._id] || 0) : 0;
                  const isOutOfStock = stockCount === 0;
                  
                  if (!selectedModel) return null;
                  
                  return (
                    <div className={`flex items-center gap-2 p-2 rounded-md text-sm ${
                      isOutOfStock 
                        ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800' 
                        : 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'
                    }`}>
                      {isOutOfStock ? (
                        <>
                          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          <span className="text-red-700 dark:text-red-400 font-medium">Out of Stock</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-green-700 dark:text-green-400 font-medium">
                            {stockCount} unit{stockCount !== 1 ? 's' : ''} available in factory
                          </span>
                        </>
                      )}
                    </div>
                  );
                })()}
                {singleErrors.inverterModel && (
                  <p className="text-sm text-destructive">{singleErrors.inverterModel.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="manufacturingDate">Manufacturing Date (Optional)</Label>
                <Input id="manufacturingDate" type="date" {...registerSingle('manufacturingDate')} />
              </div>

              <Button type="submit" disabled={singleMutation.isPending}>
                {singleMutation.isPending ? 'Registering...' : 'Register Inverter'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Registration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBulkSubmit(onBulkSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulkInverterModel">Model</Label>
                <Controller
                  name="inverterModel"
                  control={controlBulk}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="bulkInverterModel">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models?.map((model) => {
                          const stockCount = modelStockCounts[model._id] || 0;
                          const isOutOfStock = stockCount === 0;
                          const displayName = model.modelName || `${model.brand} ${model.productLine} ${model.variant}`.trim();
                          return (
                            <SelectItem key={model._id} value={model._id}>
                              {displayName} {isOutOfStock ? '(Out of Stock)' : `(${stockCount} in stock)`}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
                {selectedBulkModel && (() => {
                  const selectedModel = models?.find(m => m._id === selectedBulkModel);
                  const stockCount = selectedModel ? (modelStockCounts[selectedModel._id] || 0) : 0;
                  const isOutOfStock = stockCount === 0;
                  
                  if (!selectedModel) return null;
                  
                  return (
                    <div className={`flex items-center gap-2 p-2 rounded-md text-sm ${
                      isOutOfStock 
                        ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800' 
                        : 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'
                    }`}>
                      {isOutOfStock ? (
                        <>
                          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          <span className="text-red-700 dark:text-red-400 font-medium">Out of Stock</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-green-700 dark:text-green-400 font-medium">
                            {stockCount} unit{stockCount !== 1 ? 's' : ''} available in factory
                          </span>
                        </>
                      )}
                    </div>
                  );
                })()}
                {bulkErrors.inverterModel && (
                  <p className="text-sm text-destructive">{bulkErrors.inverterModel.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bulkSerialNumbers">Serial Numbers (one per line, unlimited)</Label>
                  <span className="text-sm text-muted-foreground">
                    {serialCount} serial number{serialCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <textarea
                  id="bulkSerialNumbers"
                  {...registerBulk('serialNumbers', {
                    onChange: (e) => {
                      const value = e.target.value;
                      const serials = value.split('\n').filter((s) => s.trim().length > 0);
                      setSerialCount(serials.length);
                    },
                  })}
                  className="flex min-h-[400px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                  placeholder="SLI6K-0001&#10;SLI6K-0002&#10;SLI6K-0003&#10;...&#10;(Enter serial numbers, one per line - unlimited)"
                  rows={20}
                />
                {bulkErrors.serialNumbers && (
                  <p className="text-sm text-destructive">{bulkErrors.serialNumbers.message}</p>
                )}
                {serialCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {serialCount} serial number{serialCount !== 1 ? 's' : ''} entered
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulkManufacturingDate">Manufacturing Date (Optional)</Label>
                <Input id="bulkManufacturingDate" type="date" {...registerBulk('manufacturingDate')} />
              </div>

              <Button type="submit" disabled={bulkMutation.isPending}>
                {bulkMutation.isPending ? 'Registering...' : 'Register Inverters'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
