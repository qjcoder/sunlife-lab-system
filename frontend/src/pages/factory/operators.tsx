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
import { Users, Calendar, Mail, Scan, Trash2, KeyRound, Loader2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { resetPassword as apiResetPassword } from '@/api/auth-api';
import { useAuth } from '@/store/auth-store';
import { PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from '@/lib/utils';

const operatorSchema = z.object({
  name: z.string().min(1, 'Operator name is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type OperatorFormData = z.infer<typeof operatorSchema>;

export default function Operators() {
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin ?? !!(user?.email && user.email.includes('@'));
  const [deletingOperatorId, setDeletingOperatorId] = useState<string | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetPasswordSubmitting, setResetPasswordSubmitting] = useState(false);
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
              <Scan className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              Create Operator Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Operator Name</Label>
                <Input id="name" {...register('name')} placeholder="e.g., John Operator" className="max-w-sm" />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" {...register('username')} placeholder="Operator username" className="max-w-sm" />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...register('password')} className="max-w-sm" />
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
              <Users className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              Registered Operators
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
                      <TableHead>Username</TableHead>
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
                            <span className="text-sm">{op.username || op.email || '—'}</span>
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
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setResetPasswordTarget({ id: op.id, name: op.name })}
                              className="text-slate-600 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                              aria-label="Reset password"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
{isSuperAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(op.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          )}
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

      {/* Reset password dialog */}
      <Dialog open={!!resetPasswordTarget} onOpenChange={(open) => { if (!open) { setResetPasswordTarget(null); setResetPasswordValue(''); setResetPasswordConfirm(''); } }}>
        <DialogContent onClose={() => { setResetPasswordTarget(null); setResetPasswordValue(''); setResetPasswordConfirm(''); }}>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
          </DialogHeader>
          {resetPasswordTarget && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Set a new password for <strong>{resetPasswordTarget.name}</strong>.</p>
              <div className="space-y-2">
                <Label htmlFor="reset-new-password">New password</Label>
                <Input id="reset-new-password" type="password" value={resetPasswordValue} onChange={(e) => setResetPasswordValue(e.target.value)} placeholder="Min 6 characters" autoComplete="new-password" className="max-w-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirm-password">Confirm password</Label>
                <Input id="reset-confirm-password" type="password" value={resetPasswordConfirm} onChange={(e) => setResetPasswordConfirm(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" className="max-w-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setResetPasswordTarget(null); setResetPasswordValue(''); setResetPasswordConfirm(''); }}>Cancel</Button>
                <Button
                  onClick={async () => {
                    if (!resetPasswordTarget) return;
                    if (resetPasswordValue.length < 6) { toast.error('Password must be at least 6 characters'); return; }
                    if (resetPasswordValue !== resetPasswordConfirm) { toast.error('Passwords do not match'); return; }
                    setResetPasswordSubmitting(true);
                    try {
                      await apiResetPassword(resetPasswordTarget.id, resetPasswordValue);
                      toast.success('Password reset successfully');
                      setResetPasswordTarget(null);
                      setResetPasswordValue('');
                      setResetPasswordConfirm('');
                    } catch (e: any) {
                      toast.error(e.response?.data?.message || 'Failed to reset password');
                    } finally {
                      setResetPasswordSubmitting(false);
                    }
                  }}
                  disabled={resetPasswordSubmitting}
                >
                  {resetPasswordSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset password'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
