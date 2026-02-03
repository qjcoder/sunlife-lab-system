import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createServiceCenter } from '@/api/service-center-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const serviceCenterSchema = z.object({
  name: z.string().min(1, 'Service center name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type ServiceCenterFormData = z.infer<typeof serviceCenterSchema>;

export default function ServiceCenters() {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ServiceCenterFormData>({
    resolver: zodResolver(serviceCenterSchema),
  });

  const mutation = useMutation({
    mutationFn: createServiceCenter,
    onSuccess: () => {
      toast.success('Service center created successfully');
      reset();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create service center');
    },
  });

  const onSubmit = (data: ServiceCenterFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Service Center</h1>
        <p className="text-muted-foreground">Create a new service center account</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Center Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Center Name</Label>
              <Input id="name" {...register('name')} placeholder="e.g., Lahore Service Center" />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} placeholder="service@sunlife.com" />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create Service Center'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
