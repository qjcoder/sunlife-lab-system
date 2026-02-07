import { useState, useRef, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPartDispatch, DispatchedItem } from '@/api/part-dispatch-api';
import { listServiceCenters } from '@/api/service-center-api';
import { listParts, Part } from '@/api/parts-api';
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
import * as XLSX from 'xlsx';
import { Plus, Trash2, Scan, Upload, Hash, Loader2, CheckCircle2, Box } from 'lucide-react';
import { cn, PAGE_HEADING_FIRST, PAGE_HEADING_SECOND, getModelDisplayName, getVariantDisplay } from '@/lib/utils';

const dispatchSchema = z.object({
  serviceCenter: z.string().min(1, 'Service center is required'),
  remarks: z.string().optional(),
});

type DispatchFormData = z.infer<typeof dispatchSchema>;

/** Parse one line to DispatchedItem: "code,name,qty" or "code,name" or "code" (tab or comma). */
function parsePartLine(line: string): DispatchedItem | null {
  const parts = line.split(/[\t,]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const partCode = parts[0];
  const partName = parts[1] ?? partCode;
  const quantity = Math.max(1, parseInt(parts[2] ?? '1', 10) || 1);
  return { partCode, partName, quantity };
}

/** Get "Model Variant" display string for a part from catalog (by partCode). */
function getPartModelVariantDisplay(catalogParts: Part[], partCode: string): string {
  const part = catalogParts.find(
    (p) => p.partCode?.trim().toLowerCase() === String(partCode || '').trim().toLowerCase()
  );
  if (!part?.inverterModel || typeof part.inverterModel !== 'object') return '—';
  const model = part.inverterModel as Part['inverterModel'] & { brand?: string; productLine?: string; variant?: string; modelCode?: string };
  const name = getModelDisplayName(model);
  const variant = getVariantDisplay(model);
  return [name, variant].filter(Boolean).join(' ') || '—';
}

/** Enrich dispatched items with modelName and variant from catalog. */
function enrichItemsWithModelVariant(
  items: DispatchedItem[],
  catalogParts: Part[]
): DispatchedItem[] {
  return items.map((item) => {
    const part = catalogParts.find(
      (p) => p.partCode?.trim().toLowerCase() === String(item.partCode || '').trim().toLowerCase()
    );
    if (!part?.inverterModel || typeof part.inverterModel !== 'object')
      return { ...item, modelName: item.modelName, variant: item.variant };
    const model = part.inverterModel as Part['inverterModel'] & { brand?: string; productLine?: string; variant?: string; modelCode?: string };
    return {
      ...item,
      modelName: getModelDisplayName(model),
      variant: getVariantDisplay(model) || undefined,
    };
  });
}

export default function PartDispatch() {
  const [dispatchMode, setDispatchMode] = useState<'single' | 'bulk'>('single');
  const [dispatchedItems, setDispatchedItems] = useState<DispatchedItem[]>([]);
  const [currentItem, setCurrentItem] = useState<DispatchedItem>({
    partCode: '',
    partName: '',
    quantity: 1,
  });
  const [bulkPartsText, setBulkPartsText] = useState('');
  const [scannerMode, setScannerMode] = useState(false);
  const [bulkScannerMode, setBulkScannerMode] = useState(false);
  const queryClient = useQueryClient();
  const partCodeRef = useRef<HTMLInputElement>(null);
  const bulkPartsRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bulkPartsFromText = useMemo(() => {
    return bulkPartsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parsePartLine)
      .filter((item): item is DispatchedItem => item !== null);
  }, [bulkPartsText]);

  const { data: serviceCenters = [] } = useQuery({
    queryKey: ['service-centers'],
    queryFn: listServiceCenters,
  });

  const { data: catalogParts = [] } = useQuery({
    queryKey: ['parts'],
    queryFn: () => listParts(),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<DispatchFormData>({
    resolver: zodResolver(dispatchSchema),
  });

  const serviceCenterInput = watch('serviceCenter', '');
  const matchedServiceCenter = useMemo(
    () =>
      serviceCenters.find(
        (sc) => sc.name?.trim().toLowerCase() === String(serviceCenterInput || '').trim().toLowerCase()
      ),
    [serviceCenters, serviceCenterInput]
  );

  useEffect(() => {
    if (scannerMode && partCodeRef.current) {
      partCodeRef.current.focus();
    }
  }, [scannerMode]);

  useEffect(() => {
    if (bulkScannerMode && bulkPartsRef.current) {
      bulkPartsRef.current.focus();
    }
  }, [bulkScannerMode]);

  const handlePartCodeBlur = () => {
    const code = currentItem.partCode.trim();
    if (!code || currentItem.partName.trim()) return;
    const match = catalogParts.find((p) => p.partCode.trim().toLowerCase() === code.toLowerCase());
    if (match) {
      setCurrentItem((prev) => ({ ...prev, partName: match.partName }));
    }
  };

  const handlePartNameBlur = () => {
    const name = currentItem.partName.trim();
    if (!name || currentItem.partCode.trim()) return;
    const match = catalogParts.find((p) => p.partName.trim().toLowerCase() === name.toLowerCase());
    if (match) {
      setCurrentItem((prev) => ({ ...prev, partCode: match.partCode }));
    }
  };

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

  const applyParsedItems = (items: DispatchedItem[]) => {
    if (items.length === 0) {
      toast.error('No parts found in file');
      return;
    }
    if (dispatchMode === 'bulk') {
      setBulkPartsText(items.map((i) => `${i.partCode},${i.partName},${i.quantity}`).join('\n'));
      toast.success(`Loaded ${items.length} part(s) from file`);
    } else {
      setDispatchedItems((prev) => [...prev, ...items]);
      toast.success(`Added ${items.length} parts from file`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const ab = event.target?.result as ArrayBuffer;
          if (!ab) return;
          const wb = XLSX.read(ab, { type: 'array' });
          const firstSheetName = wb.SheetNames[0];
          const sheet = wb.Sheets[firstSheetName];
          if (!sheet) {
            toast.error('No sheet found in Excel file');
            return;
          }
          const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][];
          const items: DispatchedItem[] = [];
          const headerLike = /part|code|name|quantity/i;
          rows.forEach((row, index) => {
            const first = row && row[0] != null ? String(row[0]).trim() : '';
            if (!first) return;
            if (index === 0 && headerLike.test(first)) return;
            const partCode = first;
            const partName = (row[1] != null ? String(row[1]).trim() : '') || partCode;
            const quantity = Math.max(1, parseInt(String(row[2] ?? '1'), 10) || 1);
            items.push({ partCode, partName, quantity });
          });
          applyParsedItems(items);
        } catch {
          toast.error('Failed to parse Excel file');
        }
      };
      reader.onerror = () => toast.error('Failed to read file');
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;
        const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
        const items: DispatchedItem[] = [];
        const headerLike = /part|code|name|quantity/i;
        lines.forEach((line, index) => {
          if (index === 0 && headerLike.test(line)) return;
          const item = parsePartLine(line);
          if (item) items.push(item);
        });
        applyParsedItems(items);
      };
      reader.onerror = () => toast.error('Failed to read file');
      reader.readAsText(file);
    }

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
      setBulkPartsText('');
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
    const items = dispatchMode === 'bulk' ? bulkPartsFromText : dispatchedItems;
    if (items.length === 0) {
      toast.error(dispatchMode === 'bulk' ? 'Enter or upload at least one part' : 'Please add at least one part to dispatch');
      return;
    }
    const enrichedItems = enrichItemsWithModelVariant(items, catalogParts);

    mutation.mutate({
      serviceCenter: data.serviceCenter,
      dispatchedItems: enrichedItems,
      remarks: data.remarks,
    });
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-muted/30">
      <header className="shrink-0 border-b bg-card py-2 px-4 sm:px-5">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0">
            <h1 className="inline text-xl sm:text-2xl"><span className={PAGE_HEADING_FIRST}>Service Center Parts </span><span className={PAGE_HEADING_SECOND}>Dispatch</span></h1>
            <p className="text-sm text-muted-foreground">Dispatch parts from factory to service center</p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-3 sm:p-4">
        <div className="shrink-0 flex gap-2 mb-3">
          <Button
            variant={dispatchMode === 'single' ? 'default' : 'outline'}
            size="sm"
            className="font-semibold text-sm"
            onClick={() => setDispatchMode('single')}
          >
            Single Dispatch
          </Button>
          <Button
            variant={dispatchMode === 'bulk' ? 'default' : 'outline'}
            size="sm"
            className="font-semibold text-sm"
            onClick={() => setDispatchMode('bulk')}
          >
            Bulk Dispatch
          </Button>
        </div>

        <div className="max-w-4xl w-full flex-1 min-h-0 flex flex-col min-w-0">
          <Card className="flex flex-col overflow-hidden flex-1 min-h-0 min-w-0">
            <CardHeader
              className={cn(
                'shrink-0 flex flex-row items-start justify-between gap-3 space-y-0 px-4 sm:px-5',
                dispatchMode === 'bulk' ? 'gap-4 pb-4 pt-6 px-6 sm:px-8' : 'py-3'
              )}
            >
              <div className={cn('min-w-0', dispatchMode === 'bulk' ? 'space-y-2' : 'space-y-0.5')}>
                <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                  <Box className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {dispatchMode === 'single' ? 'Single Dispatch' : 'Bulk Dispatch'}
                </CardTitle>
                <CardDescription className={dispatchMode === 'bulk' ? 'text-base' : 'text-sm'}>
                  {dispatchMode === 'single'
                    ? 'Quick single part entry. Use scanner or type part code.'
                    : 'Enter or upload parts, one per line: Part Code, Part Name, Quantity (comma or tab).'}
                </CardDescription>
              </div>
              <div className="flex gap-2 shrink-0">
                {dispatchMode === 'single' ? (
                  <Button
                    type="button"
                    variant={scannerMode ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      !scannerMode &&
                        'border-emerald-500/60 text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500 hover:text-emerald-800'
                    )}
                    onClick={() => {
                      setScannerMode(!scannerMode);
                      if (!scannerMode) setTimeout(() => partCodeRef.current?.focus(), 100);
                    }}
                  >
                    <Scan className="h-3.5 w-3.5 mr-1.5" />
                    {scannerMode ? 'Scanner ON' : 'Enable Scanner'}
                  </Button>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={bulkScannerMode ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        !bulkScannerMode &&
                          'border-emerald-500/60 text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500 hover:text-emerald-800'
                      )}
                      onClick={() => {
                        setBulkScannerMode(!bulkScannerMode);
                        if (!bulkScannerMode) setTimeout(() => bulkPartsRef.current?.focus(), 100);
                      }}
                    >
                      <Scan className="h-3.5 w-3.5 mr-2" />
                      {bulkScannerMode ? 'Scanner ON' : 'Scanner'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-blue-500/60 text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500 hover:text-blue-800"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-3.5 w-3.5 mr-2" />
                      Upload Excel
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </CardHeader>
            <CardContent
              className={cn(
                'flex-1 min-h-0 overflow-hidden flex flex-col',
                dispatchMode === 'bulk' ? 'pt-0 px-6 pb-6 sm:px-8 sm:pb-8' : 'pt-0 px-4 pb-4 sm:px-5 sm:pb-4'
              )}
            >
              <datalist id="part-dispatch-service-center-list">
                {serviceCenters.filter((sc) => sc.name?.trim()).map((sc) => (
                  <option key={sc.id} value={sc.name.trim()} />
                ))}
              </datalist>
              <datalist id="part-dispatch-part-code-list">
                {catalogParts.filter((p) => p.partCode?.trim()).map((p) => (
                  <option key={p._id} value={p.partCode.trim()} />
                ))}
              </datalist>
              <datalist id="part-dispatch-part-name-list">
                {catalogParts.filter((p) => p.partName?.trim()).map((p) => (
                  <option key={p._id} value={p.partName.trim()} />
                ))}
              </datalist>
              <form onSubmit={handleSubmit(onSubmit)} className={cn('flex flex-col h-full min-h-0', dispatchMode === 'bulk' ? 'gap-0' : 'gap-3 sm:gap-4')}>
                {dispatchMode === 'bulk' ? (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,320px),1fr] grid-rows-[1fr] gap-4 lg:gap-6 flex-1 min-h-0 overflow-hidden">
                      <div className="flex flex-col min-h-0 overflow-y-auto space-y-3 lg:space-y-4 px-4 sm:px-6 lg:pl-0 lg:pr-6 lg:border-r lg:border-border">
                        <div className="space-y-1.5">
                          <Label htmlFor="bulk-serviceCenter" className="block text-sm font-semibold text-foreground">
                            Service Center
                          </Label>
                          <Input
                            id="bulk-serviceCenter"
                            {...register('serviceCenter')}
                            list="part-dispatch-service-center-list"
                            className="h-9 text-sm bg-background max-w-sm"
                            placeholder="Enter or select service center name"
                          />
                          {errors.serviceCenter && <p className="text-xs text-destructive mt-0.5">{errors.serviceCenter.message}</p>}
                          {matchedServiceCenter && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {matchedServiceCenter.username && <span>Username: {matchedServiceCenter.username}</span>}
                              {matchedServiceCenter.username && matchedServiceCenter.email && ' · '}
                              {matchedServiceCenter.email && <span>Email: {matchedServiceCenter.email}</span>}
                              {!matchedServiceCenter.username && !matchedServiceCenter.email && 'Service center selected'}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="bulk-remarks" className="block text-sm font-semibold text-foreground">
                            Remarks (Optional)
                          </Label>
                          <Input
                            id="bulk-remarks"
                            {...register('remarks')}
                            className="h-9 text-sm bg-background max-w-sm"
                            placeholder="Any additional notes"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Box className="h-3 w-3 text-muted-foreground shrink-0" />
                            Parts to Dispatch: <span className="tabular-nums font-bold text-foreground">{bulkPartsFromText.length}</span>
                          </Label>
                          {bulkPartsFromText.length === 0 && (
                            <p className="text-xs text-muted-foreground">Paste or upload parts (one per line).</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col min-h-0 overflow-hidden space-y-2 px-4 sm:px-6 lg:pl-4 lg:pr-4">
                        <div className="flex items-center justify-between gap-2 shrink-0">
                          <Label htmlFor="bulkPartsText" className="block text-sm font-semibold text-foreground">
                            Parts list
                          </Label>
                          <span className="text-sm text-muted-foreground tabular-nums shrink-0">
                            {bulkPartsFromText.length} line{bulkPartsFromText.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <textarea
                          ref={bulkPartsRef}
                          id="bulkPartsText"
                          value={bulkPartsText}
                          onChange={(e) => setBulkPartsText(e.target.value)}
                          className={cn(
                            'flex-1 min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y overflow-auto',
                            bulkScannerMode && 'border-primary ring-primary/20'
                          )}
                          placeholder="Part Code, Part Name, Quantity (comma or tab). One per line, or upload Excel/CSV."
                          autoFocus={bulkScannerMode}
                        />
                        <p className="text-xs text-muted-foreground shrink-0">
                          Upload Excel or CSV with columns: Part Code, Part Name, Quantity. Or use scanner.
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 pt-3">
                      <Button
                        type="submit"
                        disabled={mutation.isPending || bulkPartsFromText.length === 0}
                        className="w-full h-11 text-sm"
                      >
                        {mutation.isPending ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                            Dispatching...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                            Dispatch {bulkPartsFromText.length || 0} part{bulkPartsFromText.length !== 1 ? 's' : ''}
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,1fr),1fr] gap-4 lg:gap-6 flex-1 min-h-0 content-start">
                  <div className="space-y-3 lg:pr-5 lg:border-r lg:border-border min-w-0">
                    <div className="space-y-2">
                      <Label htmlFor="serviceCenter" className="block text-sm font-semibold text-foreground">
                        Service Center
                      </Label>
                      <Input
                        id="serviceCenter"
                        {...register('serviceCenter')}
                        list="part-dispatch-service-center-list"
                        className="h-11 text-base border border-border bg-background focus-visible:ring-2 focus-visible:ring-ring max-w-sm"
                        placeholder="Enter or select service center name"
                      />
                      {errors.serviceCenter && (
                        <p className="text-xs text-destructive mt-0.5">{errors.serviceCenter.message}</p>
                      )}
                      {matchedServiceCenter && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {matchedServiceCenter.username && <span>Username: {matchedServiceCenter.username}</span>}
                          {matchedServiceCenter.username && matchedServiceCenter.email && ' · '}
                          {matchedServiceCenter.email && <span>Email: {matchedServiceCenter.email}</span>}
                          {!matchedServiceCenter.username && !matchedServiceCenter.email && 'Service center selected'}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="remarks" className="block text-sm font-semibold text-foreground">
                        Remarks (Optional)
                      </Label>
                      <Input
                        id="remarks"
                        {...register('remarks')}
                        className="h-11 text-base border border-border bg-background max-w-sm"
                        placeholder="Any additional notes"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Box className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        Parts to Dispatch: <span className="tabular-nums font-bold text-foreground">{dispatchedItems.length}</span>
                      </Label>
                      {dispatchedItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No parts added yet. Use the form on the right to add parts.</p>
                      ) : null}
                    </div>

                    <div className="shrink-0 pt-1">
                      <Button
                        type="submit"
                        disabled={mutation.isPending || dispatchedItems.length === 0}
                        className="w-full h-11 text-base font-semibold"
                      >
                        {mutation.isPending ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                            Dispatching...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                            Create Dispatch ({dispatchedItems.length} part{dispatchedItems.length !== 1 ? 's' : ''})
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="partCode" className="block text-sm font-semibold text-foreground">
                      Part Code
                      {scannerMode && (
                        <span className="text-muted-foreground font-normal ml-1">(Enter to submit)</span>
                      )}
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        ref={partCodeRef}
                        id="partCode"
                        list="part-dispatch-part-code-list"
                        value={currentItem.partCode}
                        onChange={(e) => setCurrentItem({ ...currentItem, partCode: e.target.value })}
                        onBlur={handlePartCodeBlur}
                        onKeyDown={handleScannerInput}
                        placeholder={scannerMode ? 'Scan then Enter' : 'Enter part code'}
                        autoFocus={scannerMode}
                        className={cn('pl-9 h-11 text-base', scannerMode && 'border-primary ring-primary/20')}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Scan or type part code and press Enter to add to dispatch.</p>

                    <div className="space-y-2">
                      <Label htmlFor="partName" className="block text-sm font-semibold text-foreground">
                        Part Name
                      </Label>
                      <Input
                        id="partName"
                        list="part-dispatch-part-name-list"
                        value={currentItem.partName}
                        onChange={(e) => setCurrentItem({ ...currentItem, partName: e.target.value })}
                        onBlur={handlePartNameBlur}
                        className="h-11 text-base border border-border bg-background"
                        placeholder="Enter part name (optional, will use part code if empty)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity" className="block text-sm font-semibold text-foreground">
                        Quantity
                      </Label>
                      <Input
                        id="quantity"
                        type="number"
                        min={1}
                        value={currentItem.quantity}
                        onChange={(e) =>
                          setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })
                        }
                        className="h-11 text-base border border-border bg-background"
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={addItem}
                      className="w-full h-11 text-base font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5 mr-2" />
                      Add Part to Dispatch List
                    </Button>

                    <p className="text-xs text-muted-foreground">
                      Add parts one at a time here, or switch to Bulk Dispatch to upload Excel/CSV.
                    </p>
                  </div>
                </div>

                {dispatchedItems.length > 0 && (
                  <div className="shrink-0 rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b border-border">
                          <TableHead className="h-11 bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Part Code</TableHead>
                          <TableHead className="h-11 bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Part Name</TableHead>
                          <TableHead className="h-11 bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Model & variant</TableHead>
                          <TableHead className="h-11 bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantity</TableHead>
                          <TableHead className="h-11 bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dispatchedItems.map((item, index) => (
                          <TableRow key={index} className="border-b border-border/50 last:border-0">
                            <TableCell className="py-3.5 font-mono text-sm text-foreground">{item.partCode}</TableCell>
                            <TableCell className="py-3.5 text-sm text-foreground">{item.partName}</TableCell>
                            <TableCell className="py-3.5 text-sm text-muted-foreground">{getPartModelVariantDisplay(catalogParts, item.partCode)}</TableCell>
                            <TableCell className="py-3.5 text-sm text-foreground">{item.quantity}</TableCell>
                            <TableCell className="py-3.5 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <p className="text-xs text-muted-foreground px-4 py-2 border-t border-border bg-muted/30">
                      Total quantity: {dispatchedItems.reduce((sum, item) => sum + item.quantity, 0)}
                    </p>
                  </div>
                )}
                  </>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
