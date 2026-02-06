import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getFactoryStock, getDealerStock } from '@/api/stock-api';
import { listServiceJobs } from '@/api/service-api';
import { listModels } from '@/api/model-api';
import { Warehouse, Package, Wrench, TrendingUp, Building2, Sun, Battery, Gauge, Settings, Shield, Calendar, Hash, Tag, Eye, ArrowRight, ArrowLeft, X, FileText, BookOpen, Video, Users, ArrowRightLeft, ShoppingCart } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getProductImageWithHandler } from '@/lib/image-utils';
import { cn, PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from '@/lib/utils';
import { toast } from 'sonner';

/** Roles that can see Full Life Cycle View */
const ROLES_WITH_LIFECYCLE_ACCESS = ['FACTORY_ADMIN', 'SERVICE_CENTER', 'INSTALLER_PROGRAM_MANAGER'];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVFDGroup, setSelectedVFDGroup] = useState<any>(null);
  const [isVFDDialogOpen, setIsVFDDialogOpen] = useState(false);
  const [selectedModelForPdf, setSelectedModelForPdf] = useState<any>(null);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);

  /** Format warranty months as years for display (e.g. 12 → "1 year", 24 → "2 years") */
  const formatWarrantyYears = (months: number | undefined, defaultMonths: number): string => {
    const m = months ?? defaultMonths;
    if (m === 0) return '0 years';
    const years = m / 12;
    if (years === 1) return '1 year';
    return `${Number.isInteger(years) ? years : years.toFixed(1)} years`;
  };

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

  const { data: dealerStock } = useQuery({
    queryKey: ['dealer-stock'],
    queryFn: getDealerStock,
    enabled: user?.role === 'DEALER' || user?.role === 'SUB_DEALER',
  });

  // Product catalog: show for admin, service center, installer program manager, data entry operator, dealer, sub-dealer
  const rolesWithProductCatalog = ['FACTORY_ADMIN', 'SERVICE_CENTER', 'INSTALLER_PROGRAM_MANAGER', 'DATA_ENTRY_OPERATOR', 'DEALER', 'SUB_DEALER'];
  const { data: models } = useQuery({
    queryKey: ['inverter-models'],
    queryFn: () => listModels(),
    enabled: !!user && rolesWithProductCatalog.includes(user.role),
  });

  // Open variant details dialog when URL has ?model=id (e.g. from "View Full Details" - stay on dashboard)
  const modelIdFromUrl = searchParams.get('model');
  useEffect(() => {
    if (!modelIdFromUrl || !models || !Array.isArray(models)) return;
    const model = models.find((m: any) => m && m._id === modelIdFromUrl);
    if (model) {
      setSelectedVariant(model);
      setIsDialogOpen(true);
    }
  }, [modelIdFromUrl, models]);

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

  /** VFD (GD170) variant order: 5R5, 7R5, then 011, 015, 018, 022, 030, 037, 045 */
  const VFD_GD170_SORT_ORDER = ['5R5', '7R5', '011', '015', '018', '022', '030', '037', '045'];

  const getVFDVariantSortKey = (model: any): number => {
    const code = (model?.modelCode || model?.variant || '').trim();
    const match = code.match(/GD170-(\d*R?\d+)-/i) || code.match(/-(\d*R?\d+)-\d+-PV$/i);
    const segment = (match ? match[1] : '').toUpperCase();
    const idx = VFD_GD170_SORT_ORDER.findIndex(s => s.toUpperCase() === segment);
    return idx === -1 ? 999 : idx;
  };

  const sortVariants = (variants: any[]) => {
    if (!variants || !Array.isArray(variants) || variants.length === 0) return [];
    const list = [...variants].filter(v => v != null);
    const isVFD = list.length > 0 && (list[0]?.modelCode || '').toUpperCase().includes('GD170');
    return list.sort((a, b) => {
      if (!a || !b) return 0;
      // Discontinued (active: false) at the end within each category
      if (a.active && !b.active) return -1;
      if (!a.active && b.active) return 1;
      if (isVFD) {
        return getVFDVariantSortKey(a) - getVFDVariantSortKey(b);
      }
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
    const fullName = [model.brand, model.productLine, variant, modelCode].filter(Boolean).join(' ').toLowerCase();
    
    // Detect battery: productLine, or modelCode pattern (SL-48xxx, RM-48xxx), or variant/model name with V+AH
    const isBattery =
      productLine === 'lithium' ||
      productLine.includes('battery') ||
      productLine.includes('batt') ||
      /(?:SL-|RM-)\d{2}\d+/.test(modelCode) ||
      (variant.includes('V') && variant.includes('AH')) ||
      fullName.includes('51.2v') ||
      fullName.includes('48100') ||
      fullName.includes('48314') ||
      fullName.includes('100ah') ||
      fullName.includes('lithium');
    
    // For batteries, show proper variant name / voltage-capacity (never "48100W" or "51.2kW")
    if (isBattery) {
      // If variant already contains voltage and capacity (e.g., "51.2V 100AH", "RM 51.2V 100AH")
      if (variant && (variant.includes('V') && variant.includes('AH'))) {
        const voltageMatch = variant.match(/(\d+\.?\d*)\s*V/i);
        const capacityMatch = variant.match(/(\d+\.?\d*)\s*AH/i);
        if (voltageMatch && capacityMatch) {
          return `${voltageMatch[1]}V ${capacityMatch[1]}AH`;
        }
        return variant.replace(/^RM\s+/i, '').trim();
      }
      
      // If modelCode contains pattern like "SL-48100M" or "SL-48314M" → show "51.2V 100AH" / "51.2V 314AH"
      if (modelCode) {
        const codeMatch = modelCode.match(/(?:SL-|RM-)?(\d{2})(\d+)(\w*)/i);
        if (codeMatch) {
          const voltagePart = codeMatch[1];
          const capacityPart = codeMatch[2];
          const voltage = voltagePart === '48' ? '51.2' : voltagePart;
          return `${voltage}V ${capacityPart}AH`;
        }
      }
      
      // Fallback: show actual variant or modelCode (e.g. "SL-48100M")
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
    const modelCode = (model.modelCode || '').trim();
    const productLineLower = productLine.toLowerCase();
    const brandLower = brand.toLowerCase();
    const fullName = [brand, productLine, variant, modelCode].filter(Boolean).join(' ').toLowerCase();
    
    // Detect battery (same logic as getPowerDisplay / categorizeModel)
    const isBattery =
      productLineLower === 'lithium' ||
      productLineLower.includes('battery') ||
      productLineLower.includes('batt') ||
      /(?:SL-|RM-)\d{2}\d+/.test(modelCode) ||
      (variant.includes('V') && variant.includes('AH')) ||
      fullName.includes('51.2v') ||
      fullName.includes('48100') ||
      fullName.includes('48314') ||
      fullName.includes('100ah') ||
      fullName.includes('lithium');
    
    // For batteries, show actual model name as stored (SL- or RM- as per product)
    // Examples: "SL-48100M", "SL-48314M", "SL-RM-SKWH-51.2V-100A", "RM 51.2V 100AH"
    if (isBattery) {
      return modelCode || variant || '';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100/50 to-blue-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm">
        <div className="p-5 sm:p-6 md:p-8 lg:p-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className={PAGE_HEADING_CLASS}>
                Dashboard
              </h1>
              <p className={`${PAGE_SUBHEADING_CLASS} flex items-center gap-2 flex-wrap`}>
                <span className="text-slate-500 dark:text-slate-500">Welcome back,</span>
                <span className="inline-flex items-center font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 text-base sm:text-lg px-3 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                  {user?.name}
                </span>
              </p>
            </div>
            {/* Dealer Stock - same style and position as Total Factory Stock */}
            {(user?.role === 'DEALER' || user?.role === 'SUB_DEALER') && (
              <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-slate-900 shrink-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Dealer Stock</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {(dealerStock?.count ?? 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dealerStock?.count ?? 0} units available
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-4 sm:p-5 md:p-6 lg:p-8 space-y-6 sm:space-y-8">

        {/* Summary / Stats cards - admin only; other roles see only Product Catalog below */}
        {user?.role === 'FACTORY_ADMIN' && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-5">
            <>
              <Card className="rounded-xl border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3 sm:pb-2 sm:pt-5 sm:px-5">
                  <CardTitle className="font-heading text-xs sm:text-sm font-semibold tracking-wide text-slate-600 dark:text-slate-400 truncate pr-1">
                    Total Products
                  </CardTitle>
                  <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-1.5 sm:p-2 shrink-0">
                    <Package className="h-3 w-3 sm:h-4 sm:w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3 sm:px-5 sm:pb-5">
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {stats.totalInverters.toLocaleString()}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">Registered in system</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3 sm:pb-2 sm:pt-5 sm:px-5">
                  <CardTitle className="font-heading text-xs sm:text-sm font-semibold tracking-wide text-slate-600 dark:text-slate-400 truncate pr-1">
                    Available Stock
                  </CardTitle>
                  <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-1.5 sm:p-2 shrink-0">
                    <Warehouse className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3 sm:px-5 sm:pb-5">
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold tabular-nums text-green-600 dark:text-green-400">
                    {stats.availableInverters.toLocaleString()}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">In factory warehouse</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3 sm:pb-2 sm:pt-5 sm:px-5">
                  <CardTitle className="font-heading text-xs sm:text-sm font-semibold tracking-wide text-slate-600 dark:text-slate-400 truncate pr-1">
                    Dispatched
                  </CardTitle>
                  <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-1.5 sm:p-2 shrink-0">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3 sm:px-5 sm:pb-5">
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                    {stats.dispatchedInverters.toLocaleString()}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">Sent to dealers</p>
                </CardContent>
              </Card>
              <Card className="rounded-xl border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3 sm:pb-2 sm:pt-5 sm:px-5">
                  <CardTitle className="font-heading text-xs sm:text-sm font-semibold tracking-wide text-slate-600 dark:text-slate-400 truncate pr-1">
                    Service Centers
                  </CardTitle>
                  <div className="rounded-lg bg-orange-100 dark:bg-orange-900/30 p-1.5 sm:p-2 shrink-0">
                    <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3 sm:px-5 sm:pb-5">
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold tabular-nums text-orange-600 dark:text-orange-400">–</p>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">Active centers</p>
                </CardContent>
              </Card>
            </>
        </section>
        )}

        {/* Dealer dashboard - quick links (Dealer Stock shown in header top-right) */}
        {user?.role === 'DEALER' && (
          <section className="space-y-6">
            <Card className="rounded-xl border-2 border-blue-200/80 dark:border-blue-800/50 shadow-md bg-white dark:bg-slate-900/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Quick actions</CardTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Go to your main areas</p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="justify-start gap-4 h-auto py-5 px-5 text-base font-semibold rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm hover:shadow-md transition-all duration-200 text-blue-700 dark:text-blue-300"
                  onClick={() => navigate('/dealer/stock')}
                >
                  <Warehouse className="h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>Dealer Stock</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-4 h-auto py-5 px-5 text-base font-semibold rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm hover:shadow-md transition-all duration-200 text-emerald-700 dark:text-emerald-300"
                  onClick={() => navigate('/dealer/sales')}
                >
                  <ShoppingCart className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Sales</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-4 h-auto py-5 px-5 text-base font-semibold rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:border-amber-500 dark:hover:border-amber-500 shadow-sm hover:shadow-md transition-all duration-200 text-amber-700 dark:text-amber-300"
                  onClick={() => navigate('/dealer/transfer')}
                >
                  <ArrowRightLeft className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Transfer to Sub Dealer</span>
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Sub-dealer dashboard - quick links (Dealer Stock shown in header top-right) */}
        {user?.role === 'SUB_DEALER' && (
          <section className="space-y-6">
            <Card className="rounded-xl border-2 border-green-200/80 dark:border-green-800/50 shadow-md bg-white dark:bg-slate-900/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Quick actions</CardTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Go to your main areas</p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="justify-start gap-4 h-auto py-5 px-5 text-base font-semibold rounded-xl border-2 border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/40 hover:border-green-500 dark:hover:border-green-500 shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={() => navigate('/sub-dealer/stock')}
                >
                  <Warehouse className="h-6 w-6 shrink-0 text-green-600 dark:text-green-400" />
                  <span>My Stock</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-4 h-auto py-5 px-5 text-base font-semibold rounded-xl border-2 border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/40 hover:border-green-500 dark:hover:border-green-500 shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={() => navigate('/sub-dealer/sales')}
                >
                  <ShoppingCart className="h-6 w-6 shrink-0 text-green-600 dark:text-green-400" />
                  <span>Sales</span>
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Product catalog - roles with access */}
        {models && Array.isArray(models) && models.length > 0 && (
          <section>
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden bg-white dark:bg-slate-900/80">
              <CardHeader className="bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-800/80 dark:via-slate-900/80 dark:to-indigo-950/20 border-b border-slate-200/80 dark:border-slate-700/80 py-6 px-5 sm:px-6 md:px-8">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-white dark:bg-slate-800 p-3 shadow-md border border-slate-200/80 dark:border-slate-700/80 ring-2 ring-indigo-500/10 dark:ring-indigo-400/10">
                    <Package className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <CardTitle className="font-heading text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-indigo-700 dark:from-slate-100 dark:to-indigo-300 bg-clip-text text-transparent">
                      Product Catalog
                    </CardTitle>
                    <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 tracking-wide">
                      Browse product lines and variants
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 pt-6">
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
                  <div className="space-y-0">
                    {/* Inverters */}
                    {inverterModels.length > 0 && (() => {
                      try {
                        const groupedInverters = groupModelsByProductLine(inverterModels);
                        if (!groupedInverters || groupedInverters.size === 0) return null;
                        
                        const sortedGroups = Array.from(groupedInverters.entries()).sort(([, groupA], [, groupB]) => {
                          try {
                            const sortedA = sortVariants(groupA);
                            const sortedB = sortVariants(groupB);
                            if (!sortedA || sortedA.length === 0 || !sortedB || sortedB.length === 0) return 0;
                            const primaryA = sortedA[0];
                            const primaryB = sortedB[0];
                            if (!primaryA || !primaryB) return 0;
                            if (primaryA.active && !primaryB.active) return -1;
                            if (!primaryA.active && primaryB.active) return 1;
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
                          <section className="relative rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-orange-500 dark:from-amber-500 dark:to-orange-600" aria-hidden />
                            <div className="p-6 md:p-8 pl-7 md:pl-9">
                              <div className="flex items-center gap-4 mb-6">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/50 shadow-sm">
                                  <Sun className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-0.5">OffGrid & hybrid</p>
                                  <h3 className="font-heading text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Inverters</h3>
                                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{inverterModels.length} models across {groupedInverters.size} product lines</p>
                                </div>
                              </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
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
                                    className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200"
                                  >
                                    {/* Image Section */}
                                    <div className="relative h-48 bg-slate-50 dark:bg-slate-800/50 overflow-hidden rounded-t-xl">
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
                                      
                                      {/* Variant Display - wrap so all buttons stay inside card */}
                                      <div className="mb-2 min-w-0">
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
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                try {
                                                  setSelectedVariant(model);
                                                  setIsDialogOpen(true);
                                                } catch (err) {
                                                  console.error('Variant click error:', err);
                                                }
                                              }}
                                              className={cn(
                                                "inline-flex items-center justify-center shrink-0 px-5 py-1.5 text-xs font-medium rounded-lg border-2 transition-all duration-150 whitespace-nowrap relative cursor-pointer min-h-[32px]",
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
                                      
                                      {/* Warranty Section - single line, no wrap */}
                                      <div className="mt-auto pt-1.5 border-t border-slate-200 dark:border-slate-700 min-w-0">
                                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                                          Warranty
                                        </p>
                                        <div className="flex flex-nowrap justify-between items-center gap-1.5">
                                          <button type="button" className="inline-flex items-center shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded border border-blue-400 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-150 whitespace-nowrap">
                                            <Shield className="h-2 w-2 mr-0.5" />
                                            <span>Parts: {formatWarrantyYears(primaryModel.warranty?.partsMonths, 12)}</span>
                                          </button>
                                          <button type="button" className="inline-flex items-center shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded border border-green-400 text-green-600 dark:text-green-400 bg-white dark:bg-slate-900 hover:bg-green-50 dark:hover:bg-green-950/30 transition-all duration-150 whitespace-nowrap">
                                            <Calendar className="h-2 w-2 mr-0.5" />
                                            <span>Service: {formatWarrantyYears(primaryModel.warranty?.serviceMonths, 24)}</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            </div>
                        </section>
                        );
                      } catch (error) {
                        console.error('Error rendering inverters:', error);
                        return null;
                      }
                    })()}

                  {/* Batteries - Each model is separate */}
                  {batteryModels.length > 0 && (() => {
                    const groupedBatteries = groupModelsByProductLine(batteryModels, true);
                    
                    // Sort battery groups: active first, then by power; discontinued at the end
                    const sortedBatteryGroups = Array.from(groupedBatteries.entries()).sort(([, groupA], [, groupB]) => {
                      const modelA = groupA[0];
                      const modelB = groupB[0];
                      if (modelA?.active && !modelB?.active) return -1;
                      if (!modelA?.active && modelB?.active) return 1;
                      const powerA = extractPowerRating(modelA);
                      const powerB = extractPowerRating(modelB);
                      const orderA = getPowerSortOrder(powerA);
                      const orderB = getPowerSortOrder(powerB);
                      return orderA - orderB;
                    });
                    
                    return (
                      <section className="relative mt-10 rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-green-600 dark:from-emerald-500 dark:to-green-600" aria-hidden />
                        <div className="p-6 md:p-8 pl-7 md:pl-9">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/50 shadow-sm">
                              <Battery className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-0.5">Energy storage</p>
                              <h3 className="font-heading text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Batteries</h3>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{batteryModels.length} models</p>
                            </div>
                          </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                          {sortedBatteryGroups.map(([key, modelGroup]) => {
                            if (!modelGroup || !Array.isArray(modelGroup) || modelGroup.length === 0) return null;
                            const model = modelGroup[0];
                            if (!model || !model._id) return null;
                            const productLineName = `${model.brand || ''} ${model.productLine || ''} ${model.variant || ''}`.trim();
                            
                            return (
                              <div
                                key={key}
                                className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200"
                              >
                                {/* Image Section */}
                                <div className="relative h-48 bg-slate-50 dark:bg-slate-800/50 overflow-hidden rounded-t-xl">
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
                                  
                                  {/* Variant Display - wrap so all buttons stay inside card */}
                                  <div className="mb-2 min-w-0">
                                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                                      Variant
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          try {
                                            setSelectedVariant(model);
                                            setIsDialogOpen(true);
                                          } catch (err) {
                                            console.error('Variant click error:', err);
                                          }
                                        }}
                                        className="inline-flex items-center justify-center shrink-0 px-5 py-1.5 text-xs font-medium rounded-lg border-2 border-red-400 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 transition-all duration-150 relative cursor-pointer min-h-[32px]"
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
                                  
                                  {/* Warranty Section - single line, no wrap */}
                                  <div className="mt-auto pt-1.5 border-t border-slate-200 dark:border-slate-700 min-w-0">
                                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                                      Warranty
                                    </p>
                                    <div className="flex flex-nowrap justify-between items-center gap-1.5">
                                      <button type="button" className="inline-flex items-center shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded border border-blue-400 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-150 whitespace-nowrap">
                                        <Shield className="h-2 w-2 mr-0.5" />
                                        <span>Parts: {formatWarrantyYears(model.warranty?.partsMonths, 12)}</span>
                                      </button>
                                      <button type="button" className="inline-flex items-center shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded border border-green-400 text-green-600 dark:text-green-400 bg-white dark:bg-slate-900 hover:bg-green-50 dark:hover:bg-green-950/30 transition-all duration-150 whitespace-nowrap">
                                        <Calendar className="h-2 w-2 mr-0.5" />
                                        <span>Service: {formatWarrantyYears(model.warranty?.serviceMonths, 24)}</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        </div>
                      </section>
                    );
                  })()}

                  {/* VFD - Generic card showing all variants */}
                  {vfdModels.length > 0 && (() => {
                    const groupedVFD = groupModelsByProductLine(vfdModels);
                    
                    // Sort VFD groups: active first, then by power; discontinued at the end
                    const sortedVFDGroups = Array.from(groupedVFD.entries()).sort(([, groupA], [, groupB]) => {
                      const sortedA = sortVariants(groupA);
                      const sortedB = sortVariants(groupB);
                      const primaryA = sortedA[0];
                      const primaryB = sortedB[0];
                      if (primaryA?.active && !primaryB?.active) return -1;
                      if (!primaryA?.active && primaryB?.active) return 1;
                      const powerA = extractPowerRating(primaryA);
                      const powerB = extractPowerRating(primaryB);
                      const orderA = getPowerSortOrder(powerA);
                      const orderB = getPowerSortOrder(powerB);
                      return orderA - orderB;
                    });
                    
                    return (
                      <section className="relative mt-10 rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-400 to-indigo-600 dark:from-violet-500 dark:to-indigo-600" aria-hidden />
                        <div className="p-6 md:p-8 pl-7 md:pl-9">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200/80 dark:border-violet-800/50 shadow-sm">
                              <Gauge className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-0.5">Variable frequency drives</p>
                              <h3 className="font-heading text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">VFD</h3>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{vfdModels.length} models across {groupedVFD.size} product lines</p>
                            </div>
                          </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
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
                                className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 cursor-pointer"
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
                                    <Gauge className="h-12 w-12 text-slate-300 dark:text-slate-600" />
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
                      </section>
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

              </CardContent>
            </Card>
          </section>
        )}

      </main>

      {/* Variant Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('model');
            return next;
          });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[95dvh] sm:max-h-[90vh] overflow-y-auto rounded-2xl border-slate-200/80 dark:border-slate-700/80 shadow-xl p-3 sm:p-6">
          {selectedVariant && (
            <>
              <DialogHeader className="space-y-1 pb-2 sm:pb-4">
                <DialogTitle className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                  {selectedVariant.modelName || `${selectedVariant.brand} ${selectedVariant.productLine} ${selectedVariant.variant}`}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 tracking-wide">
                  Complete product specifications and warranty information
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-3 sm:space-y-6 mt-2 sm:mt-4">
                <div className="relative h-20 sm:aspect-video sm:h-auto bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg overflow-hidden">
                  <img
                    src={getModelImage(selectedVariant)}
                    alt={selectedVariant.modelName || selectedVariant.modelCode}
                    className="w-full h-full object-contain p-3 sm:p-8"
                    onError={(e) => {
                      getImageErrorHandler(selectedVariant)(e);
                      const placeholder = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'flex';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700" style={{ display: 'none' }}>
                    <Package className="h-10 w-10 sm:h-20 sm:w-20 text-slate-300 dark:text-slate-600" />
                  </div>
                  
                  <div className="absolute top-1.5 right-1.5 sm:top-4 sm:right-4">
                    {selectedVariant.active ? (
                      <span className="px-2 py-0.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide rounded-md sm:rounded-lg bg-emerald-500 text-white shadow-lg">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide rounded-md sm:rounded-lg bg-slate-500 text-white shadow-lg">
                        Discontinued
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="flex items-center gap-2 p-2 sm:items-start sm:gap-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg min-w-0">
                    <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                      <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1 truncate">Brand</p>
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{selectedVariant.brand || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 sm:items-start sm:gap-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg min-w-0">
                    <div className="p-1.5 sm:p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg shrink-0">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1 truncate">Product Line</p>
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{selectedVariant.productLine || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 sm:items-start sm:gap-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg min-w-0">
                    <div className="p-1.5 sm:p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg shrink-0">
                      <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1 truncate">Variant</p>
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{selectedVariant.variant || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 sm:items-start sm:gap-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg min-w-0">
                    <div className="p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-700 rounded-lg shrink-0">
                      <Hash className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1 truncate">Model Code</p>
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono truncate">{selectedVariant.modelCode || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <h3 className="font-heading font-bold text-sm sm:text-lg tracking-tight text-slate-900 dark:text-slate-100">Warranty Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <p className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5 sm:mb-1">Parts Warranty</p>
                      <p className="text-base sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatWarrantyYears(selectedVariant.warranty?.partsMonths, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5 sm:mb-1">Service Warranty</p>
                      <p className="text-base sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatWarrantyYears(selectedVariant.warranty?.serviceMonths, 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timeline (Created / Last Updated) - only for FACTORY_ADMIN; hidden for all other roles */}
                {user && user.role === 'FACTORY_ADMIN' && (selectedVariant.createdAt || selectedVariant.updatedAt) && (
                  <div className="pt-2 sm:pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500 dark:text-slate-400" />
                      <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">Timeline</p>
                    </div>
                    <div className="space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">
                      {selectedVariant.createdAt && (
                        <p>Created: {new Date(selectedVariant.createdAt).toLocaleDateString()}</p>
                      )}
                      {selectedVariant.updatedAt && (
                        <p>Last Updated: {new Date(selectedVariant.updatedAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Technical support videos - prominent, focusable to attract users */}
                {selectedVariant.supportVideoLinks && selectedVariant.supportVideoLinks.length > 0 && (
                  <div className="pt-2 sm:pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="rounded-lg sm:rounded-xl bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30 border-2 border-rose-200 dark:border-rose-800/50 p-2 sm:p-4 space-y-2 sm:space-y-3">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 sm:gap-2">
                        <Video className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600 dark:text-rose-400 shrink-0" />
                        Technical support videos
                      </p>
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        {selectedVariant.supportVideoLinks.map((link: { title: string; url: string }, i: number) => (
                          <Button
                            key={i}
                            type="button"
                            className="min-h-[36px] sm:min-h-[44px] px-3 py-1.5 sm:px-5 sm:py-2.5 text-xs sm:text-sm justify-center bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-semibold shadow-md hover:shadow-lg focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 rounded-lg transition-all duration-200 hover:scale-[1.02]"
                            onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                          >
                            <Video className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                            <span className="truncate max-w-[120px] sm:max-w-[200px]">{link.title || 'Video'}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700">
                  {/* Technical Datasheet - same style as other action buttons */}
                  {selectedVariant.datasheet && (
                    <Button
                      onClick={() => {
                        setIsDialogOpen(false);
                        setSelectedModelForPdf(selectedVariant);
                        setIsPdfDialogOpen(true);
                      }}
                      className="flex-1 min-w-0 sm:min-w-[140px] justify-center text-xs sm:text-sm py-2 sm:py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                    >
                      <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                      <span className="truncate">Technical Datasheet</span>
                    </Button>
                  )}
                  {/* User Manual - same row, same style (e.g. Google Drive link) */}
                  {selectedVariant.userManualUrl && (
                    <Button
                      type="button"
                      onClick={() => window.open(selectedVariant.userManualUrl, '_blank', 'noopener,noreferrer')}
                      className="flex-1 min-w-0 sm:min-w-[140px] justify-center text-xs sm:text-sm py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                    >
                      <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                      User Manual
                    </Button>
                  )}
                  {/* Full Life Cycle View - admin, service center, installer program manager */}
                  {user?.role && ROLES_WITH_LIFECYCLE_ACCESS.includes(user.role) && (
                    <Button 
                      onClick={() => {
                        setIsDialogOpen(false);
                        navigate(`/lifecycle?modelId=${selectedVariant._id}`);
                      }}
                      className="flex-1 min-w-0 sm:min-w-[140px] justify-center text-xs sm:text-sm py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    >
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                      <span className="truncate">Full Life Cycle View</span>
                    </Button>
                  )}
                  <Button onClick={() => setIsDialogOpen(false)} variant="outline" className="shrink-0 px-3 sm:px-5 justify-center text-xs sm:text-sm py-2">
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
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border-slate-200/80 dark:border-slate-700/80 shadow-xl">
          {selectedVFDGroup && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {selectedVFDGroup.displayName}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 tracking-wide">
                  All available variants — click on any variant to view its complete lifecycle
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

      {/* PDF Viewer Dialog */}
      <Dialog open={isPdfDialogOpen} onOpenChange={setIsPdfDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-6xl max-h-[95dvh] sm:max-h-[95vh] overflow-hidden flex flex-col rounded-2xl border-slate-200/80 dark:border-slate-700/80 shadow-xl p-3 sm:p-6">
          {selectedModelForPdf && (
            <>
              <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-700 space-y-1">
                <DialogTitle className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2 sm:gap-3 truncate min-w-0">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">
                    {selectedModelForPdf.modelName || `${selectedModelForPdf.brand} ${selectedModelForPdf.productLine} ${selectedModelForPdf.variant}`}
                  </span>
                </DialogTitle>
                <DialogDescription className="mt-1 sm:mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 tracking-wide">
                  <span className="font-mono font-medium">{selectedModelForPdf.modelCode}</span>
                  {' — '}
                  Technical Datasheet
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col mt-2 sm:mt-4">
                {selectedModelForPdf.datasheet ? (
                  <iframe
                    src={selectedModelForPdf.datasheet}
                    className="w-full flex-1 min-h-0 border-2 border-slate-200 dark:border-slate-700 rounded-lg"
                    title={`Datasheet for ${selectedModelForPdf.modelCode}`}
                  />
                ) : (
                  <div className="flex-1 min-h-0 flex items-center justify-center p-6 sm:p-12 bg-slate-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
                    <div className="text-center">
                      <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400 dark:text-slate-500 mx-auto mb-3 sm:mb-4" />
                      <p className="text-base sm:text-lg font-semibold text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2">
                        No Datasheet Available
                      </p>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-500">
                        This product model does not have a technical datasheet uploaded yet.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex-shrink-0 flex justify-between items-center gap-3 pt-4 sm:pt-5 border-t border-slate-200 dark:border-slate-700 mt-4 sm:mt-5 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPdfDialogOpen(false);
                    setIsDialogOpen(true);
                  }}
                  className="shrink-0 rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-200 font-medium text-sm py-2.5 px-5 shadow-sm hover:shadow transition-all"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                {selectedModelForPdf.datasheet && (
                  <Button
                    onClick={() => {
                      window.open(selectedModelForPdf.datasheet, '_blank');
                    }}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-sm py-2.5 px-5 shadow-md hover:shadow-lg transition-all"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
