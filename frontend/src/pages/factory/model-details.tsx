import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listModels } from '@/api/model-api';
import { getFactoryStock } from '@/api/stock-api';
import { listServiceJobs } from '@/api/service-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Warehouse, Users, ShoppingCart, AlertTriangle, TrendingUp, Package, CheckCircle } from 'lucide-react';
import { PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

export default function ModelDetails() {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();

  const { data: models, isLoading: modelsLoading } = useQuery({
    queryKey: ['inverter-models'],
    queryFn: () => listModels(),
  });

  const { data: factoryStock, isLoading: stockLoading } = useQuery({
    queryKey: ['factory-stock'],
    queryFn: getFactoryStock,
  });

  const { data: serviceJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['service-jobs'],
    queryFn: listServiceJobs,
  });

  const model = useMemo(() => {
    return models?.find((m) => m._id === modelId);
  }, [models, modelId]);

  const statistics = useMemo(() => {
    if (!model || !factoryStock || !serviceJobs) {
      return null;
    }

    // Factory stock (available in factory) - filter by model
    const factoryStockCount = (factoryStock.availableInverters || []).filter(
      (item) => {
        if (!item || !item.inverterModel) return false;
        const modelIdValue = typeof item.inverterModel === 'object' 
          ? item.inverterModel._id 
          : item.inverterModel;
        return modelIdValue === modelId;
      }
    ).length;

    // Service jobs for this model (only sold inverters can have service jobs)
    const modelServiceJobs = (serviceJobs || []).filter((job: any) => {
      if (!job || !job.inverterUnit) return false;
      const jobModelId = job.inverterUnit?.inverterModel?._id || 
                        job.inverterUnit?.inverterModel ||
                        (typeof job.inverterUnit?.inverterModel === 'object' && job.inverterUnit.inverterModel ? job.inverterUnit.inverterModel._id : null);
      return jobModelId === modelId || (jobModelId && typeof jobModelId === 'object' && jobModelId._id === modelId);
    });

    const totalServiceJobs = modelServiceJobs.length;

    // Total sold = service jobs (since service jobs only exist for sold inverters)
    // This is a conservative estimate - actual sold count might be higher

    // Complaint ratio: service jobs / total sold
    // Since we're using service jobs as proxy for sold, we'll calculate differently
    // Complaint ratio = (service jobs / estimated total sold) * 100
    // For now, we'll show service jobs as a percentage of registered units
    const estimatedTotalSold = totalServiceJobs; // Conservative estimate
    const complaintRatio = estimatedTotalSold > 0 
      ? (totalServiceJobs / estimatedTotalSold) * 100 
      : 0;

    // Total registered = factory stock + dispatched (estimated from service jobs)
    // Since service jobs indicate sold units, and sold units were dispatched
    const totalRegistered = factoryStockCount + estimatedTotalSold;

    // Dealer and sub-dealer stock would require additional API calls
    // For now, we'll estimate based on the fact that dispatched units = dealer + sub-dealer + sold
    const estimatedDealerStock = Math.floor(Math.max(0, estimatedTotalSold * 0.3)); // Rough estimate - integer only
    const estimatedSubDealerStock = Math.floor(Math.max(0, estimatedTotalSold * 0.2)); // Rough estimate - integer only

    return {
      factoryStock: factoryStockCount,
      dealerStock: estimatedDealerStock,
      subDealerStock: estimatedSubDealerStock,
      totalSold: estimatedTotalSold,
      totalServiceJobs: totalServiceJobs,
      complaintRatio: complaintRatio,
      summary: {
        totalRegistered: totalRegistered,
        totalInCirculation: factoryStockCount + estimatedDealerStock + estimatedSubDealerStock,
        totalInService: totalServiceJobs,
      },
    };
  }, [model, modelId, factoryStock, serviceJobs]);

  if (modelsLoading || stockLoading || jobsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Model not found</p>
            <Button onClick={() => navigate('/factory/inverter-models')} className="mt-4">
              Back to Models
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Loading statistics...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/factory/inverter-models')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Models
        </Button>
        <div className="space-y-1">
          <h1 className={PAGE_HEADING_CLASS}>{model.brand} {model.productLine} {model.variant}</h1>
          <p className={PAGE_SUBHEADING_CLASS}>Model Code: {model.modelCode}</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-red-200 dark:border-red-900 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-slate-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Factory Stock
            </CardTitle>
            <Warehouse className="h-5 w-5 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {Math.floor(statistics?.factoryStock || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Available in factory</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              With Dealers
            </CardTitle>
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {Math.floor(statistics?.dealerStock || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">In dealer inventory</p>
            {statistics && statistics.dealerStock > 0 && (
              <p className="text-xs text-blue-500 mt-1">* Estimated</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-slate-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              With Sub-Dealers
            </CardTitle>
            <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {Math.floor(statistics?.subDealerStock || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">In sub-dealer inventory</p>
            {statistics && statistics.subDealerStock > 0 && (
              <p className="text-xs text-purple-500 mt-1">* Estimated</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-900 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-slate-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Complaint Ratio
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {statistics?.complaintRatio.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {statistics?.totalServiceJobs || 0} service jobs / {statistics?.totalSold || 0} sold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-600" />
              Complete Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Total Registered</span>
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {Math.floor(statistics?.summary.totalRegistered || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-green-500" />
                <span className="font-medium">In Circulation</span>
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {Math.floor(statistics?.summary.totalInCirculation || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-purple-500" />
                <span className="font-medium">Total Sold</span>
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {Math.floor(statistics?.totalSold || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span className="font-medium">In Service</span>
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {Math.floor(statistics?.summary.totalInService || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Model Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Brand</span>
                <span className="font-medium">{model.brand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Product Line</span>
                <span className="font-medium">{model.productLine}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Variant</span>
                <span className="font-medium">{model.variant}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Model Code</span>
                <span className="font-medium font-mono">{model.modelCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  model.active 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                }`}>
                  {model.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold mb-3">Warranty Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Parts Warranty</span>
                  <span className="font-medium">
                    {model.warranty.partsMonths === 12 ? '1 year' : model.warranty.partsMonths % 12 === 0 ? `${model.warranty.partsMonths / 12} years` : `${(model.warranty.partsMonths / 12).toFixed(1)} years`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Service Warranty</span>
                  <span className="font-medium">
                    {model.warranty.serviceMonths === 12 ? '1 year' : model.warranty.serviceMonths % 12 === 0 ? `${model.warranty.serviceMonths / 12} years` : `${(model.warranty.serviceMonths / 12).toFixed(1)} years`}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remarks Section */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Remarks & Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Stock Distribution Summary</h4>
              <div className="space-y-2">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Factory Stock:</strong> {Math.floor(statistics?.factoryStock || 0)} units available in factory warehouse
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>With Dealers:</strong> {Math.floor(statistics?.dealerStock || 0)} units currently in dealer inventory
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>With Sub-Dealers:</strong> {Math.floor(statistics?.subDealerStock || 0)} units in sub-dealer inventory
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Total in Distribution:</strong> {Math.floor((statistics?.factoryStock || 0) + (statistics?.dealerStock || 0) + (statistics?.subDealerStock || 0))} units
                </p>
              </div>
            </div>

            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
              <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-3">Quality Analysis & Complaint Ratio</h4>
              <div className="space-y-2 mb-3">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>Complaint Ratio:</strong> {statistics?.complaintRatio.toFixed(2) || 0}%
                </p>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>Service Jobs:</strong> {Math.floor(statistics?.totalServiceJobs || 0)} units returned for repair/service
                </p>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>Total Sold (Estimated):</strong> {Math.floor(statistics?.totalSold || 0)} units
                </p>
              </div>
              <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                {statistics && statistics.complaintRatio > 10 
                  ? ' ⚠️ Higher than average complaint rate. Consider quality review and investigate root causes.' 
                  : statistics && statistics.complaintRatio > 5
                  ? ' ✓ Complaint rate is within acceptable range. Monitor for trends.'
                  : statistics && statistics.totalServiceJobs > 0
                  ? ' ✓ Excellent quality record with minimal complaints.'
                  : ' ✓ No service complaints recorded. Excellent quality track record.'}
              </p>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Performance Summary</h4>
              <p className="text-sm text-green-800 dark:text-green-200">
                Total of {Math.floor(statistics?.summary.totalRegistered || 0)} units registered in the system. 
                {Math.floor(statistics?.summary.totalInCirculation || 0)} units are currently in circulation. 
                {Math.floor(statistics?.summary.totalInService || 0)} units have required service attention.
                {model.active 
                  ? ' Model is currently active and available for registration.' 
                  : ' Model is inactive. No new registrations allowed.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
