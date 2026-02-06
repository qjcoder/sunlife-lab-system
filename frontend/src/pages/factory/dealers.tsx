import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createDealer, listDealers, getDealerHierarchy, deleteDealer } from '@/api/dealer-api';
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
import { Users, Calendar, Mail, Network, Building2, Loader2, Trash2 } from 'lucide-react';
import { cn, PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const dealerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type DealerFormData = z.infer<typeof dealerSchema>;

export default function Dealers() {
  const [activeTab, setActiveTab] = useState<'dealers' | 'hierarchy'>('dealers');
  const [deletingDealerId, setDeletingDealerId] = useState<string | null>(null);
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
              <Building2 className="h-5 w-5" />
            ) : (
              <Users className="h-5 w-5" />
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
                      <Mail className="h-4 w-4" />
                      <span>{node.dealer.email}</span>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/30 to-orange-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 md:px-6 space-y-1">
        <h1 className={PAGE_HEADING_CLASS}>Dealers Network</h1>
        <p className={PAGE_SUBHEADING_CLASS}>Manage dealer accounts and view network hierarchy</p>
      </div>
      <div className="space-y-4 sm:space-y-5 px-4 sm:px-5 md:px-6 pb-4 pt-0">

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('dealers')}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-all duration-200 border-b-2",
            activeTab === 'dealers'
              ? "border-red-600 text-red-600 dark:text-red-400 dark:border-red-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Create & Manage Dealers
          </div>
        </button>
        <button
          onClick={() => setActiveTab('hierarchy')}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-all duration-200 border-b-2",
            activeTab === 'hierarchy'
              ? "border-red-600 text-red-600 dark:text-red-400 dark:border-red-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Network Hierarchy
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'dealers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Dealer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register('email')} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" {...register('password')} />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Creating...' : 'Create Dealer'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Registered Dealers ({dealers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingDealers ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : dealers.length === 0 ? (
                <p className="text-muted-foreground">No dealers registered yet</p>
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
                      {dealers.map((dealer) => (
                        <TableRow key={dealer.id}>
                          <TableCell className="font-medium">{dealer.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span className="text-sm">{dealer.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                {new Date(dealer.createdAt).toLocaleDateString('en-US', {
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
      )}

      {activeTab === 'hierarchy' && (
        <div className="space-y-6">
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
      </div>

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
    </div>
  );
}
