import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createServiceJob } from '@/api/service-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const serviceJobSchema = z.object({
  serialNumber: z.string().min(1, 'Serial number is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerContact: z.string().min(1, 'Customer contact is required'),
  reportedFault: z.string().min(1, 'Reported fault is required'),
  visitDate: z.string().min(1, 'Visit date is required'),
  remarks: z.string().optional(),
});

type ServiceJobFormData = z.infer<typeof serviceJobSchema>;

export default function CreateJob() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ServiceJobFormData>({
    resolver: zodResolver(serviceJobSchema),
  });

  const mutation = useMutation({
    mutationFn: createServiceJob,
    onSuccess: () => {
      toast.success('Service job created successfully');
      reset();
      queryClient.invalidateQueries({ queryKey: ['service-jobs'] });
      navigate('/service-center/jobs');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create service job');
    },
  });

  const onSubmit = (data: ServiceJobFormData) => {
    // Combine customer info into remarks if backend doesn't support separate fields
    const remarksWithCustomer = data.remarks 
      ? `${data.remarks}\n\nCustomer: ${data.customerName}\nContact: ${data.customerContact}`
      : `Customer: ${data.customerName}\nContact: ${data.customerContact}`;
    
    mutation.mutate({
      serialNumber: data.serialNumber,
      reportedFault: data.reportedFault,
      visitDate: data.visitDate,
      remarks: remarksWithCustomer,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Service Job</h1>
        <p className="text-muted-foreground">Record a new service job</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Job Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Customer Information Section */}
            <div className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
              <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input id="customerName" {...register('customerName')} placeholder="Enter customer name" />
                  {errors.customerName && (
                    <p className="text-sm text-destructive">{errors.customerName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerContact">Customer Contact *</Label>
                  <Input id="customerContact" {...register('customerContact')} placeholder="Phone number or email" />
                  {errors.customerContact && (
                    <p className="text-sm text-destructive">{errors.customerContact.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Service Job Information Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">Service Job Details</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Inverter Serial Number *</Label>
                  <Input id="serialNumber" {...register('serialNumber')} placeholder="Enter serial number" />
                  {errors.serialNumber && (
                    <p className="text-sm text-destructive">{errors.serialNumber.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reportedFault">Reported Fault *</Label>
                  <textarea
                    id="reportedFault"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...register('reportedFault')}
                    placeholder="Describe the reported fault or issue"
                  />
                  {errors.reportedFault && (
                    <p className="text-sm text-destructive">{errors.reportedFault.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visitDate">Visit Date *</Label>
                  <Input id="visitDate" type="date" {...register('visitDate')} />
                  {errors.visitDate && (
                    <p className="text-sm text-destructive">{errors.visitDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks (Optional)</Label>
                  <Input id="remarks" {...register('remarks')} placeholder="Additional notes or remarks" />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating...' : 'Create Service Job'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/service-center/jobs')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
