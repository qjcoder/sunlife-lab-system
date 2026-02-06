import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getServiceJobDetails, addReplacedPart } from '@/api/service-api';
import { listPartDispatches } from '@/api/part-dispatch-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Plus, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const replacedPartSchema = z.object({
  partCode: z.string().min(1, 'Part code is required'),
  partName: z.string().min(1, 'Part name is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  replacementDate: z.string().min(1, 'Replacement date is required'),
  replacementType: z.enum(['REPLACEMENT', 'REPAIR']),
  dispatchId: z.string().min(1, 'Dispatch is required'),
});

type ReplacedPartFormData = z.infer<typeof replacedPartSchema>;

export default function ServiceJobDetails() {
  const { serviceJobId } = useParams<{ serviceJobId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: jobDetails, isLoading, error } = useQuery({
    queryKey: ['service-job-details', serviceJobId],
    queryFn: () => getServiceJobDetails(serviceJobId!),
    enabled: !!serviceJobId,
  });

  const { data: dispatches } = useQuery({
    queryKey: ['part-dispatches'],
    queryFn: listPartDispatches,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ReplacedPartFormData>({
    resolver: zodResolver(replacedPartSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: ReplacedPartFormData) => addReplacedPart(serviceJobId!, data),
    onSuccess: () => {
      toast.success('Replaced part added successfully');
      reset();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['service-job-details', serviceJobId] });
      queryClient.invalidateQueries({ queryKey: ['service-center-stock'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to add replaced part');
    },
  });

  const onSubmit = (data: ReplacedPartFormData) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !jobDetails) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load service job details</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const serviceJob = jobDetails.serviceJob;
  const replacedParts = jobDetails.replacedParts || [];

  return (
    <div className="space-y-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/service-center/jobs')} className="mb-2">
          <ArrowLeft className="h-3.5 w-3.5 mr-2" />
          Back
        </Button>
        <PageHeader title="Service Job Details" description={`Job ID: ${serviceJobId}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Job Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Serial Number:</span> {serviceJob.serialNumber}
              </p>
              <p>
                <span className="font-medium">Service Center:</span> {serviceJob.serviceCenter}
              </p>
              <p>
                <span className="font-medium">Visit Date:</span>{' '}
                {new Date(serviceJob.visitDate).toLocaleDateString()}
              </p>
              <p>
                <span className="font-medium">Reported Fault:</span> {serviceJob.reportedFault}
              </p>
              <p>
                <span className="font-medium">Service Type:</span> {serviceJob.serviceType || 'N/A'}
              </p>
              <p>
                <span className="font-medium">Warranty Status:</span> Parts:{' '}
                {serviceJob.warrantyStatus.parts ? 'In Warranty' : 'Out of Warranty'}, Service:{' '}
                {serviceJob.warrantyStatus.service ? 'In Warranty' : 'Out of Warranty'}
              </p>
              {serviceJob.remarks && (
                <p>
                  <span className="font-medium">Remarks:</span> {serviceJob.remarks}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Replaced Parts</CardTitle>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger>
                  <Button size="sm">
                    <Plus className="h-3.5 w-3.5 mr-2" />
                    Add Part
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Replaced Part</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dispatchId">Part Dispatch</Label>
                      <select
                        id="dispatchId"
                        {...register('dispatchId')}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Select dispatch</option>
                        {dispatches?.map((dispatch) => (
                          <option key={dispatch._id} value={dispatch._id}>
                            {dispatch.dispatchNumber} - {dispatch.serviceCenter}
                          </option>
                        ))}
                      </select>
                      {errors.dispatchId && (
                        <p className="text-sm text-destructive">{errors.dispatchId.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="partCode">Part Code</Label>
                      <Input id="partCode" {...register('partCode')} />
                      {errors.partCode && (
                        <p className="text-sm text-destructive">{errors.partCode.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="partName">Part Name</Label>
                      <Input id="partName" {...register('partName')} />
                      {errors.partName && (
                        <p className="text-sm text-destructive">{errors.partName.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          {...register('quantity', { valueAsNumber: true })}
                        />
                        {errors.quantity && (
                          <p className="text-sm text-destructive">{errors.quantity.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="replacementDate">Replacement Date</Label>
                        <Input id="replacementDate" type="date" {...register('replacementDate')} />
                        {errors.replacementDate && (
                          <p className="text-sm text-destructive">{errors.replacementDate.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="replacementType">Replacement Type</Label>
                      <select
                        id="replacementType"
                        {...register('replacementType')}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="REPLACEMENT">Replacement</option>
                        <option value="REPAIR">Repair</option>
                      </select>
                      {errors.replacementType && (
                        <p className="text-sm text-destructive">{errors.replacementType.message}</p>
                      )}
                    </div>

                    <Button type="submit" disabled={mutation.isPending} className="w-full">
                      {mutation.isPending ? 'Adding...' : 'Add Replaced Part'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {replacedParts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Code</TableHead>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Replacement Date</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {replacedParts.map((part: any) => (
                    <TableRow key={part._id}>
                      <TableCell className="font-medium">{part.partCode}</TableCell>
                      <TableCell>{part.partName}</TableCell>
                      <TableCell>{part.quantity}</TableCell>
                      <TableCell>
                        {new Date(part.replacementDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{part.replacementType}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">No replaced parts recorded</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
