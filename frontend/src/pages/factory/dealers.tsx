import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createDealer, listDealers, getDealerHierarchy, deleteDealer } from '@/api/dealer-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Users, Calendar, Mail, Network, Building2, Loader2, Trash2, Plus, X, KeyRound } from 'lucide-react';
import { cn, PAGE_HEADING_FIRST, PAGE_HEADING_SECOND, PAGE_SUBHEADING_CLASS } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { resetPassword as apiResetPassword } from '@/api/auth-api';
import { useAuth } from '@/store/auth-store';

const dealerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type DealerFormData = z.infer<typeof dealerSchema>;

export default function Dealers() {
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin ?? !!(user?.email && user.email.includes('@'));
  const [activeTab, setActiveTab] = useState<'dealers' | 'hierarchy'>('dealers');
  const [showCreateDealerForm, setShowCreateDealerForm] = useState(false);
  const [deletingDealerId, setDeletingDealerId] = useState<string | null>(null);
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
  } = useForm<DealerFormData>({
    resolver: zodResolver(dealerSchema),
  });

  const { data: dealers = [], isLoading: isLoadingDealers } = useQuery({
    queryKey: ['dealers'],
    queryFn: listDealers,
  });

  const { data: hierarchyData, isLoading: isLoadingHierarchy, error: hierarchyError } = useQuery({
    queryKey: ['dealer-hierarchy'],
    queryFn: getDealerHierarchy,
  });

  const mutation = useMutation({
    mutationFn: createDealer,
    onSuccess: () => {
      toast.success('Dealer created successfully');
      reset();
      setShowCreateDealerForm(false);
      queryClient.invalidateQueries({ queryKey: ['dealers'] });
      queryClient.invalidateQueries({ queryKey: ['dealer-hierarchy'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create dealer');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDealer,
    onSuccess: () => {
      toast.success('Dealer deleted successfully');
      setDeletingDealerId(null);
      queryClient.invalidateQueries({ queryKey: ['dealers'] });
      queryClient.invalidateQueries({ queryKey: ['dealer-hierarchy'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete dealer');
      setDeletingDealerId(null);
    },
  });

  const onSubmit = (data: DealerFormData) => {
    mutation.mutate(data);
  };

  const handleDelete = (id: string, name: string) => {
    setDeletingDealerId(id);
  };

  const confirmDelete = () => {
    if (deletingDealerId) {
      deleteMutation.mutate(deletingDealerId);
    }
  };

  const renderHierarchyNode = (node: any, level = 0) => {
    const hasSubDealers = node.subDealers && node.subDealers.length > 0;
    
    return (
      <div key={node.dealer.id} className="relative">
        {/* Vertical Line */}
        {level > 0 && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-400 to-red-600 dark:from-red-500 dark:to-red-700"></div>
        )}
        
        <div className={cn("flex items-start gap-4", level > 0 && "ml-8")}>
          {/* Connector Line */}
          {level > 0 && (
            <div className="absolute left-0 top-6 w-8 h-0.5 bg-gradient-to-r from-red-400 to-red-600 dark:from-red-500 dark:to-red-700"></div>
          )}
          
          {/* Icon */}
          <div className={cn(
            "relative z-10 flex-shrink-0 rounded-full p-3 shadow-lg",
            level === 0 
              ? "bg-gradient-to-br from-red-600 to-red-700 text-white" 
              : "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
          )}>
            {level === 0 ? (
              <Building2 className="h-3.5 w-3.5" />
            ) : (
              <Users className="h-3.5 w-3.5" />
            )}
          </div>

          {/* Card */}
          <Card className={cn(
            "flex-1 border-2 shadow-md hover:shadow-lg transition-all duration-200",
            level === 0 
              ? "border-red-200 dark:border-red-900 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-slate-900" 
              : "border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-900"
          )}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {node.dealer.name}
                    </h3>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                      level === 0 
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    )}>
                      {level === 0 ? "Main Dealer" : "Sub-Dealer"}
                    </span>
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{node.dealer.username || node.dealer.email || '—'}</span>
                    </div>
                  </div>
                </div>
                {hasSubDealers && (
                  <div className="ml-4 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {node.subDealers.length} Sub-Dealer{node.subDealers.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sub-Dealers */}
        {hasSubDealers && (
          <div className="mt-4 ml-16 space-y-4">
            {node.subDealers.map((subDealer: any) => (
              <div key={subDealer.id}>
                {renderHierarchyNode({ dealer: subDealer, subDealers: [] }, level + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const totalDealers = hierarchyData?.length || 0;
  const totalSubDealers = hierarchyData?.reduce((acc: number, node: any) => acc + (node.subDealers?.length || 0), 0) || 0;

  return (
    <div className={cn("h-full min-h-0 max-h-full flex flex-col overflow-hidden bg-muted/30", activeTab === 'hierarchy' && "min-h-screen")}>
      {/* Header - card-style bar (same as Create Product Model) */}
      <header className="shrink-0 border-b bg-card">
        <div className="px-4 py-2 sm:px-5 sm:py-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <h1 className="inline text-xl sm:text-2xl">
                <span className={PAGE_HEADING_FIRST}>Create </span>
                <span className={PAGE_HEADING_SECOND}>Dealer</span>
              </h1>
              <p className={PAGE_SUBHEADING_CLASS}>Create and manage dealer accounts and view network hierarchy</p>
            </div>
          </div>
        </div>
      </header>

      {/* Create Dealer button + Network Hierarchy tab */}
      <div className="shrink-0 px-3 sm:px-4 pt-3 pb-2 flex flex-wrap items-center gap-2">
        <Button
          onClick={() => {
            if (activeTab === 'hierarchy') {
              setActiveTab('dealers');
              return;
            }
            setShowCreateDealerForm(!showCreateDealerForm);
            if (showCreateDealerForm) reset();
          }}
          size="default"
          className="shrink-0"
        >
          {showCreateDealerForm && activeTab === 'dealers' ? (
            <>
              <X className="h-3.5 w-3.5 mr-2" />
              Hide Form
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5 mr-2" />
              Create New
            </>
          )}
        </Button>
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 dark:bg-slate-800/50 w-fit border border-border/50">
          <button
            type="button"
            onClick={() => setActiveTab('hierarchy')}
            className={cn(
              "px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
              activeTab === 'hierarchy'
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <Network className="h-3.5 w-3.5" />
            Network Hierarchy
          </button>
        </div>
      </div>

      {/* Tab Content - Create Dealer */}
      {activeTab === 'dealers' && (
        <div
          className={cn(
            'flex-1 min-h-0 min-w-0 flex flex-col p-3 sm:p-4',
            showCreateDealerForm ? 'overflow-hidden' : 'overflow-auto space-y-4 sm:space-y-5'
          )}
        >
          {showCreateDealerForm ? (
            <Card className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden max-w-xl">
              <CardContent className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-foreground">Name</Label>
                    <Input
                      id="name"
                      placeholder="Dealer name"
                      className="h-10 rounded-lg border-border bg-background"
                      {...register('name')}
                    />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-foreground">Username</Label>
                    <Input
                      id="username"
                      placeholder="Dealer username"
                      className="h-10 rounded-lg border-border bg-background"
                      {...register('username')}
                    />
                    {errors.username && <p className="text-xs text-destructive mt-1">{errors.username.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 6 characters"
                      className="h-10 rounded-lg border-border bg-background"
                      {...register('password')}
                    />
                    {errors.password && (
                      <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={mutation.isPending}
                    className="h-10 rounded-lg px-6 font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Dealer'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            /* Browse view - central card like "Browse by category" */
            isLoadingDealers ? (
              <Card className="max-w-5xl mx-auto w-full">
                <CardContent className="py-16">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="p-4 rounded-lg bg-muted mb-4">
                      <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                    </div>
                    <p className="font-medium text-foreground">Loading dealers...</p>
                    <CardDescription className="mt-1">Fetching dealer accounts</CardDescription>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="max-w-5xl mx-auto w-full">
                <CardHeader className="text-center space-y-1.5 pb-4 sm:pb-5 pt-5 sm:pt-6 px-5 sm:px-8">
                  <CardTitle className="text-xl sm:text-2xl">Dealer accounts</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    View and manage registered dealer accounts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 sm:px-8 pb-5 sm:pb-6">
                  {dealers.length === 0 ? (
                    <div className="py-12 text-center rounded-lg border border-dashed border-border bg-muted/30">
                      <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="font-medium text-foreground">No dealers registered yet</p>
                      <CardDescription className="mt-1">Click Create New above to add one</CardDescription>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b border-border">
                            <TableHead className="h-11 bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</TableHead>
                            <TableHead className="h-11 bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Username</TableHead>
                            <TableHead className="h-11 bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Created</TableHead>
                            <TableHead className="h-11 bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dealers.map((dealer) => (
                            <TableRow key={dealer.id} className="border-b border-border/50 last:border-0">
                              <TableCell className="py-3.5 font-medium text-foreground">{dealer.name}</TableCell>
                              <TableCell className="py-3.5 text-sm text-foreground">{dealer.username || dealer.email || '—'}</TableCell>
                              <TableCell className="py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                                  {new Date(dealer.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </div>
                              </TableCell>
                              <TableCell className="py-3.5">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setResetPasswordTarget({ id: dealer.id, name: dealer.name })}
                                    className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8 p-0"
                                    aria-label="Reset password"
                                  >
                                    <KeyRound className="h-3.5 w-3.5" />
                                  </Button>
                                  {isSuperAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingDealerId(dealer.id)}
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                    aria-label="Delete"
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
            )
          )}
        </div>
      )}

      {activeTab === 'hierarchy' && (
        <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-4 space-y-6">
          {/* Statistics */}
          <div className="flex gap-4">
            <Card className="border-red-200 dark:border-red-900 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-slate-900">
              <CardContent className="p-4">
                <div className="text-sm text-slate-600 dark:text-slate-400">Main Dealers</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totalDealers}</div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-900">
              <CardContent className="p-4">
                <div className="text-sm text-slate-600 dark:text-slate-400">Sub-Dealers</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalSubDealers}</div>
              </CardContent>
            </Card>
          </div>

          {/* Hierarchy View */}
          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <CardContent className="p-8">
              {isLoadingHierarchy ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-red-600" />
                </div>
              ) : hierarchyError ? (
                <div className="text-center py-12">
                  <p className="text-destructive">Failed to load dealer hierarchy</p>
                </div>
              ) : !hierarchyData || hierarchyData.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">No dealers found</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {hierarchyData.map((node: any) => (
                    <div key={node.dealer.id}>
                      {renderHierarchyNode(node, 0)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingDealerId && (
        <ConfirmDialog
          title="Delete Dealer"
          message={`Are you sure you want to delete this dealer? This will also delete all sub-dealers under this dealer. This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setDeletingDealerId(null)}
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
                <Input
                  id="reset-new-password"
                  type="password"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirm-password">Confirm password</Label>
                <Input
                  id="reset-confirm-password"
                  type="password"
                  value={resetPasswordConfirm}
                  onChange={(e) => setResetPasswordConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
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
