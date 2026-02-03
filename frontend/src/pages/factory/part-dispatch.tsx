import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPartDispatch, DispatchedItem } from '@/api/part-dispatch-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

const dispatchSchema = z.object({
  serviceCenter: z.string().min(1, 'Service center is required'),
  remarks: z.string().optional(),
});

type DispatchFormData = z.infer<typeof dispatchSchema>;

export default function PartDispatch() {
  const [dispatchedItems, setDispatchedItems] = useState<DispatchedItem[]>([]);
  const [currentItem, setCurrentItem] = useState<DispatchedItem>({
    partCode: '',
    partName: '',
    quantity: 1,
  });
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DispatchFormData>({
    resolver: zodResolver(dispatchSchema),
  });

  const mutation = useMutation({
    mutationFn: createPartDispatch,
    onSuccess: () => {
      toast.success('Part dispatch created successfully');
      reset();
      setDispatchedItems([]);
      setCurrentItem({ partCode: '', partName: '', quantity: 1 });
      queryClient.invalidateQueries({ queryKey: ['service-center-stock'] });
      queryClient.invalidateQueries({ queryKey: ['part-dispatches'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create part dispatch');
    },
  });

  const addItem = () => {
    if (!currentItem.partCode || !currentItem.partName || currentItem.quantity <= 0) {
      toast.error('Please fill in all part details');
      return;
    }

    setDispatchedItems([...dispatchedItems, { ...currentItem }]);
    setCurrentItem({ partCode: '', partName: '', quantity: 1 });
  };

  const removeItem = (index: number) => {
    setDispatchedItems(dispatchedItems.filter((_, i) => i !== index));
  };

  const onSubmit = (data: DispatchFormData) => {
    if (dispatchedItems.length === 0) {
      toast.error('Please add at least one part to dispatch');
      return;
    }

    mutation.mutate({
      serviceCenter: data.serviceCenter,
      dispatchedItems,
      remarks: data.remarks,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Part Dispatch</h1>
        <p className="text-muted-foreground">Dispatch parts from factory to service center</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dispatch Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serviceCenter">Service Center</Label>
                <Input id="serviceCenter" {...register('serviceCenter')} />
                {errors.serviceCenter && (
                  <p className="text-sm text-destructive">{errors.serviceCenter.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Input id="remarks" {...register('remarks')} />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Parts to dispatch: {dispatchedItems.length}
                </p>
              </div>

              <Button type="submit" disabled={mutation.isPending || dispatchedItems.length === 0}>
                {mutation.isPending ? 'Dispatching...' : 'Create Dispatch'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Parts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="partCode">Part Code</Label>
                <Input
                  id="partCode"
                  value={currentItem.partCode}
                  onChange={(e) => setCurrentItem({ ...currentItem, partCode: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="partName">Part Name</Label>
                <Input
                  id="partName"
                  value={currentItem.partName}
                  onChange={(e) => setCurrentItem({ ...currentItem, partName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={currentItem.quantity}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })
                  }
                />
              </div>

              <Button type="button" onClick={addItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Part
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {dispatchedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parts to Dispatch</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part Code</TableHead>
                  <TableHead>Part Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispatchedItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.partCode}</TableCell>
                    <TableCell>{item.partName}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
