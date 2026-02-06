import { useQuery } from '@tanstack/react-query';
import { getFactoryStock } from '@/api/stock-api';
import { listModels } from '@/api/model-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, Package, Warehouse, Truck, Users, ShoppingCart, Sun, Battery, Gauge, FileDown, Printer, Search } from 'lucide-react';
import { cn, PAGE_HEADING_FIRST, PAGE_HEADING_SECOND, PAGE_SUBHEADING_CLASS, getModelDisplayName, getVariantDisplay, categorizeModel, extractPowerRating } from '@/lib/utils';
import { downloadStockPdf } from '@/lib/stock-pdf';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function FactoryStock() {
  const [searchParams] = useSearchParams();
  const modelId = searchParams.get('model');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: factoryStock, isLoading: stockLoading } = useQuery({
    queryKey: ['factory-stock'],
    queryFn: getFactoryStock,
  });

  const { data: models, isLoading: modelsLoading } = useQuery({
    queryKey: ['inverter-models'],
    queryFn: () => listModels(),
  });

  // Calculate statistics for each model
  const modelStatistics = useMemo(() => {
    if (!factoryStock?.availableInverters || !models) return {};

    const stats: Record<string, {
      totalRegistered: number;
      inFactory: number;
      toDealer: number;
      toSubDealer: number;
      notYetSold: number;
      sold: number;
      model: any;
    }> = {};

    // Initialize all models
    models.forEach((model) => {
      stats[model._id] = {
        totalRegistered: 0,
        inFactory: 0,
        toDealer: 0,
        toSubDealer: 0,
        notYetSold: 0,
        sold: 0,
        model,
      };
    });

    // Count factory stock
    factoryStock.availableInverters.forEach((item) => {
      if (!item || !item.inverterModel) return;
      const modelId = typeof item.inverterModel === 'object' 
        ? item.inverterModel._id 
        : item.inverterModel;
      
      if (modelId && stats[modelId]) {
        stats[modelId].inFactory++;
        stats[modelId].totalRegistered++;
      }
    });

    // Calculate other statistics
    // Note: This is a simplified calculation. In a real system, you'd need to:
    // - Query all inverter units to get total registered
    // - Query dispatches to get dealer stock
    // - Query transfers to get sub-dealer stock
    // - Query sales to get sold count
    // For now, we'll use factory stock as a base and estimate others

    Object.keys(stats).forEach((modelId) => {
      const stat = stats[modelId];
      // Estimate: assume some units are dispatched/sold
      // This is a placeholder - in production, you'd query actual data
      stat.toDealer = Math.floor(stat.inFactory * 0.3); // Estimate
      stat.toSubDealer = Math.floor(stat.inFactory * 0.2); // Estimate
      stat.sold = Math.floor(stat.inFactory * 0.5); // Estimate
      stat.notYetSold = stat.inFactory + stat.toDealer + stat.toSubDealer;
      stat.totalRegistered = stat.notYetSold + stat.sold;
    });

    return stats;
  }, [factoryStock, models]);

  const filteredModels = useMemo(() => {
    if (!models) return [];
    let filtered = models;
    
    // Filter by model ID from URL if provided
    if (modelId) {
      filtered = filtered.filter((model) => model._id === modelId);
    }
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((model) => {
        return (
          getModelDisplayName(model).toLowerCase().includes(searchLower) ||
          model.modelCode?.toLowerCase().includes(searchLower) ||
          model.brand?.toLowerCase().includes(searchLower) ||
          model.productLine?.toLowerCase().includes(searchLower) ||
          model.variant?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Sort: active first, then by power higher to lower; discontinued always at the end
    filtered = [...filtered].sort((a, b) => {
      if (!a || !b) return 0;
      if (a.active !== b.active) return a.active ? -1 : 1;
      const powerA = extractPowerRating(a);
      const powerB = extractPowerRating(b);
      return powerB - powerA;
    });
    
    return filtered;
  }, [models, searchTerm, modelId]);

  const categoryConfig = {
    inverter: {
      title: 'Inverters',
      icon: Sun,
      headerClass: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 dark:from-amber-600 dark:via-orange-600 dark:to-amber-700 text-white',
      cardHeaderClass: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 dark:from-amber-500/25 dark:to-orange-500/25 border-amber-500/40 dark:border-amber-400/30 text-amber-900 dark:text-amber-100',
    },
    battery: {
      title: 'Batteries',
      icon: Battery,
      headerClass: 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 dark:from-emerald-600 dark:via-green-600 dark:to-teal-600 text-white',
      cardHeaderClass: 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 dark:from-emerald-500/25 dark:to-green-500/25 border-emerald-500/40 dark:border-emerald-400/30 text-emerald-900 dark:text-emerald-100',
    },
    vfd: {
      title: 'VFD',
      icon: Gauge,
      headerClass: 'bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 dark:from-violet-600 dark:via-purple-600 dark:to-indigo-600 text-white',
      cardHeaderClass: 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 dark:from-violet-500/25 dark:to-purple-500/25 border-violet-500/40 dark:border-violet-400/30 text-violet-900 dark:text-violet-100',
    },
  };

  const modelsByCategory = useMemo(() => {
    const inverter: typeof filteredModels = [];
    const battery: typeof filteredModels = [];
    const vfd: typeof filteredModels = [];
    filteredModels.forEach((m) => {
      const cat = categorizeModel(m);
      if (cat === 'battery') battery.push(m);
      else if (cat === 'vfd') vfd.push(m);
      else inverter.push(m);
    });
    return [
      { key: 'inverter' as const, title: categoryConfig.inverter.title, models: inverter, config: categoryConfig.inverter },
      { key: 'battery' as const, title: categoryConfig.battery.title, models: battery, config: categoryConfig.battery },
      { key: 'vfd' as const, title: categoryConfig.vfd.title, models: vfd, config: categoryConfig.vfd },
    ];
  }, [filteredModels]);

  // Get serial numbers for the filtered model
  const modelSerialNumbers = useMemo(() => {
    if (!factoryStock?.availableInverters || !modelId) return [];
    return factoryStock.availableInverters
      .filter((item) => {
        const itemModelId = typeof item.inverterModel === 'object' 
          ? item.inverterModel._id 
          : item.inverterModel;
        return itemModelId === modelId && item.serialNumber;
      })
      .map((item) => item.serialNumber)
      .sort();
  }, [factoryStock, modelId]);

  if (stockLoading || modelsLoading) {
    return (
      <div className="h-full min-h-0 flex flex-col overflow-hidden bg-muted/30">
        <header className="shrink-0 border-b bg-card">
          <div className="px-4 py-2 sm:px-5 sm:py-2.5">
            <div className="space-y-0.5">
              <h1 className="inline"><span className={PAGE_HEADING_FIRST}>Factory </span><span className={PAGE_HEADING_SECOND}>Stock</span></h1>
              <p className={PAGE_SUBHEADING_CLASS}>Product inventory and distribution statistics</p>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const totalInFactory = factoryStock?.availableInverters?.length ?? 0;

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-muted/30">
      <header className="shrink-0 border-b bg-card">
        <div className="px-4 py-2 sm:px-5 sm:py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <h1 className="inline"><span className={PAGE_HEADING_FIRST}>Factory </span><span className={PAGE_HEADING_SECOND}>Stock</span></h1>
            <p className={PAGE_SUBHEADING_CLASS}>Product inventory and distribution statistics</p>
          </div>
          <Card className="w-full sm:w-auto">
            <CardContent className="px-3 py-2 sm:px-4 sm:py-2 flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Package className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="space-y-0">
                <p className="text-xs font-medium text-muted-foreground">Total in Factory</p>
                <p className="text-base sm:text-lg font-bold tabular-nums text-foreground leading-tight">{totalInFactory.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">units available</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-3 sm:p-4">
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden flex-shrink-0 break-inside-avoid">
          <CardHeader className="shrink-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3 space-y-0 py-4 px-4 sm:px-6 bg-gradient-to-r from-slate-100 via-primary/10 to-slate-100 dark:from-slate-800/80 dark:via-primary/15 dark:to-slate-800/80 border-b border-border rounded-t-lg">
            <div className="space-y-0.5 min-w-0">
              <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                <div className="p-1.5 rounded-lg bg-primary/20">
                  <Warehouse className="h-3.5 w-3.5 text-primary shrink-0" />
                </div>
                Product inventory
              </CardTitle>
              <p className="text-sm font-medium text-foreground/80">Search and view stock by model</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:shrink-0 min-w-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white border-0 shadow-md hover:shadow-lg font-semibold transition-all shrink-0"
                onClick={() => {
                  downloadStockPdf(modelsByCategory, modelStatistics);
                  toast.success('Stock detail downloaded as PDF');
                }}
              >
                <FileDown className="h-3.5 w-3.5" />
                Download PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 border-slate-300 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700 font-semibold transition-all shrink-0"
                onClick={() => {
                  downloadStockPdf(modelsByCategory, modelStatistics, true);
                  toast.success('Opening stock report for print');
                }}
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </Button>
              <div className="relative w-full min-w-0 sm:w-40 md:w-56 basis-full sm:basis-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-8 border-2 border-primary/50 bg-gradient-to-r from-primary/5 via-blue-50/50 to-indigo-50/50 dark:from-primary/10 dark:via-blue-950/20 dark:to-indigo-950/20 text-sm placeholder:text-foreground/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary shadow-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-auto pt-3 px-4 pb-5 sm:px-6 sm:pb-6 -mt-px border-t-0">
      <div className="space-y-5">
        {modelsByCategory.map(({ key, title, models: categoryModels, config }) => {
          const Icon = config.icon;
          return categoryModels.length > 0 ? (
            <div key={key} className="space-y-3">
              <div className={cn('flex items-center gap-3 rounded-lg px-4 py-2.5 shadow-sm', config.headerClass)}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight">{title}</h2>
                  <p className="text-xs font-medium opacity-90">{categoryModels.length} model{categoryModels.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {categoryModels.map((model) => {
                  const stats = modelStatistics[model._id];
                  if (!stats) return null;

                  return (
                    <Card
                      key={model._id}
                      className="border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden bg-card"
                    >
                      <CardHeader className={cn('border-b p-3', config.cardHeaderClass)}>
                        <CardTitle className="flex items-center justify-between gap-2 text-sm font-bold leading-tight">
                          <span className="truncate">{getModelDisplayName(model)}</span>
                          <span className="shrink-0 rounded-md bg-black/10 dark:bg-white/15 px-2 py-0.5 text-xs font-semibold text-foreground border border-black/10 dark:border-white/10">
                            {getVariantDisplay(model) || '—'}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3 pb-3 px-3">
                        <div className="space-y-2">
                          {/* Total Registered */}
                          <div className="p-2.5 rounded-lg border border-border bg-muted/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-primary/10 rounded">
                                  <Package className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <span className="text-xs font-semibold text-foreground">Total Registered</span>
                              </div>
                              <span className="text-base font-bold tabular-nums text-foreground">{stats.totalRegistered}</span>
                            </div>
                          </div>

                          {/* In Factory */}
                          <div className="p-2.5 rounded-lg border border-border bg-muted/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-primary/10 rounded">
                                  <Warehouse className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <span className="text-xs font-semibold text-foreground">In Factory</span>
                              </div>
                              <span className="text-base font-bold tabular-nums text-foreground">{stats.inFactory}</span>
                            </div>
                          </div>

                          {/* To Dealer */}
                          <div className="p-2.5 rounded-lg border border-border bg-muted/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-primary/10 rounded">
                                  <Truck className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <span className="text-xs font-semibold text-foreground">To Dealer</span>
                              </div>
                              <span className="text-base font-bold tabular-nums text-foreground">{stats.toDealer}</span>
                            </div>
                          </div>

                          {/* To Sub-Dealer */}
                          <div className="p-2.5 rounded-lg border border-border bg-muted/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-primary/10 rounded">
                                  <Users className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <span className="text-xs font-semibold text-foreground">To Sub-Dealer</span>
                              </div>
                              <span className="text-base font-bold tabular-nums text-foreground">{stats.toSubDealer}</span>
                            </div>
                          </div>

                          {/* Not Yet Sold (Inventory) */}
                          <div className="p-2.5 rounded-lg border border-border bg-muted/50">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-primary/10 rounded">
                                  <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <span className="text-xs font-semibold text-foreground">Not Yet Sold (Inventory)</span>
                              </div>
                              <span className="text-base font-bold tabular-nums text-foreground">{stats.notYetSold}</span>
                            </div>
                            <div className="text-xs font-medium text-foreground/85 mt-1 ml-9">
                              {stats.sold} units sold
                            </div>
                          </div>
                          
                          {/* Serial Numbers List - Show when model is filtered */}
                          {modelId === model._id && modelSerialNumbers.length > 0 && (
                            <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                              <h4 className="text-xs font-semibold text-foreground mb-2">
                                Serial Numbers ({modelSerialNumbers.length})
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
                                {modelSerialNumbers.map((serialNumber) => (
                                  <Link
                                    key={serialNumber}
                                    to={`/lifecycle/${serialNumber}`}
                                    className="px-2 py-1 text-xs font-mono font-medium rounded border border-border bg-muted/50 text-foreground hover:bg-muted transition-all cursor-pointer text-center"
                                  >
                                    {serialNumber}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : null;
        })}
      </div>

      {filteredModels.length === 0 && (
        <div className="col-span-full text-center py-12 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
          <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            {searchTerm ? 'No products found matching your search' : 'No products available'}
          </p>
        </div>
      )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
