import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getFactoryStock } from '@/api/stock-api';
import { listServiceJobs } from '@/api/service-api';
import { listModels } from '@/api/model-api';
import { Warehouse, Package, Wrench, TrendingUp, Users, Building2, Zap, Battery, Sun, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { user } = useAuth();

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
    queryFn: listModels,
    enabled: user?.role === 'FACTORY_ADMIN',
  });

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
        { label: 'Register Inverters', path: '/factory/inverter-registration', icon: Package },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {user?.name}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {user?.role === 'FACTORY_ADMIN' && (
          <>
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Inverters
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
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-red-600" />
              Product Lines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Helper function to categorize models */}
            {(() => {
              const categorizeModel = (model: any) => {
                if (!model) return null;
                
                // Get all text fields and combine them for searching
                const productLine = (model.productLine || '').toLowerCase();
                const brand = (model.brand || '').toLowerCase();
                const variant = (model.variant || '').toLowerCase();
                const modelCode = (model.modelCode || '').toLowerCase();
                
                // Create full model name for searching (all possible combinations)
                const fullName = `${brand} ${productLine} ${variant} ${modelCode}`.toLowerCase();
                
                // Check for VFD first (most specific - check for "vfd" keyword)
                // Examples: "Sunlife VFD 2.2kW", "Sunlife VFD 5.5kW"
                if (
                  productLine.includes('vfd') || 
                  brand.includes('vfd') || 
                  variant.includes('vfd') || 
                  modelCode.includes('vfd') ||
                  fullName.includes('vfd')
                ) {
                  return 'vfd';
                }
                
                // Check for battery (check for "battery", "batt", "lithium")
                // Examples: "Lithium RM 51.2V 100AH", "Lithium 48100M", "Lithium SL-48100M"
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
                  // Battery-specific patterns
                  fullName.includes('51.2v') ||
                  fullName.includes('48100') ||
                  fullName.includes('48314') ||
                  fullName.includes('100ah')
                ) {
                  return 'battery';
                }
                
                // Check for solar panel
                if (
                  productLine.includes('panel') || 
                  productLine.includes('solar') || 
                  brand.includes('solar') || 
                  variant.includes('panel') ||
                  fullName.includes('panel') ||
                  fullName.includes('solar')
                ) {
                  return 'solar';
                }
                
                // Check for inverter (check for "inverter" keyword or common inverter naming patterns)
                // Examples: "Sunpro 1.5kW", "SL 2.0kW", "SL Premium 3kW", "SL Royal 4kW", "SL-SKY ULTRA 8KW"
                if (
                  productLine.includes('inverter') || 
                  brand.includes('inverter') || 
                  variant.includes('inverter') || 
                  modelCode.includes('inverter') ||
                  fullName.includes('inverter') ||
                  // Common inverter naming patterns
                  variant.includes('kw') ||
                  variant.includes('w') ||
                  productLine.includes('sunpro') ||
                  productLine.includes('sl') ||
                  productLine.includes('sky') ||
                  productLine.includes('ultra') ||
                  productLine.includes('plus') ||
                  productLine.includes('royal') ||
                  productLine.includes('elite') ||
                  productLine.includes('iv') ||
                  productLine.includes('premium') ||
                  productLine.includes('infini') ||
                  productLine.includes('ip65') ||
                  modelCode.includes('kw') ||
                  modelCode.includes('w') ||
                  // If it has kW/W pattern and not battery/vfd, it's likely an inverter
                  (fullName.match(/\d+\.?\d*\s*(kw|w)/i) && !fullName.includes('lithium') && !fullName.includes('vfd'))
                ) {
                  return 'inverter';
                }
                
                // Default to inverter if unclear (most products are inverters)
                return 'inverter';
              };

              const inverterModels = models.filter(m => categorizeModel(m) === 'inverter');
              const batteryModels = models.filter(m => categorizeModel(m) === 'battery');
              const solarModels = models.filter(m => categorizeModel(m) === 'solar');
              const vfdModels = models.filter(m => categorizeModel(m) === 'vfd');

              const getModelName = (model: any) => {
                if (!model) return '';
                return `${model.brand || ''} ${model.productLine || ''} ${model.variant || ''}`.trim();
              };

              const getModelImage = (model: any) => {
                // Use image from database if available
                if (model.image) {
                  return model.image;
                }
                // Fallback: generate from modelCode (try .jpg first)
                const modelCode = (model.modelCode || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
                return `/products/${modelCode}.jpg`;
              };

              return (
                <div className="space-y-6">
                  {/* Inverters */}
                  {inverterModels.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Inverters</h3>
                        <span className="text-sm text-slate-500 dark:text-slate-400">({inverterModels.length} models)</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {inverterModels.map((model) => (
                          <div
                            key={model._id}
                            className="group relative border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 hover:shadow-lg transition-all duration-200"
                          >
                            <div className="aspect-square bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 flex items-center justify-center relative overflow-hidden">
                              <img
                                src={getModelImage(model)}
                                alt={getModelName(model)}
                                className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-200"
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  const currentSrc = img.src;
                                  // Try .png if .jpg failed
                                  if (currentSrc.endsWith('.jpg')) {
                                    img.src = currentSrc.replace('.jpg', '.png');
                                    return;
                                  }
                                  // Try .jpeg if .png failed
                                  if (currentSrc.endsWith('.png')) {
                                    img.src = currentSrc.replace('.png', '.jpeg');
                                    return;
                                  }
                                  // Fallback to placeholder if all extensions fail
                                  img.style.display = 'none';
                                  const placeholder = img.nextElementSibling as HTMLElement;
                                  if (placeholder) placeholder.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20" style={{ display: 'none' }}>
                                <Zap className="h-12 w-12 text-blue-400 opacity-50" />
                              </div>
                            </div>
                            <div className="p-3">
                              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 mb-1">
                                {getModelName(model)}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{model.modelCode}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Batteries */}
                  {batteryModels.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <Battery className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Batteries</h3>
                        <span className="text-sm text-slate-500 dark:text-slate-400">({batteryModels.length} models)</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {batteryModels.map((model) => (
                          <div
                            key={model._id}
                            className="group relative border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 hover:shadow-lg transition-all duration-200"
                          >
                            <div className="aspect-square bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 flex items-center justify-center relative overflow-hidden">
                              <img
                                src={getModelImage(model)}
                                alt={getModelName(model)}
                                className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-200"
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  const currentSrc = img.src;
                                  // Try .png if .jpg failed
                                  if (currentSrc.endsWith('.jpg')) {
                                    img.src = currentSrc.replace('.jpg', '.png');
                                    return;
                                  }
                                  // Try .jpeg if .png failed
                                  if (currentSrc.endsWith('.png')) {
                                    img.src = currentSrc.replace('.png', '.jpeg');
                                    return;
                                  }
                                  // Fallback to placeholder if all extensions fail
                                  img.style.display = 'none';
                                  const placeholder = img.nextElementSibling as HTMLElement;
                                  if (placeholder) placeholder.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20" style={{ display: 'none' }}>
                                <Battery className="h-12 w-12 text-green-400 opacity-50" />
                              </div>
                            </div>
                            <div className="p-3">
                              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 mb-1">
                                {getModelName(model)}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{model.modelCode}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Solar Panels */}
                  {solarModels.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                          <Sun className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Solar Panels</h3>
                        <span className="text-sm text-slate-500 dark:text-slate-400">({solarModels.length} models)</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {solarModels.map((model) => (
                          <div
                            key={model._id}
                            className="group relative border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 hover:shadow-lg transition-all duration-200"
                          >
                            <div className="aspect-square bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20 flex items-center justify-center relative overflow-hidden">
                              <img
                                src={getModelImage(model)}
                                alt={getModelName(model)}
                                className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-200"
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  const currentSrc = img.src;
                                  // Try .png if .jpg failed
                                  if (currentSrc.endsWith('.jpg')) {
                                    img.src = currentSrc.replace('.jpg', '.png');
                                    return;
                                  }
                                  // Try .jpeg if .png failed
                                  if (currentSrc.endsWith('.png')) {
                                    img.src = currentSrc.replace('.png', '.jpeg');
                                    return;
                                  }
                                  // Fallback to placeholder if all extensions fail
                                  img.style.display = 'none';
                                  const placeholder = img.nextElementSibling as HTMLElement;
                                  if (placeholder) placeholder.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20" style={{ display: 'none' }}>
                                <Sun className="h-12 w-12 text-yellow-400 opacity-50" />
                              </div>
                            </div>
                            <div className="p-3">
                              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 mb-1">
                                {getModelName(model)}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{model.modelCode}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* VFD */}
                  {vfdModels.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">VFD (Variable Frequency Drives)</h3>
                        <span className="text-sm text-slate-500 dark:text-slate-400">({vfdModels.length} models)</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {vfdModels.map((model) => (
                          <div
                            key={model._id}
                            className="group relative border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 hover:shadow-lg transition-all duration-200"
                          >
                            <div className="aspect-square bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 flex items-center justify-center relative overflow-hidden">
                              <img
                                src={getModelImage(model)}
                                alt={getModelName(model)}
                                className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-200"
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  const currentSrc = img.src;
                                  // Try .png if .jpg failed
                                  if (currentSrc.endsWith('.jpg')) {
                                    img.src = currentSrc.replace('.jpg', '.png');
                                    return;
                                  }
                                  // Try .jpeg if .png failed
                                  if (currentSrc.endsWith('.png')) {
                                    img.src = currentSrc.replace('.png', '.jpeg');
                                    return;
                                  }
                                  // Fallback to placeholder if all extensions fail
                                  img.style.display = 'none';
                                  const placeholder = img.nextElementSibling as HTMLElement;
                                  if (placeholder) placeholder.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20" style={{ display: 'none' }}>
                                <Settings className="h-12 w-12 text-purple-400 opacity-50" />
                              </div>
                            </div>
                            <div className="p-3">
                              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 mb-1">
                                {getModelName(model)}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{model.modelCode}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* All Models Link */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Link to="/factory/inverter-models">
                <Button variant="outline" className="w-full">
                  View All Product Models
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
    </div>
  );
}
