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

export default function SubDealerSales() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
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

  const onSingleSubmit = (data: SingleSaleFormData) => {
    singleMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales</h1>
        <p className="text-muted-foreground">Record inverter sales</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record Sale</CardTitle>
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
    </div>
  );
}
