import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listParts, createPart, updatePart, deletePart, type Part, type PartInverterModel } from '@/api/parts-api';
import { listModels, type InverterModel } from '@/api/model-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Package, Hash, Loader2, CheckCircle2, Trash2, X, Pencil, Boxes, Sun, Battery, Gauge, ChevronLeft, Search } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn, PAGE_HEADING_FIRST,PAGE_HEADING_CLASS, PAGE_HEADING_SECOND, PAGE_SUBHEADING_CLASS, getModelDisplayName, categorizeModel, sortModelsByPowerAndActive, extractPowerRating } from '@/lib/utils';

const CATEGORY_OPTIONS: { key: 'inverter' | 'battery' | 'vfd'; label: string; icon: typeof Sun; activeClass: string }[] = [
  { key: 'inverter', label: 'Inverters', icon: Sun, activeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 hover:from-amber-600 hover:to-orange-600' },
  { key: 'battery', label: 'Batteries', icon: Battery, activeClass: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-emerald-500 hover:from-emerald-600 hover:to-green-600' },
  { key: 'vfd', label: 'VFD', icon: Gauge, activeClass: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white border-violet-500 hover:from-violet-600 hover:to-purple-600' },
];

const partSchema = z.object({
  inverterModel: z.string().min(1, 'Model is required'),
  partCode: z.string().min(1, 'Part code is required'),
  partName: z.string().min(1, 'Part name is required'),
  description: z.string().optional(),
});

type PartFormData = z.infer<typeof partSchema>;

function getModelVariantLabel(model: PartInverterModel | null | undefined): string {
  if (!model) return '—';
  const name = getModelDisplayName(model);
  const variant = (model as PartInverterModel).variant;
  return variant ? `${name} (${variant})` : name;
}

type DrillView = 'categories' | 'models' | 'parts';

export default function CreateParts() {
  const [selectedCategory, setSelectedCategory] = useState<'inverter' | 'battery' | 'vfd' | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [drillView, setDrillView] = useState<DrillView>('categories');
  const [drillCategory, setDrillCategory] = useState<'inverter' | 'battery' | 'vfd' | null>(null);
  const [drillModelId, setDrillModelId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: () => listParts(),
  });

  const { data: models = [] } = useQuery({
    queryKey: ['inverter-models'],
    queryFn: () => listModels(),
  });

  const categorizedModels = useMemo(() => {
    const inverter: InverterModel[] = [];
    const battery: InverterModel[] = [];
    const vfd: InverterModel[] = [];
    models.forEach((m) => {
      const cat = categorizeModel(m);
      if (cat === 'battery') battery.push(m);
      else if (cat === 'vfd') vfd.push(m);
      else inverter.push(m);
    });
    return {
      inverter: sortModelsByPowerAndActive(inverter, extractPowerRating),
      battery: sortModelsByPowerAndActive(battery, extractPowerRating),
      vfd: sortModelsByPowerAndActive(vfd, extractPowerRating),
    };
  }, [models]);

  const modelsInCategory = selectedCategory ? categorizedModels[selectedCategory] : [];

  /** Parts count per model ID (for display when form is hidden). */
  const partsCountByModelId = useMemo(() => {
    const map: Record<string, number> = {};
    parts.forEach((p) => {
      const id = typeof p.inverterModel === 'object' && p.inverterModel && '_id' in p.inverterModel
        ? (p.inverterModel as PartInverterModel)._id
        : (p.inverterModel as string) || '';
      if (id) {
        map[id] = (map[id] ?? 0) + 1;
      }
    });
    return map;
  }, [parts]);

  const partsInCategory = useMemo(() => {
    if (!selectedCategory) return [];
    return parts.filter((p) => {
      const model = typeof p.inverterModel === 'object' ? p.inverterModel : null;
      return model && categorizeModel(model) === selectedCategory;
    });
  }, [parts, selectedCategory]);

  /** Parts count per category (for drill-down category cards). */
  const partsCountByCategory = useMemo(() => {
    const out = { inverter: 0, battery: 0, vfd: 0 } as const;
    CATEGORY_OPTIONS.forEach(({ key }) => {
      categorizedModels[key].forEach((m) => {
        out[key] += partsCountByModelId[m._id] ?? 0;
      });
    });
    return out;
  }, [categorizedModels, partsCountByModelId]);

  /** Parts for the selected model in drill-down (complete details view). */
  const partsForDrillModel = useMemo(() => {
    if (!drillModelId) return [];
    return parts.filter((p) => {
      const id = typeof p.inverterModel === 'object' && p.inverterModel && '_id' in p.inverterModel
        ? (p.inverterModel as PartInverterModel)._id
        : (p.inverterModel as string) || '';
      return id === drillModelId;
    });
  }, [parts, drillModelId]);

  const drillModel = useMemo(() => {
    if (!drillModelId) return null;
    return models.find((m) => m._id === drillModelId) ?? null;
  }, [models, drillModelId]);

  const q = searchQuery.trim().toLowerCase();

  /** Global search: parts matching query (part code, name, description, model name). Used on categories view. */
  const searchResultsParts = useMemo(() => {
    if (!q) return [];
    return parts.filter((p) => {
      const code = (p.partCode ?? '').toLowerCase();
      const name = (p.partName ?? '').toLowerCase();
      const desc = (p.description ?? '').toLowerCase();
      const modelLabel = getModelVariantLabel(typeof p.inverterModel === 'object' ? p.inverterModel : null).toLowerCase();
      return code.includes(q) || name.includes(q) || desc.includes(q) || modelLabel.includes(q);
    });
  }, [parts, q]);

  /** Filter models in drill models view by search. */
  const filteredDrillModels = useMemo(() => {
    if (!drillCategory) return [];
    const list = categorizedModels[drillCategory];
    if (!q) return list;
    return list.filter((m) => getModelVariantLabel(m).toLowerCase().includes(q));
  }, [drillCategory, categorizedModels, q]);

  /** Filter parts in drill parts view by search. */
  const filteredPartsForDrillModel = useMemo(() => {
    if (!q) return partsForDrillModel;
    return partsForDrillModel.filter((p) => {
      const code = (p.partCode ?? '').toLowerCase();
      const name = (p.partName ?? '').toLowerCase();
      const desc = (p.description ?? '').toLowerCase();
      return code.includes(q) || name.includes(q) || desc.includes(q);
    });
  }, [partsForDrillModel, q]);

  const form = useForm<PartFormData>({
    resolver: zodResolver(partSchema),
    defaultValues: { inverterModel: '', partCode: '', partName: '', description: '' },
  });
  const { register, handleSubmit, control, formState: { errors }, reset, setValue } = form;

  const createMutation = useMutation({
    mutationFn: createPart,
    onSuccess: () => {
      toast.success('Part created successfully');
      reset();
      setShowCreateForm(false);
      setEditingPart(null);
      queryClient.invalidateQueries({ queryKey: ['parts'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create part');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { partCode: string; partName: string; description?: string } }) => updatePart(id, data),
    onSuccess: () => {
      toast.success('Part updated successfully');
      reset();
      setEditingPart(null);
      queryClient.invalidateQueries({ queryKey: ['parts'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to update part');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePart,
    onSuccess: () => {
      toast.success('Part deleted');
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['parts'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to delete part');
    },
  });

  const onSubmit = (data: PartFormData) => {
    if (editingPart) {
      updateMutation.mutate({
        id: editingPart._id,
        data: { partCode: data.partCode, partName: data.partName, description: data.description },
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const startEdit = (part: Part) => {
    setEditingPart(part);
    setShowCreateForm(true);
    const modelObj = typeof part.inverterModel === 'object' ? part.inverterModel : null;
    if (modelObj) {
      const cat = categorizeModel(modelObj);
      setSelectedCategory(cat);
    }
    const modelId = modelObj ? (modelObj as PartInverterModel)._id : (part.inverterModel || '');
    setValue('inverterModel', modelId);
    setValue('partCode', part.partCode);
    setValue('partName', part.partName);
    setValue('description', part.description ?? '');
  };

  const cancelForm = () => {
    setShowCreateForm(false);
    setEditingPart(null);
    reset({ inverterModel: '', partCode: '', partName: '', description: '' });
  };

  return (
    <div className="h-full min-h-0 max-h-full flex flex-col overflow-hidden bg-muted/30">
      <header className="shrink-0 border-b bg-card">
        <div className="px-4 py-2 sm:px-5 sm:py-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <h1 className="inline text-xl sm:text-2xl"><span className={PAGE_HEADING_FIRST}>Create </span><span className={PAGE_HEADING_CLASS}>Parts</span></h1>
              <p className={PAGE_SUBHEADING_CLASS}>Create and manage parts catalog for dispatch</p>
            </div>
            <Button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                if (!showCreateForm) {
                  reset();
                  setEditingPart(null);
                  setSelectedCategory(null);
                  setDrillView('categories');
                  setDrillCategory(null);
                  setDrillModelId(null);
                  setSearchQuery('');
                } else {
                  setDrillView('categories');
                  setDrillCategory(null);
                  setDrillModelId(null);
                  setSearchQuery('');
                }
              }}
              size="default"
              className="w-full sm:w-auto"
            >
              {showCreateForm ? (
                <>
                  <X className="h-3.5 w-3.5 mr-2" />
                  Hide Form
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 mr-2" />
                  Create Part
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          'flex-1 min-h-0 min-w-0 flex flex-col p-3 sm:p-4',
          showCreateForm ? 'overflow-hidden' : 'overflow-auto space-y-4 sm:space-y-5'
        )}
      >
        {showCreateForm && (
          <Card className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
            <CardContent className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 max-w-xl">
                <div className="space-y-3">
                  <Label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Product category</Label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_OPTIONS.map(({ key, label, icon: Icon, activeClass }) => (
                      <Button
                        key={key}
                        type="button"
                        variant={selectedCategory === key ? 'default' : 'outline'}
                        size="sm"
                        className={cn('capitalize gap-1.5', selectedCategory === key && activeClass)}
                        onClick={() => {
                          setSelectedCategory(key);
                          if (!editingPart) setValue('inverterModel', '');
                        }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Boxes className="h-3.5 w-3.5 text-muted-foreground" />
                    Model &amp; Variant
                  </Label>
                  <Controller
                    name="inverterModel"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!!editingPart || !selectedCategory}
                      >
                        <SelectTrigger className="h-11 border-2 border-slate-300 dark:border-slate-600">
                          <SelectValue placeholder={selectedCategory ? 'Select product model' : 'Select category first'} />
                        </SelectTrigger>
                        <SelectContent>
                          {modelsInCategory.map((m) => (
                            <SelectItem key={m._id} value={m._id}>
                              {getModelVariantLabel(m)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.inverterModel && (
                    <p className="text-xs text-destructive">{errors.inverterModel.message}</p>
                  )}
                  {!selectedCategory && (
                    <p className="text-xs text-muted-foreground">Select a category above to see models.</p>
                  )}
                  {editingPart && (
                    <p className="text-xs text-muted-foreground">Model cannot be changed when editing.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partCode" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    Part Code
                  </Label>
                  <Input
                    id="partCode"
                    {...register('partCode')}
                    className="h-11 border-2 border-slate-300 dark:border-slate-600 max-w-sm"
                    placeholder="e.g. MB-4KW-V2"
                    disabled={!!editingPart}
                  />
                  {errors.partCode && (
                    <p className="text-xs text-destructive">{errors.partCode.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partName" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    Part Name
                  </Label>
                  <Input
                    id="partName"
                    {...register('partName')}
                    className="h-11 border-2 border-slate-300 dark:border-slate-600 max-w-sm"
                    placeholder="e.g. Main Control Board"
                  />
                  {errors.partName && (
                    <p className="text-xs text-destructive">{errors.partName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Description (optional)
                  </Label>
                  <Input
                    id="description"
                    {...register('description')}
                    className="h-11 border-2 border-slate-300 dark:border-slate-600 max-w-sm"
                    placeholder="Brief description"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="h-11"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                    )}
                    {editingPart ? 'Update Part' : 'Create Part'}
                  </Button>
                  {editingPart && (
                    <Button type="button" variant="outline" onClick={cancelForm}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {!showCreateForm && (
          isLoading ? (
            <Card>
              <CardContent className="py-16 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : (
            <Card className="max-w-3xl overflow-hidden shadow-sm border-border/80">
              {/* Breadcrumb / back when drilling down */}
              {(drillView === 'models' || drillView === 'parts') && (
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      if (drillView === 'parts') {
                        setDrillView('models');
                        setDrillModelId(null);
                      } else {
                        setDrillView('categories');
                        setDrillCategory(null);
                      }
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  {drillView === 'parts' && drillCategory && (
                    <>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-sm font-medium text-foreground">
                        {drillModel ? getModelVariantLabel(drillModel) : 'Model'}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Search: show on all views when form is hidden */}
              <div className="px-4 py-2 border-b border-border/60 bg-muted/20">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={
                      drillView === 'categories' ? 'Search all parts by code, name, description or model...' :
                      drillView === 'models' ? 'Filter models...' :
                      'Filter parts in this model...'
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-background"
                  />
                </div>
              </div>

              {drillView === 'categories' && (
                <>
                  <CardHeader className="pb-3 pt-5 sm:pt-6 px-5 sm:px-6 border-b bg-muted/40">
                    <CardTitle className="text-base font-semibold tracking-tight text-foreground">Parts count by category</CardTitle>
                    <CardDescription className="text-sm mt-0.5">Select a category to see models and part counts, or search above.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5">
                    {q && searchResultsParts.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">
                          Search results ({searchResultsParts.length})
                        </p>
                        <div className="rounded-lg border border-border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent border-b border-border bg-muted/50">
                                <TableHead className="h-9 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Part Code</TableHead>
                                <TableHead className="h-9 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Part Name</TableHead>
                                <TableHead className="h-9 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Model</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {searchResultsParts.map((part) => {
                                const modelObj = typeof part.inverterModel === 'object' ? part.inverterModel : null;
                                const modelId = modelObj && '_id' in modelObj ? (modelObj as PartInverterModel)._id : (part.inverterModel as string) || '';
                                const cat = modelObj ? categorizeModel(modelObj) : null;
                                return (
                                  <TableRow
                                    key={part._id}
                                    role="button"
                                    tabIndex={0}
                                    className="cursor-pointer hover:bg-muted/30"
                                    onClick={() => {
                                      if (cat) setDrillCategory(cat);
                                      setDrillModelId(modelId || null);
                                      setDrillView('parts');
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && cat && (setDrillCategory(cat), setDrillModelId(modelId || null), setDrillView('parts'))}
                                  >
                                    <TableCell className="py-2.5 font-mono text-sm">{part.partCode}</TableCell>
                                    <TableCell className="py-2.5 text-sm font-medium">{part.partName}</TableCell>
                                    <TableCell className="py-2.5 text-sm text-muted-foreground">{getModelVariantLabel(modelObj)}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : q && searchResultsParts.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">No parts match your search.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {CATEGORY_OPTIONS.map(({ key, label, icon: Icon }) => {
                          const count = partsCountByCategory[key];
                          return (
                            <Card
                              key={key}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setDrillCategory(key);
                                setDrillView('models');
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && (setDrillCategory(key), setDrillView('models'))}
                              className={cn(
                                'cursor-pointer transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                key === 'inverter' && 'border-l-4 border-l-amber-500 hover:border-amber-600',
                                key === 'battery' && 'border-l-4 border-l-emerald-500 hover:border-emerald-600',
                                key === 'vfd' && 'border-l-4 border-l-violet-500 hover:border-violet-600'
                              )}
                            >
                              <CardContent className="flex items-center gap-4 p-4">
                                <div className={cn(
                                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
                                  key === 'inverter' && 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
                                  key === 'battery' && 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
                                  key === 'vfd' && 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
                                )}>
                                  <Icon className="h-6 w-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-foreground">{label}</p>
                                  <p className="text-sm text-muted-foreground tabular-nums">{count} part{count !== 1 ? 's' : ''}</p>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </>
              )}

              {drillView === 'models' && drillCategory && (
                <>
                  <CardHeader className="pb-3 pt-5 sm:pt-6 px-5 sm:px-6 border-b bg-muted/40">
                    <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                      {CATEGORY_OPTIONS.find((c) => c.key === drillCategory)?.label} — models
                    </CardTitle>
                    <CardDescription className="text-sm mt-0.5">Click a model to see all parts, or filter with search above.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex flex-col min-h-0">
                    {filteredDrillModels.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 px-4 text-center">
                        {q ? 'No models match your search.' : 'No models in this category.'}
                      </p>
                    ) : (
                    <div className="rounded-lg border border-border/70 overflow-hidden bg-card/90 max-h-[min(60vh,28rem)] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b border-border bg-muted/50">
                            <TableHead className="h-9 pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Model / Variant</TableHead>
                            <TableHead className="h-9 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right w-28 pr-4">Parts</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDrillModels.map((m) => {
                            const count = partsCountByModelId[m._id] ?? 0;
                            return (
                              <TableRow
                                key={m._id}
                                role="button"
                                tabIndex={0}
                                className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                                onClick={() => {
                                  setDrillModelId(m._id);
                                  setDrillView('parts');
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && (setDrillModelId(m._id), setDrillView('parts'))}
                              >
                                <TableCell className="py-2.5 pl-4 text-sm text-foreground font-medium">
                                  {getModelVariantLabel(m)}
                                </TableCell>
                                <TableCell className="py-2.5 text-right pr-4">
                                  <span
                                    className={cn(
                                      'inline-flex items-center justify-center min-w-[2.5rem] rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums',
                                      count > 0 ? 'bg-primary/20 text-primary dark:bg-primary/30' : 'bg-muted/80 text-muted-foreground'
                                    )}
                                  >
                                    {count}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    )}
                  </CardContent>
                </>
              )}

              {drillView === 'parts' && drillModelId && drillModel && (
                <>
                  <CardHeader className="pb-3 pt-5 sm:pt-6 px-5 sm:px-6 border-b bg-muted/40">
                    <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                      Parts for {getModelVariantLabel(drillModel)}
                    </CardTitle>
                    <CardDescription className="text-sm mt-0.5">
                      {filteredPartsForDrillModel.length} part{filteredPartsForDrillModel.length !== 1 ? 's' : ''} {q ? '(filtered)' : ''} — full details below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {filteredPartsForDrillModel.length === 0 ? (
                      <div className="py-12 px-6 text-center text-muted-foreground">
                        <Package className="h-10 w-10 mx-auto mb-3 opacity-60" />
                        <p className="font-medium text-foreground">
                          {q ? 'No parts match your search.' : 'No parts for this model yet'}
                        </p>
                        <p className="text-sm mt-1">
                          {q ? 'Clear the search or try another term.' : 'Click Create Part to add a part for this model.'}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border/70 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent border-b border-border bg-muted/50">
                              <TableHead className="h-9 pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Part Code</TableHead>
                              <TableHead className="h-9 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Part Name</TableHead>
                              <TableHead className="h-9 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</TableHead>
                              <TableHead className="h-9 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right pr-4">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPartsForDrillModel.map((part) => (
                              <TableRow key={part._id} className="border-b border-border/50 last:border-0">
                                <TableCell className="py-3 pl-4 font-mono text-sm">{part.partCode}</TableCell>
                                <TableCell className="py-3 text-sm font-medium">{part.partName}</TableCell>
                                <TableCell className="py-3 text-sm text-muted-foreground">{part.description || '—'}</TableCell>
                                <TableCell className="py-3 text-right pr-4">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEdit(part)}
                                    className="text-muted-foreground hover:text-foreground h-8 w-8 p-0 mr-1"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingId(part._id)}
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </>
              )}
            </Card>
          )
        )}
      </div>

      {deletingId && (
        <ConfirmDialog
          title="Delete Part"
          message="Are you sure you want to delete this part? This cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => {
            if (deletingId) deleteMutation.mutate(deletingId);
          }}
          onCancel={() => setDeletingId(null)}
          variant="danger"
        />
      )}
    </div>
  );
}
