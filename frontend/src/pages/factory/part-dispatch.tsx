import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPartDispatch, DispatchedItem } from '@/api/part-dispatch-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2, Scan, Upload, Package, Building2, FileText, Hash, Loader2, CheckCircle2, Box } from 'lucide-react';
import { PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from '@/lib/utils';

const dispatchSchema = z.object({
  serviceCenter: z.string().min(1, 'Service center is required'),
  remarks: z.string().optional(),
});

type DispatchFormData = z.infer<typeof dispatchSchema>;

export default function PartDispatch() {
  const [dispatchedItems, setDispatchedItems] = useState<DispatchedItem[]>([]);
  const [currentItem, setCurrentItem] = useState<DispatchedItem>({
    partCode: '',
    partName: '',
    quantity: 1,
  });
  const [scannerMode, setScannerMode] = useState(false);
  const queryClient = useQueryClient();
  const partCodeRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DispatchFormData>({
    resolver: zodResolver(dispatchSchema),
  });

  // Auto-focus scanner input when scanner mode is enabled
  useEffect(() => {
    if (scannerMode && partCodeRef.current) {
      partCodeRef.current.focus();
    }
  }, [scannerMode]);

  // Handle scanner input - auto-add part on Enter
  const handleScannerInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scannerMode) {
      e.preventDefault();
      if (currentItem.partCode.trim()) {
        // Auto-add part if part code is scanned
        if (!currentItem.partName.trim()) {
          // If part name is empty, use part code as name
          setCurrentItem({ ...currentItem, partName: currentItem.partCode });
        }
        addItem();
        // Clear and refocus for next scan
        setCurrentItem({ partCode: '', partName: '', quantity: 1 });
        setTimeout(() => {
          partCodeRef.current?.focus();
        }, 100);
      }
    }
  };

  // Handle Excel/CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Parse CSV/Excel
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const items: DispatchedItem[] = [];

      lines.forEach((line, index) => {
        // Skip header row
        if (index === 0 && (
          line.toLowerCase().includes('part') ||
          line.toLowerCase().includes('code') ||
          line.toLowerCase().includes('name') ||
          line.toLowerCase().includes('quantity')
        )) {
          return;
        }
        
        const parts = line.split(',').map(p => p.trim());
        const partCode = parts[0] || '';
        const partName = parts[1] || partCode;
        const quantity = parseInt(parts[2] || '1', 10) || 1;

        if (partCode && partCode.length > 0) {
          items.push({ partCode, partName, quantity });
        }
      });

      if (items.length === 0) {
        toast.error('No parts found in file');
        return;
      }

      // Add items to dispatch list
      setDispatchedItems([...dispatchedItems, ...items]);
      toast.success(`Added ${items.length} parts from file`);
    };

    reader.onerror = () => {
      toast.error('Failed to read file');
    };

    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const mutation = useMutation({
    mutationFn: createPartDispatch,
    onSuccess: () => {
      toast.success('Part dispatch created successfully');
      reset();
      setDispatchedItems([]);
      setCurrentItem({ partCode: '', partName: '', quantity: 1 });
      queryClient.invalidateQueries({ queryKey: ['service-center-stock'] });
      queryClient.invalidateQueries({ queryKey: ['part-dispatches'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create part dispatch');
    },
  });

  const addItem = () => {
    if (!currentItem.partCode || !currentItem.partName || currentItem.quantity <= 0) {
      toast.error('Please fill in all part details');
      return;
    }

    setDispatchedItems([...dispatchedItems, { ...currentItem }]);
    setCurrentItem({ partCode: '', partName: '', quantity: 1 });
    if (scannerMode && partCodeRef.current) {
      partCodeRef.current.focus();
    }
  };

  const removeItem = (index: number) => {
    setDispatchedItems(dispatchedItems.filter((_, i) => i !== index));
  };

  const onSubmit = (data: DispatchFormData) => {
    if (dispatchedItems.length === 0) {
      toast.error('Please add at least one part to dispatch');
      return;
    }

    mutation.mutate({
      serviceCenter: data.serviceCenter,
      dispatchedItems,
      remarks: data.remarks,
    });
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-muted/30">
      <header className="shrink-0 border-b bg-card">
        <div className="px-4 py-2 sm:px-5 sm:py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <h1 className={PAGE_HEADING_CLASS}>Service Center Parts Dispatch</h1>
            <p className={PAGE_SUBHEADING_CLASS}>Dispatch parts from factory to service center</p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col overflow-auto p-3 sm:p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 max-w-6xl">
        <Card className="flex flex-col overflow-hidden break-inside-avoid">
          <CardHeader className="shrink-0 flex flex-row items-start justify-between gap-3 space-y-0 pb-4 pt-5 px-4 sm:px-6 bg-gradient-to-r from-teal-50 via-cyan-50/80 to-slate-50 dark:from-teal-950/40 dark:via-cyan-950/30 dark:to-slate-900/50 border-b border-border">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                <div className="p-1.5 rounded-lg bg-teal-500/20">
                  <Box className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0" />
                </div>
                Dispatch Information
              </CardTitle>
              <CardDescription className="text-sm">Enter service center and parts to dispatch</CardDescription>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                type="button"
                variant={scannerMode ? 'default' : 'outline'}
                size="sm"
                className={scannerMode ? "border-emerald-500/60 text-white bg-emerald-600 hover:bg-emerald-700" : "border-emerald-500/60 text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20"}
                onClick={() => {
                  setScannerMode(!scannerMode);
                  if (!scannerMode) setTimeout(() => partCodeRef.current?.focus(), 100);
                }}
              >
                <Scan className="h-4 w-4 mr-2" />
                {scannerMode ? 'Scanner ON' : 'Scanner'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Excel/CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-5 sm:px-6 sm:pb-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="serviceCenter" className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  Service Center
                </Label>
                <Input id="serviceCenter" {...register('serviceCenter')} className="h-11" placeholder="Enter service center name" />
                {errors.serviceCenter && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                    <span>⚠</span>
                    {errors.serviceCenter.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks" className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  Remarks (Optional)
                </Label>
                <Input id="remarks" {...register('remarks')} className="h-11" placeholder="Any additional notes" />
              </div>

              <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-500" />
                  Parts to Dispatch: <span className="text-primary font-bold">{dispatchedItems.length}</span>
                </Label>
                {dispatchedItems.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">No parts added yet. Use the form on the right to add parts.</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button 
                  type="submit" 
                  disabled={mutation.isPending || dispatchedItems.length === 0}
                  className="w-full h-11 text-base"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Create Dispatch ({dispatchedItems.length} part{dispatchedItems.length !== 1 ? 's' : ''})
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="flex flex-col overflow-hidden break-inside-avoid">
          <CardHeader className="shrink-0 pb-4 pt-5 px-4 sm:px-6 bg-gradient-to-r from-slate-50 to-cyan-50/50 dark:from-slate-800/50 dark:to-cyan-950/30 border-b border-border">
            <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <div className="p-1.5 rounded-lg bg-cyan-500/20">
                <Box className="h-5 w-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              </div>
              Add Parts (Bulk Operations)
            </CardTitle>
            <CardDescription className="text-sm">Use scanner or upload file to add parts to the dispatch list</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {scannerMode && (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
                  <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Scan className="h-4 w-4 text-green-600" />
                    Scanner Mode Active
                  </Label>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>💡</span>
                    Scan part code and press Enter to auto-add. Quantity defaults to 1.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="partCode" className="text-sm font-semibold flex items-center gap-2">
                  <Hash className="h-4 w-4 text-slate-500" />
                  Part Code
                </Label>
                <Input
                  ref={partCodeRef}
                  id="partCode"
                  value={currentItem.partCode}
                  onChange={(e) => setCurrentItem({ ...currentItem, partCode: e.target.value })}
                  onKeyDown={handleScannerInput}
                  placeholder={scannerMode ? "Scan part code and press Enter" : "Enter part code"}
                  autoFocus={scannerMode}
                  className={`h-11 ${scannerMode ? 'border-green-500 focus:ring-green-500' : ''}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="partName" className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-500" />
                  Part Name
                </Label>
                <Input
                  id="partName"
                  value={currentItem.partName}
                  onChange={(e) => setCurrentItem({ ...currentItem, partName: e.target.value })}
                  placeholder="Enter part name (optional, will use part code if empty)"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-500" />
                  Quantity
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={currentItem.quantity}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })
                  }
                  className="h-11"
                />
              </div>

              <Button 
                type="button" 
                onClick={addItem} 
                className="w-full h-11"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Part to Dispatch List
              </Button>

              <div className="p-3 bg-muted/50 border border-border rounded-lg">
                <p className="text-xs text-muted-foreground flex items-start gap-2">
                  <span>💡</span>
                  <span>
                    <strong>Bulk Upload:</strong> Upload Excel/CSV file with columns: Part Code, Part Name, Quantity. 
                    Use the Upload button in the header to add multiple parts at once.
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {dispatchedItems.length > 0 && (
        <Card className="border border-border">
          <CardHeader className="border-b border-border bg-gradient-to-r from-amber-50 to-orange-50/80 dark:from-amber-950/30 dark:to-orange-950/20">
            <CardTitle className="flex items-center gap-3 text-foreground">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xl font-bold">Parts to Dispatch ({dispatchedItems.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800">
                    <TableHead className="font-semibold">Part Code</TableHead>
                    <TableHead className="font-semibold">Part Name</TableHead>
                    <TableHead className="font-semibold">Quantity</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispatchedItems.map((item, index) => (
                    <TableRow key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell className="font-medium font-mono">{item.partCode}</TableCell>
                      <TableCell>{item.partName}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-muted text-foreground rounded-md font-semibold">
                          {item.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Total Parts: <span className="text-primary">{dispatchedItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
