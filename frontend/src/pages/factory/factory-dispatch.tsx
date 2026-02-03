import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createDispatch } from '@/api/dispatch-api';
import { getFactoryStock } from '@/api/stock-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const dispatchSchema = z.object({
  dispatchNumber: z.string().min(1, 'Dispatch number is required'),
  dealer: z.string().min(1, 'Dealer name is required'),
  dispatchDate: z.string().min(1, 'Dispatch date is required'),
  remarks: z.string().optional(),
});

type DispatchFormData = z.infer<typeof dispatchSchema>;

export default function FactoryDispatch() {
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: stock, isLoading: stockLoading, error: stockError } = useQuery({
    queryKey: ['factory-stock'],
    queryFn: getFactoryStock,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DispatchFormData>({
    resolver: zodResolver(dispatchSchema),
  });

  const mutation = useMutation({
    mutationFn: createDispatch,
    onSuccess: () => {
      toast.success('Dispatch created successfully');
      reset();
      setSelectedSerials([]);
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

    mutation.mutate({
      ...data,
      serialNumbers: selectedSerials,
    });
  };

  const toggleSerial = (serial: string) => {
    setSelectedSerials((prev) =>
      prev.includes(serial) ? prev.filter((s) => s !== serial) : [...prev, serial]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Factory Dispatch</h1>
        <p className="text-muted-foreground">Dispatch inverters to dealers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dispatch Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dispatchNumber">Dispatch Number</Label>
                <Input id="dispatchNumber" {...register('dispatchNumber')} />
                {errors.dispatchNumber && (
                  <p className="text-sm text-destructive">{errors.dispatchNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dealer">Dealer Name</Label>
                <Input id="dealer" {...register('dealer')} />
                {errors.dealer && <p className="text-sm text-destructive">{errors.dealer.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dispatchDate">Dispatch Date</Label>
                <Input id="dispatchDate" type="date" {...register('dispatchDate')} />
                {errors.dispatchDate && (
                  <p className="text-sm text-destructive">{errors.dispatchDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Input id="remarks" {...register('remarks')} />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Selected: {selectedSerials.length} inverter(s)
                </p>
              </div>

              <Button type="submit" disabled={mutation.isPending || selectedSerials.length === 0}>
                {mutation.isPending ? 'Dispatching...' : 'Create Dispatch'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Inverters</CardTitle>
          </CardHeader>
          <CardContent>
            {stockLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : stockError ? (
              <p className="text-destructive">Failed to load factory stock</p>
            ) : !stock || !stock.availableInverters || stock.availableInverters.length === 0 ? (
              <p className="text-muted-foreground">No inverters available</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {stock.availableInverters.map((item) => (
                  <div
                    key={item.serialNumber}
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
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
                        {item.inverterModel?.brand} {item.inverterModel?.modelCode}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
