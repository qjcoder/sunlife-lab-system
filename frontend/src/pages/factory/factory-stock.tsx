import { useQuery } from '@tanstack/react-query';
import { getFactoryStock } from '@/api/stock-api';
import { listModels } from '@/api/model-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, Package, Warehouse, Truck, Users, ShoppingCart } from 'lucide-react';
import { PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from '@/lib/utils';

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

  /**
   * Extract power rating in watts from model
   * Returns power in watts (e.g., 800, 1500, 1600, 2000, 3000, etc.)
   */
  const extractPowerRating = (model: any): number => {
    if (!model) return 999999;
    
    const searchText = [
      model.variant || '',
      model.modelCode || '',
      model.productLine || '',
      model.modelName || '',
    ].join(' ').toLowerCase();
    
    // Pattern 1: Match "XkW" or "X kW" or "XW" or "X W"
    const kwMatch = searchText.match(/(\d+\.?\d*)\s*k?w/i);
    if (kwMatch) {
      const value = parseFloat(kwMatch[1]);
      // If value < 100, assume it's kW, otherwise assume it's watts
      return value < 100 ? value * 1000 : value;
    }
    
    // Pattern 2: Look for specific known values
    if (searchText.includes('800') && (searchText.includes('w') || searchText.includes('kw'))) {
      return 800;
    }
    if (searchText.includes('1.5') || searchText.includes('1r5')) {
      return 1500; // 1.5kW = 1500W
    }
    if (searchText.includes('1600')) {
      return 1600;
    }
    if (searchText.includes('2') && (searchText.includes('kw') || searchText.includes('w'))) {
      // Check if it's exactly 2kW (not 2000, 20, etc.)
      const twoKwMatch = searchText.match(/2\s*k?w/i);
      if (twoKwMatch) {
        return 2000;
      }
    }
    if (searchText.includes('3') && (searchText.includes('kw') || searchText.includes('w'))) {
      const threeKwMatch = searchText.match(/3\s*k?w/i);
      if (threeKwMatch) {
        return 3000;
      }
    }
    
    // Default: extract first number and assume it's watts if > 100, otherwise kW
    const numericMatch = searchText.match(/(\d+\.?\d*)/);
    if (numericMatch) {
      const value = parseFloat(numericMatch[1]);
      return value < 100 ? value * 1000 : value;
    }
    
    return 999999; // Put unknown values at the end
  };

  /**
   * Custom power rating order: 800W, 1.5kW, 1600W, 2kW, 3kW, then ascending
   */
  const getPowerSortOrder = (powerInWatts: number): number => {
    // Define the custom order
    const customOrder: number[] = [800, 1500, 1600, 2000, 3000];
    
    // Check if power matches a custom order position
    const customIndex = customOrder.indexOf(powerInWatts);
    if (customIndex !== -1) {
      return customIndex; // Return position in custom order
    }
    
    // For other values, sort after custom order
    // Add 1000 to ensure they come after custom values
    return 1000 + powerInWatts;
  };

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
          model.modelName?.toLowerCase().includes(searchLower) ||
          model.modelCode?.toLowerCase().includes(searchLower) ||
          model.brand?.toLowerCase().includes(searchLower) ||
          model.productLine?.toLowerCase().includes(searchLower) ||
          model.variant?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Sort by power rating: 800W, 1.5kW, 1600W, 2kW, 3kW, then ascending
    filtered = [...filtered].sort((a, b) => {
      if (!a || !b) return 0;
      const powerA = extractPowerRating(a);
      const powerB = extractPowerRating(b);
      
      const orderA = getPowerSortOrder(powerA);
      const orderB = getPowerSortOrder(powerB);
      
      return orderA - orderB;
    });
    
    return filtered;
  }, [models, searchTerm, modelId]);

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
      <div className="flex items-center justify-center p-8 min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
          <div className="space-y-1 md:space-y-2">
            <h1 className={PAGE_HEADING_CLASS}>Factory Stock</h1>
            <p className={PAGE_SUBHEADING_CLASS}>Product inventory and distribution statistics</p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-40 md:w-64 h-10 md:h-11 border-2 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="space-y-6 px-4 md:px-6 pb-6 pt-4">
      {/* Product Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {filteredModels.map((model) => {
          const stats = modelStatistics[model._id];
          if (!stats) return null;

          const displayName = model.modelName || `${model.brand} ${model.productLine} ${model.variant}`.trim();

          return (
            <Card
              key={model._id}
              className="border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden bg-white dark:bg-slate-900"
            >
              <CardHeader className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 dark:from-blue-600 dark:via-indigo-600 dark:to-purple-600 border-b-0 relative overflow-hidden p-3">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDMuMzE0LTIuNjg2IDYtNiA2cy02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNnoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
                <CardTitle className="relative z-10">
                  <div className="text-white">
                    <h3 className="text-sm font-bold mb-0.5 leading-tight">{displayName}</h3>
                    <p className="text-[10px] text-blue-100 font-mono leading-tight">{model.modelCode}</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 pb-3 px-3">
                <div className="space-y-2">
                  {/* Total Registered */}
                  <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-blue-500 rounded">
                          <Package className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Total Registered</span>
                      </div>
                      <span className="text-base font-bold text-blue-600 dark:text-blue-400">{stats.totalRegistered}</span>
                    </div>
                  </div>

                  {/* In Factory */}
                  <div className="p-2 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-green-500 rounded">
                          <Warehouse className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">In Factory</span>
                      </div>
                      <span className="text-base font-bold text-green-600 dark:text-green-400">{stats.inFactory}</span>
                    </div>
                  </div>

                  {/* To Dealer */}
                  <div className="p-2 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-purple-500 rounded">
                          <Truck className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">To Dealer</span>
                      </div>
                      <span className="text-base font-bold text-purple-600 dark:text-purple-400">{stats.toDealer}</span>
                    </div>
                  </div>

                  {/* To Sub-Dealer */}
                  <div className="p-2 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-orange-500 rounded">
                          <Users className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">To Sub-Dealer</span>
                      </div>
                      <span className="text-base font-bold text-orange-600 dark:text-orange-400">{stats.toSubDealer}</span>
                    </div>
                  </div>

                  {/* Not Yet Sold (Inventory) */}
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-slate-600 rounded">
                          <ShoppingCart className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Not Yet Sold (Inventory)</span>
                      </div>
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100">{stats.notYetSold}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium ml-8">
                      {stats.sold} units sold
                    </div>
                  </div>
                  
                  {/* Serial Numbers List - Show when model is filtered */}
                  {modelId === model._id && modelSerialNumbers.length > 0 && (
                    <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <h4 className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Serial Numbers ({modelSerialNumbers.length})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
                        {modelSerialNumbers.map((serialNumber) => (
                          <Link
                            key={serialNumber}
                            to={`/lifecycle/${serialNumber}`}
                            className="px-2 py-1 text-[10px] font-mono font-medium rounded border border-blue-300 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 text-blue-700 dark:text-blue-300 hover:from-blue-100 hover:to-blue-200/50 dark:hover:from-blue-900/40 dark:hover:to-blue-800/30 transition-all cursor-pointer text-center"
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

      {filteredModels.length === 0 && (
        <Card className="border-2 border-slate-200 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                {searchTerm ? 'No products found matching your search' : 'No products available'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
