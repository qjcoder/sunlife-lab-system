import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sellInverter, bulkSellInverters } from '@/api/sale-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Hash, FileText, Calendar, User, Phone, ShoppingCart, Plus, X, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const singleSaleSchema = z.object({
  serialNumber: z.string().min(1, 'Serial number is required'),
  saleInvoiceNo: z.string().min(1, 'Invoice number is required'),
  saleDate: z.string().min(1, 'Sale date is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerContact: z.string().optional(),
});

type SingleSaleFormData = z.infer<typeof singleSaleSchema>;

export default function DealerSales() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [bulkSales, setBulkSales] = useState<SingleSaleFormData[]>([]);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SingleSaleFormData>({
    resolver: zodResolver(singleSaleSchema),
  });

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

  const bulkMutation = useMutation({
    mutationFn: bulkSellInverters,
    onSuccess: () => {
      toast.success('Sales recorded successfully');
      setBulkSales([]);
      queryClient.invalidateQueries({ queryKey: ['dealer-stock'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record sales');
    },
  });

  const onSingleSubmit = (data: SingleSaleFormData) => {
    singleMutation.mutate(data);
  };

  const addBulkSale = () => {
    setBulkSales([...bulkSales, {
      serialNumber: '',
      saleInvoiceNo: '',
      saleDate: '',
      customerName: '',
      customerContact: '',
    }]);
  };

  const updateBulkSale = (index: number, field: keyof SingleSaleFormData, value: string) => {
    const updated = [...bulkSales];
    updated[index] = { ...updated[index], [field]: value };
    setBulkSales(updated);
  };

  const removeBulkSale = (index: number) => {
    setBulkSales(bulkSales.filter((_, i) => i !== index));
  };

  const onBulkSubmit = () => {
    const validSales = bulkSales.filter(
      (sale) =>
        sale.serialNumber &&
        sale.saleInvoiceNo &&
        sale.saleDate &&
        sale.customerName
    );

    if (validSales.length === 0) {
      toast.error('Please add at least one valid sale');
      return;
    }

    bulkMutation.mutate({ sales: validSales });
  };

  const getCurrentDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="space-y-8 min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
          Sales
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg">Record inverter sales to customers</p>
      </div>

      {/* Mode Switcher */}
      <div className="flex gap-2 p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg w-fit">
        <Button
          variant={mode === 'single' ? 'default' : 'ghost'}
          onClick={() => setMode('single')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-semibold transition-all duration-300",
            mode === 'single' 
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl scale-105' 
              : 'hover:bg-slate-100 dark:hover:bg-slate-700'
          )}
        >
          Single Sale
        </Button>
        <Button
          variant={mode === 'bulk' ? 'default' : 'ghost'}
          onClick={() => setMode('bulk')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-semibold transition-all duration-300",
            mode === 'bulk' 
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl scale-105' 
              : 'hover:bg-slate-100 dark:hover:bg-slate-700'
          )}
        >
          Bulk Sale
        </Button>
      </div>

      {mode === 'single' ? (
        <Card className="border-2 border-green-200/60 dark:border-green-800/60 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 dark:from-green-600 dark:via-emerald-600 dark:to-teal-600 border-b-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDMuMzE0LTIuNjg2IDYtNiA2cy02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNnoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
            <CardTitle className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold text-white block">Single Sale</span>
                <span className="text-green-100 text-sm font-medium">Record one sale at a time</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 pb-8 px-8">
            <form onSubmit={handleSubmit(onSingleSubmit)} className="space-y-7">
              <div className="space-y-3">
                <Label htmlFor="serialNumber" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Hash className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  Serial Number
                </Label>
                <Input
                  id="serialNumber"
                  {...register('serialNumber')}
                  className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                  placeholder="Enter serial number"
                />
                {errors.serialNumber && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.serialNumber.message}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="saleInvoiceNo" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  Invoice Number
                </Label>
                <Input
                  id="saleInvoiceNo"
                  {...register('saleInvoiceNo')}
                  className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                  placeholder="Enter invoice number"
                />
                {errors.saleInvoiceNo && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.saleInvoiceNo.message}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="saleDate" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                    <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
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
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Phone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
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
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Recording Sale...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Record Sale
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-green-200/60 dark:border-green-800/60 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 dark:from-green-600 dark:via-emerald-600 dark:to-teal-600 border-b-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDMuMzE0LTIuNjg2IDYtNiA2cy02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNnoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
            <CardTitle className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-white block">Bulk Sale</span>
                  <span className="text-green-100 text-sm font-medium">Record multiple sales at once</span>
                </div>
              </div>
              <Button
                onClick={addBulkSale}
                variant="outline"
                className="bg-white/20 backdrop-blur-md text-white border-2 border-white/30 hover:bg-white/30 font-semibold transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Sale
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 pb-8 px-8">
            <div className="space-y-6">
              {bulkSales.map((sale, index) => (
                <Card key={index} className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Sale #{index + 1}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBulkSale(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-3">
                        <Label className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Hash className="h-4 w-4 text-green-600" />
                          Serial Number
                        </Label>
                        <Input
                          value={sale.serialNumber}
                          onChange={(e) => updateBulkSale(index, 'serialNumber', e.target.value)}
                          className="h-12 text-base border-2"
                          placeholder="Enter serial number"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <FileText className="h-4 w-4 text-emerald-600" />
                          Invoice Number
                        </Label>
                        <Input
                          value={sale.saleInvoiceNo}
                          onChange={(e) => updateBulkSale(index, 'saleInvoiceNo', e.target.value)}
                          className="h-12 text-base border-2"
                          placeholder="Enter invoice number"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Calendar className="h-4 w-4 text-teal-600" />
                          Sale Date
                        </Label>
                        <Input
                          type="date"
                          value={sale.saleDate}
                          onChange={(e) => updateBulkSale(index, 'saleDate', e.target.value)}
                          defaultValue={getCurrentDate()}
                          className="h-12 text-base border-2"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <User className="h-4 w-4 text-blue-600" />
                          Customer Name
                        </Label>
                        <Input
                          value={sale.customerName}
                          onChange={(e) => updateBulkSale(index, 'customerName', e.target.value)}
                          className="h-12 text-base border-2"
                          placeholder="Enter customer name"
                        />
                      </div>
                      <div className="space-y-3 col-span-2">
                        <Label className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Phone className="h-4 w-4 text-purple-600" />
                          Customer Contact (Optional)
                        </Label>
                        <Input
                          value={sale.customerContact || ''}
                          onChange={(e) => updateBulkSale(index, 'customerContact', e.target.value)}
                          className="h-12 text-base border-2"
                          placeholder="Phone number or email"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {bulkSales.length === 0 && (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                  <ShoppingCart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    Click "Add Sale" to start recording bulk sales
                  </p>
                </div>
              )}

              {bulkSales.length > 0 && (
                <div className="pt-6 border-t-2 border-slate-200 dark:border-slate-700">
                  <Button
                    onClick={onBulkSubmit}
                    disabled={bulkMutation.isPending}
                    className="w-full h-14 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
                  >
                    {bulkMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Recording {bulkSales.length} Sale(s)...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Record {bulkSales.length} Sale(s)
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
