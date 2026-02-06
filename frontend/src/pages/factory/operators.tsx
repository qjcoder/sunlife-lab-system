import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createOperator, listOperators, deleteOperator } from '@/api/operator-api-admin';
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
import { Users, Calendar, Mail, Scan, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from '@/lib/utils';

const operatorSchema = z.object({
  name: z.string().min(1, 'Operator name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type OperatorFormData = z.infer<typeof operatorSchema>;

export default function Operators() {
  const [deletingOperatorId, setDeletingOperatorId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OperatorFormData>({
    resolver: zodResolver(operatorSchema),
  });

  const { data: operatorsData, isLoading: isLoadingOperators } = useQuery({
    queryKey: ['operators'],
    queryFn: listOperators,
  });

  const operators = operatorsData?.operators || [];

  const mutation = useMutation({
    mutationFn: createOperator,
    onSuccess: () => {
      toast.success('Data entry operator created successfully');
      reset();
      queryClient.invalidateQueries({ queryKey: ['operators'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create data entry operator');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOperator,
    onSuccess: () => {
      toast.success('Data entry operator deleted successfully');
      setDeletingOperatorId(null);
      queryClient.invalidateQueries({ queryKey: ['operators'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to delete operator');
      setDeletingOperatorId(null);
    },
  });

  const onSubmit = (data: OperatorFormData) => {
    mutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    setDeletingOperatorId(id);
  };

  const confirmDelete = () => {
    if (deletingOperatorId) {
      deleteMutation.mutate(deletingOperatorId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="px-4 py-3 sm:px-5 sm:py-4 md:px-6">
          <div className="space-y-1">
            <h1 className={PAGE_HEADING_CLASS}>Data Entry Operators</h1>
            <p className={PAGE_SUBHEADING_CLASS}>Create and manage data entry operator accounts for serial number registration</p>
          </div>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="space-y-4 sm:space-y-5 p-3 sm:p-4 md:p-5">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Create Operator Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Operator Name</Label>
                <Input id="name" {...register('name')} placeholder="e.g., John Operator" />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} placeholder="operator@sunlife.com" />
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

              <Button type="submit" disabled={mutation.isPending} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                {mutation.isPending ? 'Creating...' : 'Create Operator'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Registered Operators ({operators.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingOperators ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : operators.length === 0 ? (
              <p className="text-muted-foreground">No operators registered yet</p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Username (Email)</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operators.map((op) => (
                      <TableRow key={op.id}>
                        <TableCell className="font-medium">{op.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span className="text-sm">{op.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {new Date(op.createdAt).toLocaleDateString('en-US', {
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
                            onClick={() => handleDelete(op.id)}
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
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingOperatorId && (
        <ConfirmDialog
          title="Delete Data Entry Operator"
          message="Are you sure you want to delete this data entry operator? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setDeletingOperatorId(null)}
          variant="danger"
        />
      )}
    </div>
  );
}
