import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createServiceCenter, listServiceCenters, deleteServiceCenter } from '@/api/service-center-api';
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
import { Users, Calendar, Mail, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from '@/lib/utils';

const serviceCenterSchema = z.object({
  name: z.string().min(1, 'Service center name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type ServiceCenterFormData = z.infer<typeof serviceCenterSchema>;

export default function ServiceCenters() {
  const [deletingServiceCenterId, setDeletingServiceCenterId] = useState<string | null>(null);
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

  const deleteMutation = useMutation({
    mutationFn: deleteServiceCenter,
    onSuccess: () => {
      toast.success('Service center deleted successfully');
      setDeletingServiceCenterId(null);
      queryClient.invalidateQueries({ queryKey: ['service-centers'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to delete service center');
      setDeletingServiceCenterId(null);
    },
  });

  const onSubmit = (data: ServiceCenterFormData) => {
    mutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    setDeletingServiceCenterId(id);
  };

  const confirmDelete = () => {
    if (deletingServiceCenterId) {
      deleteMutation.mutate(deletingServiceCenterId);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="space-y-1 sm:space-y-2">
        <h1 className={PAGE_HEADING_CLASS}>Create Service Center</h1>
        <p className={PAGE_SUBHEADING_CLASS}>Create a new service center account for warranty and repairs</p>
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
                      <TableHead>Actions</TableHead>
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
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(sc.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Delete Confirmation Dialog */}
      {deletingServiceCenterId && (
        <ConfirmDialog
          title="Delete Service Center"
          message="Are you sure you want to delete this service center? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setDeletingServiceCenterId(null)}
          variant="danger"
        />
      )}
    </div>
  );
}
