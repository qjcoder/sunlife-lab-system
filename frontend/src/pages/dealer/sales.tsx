import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sellInverter, bulkSellInverters } from '@/api/sale-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const singleSaleSchema = z.object({
  serialNumber: z.string().min(1, 'Serial number is required'),
  saleInvoiceNo: z.string().min(1, 'Invoice number is required'),
  saleDate: z.string().min(1, 'Sale date is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerContact: z.string().optional(),
});

type SingleSaleFormData = z.infer<typeof singleSaleSchema>;

export default function DealerSales() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [bulkSales, setBulkSales] = useState<SingleSaleFormData[]>([]);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SingleSaleFormData>({
    resolver: zodResolver(singleSaleSchema),
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
      toast.success('Sales recorded successfully');
      setBulkSales([]);
      queryClient.invalidateQueries({ queryKey: ['dealer-stock'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record sales');
    },
  });

  const onSingleSubmit = (data: SingleSaleFormData) => {
    singleMutation.mutate(data);
  };

  const addBulkSale = () => {
    setBulkSales([...bulkSales, {
      serialNumber: '',
      saleInvoiceNo: '',
      saleDate: '',
      customerName: '',
      customerContact: '',
    }]);
  };

  const updateBulkSale = (index: number, field: keyof SingleSaleFormData, value: string) => {
    const updated = [...bulkSales];
    updated[index] = { ...updated[index], [field]: value };
    setBulkSales(updated);
  };

  const removeBulkSale = (index: number) => {
    setBulkSales(bulkSales.filter((_, i) => i !== index));
  };

  const onBulkSubmit = () => {
    const validSales = bulkSales.filter(
      (sale) =>
        sale.serialNumber &&
        sale.saleInvoiceNo &&
        sale.saleDate &&
        sale.customerName
    );

    if (validSales.length === 0) {
      toast.error('Please add at least one valid sale');
      return;
    }

    bulkMutation.mutate({ sales: validSales });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales</h1>
        <p className="text-muted-foreground">Record inverter sales</p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={mode === 'single' ? 'default' : 'outline'}
          onClick={() => setMode('single')}
        >
          Single Sale
        </Button>
        <Button
          variant={mode === 'bulk' ? 'default' : 'outline'}
          onClick={() => setMode('bulk')}
        >
          Bulk Sale
        </Button>
      </div>

      {mode === 'single' ? (
        <Card>
          <CardHeader>
            <CardTitle>Single Sale</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSingleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input id="serialNumber" {...register('serialNumber')} />
                {errors.serialNumber && (
                  <p className="text-sm text-destructive">{errors.serialNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="saleInvoiceNo">Invoice Number</Label>
                <Input id="saleInvoiceNo" {...register('saleInvoiceNo')} />
                {errors.saleInvoiceNo && (
                  <p className="text-sm text-destructive">{errors.saleInvoiceNo.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="saleDate">Sale Date</Label>
                <Input id="saleDate" type="date" {...register('saleDate')} />
                {errors.saleDate && (
                  <p className="text-sm text-destructive">{errors.saleDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input id="customerName" {...register('customerName')} />
                {errors.customerName && (
                  <p className="text-sm text-destructive">{errors.customerName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerContact">Customer Contact (Optional)</Label>
                <Input id="customerContact" {...register('customerContact')} />
              </div>

              <Button type="submit" disabled={singleMutation.isPending}>
                {singleMutation.isPending ? 'Recording...' : 'Record Sale'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Bulk Sale</CardTitle>
              <Button onClick={addBulkSale} variant="outline">
                Add Sale
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bulkSales.map((sale, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">Sale #{index + 1}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBulkSale(index)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Serial Number</Label>
                        <Input
                          value={sale.serialNumber}
                          onChange={(e) => updateBulkSale(index, 'serialNumber', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Invoice Number</Label>
                        <Input
                          value={sale.saleInvoiceNo}
                          onChange={(e) => updateBulkSale(index, 'saleInvoiceNo', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sale Date</Label>
                        <Input
                          type="date"
                          value={sale.saleDate}
                          onChange={(e) => updateBulkSale(index, 'saleDate', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Customer Name</Label>
                        <Input
                          value={sale.customerName}
                          onChange={(e) => updateBulkSale(index, 'customerName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label>Customer Contact (Optional)</Label>
                        <Input
                          value={sale.customerContact || ''}
                          onChange={(e) => updateBulkSale(index, 'customerContact', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {bulkSales.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  Click "Add Sale" to start recording bulk sales
                </p>
              )}

              {bulkSales.length > 0 && (
                <Button onClick={onBulkSubmit} disabled={bulkMutation.isPending} className="w-full">
                  {bulkMutation.isPending ? 'Recording...' : `Record ${bulkSales.length} Sale(s)`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
