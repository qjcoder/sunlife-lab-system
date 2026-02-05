import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createServiceCenter, listServiceCenters } from '@/api/service-center-api';
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
import { Users, Calendar, Mail } from 'lucide-react';

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

  const { data: serviceCenters = [], isLoading: isLoadingServiceCenters } = useQuery({
    queryKey: ['service-centers'],
    queryFn: listServiceCenters,
  });

  const mutation = useMutation({
    mutationFn: createServiceCenter,
    onSuccess: () => {
      toast.success('Service center created successfully');
      reset();
      queryClient.invalidateQueries({ queryKey: ['service-centers'] });
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
    <div className="space-y-4 sm:space-y-6 md:space-y-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
          Create Service Center
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400">Create a new service center account for warranty and repairs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Registered Service Centers ({serviceCenters.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingServiceCenters ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : serviceCenters.length === 0 ? (
              <p className="text-muted-foreground">No service centers registered yet</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Username (Email)</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceCenters.map((sc) => (
                      <TableRow key={sc.id}>
                        <TableCell className="font-medium">{sc.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span className="text-sm">{sc.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {new Date(sc.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
