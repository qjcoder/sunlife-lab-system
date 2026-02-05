import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getFactoryStock } from '@/api/stock-api';
import { listServiceJobs } from '@/api/service-api';
import { listModels } from '@/api/model-api';
import { Warehouse, Package, Wrench, TrendingUp, Users, Building2, Zap, Battery, Settings, Shield, Calendar, Hash, Tag, Eye, ArrowRight, X, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getProductImageWithHandler } from '@/lib/image-utils';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVFDGroup, setSelectedVFDGroup] = useState<any>(null);
  const [isVFDDialogOpen, setIsVFDDialogOpen] = useState(false);
  const [selectedModelForPdf, setSelectedModelForPdf] = useState<any>(null);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);

  /**
   * Get model image path - ensures it's from /products/ directory
   * All images are served from public/products/ via Vite
   */
  const getModelImage = (model: any) => {
    if (!model) return '';
    try {
      const imageHandler = getProductImageWithHandler(model);
      if (!imageHandler) return '';
      const imagePath = imageHandler.src || '';
      if (imagePath && !imagePath.startsWith('/products/')) {
        console.warn(`Image path should start with /products/: ${imagePath}`);
        return imagePath.startsWith('/') ? `/products${imagePath}` : `/products/${imagePath}`;
      }
      return imagePath || '';
    } catch (error) {
      console.error('Error getting model image:', error);
      return '';
    }
  };
  
  /**
   * Get image error handler with fallback support
   */
  const getImageErrorHandler = (model: any) => {
    if (!model) return () => {};
    try {
      const imageHandler = getProductImageWithHandler(model);
      if (!imageHandler) return () => {};
      return imageHandler.onError || (() => {});
    } catch (error) {
      console.error('Error getting image error handler:', error);
      return () => {};
    }
  };

  const { data: factoryStock } = useQuery({
    queryKey: ['factory-stock'],
    queryFn: getFactoryStock,
    enabled: user?.role === 'FACTORY_ADMIN',
  });

  const { data: serviceJobs } = useQuery({
    queryKey: ['service-jobs'],
    queryFn: listServiceJobs,
    enabled: user?.role === 'SERVICE_CENTER',
  });

  const { data: models } = useQuery({
    queryKey: ['inverter-models'],
    queryFn: () => listModels(),
    enabled: user?.role === 'FACTORY_ADMIN',
  });

  // Calculate stock counts per model (for admin only) - MUST be at top level to avoid hook order violations
  const modelStockCounts = useMemo(() => {
    try {
      if (!factoryStock?.availableInverters || !models || !Array.isArray(factoryStock.availableInverters)) return {};
      
      const counts: Record<string, number> = {};
      
      factoryStock.availableInverters.forEach((item) => {
        if (!item || !item.inverterModel) return;
        try {
          const modelId = typeof item.inverterModel === 'object' 
            ? item.inverterModel?._id 
            : item.inverterModel;
          if (modelId) {
            counts[modelId] = (counts[modelId] || 0) + 1;
          }
        } catch (err) {
          // Silently skip invalid items
        }
      });
      
      return counts;
    } catch (error) {
      console.error('Error calculating model stock counts:', error);
      return {};
    }
  }, [factoryStock, models]);

  const getDashboardStats = () => {
    if (user?.role === 'FACTORY_ADMIN') {
      return {
        totalInverters: factoryStock?.count || 0,
        availableInverters: factoryStock?.availableInverters?.length || 0,
        dispatchedInverters: (factoryStock?.count || 0) - (factoryStock?.availableInverters?.length || 0),
        serviceJobs: 0,
      };
    }
    if (user?.role === 'SERVICE_CENTER') {
      return {
        totalInverters: 0,
        availableInverters: 0,
        dispatchedInverters: 0,
        serviceJobs: serviceJobs?.length || 0,
      };
    }
    return {
      totalInverters: 0,
      availableInverters: 0,
      dispatchedInverters: 0,
      serviceJobs: 0,
    };
  };

  const stats = getDashboardStats();

  const getQuickActions = () => {
    if (user?.role === 'FACTORY_ADMIN') {
      return [
        { label: 'Register Products', path: '/factory/inverter-registration', icon: Package },
        { label: 'Dispatch to Dealer', path: '/factory/dispatch', icon: Warehouse },
        { label: 'View Stock', path: '/factory/stock', icon: TrendingUp },
        { label: 'Manage Dealers', path: '/factory/dealers', icon: Users },
      ];
    }
    if (user?.role === 'DEALER') {
      return [
        { label: 'View Stock', path: '/dealer/stock', icon: Warehouse },
        { label: 'Record Sale', path: '/dealer/sales', icon: TrendingUp },
        { label: 'Transfer to Sub-Dealer', path: '/dealer/transfer', icon: Package },
        { label: 'Manage Sub-Dealers', path: '/dealer/sub-dealers', icon: Users },
      ];
    }
    if (user?.role === 'SUB_DEALER') {
      return [
        { label: 'View Stock', path: '/sub-dealer/stock', icon: Warehouse },
        { label: 'Record Sale', path: '/sub-dealer/sales', icon: TrendingUp },
      ];
    }
    if (user?.role === 'SERVICE_CENTER') {
      return [
        { label: 'Create Service Job', path: '/service-center/jobs/create', icon: Wrench },
        { label: 'View Service Jobs', path: '/service-center/jobs', icon: Package },
        { label: 'Parts Stock', path: '/service-center/stock', icon: Warehouse },
      ];
    }
    return [];
  };

  /**
   * Sort variant strings numerically (e.g., "5r5", "7r5", "011" -> "011", "5r5", "7r5")
   * Handles numeric prefixes and suffixes
   */
  /**
   * Extract power rating from model name/variant/code
   * Returns power in watts for comparison
   */
  const extractPowerRating = (model: any): number => {
    const searchText = [
      model.variant || '',
      model.modelCode || '',
      model.productLine || '',
      model.modelName || '',
    ].join(' ').toLowerCase();
    
    // Pattern 1: Match "800W", "1.5kW", "2kW", "3kW", etc.
    // Also handle "800w", "1.5kw", "1600w", etc.
    const patterns = [
      /(\d+\.?\d*)\s*k?w/i,  // Matches "800W", "1.5kW", "2kW", "1600W"
      /(\d+)\s*w/i,           // Matches "800 W", "1600 W"
    ];
    
    for (const pattern of patterns) {
      const match = searchText.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        // If it's less than 100, assume it's in kW, convert to watts
        if (value < 100) {
          return value * 1000; // Convert kW to watts
        }
        return value; // Already in watts
      }
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

  const sortVariants = (variants: any[]) => {
    if (!variants || !Array.isArray(variants) || variants.length === 0) return [];
    return [...variants].filter(v => v != null).sort((a, b) => {
      if (!a || !b) return 0;
      const powerA = extractPowerRating(a);
      const powerB = extractPowerRating(b);
      
      const orderA = getPowerSortOrder(powerA);
      const orderB = getPowerSortOrder(powerB);
      
      return orderA - orderB;
    });
  };

  /**
   * Get VFD display name - shows "SL-GD170-0XX-4-PV" format
   */
  const getVFDDisplayName = (model: any) => {
    const modelCode = (model.modelCode || '').toUpperCase();
    // Extract base pattern (e.g., "SL-GD170-0XX-4-PV" from "SL-GD170-011-4-PV")
    if (modelCode.includes('GD170')) {
      return modelCode.replace(/-\d+[A-Z]?-\d+-PV$/i, '-0XX-4-PV');
    }
    return modelCode;
  };

  /**
   * Extract power rating for display (e.g., "4kW", "6kW", "1.5kW")
   * For batteries, extracts voltage and capacity from model code or variant
   * Examples:
   * - "SL-48100M" → "51.2V 100AH" (extract from 48100: 48V = 51.2V, 100 = 100AH)
   * - "SL-48314M" → "51.2V 314AH" (extract from 48314: 48V = 51.2V, 314 = 314AH)
   * - "RM 51.2V 100AH" → "51.2V 100AH" (already in correct format)
   */
  const getPowerDisplay = (model: any): string => {
    if (!model) return '';
    
    const productLine = (model.productLine || '').toLowerCase();
    const variant = (model.variant || '').trim();
    const modelCode = (model.modelCode || '').trim();
    
    // For batteries, extract voltage and capacity
    if (productLine === 'lithium' || productLine.includes('battery')) {
      // If variant already contains voltage and capacity (e.g., "51.2V 100AH", "RM 51.2V 100AH")
      if (variant && (variant.includes('V') && variant.includes('AH'))) {
        // Extract voltage and capacity from variant
        const voltageMatch = variant.match(/(\d+\.?\d*)\s*V/i);
        const capacityMatch = variant.match(/(\d+\.?\d*)\s*AH/i);
        if (voltageMatch && capacityMatch) {
          return `${voltageMatch[1]}V ${capacityMatch[1]}AH`;
        }
        // If format is "RM 51.2V 100AH", return "51.2V 100AH"
        return variant.replace(/^RM\s+/i, '').trim();
      }
      
      // If modelCode contains pattern like "SL-48100M" or "SL-48314M"
      // Extract: 48100 → 48V 100AH → 51.2V 100AH
      // Extract: 48314 → 48V 314AH → 51.2V 314AH
      if (modelCode) {
        // Match pattern: SL-48100M, SL-48314M, RM-48100M
        // Extract numbers: first 2 digits = voltage (48), rest = capacity (100, 314)
        const codeMatch = modelCode.match(/(?:SL-|RM-)?(\d{2})(\d+)(\w*)/i);
        if (codeMatch) {
          const voltagePart = codeMatch[1]; // "48" (first 2 digits)
          const capacityPart = codeMatch[2]; // "100" or "314" (remaining digits)
          
          // Convert 48V to 51.2V (standard battery voltage)
          const voltage = voltagePart === '48' ? '51.2' : voltagePart;
          return `${voltage}V ${capacityPart}AH`;
        }
      }
      
      // Fallback: return variant or modelCode as-is
      return variant || modelCode || '';
    }
    
    const searchText = [
      model.variant || '',
      model.modelCode || '',
      model.productLine || '',
    ].join(' ').toLowerCase();
    
    // Match patterns like "4kw", "6kw", "1.5kw", "800w", etc.
    const patterns = [
      /(\d+\.?\d*)\s*k?w/i,  // Matches "4kW", "6kW", "1.5kW", "800W"
      /(\d+)\s*w/i,           // Matches "800 W", "1600 W"
    ];
    
    for (const pattern of patterns) {
      const match = searchText.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        // Format: if >= 100, show as "800W", else show as "4kW"
        if (value >= 100) {
          return `${value}W`;
        } else {
          return `${value}kW`;
        }
      }
    }
    
    // Fallback: try to extract any number and format it (only for non-battery models)
    const numericMatch = searchText.match(/(\d+\.?\d*)/);
    if (numericMatch) {
      const value = parseFloat(numericMatch[1]);
      if (value >= 100) {
        return `${value}W`;
      } else {
        return `${value}kW`;
      }
    }
    
    // If no power found, return variant or modelCode as fallback
    return model.variant || model.modelCode || '';
  };

  /**
   * Get product display name (product line only, without variant)
   * Format: Show only product line, remove brand if it appears in product line
   * Variant is shown separately in variant buttons
   * 
   * Examples:
   * - Brand: "Sunlife", ProductLine: "SL IV PLUS", Variant: "4.2kW" → "SL IV PLUS"
   * - Brand: "Sunlife", ProductLine: "SL SKY", Variant: "4kW" → "SL SKY"
   * - Brand: "Sunlife", ProductLine: "Lithium", Variant: "SL-48100M" → "SL-48100M" (battery)
   * - Brand: "Sunlife", ProductLine: "IP65", Variant: "6kW" → "IP65"
   */
  const getProductDisplayName = (model: any): string => {
    if (!model) return '';
    
    const brand = (model.brand || '').trim();
    const productLine = (model.productLine || '').trim();
    const variant = (model.variant || '').trim();
    const productLineLower = productLine.toLowerCase();
    const brandLower = brand.toLowerCase();
    
    // For batteries, use modelCode as product name
    // Examples: "SL-48100M", "SL-48314M", "RM-48100M" (from modelCode)
    if (productLineLower === 'lithium' || productLineLower.includes('battery')) {
      // Use modelCode if available, otherwise fallback to variant
      return model.modelCode || variant || '';
    }
    
    // For IP65 models (e.g., "HI-6K-SL"), productLine is "IP65" and variant is "6kW"
    if (productLineLower === 'ip65' || (model.modelCode || '').toUpperCase().includes('IP65')) {
      return 'IP65';
    }
    
    // For VFD models, productLine is "VFD" and variant contains the full model name
    // Example: variant = "SL-GD170-5R5-4-PV"
    if (productLineLower === 'vfd') {
      // Return variant if it contains the model identifier, otherwise return "VFD"
      return variant || 'VFD';
    }
    
    // For other products, return only product line (without variant)
    // Remove brand name if it appears at the start of product line to avoid repetition
    let displayName = productLine;
    
    // Remove brand name from product line if it appears at the start
    if (brandLower && displayName.toLowerCase().startsWith(brandLower)) {
      displayName = displayName.substring(brand.length).trim();
      // Also remove any leading hyphens or spaces
      displayName = displayName.replace(/^[\s-]+/, '');
    }
    
    // Convert to uppercase for consistency
    return displayName.toUpperCase() || productLine.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="space-y-1 sm:space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400">Welcome back, {user?.name}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="space-y-4 sm:space-y-6 md:space-y-8 p-3 sm:p-4 md:p-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {user?.role === 'FACTORY_ADMIN' && (
          <>
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Products
                </CardTitle>
                <Package className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.totalInverters.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Registered in system</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Available Stock
                </CardTitle>
                <Warehouse className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.availableInverters.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">In factory warehouse</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Dispatched
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.dispatchedInverters.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Sent to dealers</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Service Centers
                </CardTitle>
                <Building2 className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  -
                </div>
                <p className="text-xs text-muted-foreground mt-1">Active centers</p>
              </CardContent>
            </Card>
          </>
        )}

        {user?.role === 'SERVICE_CENTER' && (
          <>
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Service Jobs
                </CardTitle>
                <Wrench className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.serviceJobs.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">All time jobs</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Product Lines Section - Factory Admin Only */}
      {user?.role === 'FACTORY_ADMIN' && models && Array.isArray(models) && models.length > 0 && (
        <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Package className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              Product Catalog
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {(() => {
              const categorizeModel = (model: any) => {
                if (!model) return null;
                
                const productLine = (model.productLine || '').toLowerCase();
                const brand = (model.brand || '').toLowerCase();
                const variant = (model.variant || '').toLowerCase();
                const modelCode = (model.modelCode || '').toLowerCase();
                const fullName = `${brand} ${productLine} ${variant} ${modelCode}`.toLowerCase();
                
                // Check for VFD first
                if (
                  productLine.includes('vfd') || 
                  brand.includes('vfd') || 
                  variant.includes('vfd') || 
                  modelCode.includes('vfd') ||
                  fullName.includes('vfd') ||
                  modelCode.includes('gd170')
                ) {
                  return 'vfd';
                }
                
                // Check for battery
                if (
                  productLine.includes('battery') || 
                  productLine.includes('batt') || 
                  productLine.includes('lithium') ||
                  brand.includes('battery') || 
                  brand.includes('lithium') ||
                  variant.includes('battery') || 
                  variant.includes('lithium') ||
                  modelCode.includes('battery') ||
                  modelCode.includes('lithium') ||
                  fullName.includes('battery') ||
                  fullName.includes('lithium') ||
                  fullName.includes('51.2v') ||
                  fullName.includes('48100') ||
                  fullName.includes('48314') ||
                  fullName.includes('100ah')
                ) {
                  return 'battery';
                }
                
                // Everything else is an inverter (including what was previously "solar")
                return 'inverter';
              };

              const inverterModels = (models && Array.isArray(models)) ? models.filter(m => m && categorizeModel(m) === 'inverter') : [];
              const batteryModels = (models && Array.isArray(models)) ? models.filter(m => m && categorizeModel(m) === 'battery') : [];
              const vfdModels = (models && Array.isArray(models)) ? models.filter(m => m && categorizeModel(m) === 'vfd') : [];

              // modelStockCounts is now defined at component top level (above) to avoid hook order violations

              /**
               * Group models by product line (brand + productLine combination)
               * For batteries, each model is separate (no grouping)
               */
              const groupModelsByProductLine = (modelList: any[], isBattery: boolean = false) => {
                try {
                  if (!modelList || !Array.isArray(modelList)) return new Map<string, any[]>();
                  
                  if (isBattery) {
                    // Batteries: each model is its own group
                    const grouped = new Map<string, any[]>();
                    modelList.forEach(model => {
                      if (!model) return;
                      const key = model._id || `${model.brand || ''}-${model.productLine || ''}-${model.variant || ''}`;
                      if (key) {
                        grouped.set(key, [model]);
                      }
                    });
                    return grouped;
                  }
                  
                  // For inverters and VFD: group by brand + productLine
                  const grouped = new Map<string, any[]>();
                  modelList.forEach(model => {
                    if (!model) return;
                    const key = `${model.brand || 'Unknown'}-${model.productLine || 'Unknown'}`.toLowerCase();
                    if (!grouped.has(key)) {
                      grouped.set(key, []);
                    }
                    const group = grouped.get(key);
                    if (group) {
                      group.push(model);
                    }
                  });
                  return grouped;
                } catch (error) {
                  console.error('Error grouping models:', error);
                  return new Map<string, any[]>();
                }
              };

              try {
                return (
                  <div className="space-y-8">
                    {/* Inverters - Grouped by Product Line */}
                    {inverterModels.length > 0 && (() => {
                      try {
                        const groupedInverters = groupModelsByProductLine(inverterModels);
                        if (!groupedInverters || groupedInverters.size === 0) return null;
                        
                        // Sort groups by power rating of their primary model
                        const sortedGroups = Array.from(groupedInverters.entries()).sort(([, groupA], [, groupB]) => {
                          try {
                            const sortedA = sortVariants(groupA);
                            const sortedB = sortVariants(groupB);
                            if (!sortedA || sortedA.length === 0 || !sortedB || sortedB.length === 0) return 0;
                            const primaryA = sortedA[0];
                            const primaryB = sortedB[0];
                            if (!primaryA || !primaryB) return 0;
                            
                            const powerA = extractPowerRating(primaryA);
                            const powerB = extractPowerRating(primaryB);
                            
                            const orderA = getPowerSortOrder(powerA);
                            const orderB = getPowerSortOrder(powerB);
                            
                            return orderA - orderB;
                          } catch (err) {
                            return 0;
                          }
                        });
                    
                        return (
                          <div>
                            <div className="flex items-center gap-2.5 mb-4">
                              <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md">
                                <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Inverters</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{inverterModels.length} models across {groupedInverters.size} product lines</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                              {sortedGroups.map(([key, modelGroup]) => {
                                if (!modelGroup || !Array.isArray(modelGroup) || modelGroup.length === 0) return null;
                                const sortedModels = sortVariants(modelGroup);
                                if (!sortedModels || sortedModels.length === 0) return null;
                                const primaryModel = sortedModels[0];
                                if (!primaryModel) return null;
                                const productLineName = `${primaryModel.brand || ''} ${primaryModel.productLine || ''}`.trim();
                                const hasActive = sortedModels.some(m => m && m.active);
                                const hasMultipleVariants = sortedModels.length > 1;
                                
                                return (
                                  <div
                                    key={key}
                                    onClick={() => {
                                      // Open PDF dialog when clicking on the card
                                      if (primaryModel.datasheet) {
                                        setSelectedModelForPdf(primaryModel);
                                        setIsPdfDialogOpen(true);
                                      } else {
                                        // If no datasheet, show variant details dialog
                                        setSelectedVariant(primaryModel);
                                        setIsDialogOpen(true);
                                      }
                                    }}
                                    className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                                  >
                                    {/* Image Section */}
                                    <div className="relative h-48 bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
                                      <div className="absolute inset-0 flex items-center justify-center p-4">
                                        <img
                                          src={getModelImage(primaryModel)}
                                          alt={productLineName}
                                          className="max-w-full max-h-full object-contain"
                                          onError={(e) => {
                                            getImageErrorHandler(primaryModel)(e);
                                            const placeholder = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                            if (placeholder) placeholder.style.display = 'flex';
                                          }}
                                        />
                                      </div>
                                      <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-700" style={{ display: 'none' }}>
                                        <Package className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                                      </div>
                                      
                                      {/* Status Badge - Top Left */}
                                      <div className="absolute top-2 left-2 z-10">
                                        {hasActive && !sortedModels.some(m => !m.active) ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-green-500 text-white">
                                            <Shield className="h-2.5 w-2.5" />
                                            Active
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-500 text-white">
                                            <X className="h-2.5 w-2.5" />
                                            Discontinued
                                          </span>
                                        )}
                                      </div>
                                      
                                      {/* Stock Count - Top Right (Admin Only) */}
                                      {user?.role === 'FACTORY_ADMIN' && (
                                        <div className="absolute top-2 right-2 z-10">
                                          <div className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                                            {sortedModels.reduce((sum, m) => sum + (modelStockCounts[m._id] || 0), 0)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Content Section */}
                                    <div className="p-4 flex flex-col">
                                      {/* Brand Name */}
                                      <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-0.5">
                                        {primaryModel.brand || 'SUNLIFE'}
                                      </p>
                                      
                                      {/* Product Name */}
                                      <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-3 leading-tight">
                                        {getProductDisplayName(primaryModel)}
                                      </h4>
                                      
                                      {/* Variant Display */}
                                      <div className="mb-2">
                                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                                          {hasMultipleVariants ? 'Select Variant' : 'Variant'}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {sortedModels.map((model, index) => {
                                            if (!model || !model._id) return null;
                                            const powerDisplay = getPowerDisplay(model);
                                            return (
                                            <button
                                              key={model._id}
                                              onClick={() => {
                                                navigate(`/factory/factory-stock?model=${model._id}`);
                                              }}
                                              className={cn(
                                                "inline-flex items-center px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all duration-150 whitespace-nowrap relative cursor-pointer",
                                                hasMultipleVariants
                                                  ? index % 2 === 0
                                                    ? 'border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30'
                                                    : 'border-green-400 text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30'
                                                  : 'border-red-400 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30'
                                              )}
                                              style={{ 
                                                maxWidth: '100%',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                              }}
                                              title={model.modelCode || model.variant}
                                            >
                                              <span className="truncate">{powerDisplay}</span>
                                            </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      
                                      {/* Warranty Section */}
                                      <div className="mt-auto pt-1.5 border-t border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                                          Warranty
                                        </p>
                                        <div className="flex justify-between items-center gap-1.5">
                                          <button className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border border-blue-400 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-150 whitespace-nowrap">
                                            <Shield className="h-2 w-2 mr-0.5" />
                                            <span>Parts: {primaryModel.warranty?.partsMonths || 12} months</span>
                                          </button>
                                          <button className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border border-green-400 text-green-600 dark:text-green-400 bg-white dark:bg-slate-900 hover:bg-green-50 dark:hover:bg-green-950/30 transition-all duration-150 whitespace-nowrap">
                                            <Calendar className="h-2 w-2 mr-0.5" />
                                            <span>Service: {primaryModel.warranty?.serviceMonths || 24} months</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      } catch (error) {
                        console.error('Error rendering inverters:', error);
                        return null;
                      }
                    })()}

                  {/* Batteries - Each model is separate */}
                  {batteryModels.length > 0 && (() => {
                    const groupedBatteries = groupModelsByProductLine(batteryModels, true);
                    
                    // Sort battery groups by power rating
                    const sortedBatteryGroups = Array.from(groupedBatteries.entries()).sort(([, groupA], [, groupB]) => {
                      const modelA = groupA[0];
                      const modelB = groupB[0];
                      
                      const powerA = extractPowerRating(modelA);
                      const powerB = extractPowerRating(modelB);
                      
                      const orderA = getPowerSortOrder(powerA);
                      const orderB = getPowerSortOrder(powerB);
                      
                      return orderA - orderB;
                    });
                    
                    return (
                      <div>
                        <div className="flex items-center gap-2.5 mb-4">
                          <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-md">
                            <Battery className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Batteries</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{batteryModels.length} models</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                          {sortedBatteryGroups.map(([key, modelGroup]) => {
                            if (!modelGroup || !Array.isArray(modelGroup) || modelGroup.length === 0) return null;
                            const model = modelGroup[0];
                            if (!model || !model._id) return null;
                            const productLineName = `${model.brand || ''} ${model.productLine || ''} ${model.variant || ''}`.trim();
                            
                            return (
                              <div
                                key={key}
                                onClick={() => {
                                  // Open PDF dialog when clicking on the card
                                  if (model.datasheet) {
                                    setSelectedModelForPdf(model);
                                    setIsPdfDialogOpen(true);
                                  } else {
                                    // If no datasheet, show variant details dialog
                                    setSelectedVariant(model);
                                    setIsDialogOpen(true);
                                  }
                                }}
                                className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                              >
                                {/* Image Section */}
                                <div className="relative h-48 bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
                                  <div className="absolute inset-0 flex items-center justify-center p-4">
                                    <img
                                      src={getModelImage(model)}
                                      alt={productLineName}
                                      className="max-w-full max-h-full object-contain"
                                      onError={(e) => {
                                        getImageErrorHandler(model)(e);
                                        const placeholder = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                        if (placeholder) placeholder.style.display = 'flex';
                                      }}
                                    />
                                  </div>
                                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-700" style={{ display: 'none' }}>
                                    <Battery className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                                  </div>
                                  
                                  {/* Status Badge - Top Left */}
                                  <div className="absolute top-2 left-2 z-10">
                                    {model.active ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-green-500 text-white">
                                        <Shield className="h-2.5 w-2.5" />
                                        Active
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-500 text-white">
                                        <X className="h-2.5 w-2.5" />
                                        Discontinued
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Stock Count - Top Right (Admin Only) */}
                                  {user?.role === 'FACTORY_ADMIN' && (
                                    <div className="absolute top-2 right-2 z-10">
                                      <div className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                                        {modelStockCounts[model._id] || 0}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Content Section */}
                                <div className="p-4 flex flex-col">
                                  {/* Brand Name */}
                                  <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-0.5">
                                    {model.brand || 'SUNLIFE'}
                                  </p>
                                  
                                  {/* Product Name */}
                                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-3 leading-tight">
                                    {getProductDisplayName(model)}
                                  </h4>
                                  
                                  {/* Variant Display */}
                                  <div className="mb-2">
                                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                                      Variant
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      <button
                                        onClick={() => {
                                          navigate(`/factory/factory-stock?model=${model._id}`);
                                        }}
                                        className="inline-flex items-center px-2.5 py-1 text-[11px] font-medium rounded-md border border-red-400 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 transition-all duration-150 relative cursor-pointer"
                                        style={{ 
                                          maxWidth: '100%',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis'
                                        }}
                                        title={model.modelCode || model.variant}
                                      >
                                        <span className="truncate">{getPowerDisplay(model)}</span>
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* Warranty Section */}
                                  <div className="mt-auto pt-1.5 border-t border-slate-200 dark:border-slate-700">
                                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                                      Warranty
                                    </p>
                                    <div className="flex justify-between items-center gap-1.5">
                                      <button className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border border-blue-400 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-150 whitespace-nowrap">
                                        <Shield className="h-2 w-2 mr-0.5" />
                                        <span>Parts: {model.warranty?.partsMonths || 12} months</span>
                                      </button>
                                      <button className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border border-green-400 text-green-600 dark:text-green-400 bg-white dark:bg-slate-900 hover:bg-green-50 dark:hover:bg-green-950/30 transition-all duration-150 whitespace-nowrap">
                                        <Calendar className="h-2 w-2 mr-0.5" />
                                        <span>Service: {model.warranty?.serviceMonths || 24} months</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* VFD - Generic card showing all variants */}
                  {vfdModels.length > 0 && (() => {
                    const groupedVFD = groupModelsByProductLine(vfdModels);
                    
                    // Sort VFD groups by power rating
                    const sortedVFDGroups = Array.from(groupedVFD.entries()).sort(([, groupA], [, groupB]) => {
                      const sortedA = sortVariants(groupA);
                      const sortedB = sortVariants(groupB);
                      const primaryA = sortedA[0];
                      const primaryB = sortedB[0];
                      
                      const powerA = extractPowerRating(primaryA);
                      const powerB = extractPowerRating(primaryB);
                      
                      const orderA = getPowerSortOrder(powerA);
                      const orderB = getPowerSortOrder(powerB);
                      
                      return orderA - orderB;
                    });
                    
                    return (
                      <div>
                        <div className="flex items-center gap-2.5 mb-4">
                          <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded-md">
                            <Settings className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">VFD (Variable Frequency Drives)</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{vfdModels.length} models across {groupedVFD.size} product lines</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                          {sortedVFDGroups.map(([key, modelGroup]) => {
                            if (!modelGroup || !Array.isArray(modelGroup) || modelGroup.length === 0) return null;
                            const sortedModels = sortVariants(modelGroup);
                            if (!sortedModels || sortedModels.length === 0) return null;
                            const primaryModel = sortedModels[0];
                            if (!primaryModel) return null;
                            const vfdDisplayName = getVFDDisplayName(primaryModel);
                            const hasActive = sortedModels.some(m => m && m.active);
                            const hasDiscontinued = sortedModels.some(m => m && !m.active);
                            
                            return (
                              <div
                                key={key}
                                onClick={() => {
                                  setSelectedVFDGroup({ models: sortedModels, displayName: vfdDisplayName });
                                  setIsVFDDialogOpen(true);
                                }}
                                className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                              >
                                <div className="relative h-48 bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
                                  <div className="absolute inset-0 flex items-center justify-center p-4">
                                    <img
                                      src={getModelImage(primaryModel)}
                                      alt={vfdDisplayName}
                                      className="max-w-full max-h-full object-contain"
                                      onError={(e) => {
                                        getImageErrorHandler(primaryModel)(e);
                                        const placeholder = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                        if (placeholder) placeholder.style.display = 'flex';
                                      }}
                                    />
                                  </div>
                                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-700" style={{ display: 'none' }}>
                                    <Settings className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                                  </div>
                                  
                                  {/* Status Badge - Top Left */}
                                  <div className="absolute top-2 left-2 z-10">
                                    {hasActive && !hasDiscontinued ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-green-500 text-white">
                                        <Shield className="h-2.5 w-2.5" />
                                        Active
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-500 text-white">
                                        <X className="h-2.5 w-2.5" />
                                        Discontinued
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Stock Count - Top Right (Admin Only) */}
                                  {user?.role === 'FACTORY_ADMIN' && (
                                    <div className="absolute top-2 right-2 z-10">
                                      <div className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                                        {sortedModels.reduce((sum, m) => sum + (modelStockCounts[m._id] || 0), 0)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="p-4">
                                  <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-2 leading-tight font-mono">
                                    {vfdDisplayName}
                                  </h4>
                                  
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                                    {sortedModels.length} variant{sortedModels.length > 1 ? 's' : ''} available
                                  </p>
                                  
                                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                      Click to view variants
                                    </span>
                                    <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                );
              } catch (error) {
                console.error('Error rendering product catalog:', error);
                return (
                  <div className="p-6 text-center">
                    <p className="text-red-600 dark:text-red-400">Error loading product catalog. Please refresh the page.</p>
                  </div>
                );
              }
            })()}

            {/* All Models Link */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Link to="/factory/inverter-models">
                <Button variant="outline" className="w-full text-base py-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <Package className="h-5 w-5 mr-2" />
                  View All Product Models
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variant Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedVariant && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  {selectedVariant.modelName || `${selectedVariant.brand} ${selectedVariant.productLine} ${selectedVariant.variant}`}
                </DialogTitle>
                <DialogDescription>
                  Complete product specifications and warranty information
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                <div className="relative aspect-video bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg overflow-hidden">
                  <img
                    src={getModelImage(selectedVariant)}
                    alt={selectedVariant.modelName || selectedVariant.modelCode}
                    className="w-full h-full object-contain p-8"
                    onError={(e) => {
                      getImageErrorHandler(selectedVariant)(e);
                      const placeholder = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'flex';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700" style={{ display: 'none' }}>
                    <Package className="h-20 w-20 text-slate-300 dark:text-slate-600" />
                  </div>
                  
                  <div className="absolute top-4 right-4">
                    {selectedVariant.active ? (
                      <span className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg bg-emerald-500 text-white shadow-lg">
                        Active
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg bg-slate-500 text-white shadow-lg">
                        Discontinued
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Tag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Brand</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedVariant.brand || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Product Line</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedVariant.productLine || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Variant</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedVariant.variant || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <Hash className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Model Code</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono">{selectedVariant.modelCode || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Warranty Information</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Parts Warranty</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {selectedVariant.warranty?.partsMonths || 0} <span className="text-sm font-normal">months</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Service Warranty</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {selectedVariant.warranty?.serviceMonths || 0} <span className="text-sm font-normal">months</span>
                      </p>
                    </div>
                  </div>
                </div>

                {(selectedVariant.createdAt || selectedVariant.updatedAt) && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Timeline</p>
                    </div>
                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      {selectedVariant.createdAt && (
                        <p>Created: {new Date(selectedVariant.createdAt).toLocaleDateString()}</p>
                      )}
                      {selectedVariant.updatedAt && (
                        <p>Last Updated: {new Date(selectedVariant.updatedAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  {/* Datasheet View Button - Available for all roles */}
                  {selectedVariant.datasheet && (
                    <Button
                      onClick={() => {
                        setIsDialogOpen(false);
                        setSelectedModelForPdf(selectedVariant);
                        setIsPdfDialogOpen(true);
                      }}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Datasheet View
                    </Button>
                  )}
                  
                  {/* View Full Details Button - Only for FACTORY_ADMIN */}
                  {user?.role === 'FACTORY_ADMIN' && (
                    <Button 
                      onClick={() => {
                        setIsDialogOpen(false);
                        navigate(`/factory/inverter-models/${selectedVariant._id}`);
                      }}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Details
                    </Button>
                  )}
                  
                  <Button onClick={() => setIsDialogOpen(false)} variant="outline" className="flex-1">
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* VFD Variants Dialog */}
      <Dialog open={isVFDDialogOpen} onOpenChange={setIsVFDDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedVFDGroup && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold font-mono">
                  {selectedVFDGroup.displayName}
                </DialogTitle>
                <DialogDescription>
                  All available variants - Click on any variant to view its complete lifecycle
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedVFDGroup?.models && Array.isArray(selectedVFDGroup.models) && selectedVFDGroup.models.map((model: any, _index: number) => {
                    if (!model || !model._id) return null;
                    return (
                    <button
                      key={model._id}
                      onClick={() => {
                        setIsVFDDialogOpen(false);
                        // Open PDF dialog if datasheet exists, otherwise show variant details
                        if (model.datasheet) {
                          setSelectedModelForPdf(model);
                          setIsPdfDialogOpen(true);
                        } else {
                          setSelectedVariant(model);
                          setIsDialogOpen(true);
                        }
                      }}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all duration-200 text-left",
                        "hover:shadow-lg hover:-translate-y-1",
                        model.active
                          ? "border-slate-200 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-500 bg-white dark:bg-slate-900"
                          : "border-slate-300 dark:border-slate-600 opacity-60 bg-slate-50 dark:bg-slate-800"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          "text-sm font-semibold",
                          model.active ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400 line-through"
                        )}>
                          {model.variant || model.modelCode}
                        </span>
                        {model.active ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-500 text-white">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-500 text-white">
                            Discontinued
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {model.modelCode}
                      </p>
                      <div className="mt-2 flex items-center text-xs text-blue-600 dark:text-blue-400">
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </div>
                    </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700 mt-6">
                <Button onClick={() => setIsVFDDialogOpen(false)} variant="outline">
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Actions */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {getQuickActions().map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.path} to={action.path}>
                  <Button
                    variant="outline"
                    className="w-full h-auto p-4 flex flex-col items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* PDF Viewer Dialog */}
      <Dialog open={isPdfDialogOpen} onOpenChange={setIsPdfDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          {selectedModelForPdf && (
            <>
              <DialogHeader className="flex-shrink-0 pb-4 border-b border-slate-200 dark:border-slate-700">
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <span>
                    {selectedModelForPdf.modelName || `${selectedModelForPdf.brand} ${selectedModelForPdf.productLine} ${selectedModelForPdf.variant}`}
                  </span>
                </DialogTitle>
                <DialogDescription className="mt-2">
                  <span className="font-mono text-sm">{selectedModelForPdf.modelCode}</span>
                  {' - '}
                  Technical Datasheet
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-hidden flex flex-col mt-4">
                {selectedModelForPdf.datasheet ? (
                  <iframe
                    src={selectedModelForPdf.datasheet}
                    className="w-full flex-1 border-2 border-slate-200 dark:border-slate-700 rounded-lg"
                    title={`Datasheet for ${selectedModelForPdf.modelCode}`}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center p-12 bg-slate-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
                    <div className="text-center">
                      <FileText className="h-16 w-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                      <p className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
                        No Datasheet Available
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-500">
                        This product model does not have a technical datasheet uploaded yet.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                {selectedModelForPdf.datasheet && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.open(selectedModelForPdf.datasheet, '_blank');
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </Button>
                )}
                <Button onClick={() => setIsPdfDialogOpen(false)} variant="outline">
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* End scrollable content wrapper */}
      </div>
    </div>
  );
}
