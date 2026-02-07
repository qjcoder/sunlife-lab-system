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
  Plus,
  X,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { cn, PAGE_HEADING_FIRST, PAGE_HEADING_SECOND, PAGE_SUBHEADING_CLASS } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { resetPassword as apiResetPassword, createAdmin as apiCreateAdmin, listAdmins, deleteAdmin as apiDeleteAdmin } from '@/api/auth-api';
import { useAuth } from '@/store/auth-store';

const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const adminSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AccountFormData = z.infer<typeof accountSchema>;
type AdminFormData = z.infer<typeof adminSchema>;

type AccountRoleTab = 'admins' | 'dealers' | 'service-centers' | 'operators' | 'installer-program-managers';

const ROLE_TABS: { id: AccountRoleTab; label: string; icon: typeof Users }[] = [
  { id: 'admins', label: 'Admins', icon: ShieldCheck },
  { id: 'dealers', label: 'Dealers', icon: Users },
  { id: 'service-centers', label: 'Service Centers', icon: Building2 },
  { id: 'operators', label: 'Data Entry Operators', icon: UserCog },
  { id: 'installer-program-managers', label: 'Installer Program Managers', icon: ClipboardList },
];

const PATH_TO_TAB: Record<string, AccountRoleTab> = {
  '/factory/account-creation': 'admins',
  '/factory/admins': 'admins',
  '/factory/dealers': 'dealers',
  '/factory/service-centers': 'service-centers',
  '/factory/operators': 'operators',
  '/factory/installer-program-managers': 'installer-program-managers',
};

