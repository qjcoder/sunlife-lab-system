import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth-store';
import { getDealerInvoicePrefix } from '@/lib/invoice-utils';
import { sellInverter } from '@/api/sale-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Hash, FileText, Calendar, User, Phone, ShoppingCart, Loader2, CheckCircle2, Scan } from 'lucide-react';
import { cn, PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from '@/lib/utils';

const singleSaleSchema = z.object({
  serialNumber: z.string().min(1, 'Serial number is required'),
  saleInvoiceNo: z.string().optional(),
  saleDate: z.string().min(1, 'Sale date is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerContact: z.string().optional(),
});

type SingleSaleFormData = z.infer<typeof singleSaleSchema>;

const alnum = (s: string) => (s || '').replace(/\W/g, '');
const lastN = (s: string, n: number) => alnum(s).slice(-n);

export default function SubDealerSales() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [scannerMode, setScannerMode] = useState(false);
  const serialRef = useRef<HTMLInputElement>(null);
  const invoicePrefix = getDealerInvoicePrefix(user?.name);

  const getCurrentDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const defaultInvoiceSingle = (serial: string, dateStr: string) => {
    const d = dateStr.trim() || getCurrentDate();
    const [y, m, day] = d.split('-');
    const ddmmyy = day && m && y ? `${day}${m}${y.slice(-2)}` : '';
    const suffix = lastN(serial, 4) || serial.slice(-4) || '0001';
    return `${invoicePrefix}${ddmmyy}${suffix}`;
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<SingleSaleFormData>({
    resolver: zodResolver(singleSaleSchema),
    defaultValues: { saleDate: getCurrentDate() },
  });
  const singleInvoicePreview = watch('serialNumber')?.trim() && watch('saleDate')
    ? defaultInvoiceSingle(watch('serialNumber'), watch('saleDate') || getCurrentDate())
    : null;

  useEffect(() => {
    if (scannerMode && serialRef.current) serialRef.current.focus();
  }, [scannerMode]);

  const singleMutation = useMutation({
    mutationFn: sellInverter,
    onSuccess: () => {
      toast.success('Sale recorded successfully');
      reset();
      queryClient.invalidateQueries({ queryKey: ['dealer-stock'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record sale');
    },
  });

  const onSingleSubmit = (data: SingleSaleFormData) => {
    const invoice = defaultInvoiceSingle(data.serialNumber, data.saleDate);
    singleMutation.mutate({ ...data, saleInvoiceNo: invoice });
  };

  return (
    <div className="space-y-8 min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className={PAGE_HEADING_CLASS}>Sales</h1>
        <p className={PAGE_SUBHEADING_CLASS}>Record inverter sales to customers</p>
      </div>

      <Card className="border-2 border-green-200/60 dark:border-green-800/60 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 dark:from-green-600 dark:via-emerald-600 dark:to-teal-600 border-b-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDMuMzE0LTIuNjg2IDYtNiA2cy02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNnoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
          <CardTitle className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white block">Record Sale</span>
              <span className="text-green-100 text-sm font-medium">Record inverter sale to customer</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 pb-8 px-8">
          <form onSubmit={handleSubmit(onSingleSubmit)} className="space-y-7">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="serialNumber" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Hash className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  </div>
                  Serial Number
                </Label>
                <Button
                  type="button"
                  variant={scannerMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setScannerMode(!scannerMode);
                    if (!scannerMode) setTimeout(() => serialRef.current?.focus(), 100);
                  }}
                  className={cn(scannerMode && 'bg-green-600 hover:bg-green-700')}
                >
                  <Scan className="h-3.5 w-3.5 mr-1" />
                  {scannerMode ? 'Scanner ON' : 'Scanner'}
                </Button>
              </div>
              <Input
                id="serialNumber"
                {...(function () {
                  const { ref: regRef, ...rest } = register('serialNumber');
                  return {
                    ...rest,
                    ref: (el: HTMLInputElement | null) => {
                      regRef(el);
                      serialRef.current = el;
                    },
                  };
                })()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && scannerMode) {
                    e.preventDefault();
                    document.getElementById('saleDate')?.focus();
                  }
                }}
                className={cn("h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300", scannerMode && 'border-green-500 ring-2 ring-green-500/20')}
                placeholder={scannerMode ? 'Scan or type serial, then Enter' : 'Enter serial number'}
              />
              {errors.serialNumber && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.serialNumber.message}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                Invoice Number
              </Label>
              <div className="h-12 px-4 flex items-center text-base border-2 border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-medium">
                {singleInvoicePreview ?? '—'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Auto-generated ({invoicePrefix} + date + last 4 digits of serial)</p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="saleDate" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <div className="p-1.5 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                  <Calendar className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                Sale Date
              </Label>
              <Input
                id="saleDate"
                type="date"
                {...register('saleDate')}
                defaultValue={getCurrentDate()}
                className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
              />
              {errors.saleDate && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.saleDate.message}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="customerName" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                Customer Name
              </Label>
              <Input
                id="customerName"
                {...register('customerName')}
                className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                placeholder="Enter customer name"
              />
              {errors.customerName && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.customerName.message}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="customerContact" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Phone className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                </div>
                Customer Contact (Optional)
              </Label>
              <Input
                id="customerContact"
                {...register('customerContact')}
                className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                placeholder="Phone number or email"
              />
            </div>

            <div className="pt-6 border-t-2 border-slate-200 dark:border-slate-700">
              <Button
                type="submit"
                disabled={singleMutation.isPending}
                className="w-full h-14 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
              >
                {singleMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    Recording Sale...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                    Record Sale
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
