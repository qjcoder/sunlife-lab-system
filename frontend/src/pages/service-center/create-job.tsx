import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createServiceJob } from '@/api/service-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Hash, User, Phone, Wrench, Calendar, FileText, Loader2, CheckCircle2, ArrowLeft, Scan } from 'lucide-react';
import { cn, PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from '@/lib/utils';

const serviceJobSchema = z.object({
  serialNumber: z.string().min(1, 'Serial number is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerContact: z.string().min(1, 'Customer contact is required'),
  reportedFault: z.string().min(1, 'Reported fault is required'),
  visitDate: z.string().min(1, 'Visit date is required'),
  remarks: z.string().optional(),
});

type ServiceJobFormData = z.infer<typeof serviceJobSchema>;

export default function CreateJob() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [scannerMode, setScannerMode] = useState(false);
  const serialRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ServiceJobFormData>({
    resolver: zodResolver(serviceJobSchema),
  });

  useEffect(() => {
    if (scannerMode && serialRef.current) serialRef.current.focus();
  }, [scannerMode]);

  const mutation = useMutation({
    mutationFn: createServiceJob,
    onSuccess: () => {
      toast.success('Service job created successfully');
      reset();
      queryClient.invalidateQueries({ queryKey: ['service-jobs'] });
      navigate('/service-center/jobs');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create service job');
    },
  });

  const onSubmit = (data: ServiceJobFormData) => {
    // Combine customer info into remarks if backend doesn't support separate fields
    const remarksWithCustomer = data.remarks 
      ? `${data.remarks}\n\nCustomer: ${data.customerName}\nContact: ${data.customerContact}`
      : `Customer: ${data.customerName}\nContact: ${data.customerContact}`;
    
    mutation.mutate({
      serialNumber: data.serialNumber,
      reportedFault: data.reportedFault,
      visitDate: data.visitDate,
      remarks: remarksWithCustomer,
    });
  };

  const getCurrentDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 md:px-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/service-center/jobs')}
          className="hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="space-y-1">
          <h1 className={PAGE_HEADING_CLASS}>Create Service Job</h1>
          <p className={PAGE_SUBHEADING_CLASS}>Record a new service job and repair request</p>
        </div>
      </div>
      <div className="space-y-4 sm:space-y-5 px-4 sm:px-5 md:px-6 pb-4 pt-0">
      <Card className="border-2 border-blue-200/60 dark:border-blue-800/60 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 dark:from-blue-600 dark:via-indigo-600 dark:to-purple-600 border-b-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDMuMzE0LTIuNjg2IDYtNiA2cy02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNnoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
          <CardTitle className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-white block">Service Job Information</span>
              <span className="text-blue-100 text-sm font-medium">Record customer service request</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 pb-8 px-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
            {/* Customer Information Section */}
            <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-800/50 dark:to-blue-950/20 rounded-2xl border-2 border-slate-200/60 dark:border-slate-700/60">
              <h3 className="text-lg font-bold mb-5 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <Label htmlFor="customerName" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <Phone className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    Customer Contact
                  </Label>
                  <Input
                    id="customerContact"
                    {...register('customerContact')}
                    className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                    placeholder="Phone number or email"
                  />
                  {errors.customerContact && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.customerContact.message}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Service Job Information Section */}
            <div className="p-5 bg-gradient-to-br from-slate-50 to-purple-50/30 dark:from-slate-800/50 dark:to-purple-950/20 rounded-2xl border-2 border-slate-200/60 dark:border-slate-700/60">
              <h3 className="text-lg font-bold mb-5 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Service Job Details
              </h3>
              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="serialNumber" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Hash className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      Inverter Serial Number
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
                      <Scan className="h-4 w-4 mr-1" />
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
                        document.getElementById('reportedFault')?.focus();
                      }
                    }}
                    className={cn("h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300", scannerMode && 'border-green-500 ring-2 ring-green-500/20')}
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
                  <Label htmlFor="reportedFault" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <Wrench className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    Reported Fault
                  </Label>
                  <textarea
                    id="reportedFault"
                    className="flex min-h-[120px] w-full rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:border-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300"
                    {...register('reportedFault')}
                    placeholder="Describe the reported fault or issue in detail..."
                  />
                  {errors.reportedFault && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.reportedFault.message}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="visitDate" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <div className="p-1.5 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                      <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    Visit Date
                  </Label>
                  <Input
                    id="visitDate"
                    type="date"
                    {...register('visitDate')}
                    defaultValue={getCurrentDate()}
                    className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                  />
                  {errors.visitDate && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.visitDate.message}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="remarks" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    Remarks (Optional)
                  </Label>
                  <Input
                    id="remarks"
                    {...register('remarks')}
                    className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                    placeholder="Additional notes or remarks"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t-2 border-slate-200 dark:border-slate-700 flex gap-3">
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1 h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Creating Service Job...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Create Service Job
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/service-center/jobs')}
                className="h-14 px-6 border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