export default function AccountCreation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AccountRoleTab>('admins');
  const [dealerSubTab, setDealerSubTab] = useState<'create' | 'hierarchy'>('create');
  const [showCreateDealerForm, setShowCreateDealerForm] = useState(false);
  const [showCreateServiceCenterForm, setShowCreateServiceCenterForm] = useState(false);
  const [showCreateOperatorForm, setShowCreateOperatorForm] = useState(false);
  const [showCreateIpmForm, setShowCreateIpmForm] = useState(false);
  const [showCreateAdminForm, setShowCreateAdminForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingRole, setDeletingRole] = useState<AccountRoleTab | null>(null);
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetPasswordSubmitting, setResetPasswordSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.isSuperAdmin ?? !!(user?.email && user.email.includes('@'));

  // Sync tab with URL path when visiting /factory/dealers, /factory/service-centers, etc.
  useEffect(() => {
    const tab = PATH_TO_TAB[location.pathname];
    if (tab) setActiveTab(tab);
  }, [location.pathname]);

  const setActiveTabAndNavigate = (tab: AccountRoleTab) => {
    setActiveTab(tab);
    navigate(`/factory/${tab}`);
  };

  const adminForm = useForm<AdminFormData>({
    resolver: zodResolver(adminSchema),
  });
  const { register: registerAdmin, handleSubmit: handleSubmitAdmin, formState: { errors: adminErrors }, reset: resetAdmin } = adminForm;

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
  });
  const { register, handleSubmit, formState: { errors }, reset } = form;

  // Admins – fetch as soon as Account Creation page is visible (Super Admin only)
  const { data: admins = [], isLoading: loadingAdmins, isError: adminsError, error: adminsQueryError, refetch: refetchAdmins } = useQuery({
    queryKey: ['admins'],
    queryFn: listAdmins,
    enabled: true,
    refetchOnMount: 'always',
  });
  const adminsErrorMessage = (adminsQueryError as any)?.response?.data?.message;
  const adminMutation = useMutation({
    mutationFn: apiCreateAdmin,
    onSuccess: () => {
      toast.success('Factory Admin created successfully');
      resetAdmin();
      setShowCreateAdminForm(false);
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create admin'),
  });
  const adminDeleteMutation = useMutation({
    mutationFn: apiDeleteAdmin,
    onSuccess: () => {
      toast.success('Admin deleted');
      setDeletingAdminId(null);
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || 'Failed to delete admin');
      setDeletingAdminId(null);
    },
  });

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
      setShowCreateDealerForm(false);
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
      setShowCreateServiceCenterForm(false);
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
      setShowCreateOperatorForm(false);
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
      setShowCreateIpmForm(false);
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
            {level === 0 ? <Building2 className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
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
                <Mail className="h-3.5 w-3.5" />
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-foreground">Name</Label>
        <Input id="name" placeholder="Display name" className="h-10 rounded-lg border-border bg-background max-w-sm" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="username" className="text-sm font-medium text-foreground">Username</Label>
        <Input id="username" placeholder="Login username" className="h-10 rounded-lg border-border bg-background max-w-sm" {...register('username')} />
        {errors.username && <p className="text-xs text-destructive mt-1">{errors.username?.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
        <Input id="password" type="password" placeholder="Min. 6 characters" className="h-10 rounded-lg border-border bg-background max-w-sm" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
      </div>
      <Button type="submit" disabled={isPending} className="h-10 rounded-lg px-6 font-medium">
        {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : submitLabel}
      </Button>
    </form>
  );

  const renderTable = (
    items: { id: string; name: string; username?: string; email?: string; createdAt?: string }[],
    isLoading: boolean,
    emptyMsg: string,
    role: AccountRoleTab
  ) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className="py-12 text-center rounded-lg border border-dashed border-border bg-muted/30">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">{emptyMsg}</p>
        </div>
      );
    }
    return (
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
            {items.map((item) => (
              <TableRow key={item.id} className="border-b border-border/50 last:border-0">
                <TableCell className="py-3.5 font-medium text-foreground">{item.name}</TableCell>
                <TableCell className="py-3.5 text-sm text-foreground">
                  {item.username || item.email || '—'}
                </TableCell>
                <TableCell className="py-3.5 whitespace-nowrap text-sm text-muted-foreground">
                  {item.createdAt ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                      {new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setResetPasswordTarget({ id: item.id, name: item.name })}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8 p-0"
                      aria-label="Reset password"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    {isSuperAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeletingId(item.id);
                        setDeletingRole(role);
                      }}
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
    );
  };

  const handleResetPasswordSubmit = async () => {
    if (!resetPasswordTarget) return;
    if (resetPasswordValue.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (resetPasswordValue !== resetPasswordConfirm) {
      toast.error('Passwords do not match');
      return;
    }
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/30 to-orange-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="px-4 py-3 sm:px-5 sm:py-4 md:px-6 space-y-1">
        <h1 className="inline text-xl sm:text-2xl"><span className={PAGE_HEADING_FIRST}>Account </span><span className={PAGE_HEADING_SECOND}>Creation</span></h1>
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
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Admins tab – Factory Admins log in with email (Gmail, Outlook, etc.) */}
      {activeTab === 'admins' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                setShowCreateAdminForm(!showCreateAdminForm);
                if (showCreateAdminForm) resetAdmin();
              }}
              size="default"
              className="shrink-0"
            >
              {showCreateAdminForm ? (
                <><X className="h-3.5 w-3.5 mr-2" />Hide Form</>
              ) : (
                <><Plus className="h-3.5 w-3.5 mr-2" />Create New Admin</>
              )}
            </Button>
          </div>
          {showCreateAdminForm ? (
            <Card className="rounded-xl border-border shadow-sm overflow-hidden max-w-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold tracking-tight">Create Factory Admin</CardTitle>
                <p className="text-sm text-muted-foreground font-normal mt-0.5">Same as other roles: username and password. Super admin is created only via script.</p>
              </CardHeader>
              <CardContent className="pt-0">
                <form onSubmit={handleSubmitAdmin((data) => adminMutation.mutate(data))} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="admin-name" className="text-sm font-medium text-foreground">Name</Label>
                    <Input id="admin-name" placeholder="Display name" className="h-10 rounded-lg border-border bg-background max-w-sm" {...registerAdmin('name')} />
                    {adminErrors.name && <p className="text-xs text-destructive mt-1">{adminErrors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-username" className="text-sm font-medium text-foreground">Username</Label>
                    <Input id="admin-username" placeholder="Login username" className="h-10 rounded-lg border-border bg-background max-w-sm" {...registerAdmin('username')} />
                    {adminErrors.username && <p className="text-xs text-destructive mt-1">{adminErrors.username.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password" className="text-sm font-medium text-foreground">Password</Label>
                    <Input id="admin-password" type="password" placeholder="Min. 6 characters" className="h-10 rounded-lg border-border bg-background max-w-sm" {...registerAdmin('password')} />
                    {adminErrors.password && <p className="text-xs text-destructive mt-1">{adminErrors.password.message}</p>}
                  </div>
                  <Button type="submit" disabled={adminMutation.isPending} className="h-10 rounded-lg px-6 font-medium">
                    {adminMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create Admin'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl border-border shadow-sm overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  Factory Admins
                </CardTitle>
                <p className="text-sm text-muted-foreground font-normal mt-0.5">Super admin (script) uses email to sign in; panel admins use username. Reset password and delete (super admin only) below.</p>
              </CardHeader>
              <CardContent className="pt-0">
                {loadingAdmins ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : adminsError ? (
                  <div className="py-12 text-center rounded-lg border border-dashed border-border bg-destructive/10">
                    <p className="text-sm font-medium text-destructive">Failed to load admins.</p>
                    {adminsErrorMessage && <p className="text-xs text-muted-foreground mt-1">{adminsErrorMessage}</p>}
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => refetchAdmins()}>Retry</Button>
                  </div>
                ) : admins.length === 0 ? (
                  <div className="py-12 text-center rounded-lg border border-dashed border-border bg-muted/30">
                    <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No admins yet. Create the super admin with the script, then add more here.</p>
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
                        {admins.map((admin) => (
                          <TableRow key={admin._id} className="border-b border-border/50 last:border-0">
                            <TableCell className="py-3.5 font-medium text-foreground">{admin.name}</TableCell>
                            <TableCell className="py-3.5 text-sm text-foreground">{admin.username || admin.email || '—'}</TableCell>
                            <TableCell className="py-3.5 whitespace-nowrap text-sm text-muted-foreground">
                              {admin.createdAt ? (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                                  {new Date(admin.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </div>
                              ) : '—'}
                            </TableCell>
                            <TableCell className="py-3.5">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setResetPasswordTarget({ id: admin._id, name: admin.name })}
                                  className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8 p-0"
                                  aria-label="Reset password"
                                >
                                  <KeyRound className="h-3.5 w-3.5" />
                                </Button>
                                {isSuperAdmin && String(admin._id) !== String(user?.id) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingAdminId(admin._id)}
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                    aria-label="Delete admin"
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
          )}
        </>
      )}

      {/* Dealers tab */}
      {activeTab === 'dealers' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                if (dealerSubTab === 'hierarchy') setDealerSubTab('create');
                else {
                  setShowCreateDealerForm(!showCreateDealerForm);
                  if (showCreateDealerForm) reset();
                }
              }}
              size="default"
              className="shrink-0"
            >
              {showCreateDealerForm && dealerSubTab === 'create' ? (
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
                onClick={() => setDealerSubTab('hierarchy')}
                className={cn(
                  'px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2',
                  dealerSubTab === 'hierarchy'
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                <Network className="h-3.5 w-3.5" />
                Network Hierarchy
              </button>
            </div>
          </div>
          {dealerSubTab === 'create' && (
            showCreateDealerForm ? (
              <Card className="rounded-xl border-border shadow-sm overflow-hidden max-w-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold tracking-tight">Create Dealer</CardTitle>
                  <p className="text-sm text-muted-foreground font-normal mt-0.5">Add a new dealer account to the network</p>
                </CardHeader>
                <CardContent className="pt-0">{renderForm(onSubmitDealer, dealerMutation.isPending, 'Create Dealer')}</CardContent>
              </Card>
            ) : (
              <Card className="rounded-xl border-border shadow-sm overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Registered Dealers
                  </CardTitle>
                  <p className="text-sm text-muted-foreground font-normal mt-0.5">Dealer accounts in the system</p>
                </CardHeader>
                <CardContent className="pt-0">{renderTable(dealers, loadingDealers, 'No dealers yet', 'dealers')}</CardContent>
              </Card>
            )
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
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                setShowCreateServiceCenterForm(!showCreateServiceCenterForm);
                if (showCreateServiceCenterForm) reset();
              }}
              size="default"
              className="shrink-0"
            >
              {showCreateServiceCenterForm ? (
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
          </div>
          {showCreateServiceCenterForm ? (
            <Card className="rounded-xl border-border shadow-sm overflow-hidden max-w-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold tracking-tight">Create Service Center</CardTitle>
                <p className="text-sm text-muted-foreground font-normal mt-0.5">Add a new service center account</p>
              </CardHeader>
              <CardContent className="pt-0">{renderForm(onSubmitServiceCenter, serviceCenterMutation.isPending, 'Create Service Center')}</CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl border-border shadow-sm overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Registered Service Centers
                </CardTitle>
                <p className="text-sm text-muted-foreground font-normal mt-0.5">Service center accounts in the system</p>
              </CardHeader>
              <CardContent className="pt-0">{renderTable(serviceCenters, loadingServiceCenters, 'No service centers yet', 'service-centers')}</CardContent>
            </Card>
          )}
        </>
      )}

      {/* Data Entry Operators tab */}
      {activeTab === 'operators' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                setShowCreateOperatorForm(!showCreateOperatorForm);
                if (showCreateOperatorForm) reset();
              }}
              size="default"
              className="shrink-0"
            >
              {showCreateOperatorForm ? (
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
          </div>
          {showCreateOperatorForm ? (
            <Card className="rounded-xl border-border shadow-sm overflow-hidden max-w-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold tracking-tight">Create Data Entry Operator</CardTitle>
                <p className="text-sm text-muted-foreground font-normal mt-0.5">Add a new data entry operator account</p>
              </CardHeader>
              <CardContent className="pt-0">{renderForm(onSubmitOperator, operatorMutation.isPending, 'Create Operator')}</CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl border-border shadow-sm overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-muted-foreground" />
                  Registered Data Entry Operators
                </CardTitle>
                <p className="text-sm text-muted-foreground font-normal mt-0.5">Operator accounts in the system</p>
              </CardHeader>
              <CardContent className="pt-0">{renderTable(operators, loadingOperators, 'No operators yet', 'operators')}</CardContent>
            </Card>
          )}
        </>
      )}

      {/* Installer Program Managers tab */}
      {activeTab === 'installer-program-managers' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                setShowCreateIpmForm(!showCreateIpmForm);
                if (showCreateIpmForm) reset();
              }}
              size="default"
              className="shrink-0"
            >
              {showCreateIpmForm ? (
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
          </div>
          {showCreateIpmForm ? (
            <Card className="rounded-xl border-border shadow-sm overflow-hidden max-w-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold tracking-tight">Create Installer Program Manager</CardTitle>
                <p className="text-sm text-muted-foreground font-normal mt-0.5">Add a new installer program manager account</p>
              </CardHeader>
              <CardContent className="pt-0">{renderForm(onSubmitIpm, ipmMutation.isPending, 'Create Installer Program Manager')}</CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl border-border shadow-sm overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  Registered Installer Program Managers
                </CardTitle>
                <p className="text-sm text-muted-foreground font-normal mt-0.5">Installer program manager accounts in the system</p>
              </CardHeader>
              <CardContent className="pt-0">{renderTable(installerProgramManagers, loadingIpm, 'No installer program managers yet', 'installer-program-managers')}</CardContent>
            </Card>
          )}
        </>
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

      {deletingAdminId && (
        <ConfirmDialog
          title="Delete Admin"
          message="Are you sure you want to delete this admin? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => { if (deletingAdminId) adminDeleteMutation.mutate(deletingAdminId); }}
          onCancel={() => setDeletingAdminId(null)}
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
                  className="max-w-sm"
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
                  className="max-w-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setResetPasswordTarget(null); setResetPasswordValue(''); setResetPasswordConfirm(''); }}>Cancel</Button>
                <Button onClick={handleResetPasswordSubmit} disabled={resetPasswordSubmitting}>
                  {resetPasswordSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset password'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
