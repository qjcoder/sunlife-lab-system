import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createDealer, listDealers, getDealerHierarchy, deleteDealer } from '@/api/dealer-api';
import { createServiceCenter, listServiceCenters, deleteServiceCenter } from '@/api/service-center-api';
import { createOperator, listOperators, deleteOperator } from '@/api/operator-api-admin';
import {
  createInstallerProgramManager,
  listInstallerProgramManagers,
  deleteInstallerProgramManager,
} from '@/api/installer-program-manager-api';
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
import {
  Users,
  Building2,
  UserCog,
  ClipboardList,
  Mail,
  Calendar,
  Network,
  Trash2,
  Loader2,
} from 'lucide-react';
import { cn, PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AccountFormData = z.infer<typeof accountSchema>;

type AccountRoleTab = 'dealers' | 'service-centers' | 'operators' | 'installer-program-managers';

const ROLE_TABS: { id: AccountRoleTab; label: string; icon: typeof Users }[] = [
  { id: 'dealers', label: 'Dealers', icon: Users },
  { id: 'service-centers', label: 'Service Centers', icon: Building2 },
  { id: 'operators', label: 'Data Entry Operators', icon: UserCog },
  { id: 'installer-program-managers', label: 'Installer Program Managers', icon: ClipboardList },
];

const PATH_TO_TAB: Record<string, AccountRoleTab> = {
  '/factory/dealers': 'dealers',
  '/factory/service-centers': 'service-centers',
  '/factory/operators': 'operators',
  '/factory/installer-program-managers': 'installer-program-managers',
};

export default function AccountCreation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AccountRoleTab>('dealers');
  const [dealerSubTab, setDealerSubTab] = useState<'create' | 'hierarchy'>('create');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingRole, setDeletingRole] = useState<AccountRoleTab | null>(null);
  const queryClient = useQueryClient();

  // Sync tab with URL path when visiting /factory/dealers, /factory/service-centers, etc.
  useEffect(() => {
    const tab = PATH_TO_TAB[location.pathname];
    if (tab) setActiveTab(tab);
  }, [location.pathname]);

  const setActiveTabAndNavigate = (tab: AccountRoleTab) => {
    setActiveTab(tab);
    const path = tab === 'dealers' ? '/factory/account-creation' : `/factory/${tab}`;
    navigate(path);
  };

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
  });
  const { register, handleSubmit, formState: { errors }, reset } = form;

  // Dealers
  const { data: dealers = [], isLoading: loadingDealers } = useQuery({
    queryKey: ['dealers'],
    queryFn: listDealers,
    enabled: activeTab === 'dealers',
  });
  const { data: hierarchyData, isLoading: loadingHierarchy, error: hierarchyError } = useQuery({
    queryKey: ['dealer-hierarchy'],
    queryFn: getDealerHierarchy,
    enabled: activeTab === 'dealers' && dealerSubTab === 'hierarchy',
  });
  const dealerMutation = useMutation({
    mutationFn: createDealer,
    onSuccess: () => {
      toast.success('Dealer created successfully');
      reset();
      queryClient.invalidateQueries({ queryKey: ['dealers'] });
      queryClient.invalidateQueries({ queryKey: ['dealer-hierarchy'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create dealer'),
  });
  const dealerDeleteMutation = useMutation({
    mutationFn: deleteDealer,
    onSuccess: () => {
      toast.success('Dealer deleted');
      setDeletingId(null);
      setDeletingRole(null);
      queryClient.invalidateQueries({ queryKey: ['dealers'] });
      queryClient.invalidateQueries({ queryKey: ['dealer-hierarchy'] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to delete dealer');
      setDeletingId(null);
      setDeletingRole(null);
    },
  });

  // Service Centers
  const { data: serviceCenters = [], isLoading: loadingServiceCenters } = useQuery({
    queryKey: ['service-centers'],
    queryFn: listServiceCenters,
    enabled: activeTab === 'service-centers',
  });
  const serviceCenterMutation = useMutation({
    mutationFn: createServiceCenter,
    onSuccess: () => {
      toast.success('Service center created successfully');
      reset();
      queryClient.invalidateQueries({ queryKey: ['service-centers'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create service center'),
  });
  const serviceCenterDeleteMutation = useMutation({
    mutationFn: deleteServiceCenter,
    onSuccess: () => {
      toast.success('Service center deleted');
      setDeletingId(null);
      setDeletingRole(null);
      queryClient.invalidateQueries({ queryKey: ['service-centers'] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to delete');
      setDeletingId(null);
      setDeletingRole(null);
    },
  });

  // Operators
  const { data: operatorsData, isLoading: loadingOperators } = useQuery({
    queryKey: ['operators'],
    queryFn: listOperators,
    enabled: activeTab === 'operators',
  });
  const operators = operatorsData?.operators ?? [];
  const operatorMutation = useMutation({
    mutationFn: createOperator,
    onSuccess: () => {
      toast.success('Data entry operator created successfully');
      reset();
      queryClient.invalidateQueries({ queryKey: ['operators'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create operator'),
  });
  const operatorDeleteMutation = useMutation({
    mutationFn: deleteOperator,
    onSuccess: () => {
      toast.success('Operator deleted');
      setDeletingId(null);
      setDeletingRole(null);
      queryClient.invalidateQueries({ queryKey: ['operators'] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to delete');
      setDeletingId(null);
      setDeletingRole(null);
    },
  });

  // Installer Program Managers
  const { data: ipmData, isLoading: loadingIpm } = useQuery({
    queryKey: ['installer-program-managers'],
    queryFn: listInstallerProgramManagers,
    enabled: activeTab === 'installer-program-managers',
  });
  const installerProgramManagers = ipmData?.installerProgramManagers ?? [];
  const ipmMutation = useMutation({
    mutationFn: createInstallerProgramManager,
    onSuccess: () => {
      toast.success('Installer program manager created successfully');
      reset();
      queryClient.invalidateQueries({ queryKey: ['installer-program-managers'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create'),
  });
  const ipmDeleteMutation = useMutation({
    mutationFn: deleteInstallerProgramManager,
    onSuccess: () => {
      toast.success('Installer program manager deleted');
      setDeletingId(null);
      setDeletingRole(null);
      queryClient.invalidateQueries({ queryKey: ['installer-program-managers'] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to delete');
      setDeletingId(null);
      setDeletingRole(null);
    },
  });

  const onSubmitDealer = (data: AccountFormData) => dealerMutation.mutate(data);
  const onSubmitServiceCenter = (data: AccountFormData) => serviceCenterMutation.mutate(data);
  const onSubmitOperator = (data: AccountFormData) => operatorMutation.mutate(data);
  const onSubmitIpm = (data: AccountFormData) => ipmMutation.mutate(data);

  const confirmDelete = () => {
    if (!deletingId || !deletingRole) return;
    if (deletingRole === 'dealers') dealerDeleteMutation.mutate(deletingId);
    else if (deletingRole === 'service-centers') serviceCenterDeleteMutation.mutate(deletingId);
    else if (deletingRole === 'operators') operatorDeleteMutation.mutate(deletingId);
    else if (deletingRole === 'installer-program-managers') ipmDeleteMutation.mutate(deletingId);
  };

  const renderHierarchyNode = (node: any, level = 0) => {
    const hasSub = node.subDealers && node.subDealers.length > 0;
    return (
      <div key={node.dealer.id} className="relative">
        {level > 0 && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-400 to-red-600" />
        )}
        <div className={cn('flex items-start gap-4', level > 0 && 'ml-8')}>
          {level > 0 && (
            <div className="absolute left-0 top-6 w-8 h-0.5 bg-gradient-to-r from-red-400 to-red-600" />
          )}
          <div
            className={cn(
              'relative z-10 flex-shrink-0 rounded-full p-3 shadow-lg',
              level === 0 ? 'bg-gradient-to-br from-red-600 to-red-700 text-white' : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
            )}
          >
            {level === 0 ? <Building2 className="h-5 w-5" /> : <Users className="h-5 w-5" />}
          </div>
          <Card className={cn('flex-1 border-2', level === 0 ? 'border-red-200' : 'border-blue-200')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <h3 className="font-bold">{node.dealer.name}</h3>
                <span className={cn('px-2 py-0.5 rounded-full text-xs', level === 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}>
                  {level === 0 ? 'Main Dealer' : 'Sub-Dealer'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                <Mail className="h-4 w-4" />
                {node.dealer.email}
              </div>
            </CardContent>
          </Card>
        </div>
        {hasSub && (
          <div className="mt-4 ml-16 space-y-4">
            {node.subDealers.map((sub: any) => (
              <div key={sub.id}>{renderHierarchyNode({ dealer: sub, subDealers: [] }, level + 1)}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const totalDealers = hierarchyData?.length || 0;
  const totalSubDealers = hierarchyData?.reduce((acc: number, n: any) => acc + (n.subDealers?.length || 0), 0) || 0;

  const renderForm = (onSubmit: (data: AccountFormData) => void, isPending: boolean, submitLabel: string) => (
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
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : submitLabel}
      </Button>
    </form>
  );

  const renderTable = (
    items: { id: string; name: string; email: string; createdAt?: string }[],
    isLoading: boolean,
    emptyMsg: string,
    role: AccountRoleTab
  ) => {
    if (isLoading) return <p className="text-muted-foreground">Loading...</p>;
    if (items.length === 0) return <p className="text-muted-foreground">{emptyMsg}</p>;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-slate-400" />
                  <span className="text-sm">{item.email}</span>
                </div>
              </TableCell>
              <TableCell>
                {item.createdAt ? (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span className="text-sm">
                      {new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDeletingId(item.id);
                    setDeletingRole(role);
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/30 to-orange-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="px-4 py-3 sm:px-5 sm:py-4 md:px-6 space-y-1">
        <h1 className={PAGE_HEADING_CLASS}>Account Creation</h1>
        <p className={PAGE_SUBHEADING_CLASS}>Create and manage accounts for different roles</p>
      </div>
      <div className="space-y-4 sm:space-y-5 px-4 sm:px-5 md:px-6 pb-4 pt-0">
      {/* Role tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
        {ROLE_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabAndNavigate(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                activeTab === tab.id
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dealers tab */}
      {activeTab === 'dealers' && (
        <>
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setDealerSubTab('create')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px',
                dealerSubTab === 'create' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-600'
              )}
            >
              Create & List
            </button>
            <button
              type="button"
              onClick={() => setDealerSubTab('hierarchy')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-2',
                dealerSubTab === 'hierarchy' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-600'
              )}
            >
              <Network className="h-4 w-4" />
              Network Hierarchy
            </button>
          </div>
          {dealerSubTab === 'create' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create Dealer</CardTitle>
                </CardHeader>
                <CardContent>{renderForm(onSubmitDealer, dealerMutation.isPending, 'Create Dealer')}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Registered Dealers ({dealers.length})</CardTitle>
                </CardHeader>
                <CardContent>{renderTable(dealers, loadingDealers, 'No dealers yet', 'dealers')}</CardContent>
              </Card>
            </div>
          )}
          {dealerSubTab === 'hierarchy' && (
            <div className="space-y-6">
              <div className="flex gap-4">
                <Card className="flex-1">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-600">Main Dealers</div>
                    <div className="text-2xl font-bold text-red-600">{totalDealers}</div>
                  </CardContent>
                </Card>
                <Card className="flex-1">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-600">Sub-Dealers</div>
                    <div className="text-2xl font-bold text-blue-600">{totalSubDealers}</div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardContent className="p-6">
                  {loadingHierarchy ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-red-600" />
                    </div>
                  ) : hierarchyError ? (
                    <p className="text-destructive">Failed to load hierarchy</p>
                  ) : !hierarchyData?.length ? (
                    <p className="text-muted-foreground">No dealers found</p>
                  ) : (
                    <div className="space-y-6">
                      {hierarchyData.map((node: any) => (
                        <div key={node.dealer.id}>{renderHierarchyNode(node, 0)}</div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Service Centers tab */}
      {activeTab === 'service-centers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Service Center</CardTitle>
            </CardHeader>
            <CardContent>{renderForm(onSubmitServiceCenter, serviceCenterMutation.isPending, 'Create Service Center')}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Registered Service Centers ({serviceCenters.length})</CardTitle>
            </CardHeader>
            <CardContent>{renderTable(serviceCenters, loadingServiceCenters, 'No service centers yet', 'service-centers')}</CardContent>
          </Card>
        </div>
      )}

      {/* Data Entry Operators tab */}
      {activeTab === 'operators' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Data Entry Operator</CardTitle>
            </CardHeader>
            <CardContent>{renderForm(onSubmitOperator, operatorMutation.isPending, 'Create Operator')}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Registered Data Entry Operators ({operators.length})</CardTitle>
            </CardHeader>
            <CardContent>{renderTable(operators, loadingOperators, 'No operators yet', 'operators')}</CardContent>
          </Card>
        </div>
      )}

      {/* Installer Program Managers tab */}
      {activeTab === 'installer-program-managers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Installer Program Manager</CardTitle>
            </CardHeader>
            <CardContent>{renderForm(onSubmitIpm, ipmMutation.isPending, 'Create Installer Program Manager')}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Registered Installer Program Managers ({installerProgramManagers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTable(installerProgramManagers, loadingIpm, 'No installer program managers yet', 'installer-program-managers')}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingId && deletingRole && (
        <ConfirmDialog
          title="Delete account"
          message="Are you sure you want to delete this account? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => { setDeletingId(null); setDeletingRole(null); }}
          variant="danger"
        />
      )}
      </div>
    </div>
  );
}
