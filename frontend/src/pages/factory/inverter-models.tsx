import { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listModels, createModel, updateModel, deleteModel, uploadModelImage, uploadModelDatasheet } from '@/api/model-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Boxes, Shield, Calendar, Upload, Zap, Battery, Settings, Tag, Hash, Loader2, CheckCircle2, Trash2, Image as ImageIcon, FileText, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { getProductImageWithHandler } from '@/lib/image-utils';

const modelSchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  productLine: z.string().min(1, 'Product line is required'),
  variant: z.string().min(1, 'Variant is required'),
  modelCode: z.string().min(1, 'Model code is required'),
  partsMonths: z.number().min(0),
  serviceMonths: z.number().min(0),
  image: z.string().optional(),
  datasheet: z.string().optional(),
  active: z.boolean().default(true),
});

type ModelFormData = z.infer<typeof modelSchema>;

// Helper function to categorize models
const categorizeModel = (model: any) => {
  if (!model) return 'inverter';
  
  const productLine = (model.productLine || '').toLowerCase();
  const brand = (model.brand || '').toLowerCase();
  const variant = (model.variant || '').toLowerCase();
  const modelCode = (model.modelCode || '').toLowerCase();
  const fullName = `${brand} ${productLine} ${variant} ${modelCode}`.toLowerCase();
  
  // Check for VFD
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
  
  // Everything else is an inverter
  return 'inverter';
};

export default function InverterModels() {
  const [editingModel, setEditingModel] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageUpdateModel, setImageUpdateModel] = useState<any>(null);
  const [imageUpdatePreview, setImageUpdatePreview] = useState<string>('');
  const [datasheetUpdateModel, setDatasheetUpdateModel] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ modelId: string; modelName: string } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    control,
  } = useForm<ModelFormData>({
    resolver: zodResolver(modelSchema),
    defaultValues: {
      brand: 'Sunlife',
      active: true,
    },
  });

  const watchedImage = watch('image');
  const watchedBrand = watch('brand');
  const watchedProductLine = watch('productLine');
  const watchedVariant = watch('variant');
  const watchedModelCode = watch('modelCode');

  // Function to generate model code from brand, productLine, and variant
  const generateModelCode = (brand: string, productLine: string, variant: string): string => {
    if (!productLine || !variant) return '';
    
    const brandUpper = (brand || 'Sunlife').toUpperCase();
    const productLineUpper = productLine.toUpperCase().trim();
    const variantUpper = variant.toUpperCase().trim();
    
    // Special case: HI-6K-SL
    if (variantUpper === 'HI-6K-SL' || variantUpper === '6KW' && productLineUpper === 'IP65') {
      return 'HI-6K-SL';
    }
    
    // For VFD models starting with SL-GD170, use variant as-is
    if (productLineUpper === 'VFD' && variantUpper.startsWith('SL-GD170')) {
      return variantUpper;
    }
    
    // For batteries starting with SL-, use variant as-is
    if ((productLineUpper === 'LITHIUM' || productLineUpper.includes('BATTERY')) && variantUpper.startsWith('SL-')) {
      return variantUpper;
    }
    
    // Combine brand, productLine, and variant
    const combined = `${brandUpper} ${productLineUpper} ${variantUpper}`.trim();
    
    // Generate model code: convert to uppercase, replace spaces with hyphens, replace decimals with R
    let modelCode = combined
      .toUpperCase()
      .replace(/\s+/g, '-')
      // Replace decimal point with 'R' (e.g., 3.5 -> 3R5, 2.2 -> 2R2)
      .replace(/(\d+)\.(\d+)/g, '$1R$2')
      // Normalize IP65 variations
      .replace(/IP65|IP-65/gi, 'IP65')
      // Remove other special characters but keep R, numbers, letters, and hyphens
      .replace(/[^A-Z0-9-R]/g, '');
    
    // Special handling for IP65 models
    if (modelCode.includes('IP65')) {
      const kwMatch = variantUpper.match(/(\d+\.?\d*)\s*KW/i) || variantUpper.match(/(\d+\.?\d*)\s*K?W/i);
      if (kwMatch) {
        const kwValue = kwMatch[1].replace(/\./g, 'R').toUpperCase();
        modelCode = `${kwValue}KW-IP65`;
      } else if (modelCode.includes('6KW') || modelCode.includes('6-KW')) {
        modelCode = '6KW-IP65';
      } else {
        // Remove brand and format as: {value}KW-IP65
        modelCode = modelCode.replace(/SUNLIFE-/gi, '').replace(/SL-/gi, '');
        if (!modelCode.endsWith('IP65')) {
          modelCode = modelCode.replace(/IP65.*/gi, '').replace(/[^A-Z0-9-R]/g, '') + '-IP65';
        }
      }
    }
    
    // Remove brand prefix for cleaner codes (e.g., "SUNLIFE-SL-SKY-4KW" -> "SL-SKY-4KW")
    if (modelCode.startsWith('SUNLIFE-')) {
      modelCode = modelCode.replace(/^SUNLIFE-/, '');
    }
    
    return modelCode || combined.toUpperCase().replace(/\s+/g, '-').replace(/(\d+)\.(\d+)/g, '$1R$2');
  };

  // Auto-generate model code when productLine or variant changes
  useEffect(() => {
    if (!editingModel && watchedProductLine && watchedVariant) {
      const autoGeneratedCode = generateModelCode(watchedBrand || 'Sunlife', watchedProductLine, watchedVariant);
      if (autoGeneratedCode && autoGeneratedCode !== watchedModelCode) {
        setValue('modelCode', autoGeneratedCode);
      }
    }
  }, [watchedBrand, watchedProductLine, watchedVariant, editingModel, watchedModelCode, setValue]);

  const { data: models, isLoading } = useQuery({
    queryKey: ['inverter-models'],
    queryFn: () => listModels(), // Show all models (active and discontinued)
  });

  // Group models by category
  const categorizedModels = useMemo(() => {
    if (!models) return { inverter: [], battery: [], vfd: [] };
    
    const inverter: any[] = [];
    const battery: any[] = [];
    const vfd: any[] = [];
    
    models.forEach(model => {
      const category = categorizeModel(model);
      if (category === 'battery') {
        battery.push(model);
      } else if (category === 'vfd') {
        vfd.push(model);
      } else {
        inverter.push(model);
      }
    });
    
    return { inverter, battery, vfd };
  }, [models]);

  const createMutation = useMutation({
    mutationFn: createModel,
    onSuccess: () => {
      toast.success('Product model created successfully');
      reset();
      setImagePreview('');
      queryClient.invalidateQueries({ queryKey: ['inverter-models'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create model');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateModel(id, data),
    onSuccess: () => {
      toast.success('Product model updated successfully');
      reset();
      setImagePreview('');
      setEditingModel(null);
      queryClient.invalidateQueries({ queryKey: ['inverter-models'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Invalidate dashboard to refresh warranty
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update model');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteModel,
    onSuccess: () => {
      toast.success('Product model deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['inverter-models'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete model');
    },
  });

  const handleDelete = (modelId: string, modelName: string) => {
    setDeleteConfirm({ modelId, modelName });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.modelId);
      setDeleteConfirm(null);
    }
  };

  const handleStatusChange = async (modelId: string, newStatus: boolean) => {
    try {
      await updateModel(modelId, { active: newStatus });
      toast.success(`Model ${newStatus ? 'activated' : 'discontinued'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['inverter-models'] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update model status');
    }
  };

  const handleImageUpdate = (model: any) => {
    setImageUpdateModel(model);
    setImageUpdatePreview(model.image ? getProductImageWithHandler(model).src : '');
  };

  const closeImageUpdateDialog = () => {
    setImageUpdateModel(null);
    setImageUpdatePreview('');
  };

  const handleImageUpdateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !imageUpdateModel) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Read file and set preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImageUpdatePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpdateSubmit = async () => {
    if (!imageUpdateModel) return;

    const fileInput = document.getElementById('image-update-input') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    
    if (!file) {
      toast.error('Please select an image file');
      return;
    }

    try {
      // Upload the actual file to the server
      await uploadModelImage(imageUpdateModel._id, file, imageUpdateModel.modelCode);
      toast.success('Product image uploaded and updated successfully');
      queryClient.invalidateQueries({ queryKey: ['inverter-models'] });
      closeImageUpdateDialog();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload image');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Read file and set preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
      
      // Extract filename and set image path
      // For now, we'll use the filename. In production, you'd upload to server
      const fileName = file.name.toLowerCase().replace(/\s+/g, '-');
      const imagePath = `/products/${fileName}`;
      setValue('image', imagePath);
    };
    reader.readAsDataURL(file);
  };

  const handleDatasheetUpdate = (model: any) => {
    setDatasheetUpdateModel(model);
  };

  const closeDatasheetUpdateDialog = () => {
    setDatasheetUpdateModel(null);
  };

  const handleDatasheetUpdateSubmit = async () => {
    if (!datasheetUpdateModel) return;

    const fileInput = document.getElementById('datasheet-update-input') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    
    if (!file) {
      toast.error('Please select a PDF file');
      return;
    }

    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('PDF size should be less than 10MB');
      return;
    }

    try {
      // Upload the actual file to the server
      await uploadModelDatasheet(datasheetUpdateModel._id, file, datasheetUpdateModel.modelCode);
      toast.success('Product datasheet uploaded and updated successfully');
      queryClient.invalidateQueries({ queryKey: ['inverter-models'] });
      closeDatasheetUpdateDialog();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload datasheet');
    }
  };


  const onSubmit = (data: ModelFormData) => {
    const payload = {
      brand: data.brand,
      productLine: data.productLine,
      variant: data.variant,
      modelCode: data.modelCode,
      warranty: {
        partsMonths: data.partsMonths,
        serviceMonths: data.serviceMonths,
      },
      image: data.image || undefined,
      datasheet: data.datasheet || undefined,
      active: data.active,
    };

    if (editingModel) {
      updateMutation.mutate({ id: editingModel._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const renderCategorySection = (_category: string, categoryModels: any[], icon: any, title: string, color: string) => {
    if (categoryModels.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className={cn("p-2 rounded-md", color)}>
            {icon}
          </div>
          <h2 className="text-base font-semibold">{title}</h2>
          <span className="text-xs text-muted-foreground">({categoryModels.length} models)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categoryModels.map((model) => (
            <Card
              key={model._id}
              className="group relative overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900"
            >
              {/* Product Image */}
              <div className="relative h-48 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center overflow-hidden">
                {(() => {
                  const imageHandler = getProductImageWithHandler(model);
                  if (!imageHandler.src) return null;
                  
                  return (
                    <img
                      src={imageHandler.src}
                      alt={model.modelName || `${model.brand} ${model.productLine} ${model.variant}`}
                      className="max-w-full max-h-full object-contain p-4"
                      onError={(e) => {
                        imageHandler.onError(e);
                        const placeholder = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                        if (placeholder) placeholder.style.display = 'flex';
                      }}
                    />
                  );
                })()}
                <div 
                  className={`absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-700 ${model.image ? 'hidden' : 'flex'}`}
                >
                  <Boxes className="h-12 w-12 text-slate-400 dark:text-slate-500" />
                </div>
                
                {/* Status Badge - Top Left Corner */}
                <div className="absolute top-2 left-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(model._id, !model.active);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded transition-all duration-150",
                      model.active
                        ? "bg-green-500 text-white hover:bg-green-600"
                        : "bg-slate-500 text-white hover:bg-slate-600"
                    )}
                    title={`Click to ${model.active ? 'discontinue' : 'activate'} this model`}
                  >
                    {model.active ? (
                      <>
                        <Shield className="h-2.5 w-2.5" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <Hash className="h-2.5 w-2.5" />
                        <span>Discontinued</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <CardContent className="p-4">
                {/* Brand Name */}
                <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-0.5">
                  {model.brand}
                </p>

                {/* Product Name - Show only product line, remove brand if duplicated */}
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1.5 line-clamp-2 leading-tight">
                  {(() => {
                    const brand = (model.brand || '').trim();
                    const productLine = (model.productLine || '').trim();
                    const brandLower = brand.toLowerCase();
                    let displayName = productLine;
                    
                    // Remove brand name from product line if it appears at the start
                    if (brandLower && displayName.toLowerCase().startsWith(brandLower)) {
                      displayName = displayName.substring(brand.length).trim();
                      displayName = displayName.replace(/^[\s-]+/, '');
                    }
                    
                    // For batteries, show variant instead
                    const productLineLower = productLine.toLowerCase();
                    if (productLineLower === 'lithium' || productLineLower.includes('battery')) {
                      return model.variant || model.modelCode || '';
                    }
                    
                    // For IP65, show "IP65"
                    if (productLineLower === 'ip65' || (model.modelCode || '').toUpperCase().includes('IP65')) {
                      return 'IP65';
                    }
                    
                    // For VFD, show variant if available
                    if (productLineLower === 'vfd') {
                      return model.variant || 'VFD';
                    }
                    
                    return displayName.toUpperCase() || productLine.toUpperCase();
                  })()}
                </h3>

                {/* Model Code */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 font-mono">
                  {model.modelCode}
                </p>


                {/* Action Buttons */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      className="flex-1 border border-red-400 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-[11px] font-medium py-1.5 h-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageUpdate(model);
                      }}
                    >
                      <ImageIcon className="h-3 w-3 mr-1" />
                      Update Image
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border border-amber-400 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-[11px] font-medium py-1.5 h-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDatasheetUpdate(model);
                      }}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      {model.datasheet ? 'Update' : 'Add'} Datasheet
                    </Button>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      className="flex-1 border border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-[11px] font-medium py-1.5 h-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingModel(model);
                        setValue('brand', model.brand);
                        setValue('productLine', model.productLine);
                        setValue('variant', model.variant);
                        setValue('modelCode', model.modelCode);
                        setValue('partsMonths', model.warranty?.partsMonths || 12);
                        setValue('serviceMonths', model.warranty?.serviceMonths || 24);
                        setValue('active', model.active);
                        setValue('image', model.image || '');
                        setValue('datasheet', model.datasheet || '');
                        setShowCreateForm(true);
                      }}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      Edit Model
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border border-red-400 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 h-auto w-auto p-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(model._id, model.modelName || `${model.brand} ${model.productLine} ${model.variant}`);
                      }}
                      disabled={deleteMutation.isPending}
                      title="Delete Model"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                Create New Product Model
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">Create and manage product models and configurations</p>
            </div>
            <Button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                if (!showCreateForm) {
                  reset();
                  setEditingModel(null);
                }
              }}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              {showCreateForm ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Hide Form
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Model
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="space-y-8 p-6">

      {/* Create Form at Top */}
      {showCreateForm && (
        <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Create Product Model
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowCreateForm(false);
                  reset();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-3">
                  <Label htmlFor="brand" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <Hash className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    Brand
                  </Label>
                  <Input
                    id="brand"
                    {...register('brand')}
                    value="Sunlife"
                    disabled
                    readOnly
                    className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                  />
                  {errors.brand && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.brand.message}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="productLine" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Boxes className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    Product Line
                  </Label>
                  <Input
                    id="productLine"
                    {...register('productLine', {
                      onChange: () => {
                        // Trigger model code regeneration when productLine changes
                        if (watchedVariant) {
                          const newCode = generateModelCode(watchedBrand || 'Sunlife', watchedProductLine || '', watchedVariant);
                          if (newCode) setValue('modelCode', newCode);
                        }
                      }
                    })}
                    className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                    placeholder="e.g., MPPT SOLAR INVERTER"
                  />
                  {errors.productLine && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.productLine.message}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-3">
                  <Label htmlFor="variant" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    Variant
                  </Label>
                  <Input
                    id="variant"
                    {...register('variant', {
                      onChange: () => {
                        // Trigger model code regeneration when variant changes
                        if (watchedProductLine) {
                          const newCode = generateModelCode(watchedBrand || 'Sunlife', watchedProductLine, watchedVariant || '');
                          if (newCode) setValue('modelCode', newCode);
                        }
                      }
                    })}
                    className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                    placeholder="e.g., 800W, 1600W"
                  />
                  {errors.variant && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.variant.message}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="modelCode" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <div className="p-1.5 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                      <Hash className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    Model Code (Auto-generated)
                  </Label>
                  <Input
                    id="modelCode"
                    {...register('modelCode')}
                    className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300 font-mono bg-slate-50 dark:bg-slate-800/50"
                    placeholder="Auto-generated from Product Line and Variant"
                    readOnly={!editingModel}
                  />
                  {!editingModel && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Model code is automatically generated from Product Line and Variant
                    </p>
                  )}
                  {errors.modelCode && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.modelCode.message}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-800/50 dark:to-blue-950/20 rounded-2xl border-2 border-slate-200/60 dark:border-slate-700/60">
                <h3 className="text-lg font-bold mb-5 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Warranty Information (Editable)
                </h3>
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <Label htmlFor="partsMonths" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Shield className="h-4 w-4 text-blue-600" />
                      Parts Warranty (Months)
                    </Label>
                    <Input
                      id="partsMonths"
                      type="number"
                      {...register('partsMonths', { valueAsNumber: true })}
                      className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                      placeholder="12"
                    />
                    {errors.partsMonths && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                        <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.partsMonths.message}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="serviceMonths" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Calendar className="h-4 w-4 text-green-600" />
                      Service Warranty (Months)
                    </Label>
                    <Input
                      id="serviceMonths"
                      type="number"
                      {...register('serviceMonths', { valueAsNumber: true })}
                      className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                      placeholder="24"
                    />
                    {errors.serviceMonths && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                        <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.serviceMonths.message}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div className="p-5 bg-gradient-to-br from-slate-50 to-purple-50/30 dark:from-slate-800/50 dark:to-purple-950/20 rounded-2xl border-2 border-slate-200/60 dark:border-slate-700/60">
                <Label htmlFor="image" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-4">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Upload className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  Product Image
                </Label>
                <div className="flex gap-3">
                  <Input
                    id="image"
                    placeholder="/products/image-name.jpg"
                    {...register('image')}
                    className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300 font-mono text-sm"
                  />
                  <label htmlFor="imageUpload" className="cursor-pointer">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 px-6 border-2 border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 font-semibold"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                    <input
                      id="imageUpload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {watchedImage && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium font-mono">
                      Image path: {watchedImage}
                    </p>
                  </div>
                )}
                {imagePreview && (
                  <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Preview:</p>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-40 w-40 object-contain border-2 border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Datasheet Upload */}
              <div className="p-5 bg-gradient-to-br from-slate-50 to-amber-50/30 dark:from-slate-800/50 dark:to-amber-950/20 rounded-2xl border-2 border-slate-200/60 dark:border-slate-700/60">
                <Label htmlFor="datasheet" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-4">
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  Technical Datasheet (PDF)
                </Label>
                <div className="flex gap-3">
                  <Input
                    id="datasheet"
                    placeholder="/products/datasheets/model-code.pdf"
                    {...register('datasheet')}
                    className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300 font-mono text-sm"
                    disabled
                  />
                  <label htmlFor="datasheetUpload" className="cursor-pointer">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 px-6 border-2 border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-semibold"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Upload PDF
                    </Button>
                    <input
                      id="datasheetUpload"
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                            toast.error('Please select a PDF file');
                            return;
                          }
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error('PDF size should be less than 10MB');
                            return;
                          }
                          const fileName = file.name.toLowerCase().replace(/\s+/g, '-');
                          const datasheetPath = `/products/datasheets/${fileName}`;
                          setValue('datasheet', datasheetPath);
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Upload technical datasheet PDF for this product variant (max 10MB)
                </p>
              </div>

              {/* Active/Discontinued Status */}
              <div className="space-y-3">
                <Label htmlFor="active" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <Tag className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  Status
                </Label>
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? 'active' : 'discontinued'}
                      onValueChange={(value) => field.onChange(value === 'active')}
                    >
                      <SelectTrigger id="active" className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active" className="py-2.5">Active</SelectItem>
                        <SelectItem value="discontinued" className="py-2.5">Discontinued</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="pt-6 border-t-2 border-slate-200 dark:border-slate-700 flex gap-3">
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 h-14 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Create Model
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    reset();
                  }}
                  className="h-14 px-6 border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Edit Model Dialog - Centered */}
      <Dialog open={!!editingModel} onOpenChange={(open) => {
        if (!open) {
          setEditingModel(null);
          reset();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Update Product Model
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-3">
                <Label htmlFor="edit-brand" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <Hash className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Brand
                </Label>
                <Input
                  id="edit-brand"
                  {...register('brand')}
                  value="Sunlife"
                  disabled
                  readOnly
                  className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                />
                {errors.brand && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.brand.message}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="edit-productLine" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Boxes className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  Product Line
                </Label>
                <Input
                  id="edit-productLine"
                  {...register('productLine', {
                    onChange: () => {
                      if (watchedVariant) {
                        const newCode = generateModelCode(watchedBrand || 'Sunlife', watchedProductLine || '', watchedVariant);
                        if (newCode) setValue('modelCode', newCode);
                      }
                    }
                  })}
                  className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                  placeholder="e.g., MPPT SOLAR INVERTER"
                />
                {errors.productLine && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.productLine.message}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-3">
                <Label htmlFor="edit-variant" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  Variant
                </Label>
                <Input
                  id="edit-variant"
                  {...register('variant', {
                    onChange: () => {
                      if (watchedProductLine) {
                        const newCode = generateModelCode(watchedBrand || 'Sunlife', watchedProductLine, watchedVariant || '');
                        if (newCode) setValue('modelCode', newCode);
                      }
                    }
                  })}
                  className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                  placeholder="e.g., 800W, 1600W"
                />
                {errors.variant && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.variant.message}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="edit-modelCode" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                    <Hash className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  Model Code
                </Label>
                <Input
                  id="edit-modelCode"
                  {...register('modelCode')}
                  className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300 font-mono bg-slate-50 dark:bg-slate-800/50"
                  placeholder="Model code"
                />
                {errors.modelCode && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.modelCode.message}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-800/50 dark:to-blue-950/20 rounded-2xl border-2 border-slate-200/60 dark:border-slate-700/60">
              <h3 className="text-lg font-bold mb-5 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Warranty Information (Editable)
              </h3>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-3">
                  <Label htmlFor="edit-partsMonths" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Shield className="h-4 w-4 text-blue-600" />
                    Parts Warranty (Months)
                  </Label>
                  <Input
                    id="edit-partsMonths"
                    type="number"
                    {...register('partsMonths', { valueAsNumber: true })}
                    className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                    placeholder="12"
                  />
                  {errors.partsMonths && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.partsMonths.message}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="edit-serviceMonths" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Calendar className="h-4 w-4 text-green-600" />
                    Service Warranty (Months)
                  </Label>
                  <Input
                    id="edit-serviceMonths"
                    type="number"
                    {...register('serviceMonths', { valueAsNumber: true })}
                    className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                    placeholder="24"
                  />
                  {errors.serviceMonths && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <span className="text-red-600 dark:text-red-400 text-lg">⚠</span>
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errors.serviceMonths.message}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div className="p-5 bg-gradient-to-br from-slate-50 to-purple-50/30 dark:from-slate-800/50 dark:to-purple-950/20 rounded-2xl border-2 border-slate-200/60 dark:border-slate-700/60">
              <Label htmlFor="edit-image" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-4">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Upload className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                Product Image
              </Label>
              <div className="flex gap-3">
                <Input
                  id="edit-image"
                  placeholder="/products/image-name.jpg"
                  {...register('image')}
                  className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300 font-mono text-sm"
                />
                <label htmlFor="edit-imageUpload" className="cursor-pointer">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 px-6 border-2 border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 font-semibold"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                  <input
                    id="edit-imageUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {watchedImage && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium font-mono">
                    Image path: {watchedImage}
                  </p>
                </div>
              )}
              {imagePreview && (
                <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Preview:</p>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-40 w-40 object-contain border-2 border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Datasheet Upload */}
            <div className="p-5 bg-gradient-to-br from-slate-50 to-amber-50/30 dark:from-slate-800/50 dark:to-amber-950/20 rounded-2xl border-2 border-slate-200/60 dark:border-slate-700/60">
              <Label htmlFor="edit-datasheet" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-4">
                <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                Technical Datasheet (PDF)
              </Label>
              <div className="flex gap-3">
                <Input
                  id="edit-datasheet"
                  placeholder="/products/datasheets/model-code.pdf"
                  {...register('datasheet')}
                  className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300 font-mono text-sm"
                />
                <label htmlFor="edit-datasheetUpload" className="cursor-pointer">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 px-6 border-2 border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-semibold"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                  <input
                    id="edit-datasheetUpload"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                          toast.error('Please select a PDF file');
                          return;
                        }
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error('PDF size should be less than 10MB');
                          return;
                        }
                        const fileName = file.name.toLowerCase().replace(/\s+/g, '-');
                        const datasheetPath = `/products/datasheets/${fileName}`;
                        setValue('datasheet', datasheetPath);
                      }
                    }}
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Upload technical datasheet PDF for this product variant (max 10MB)
              </p>
            </div>

            {/* Active/Discontinued Status */}
            <div className="space-y-3">
              <Label htmlFor="edit-active" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <Tag className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </div>
                Status
              </Label>
              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? 'active' : 'discontinued'}
                    onValueChange={(value) => field.onChange(value === 'active')}
                  >
                    <SelectTrigger id="edit-active" className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active" className="py-2.5">Active</SelectItem>
                      <SelectItem value="discontinued" className="py-2.5">Discontinued</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="pt-6 border-t-2 border-slate-200 dark:border-slate-700 flex gap-3">
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1 h-14 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Update Model
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingModel(null);
                  reset();
                }}
                className="h-14 px-6 border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Datasheet Update Dialog */}
      <Dialog open={!!datasheetUpdateModel} onOpenChange={(isOpen) => {
        if (!isOpen) closeDatasheetUpdateDialog();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4 border-b-2 border-slate-200 dark:border-slate-700">
            <DialogTitle className="text-2xl font-bold">
              Update Product Datasheet
            </DialogTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {datasheetUpdateModel && (
                <>
                  <span className="font-semibold">{datasheetUpdateModel.brand}</span>{' '}
                  {datasheetUpdateModel.productLine} {datasheetUpdateModel.variant}
                  <br />
                  <span className="text-xs font-mono text-slate-500">{datasheetUpdateModel.modelCode}</span>
                </>
              )}
            </p>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            {/* Current Datasheet Info */}
            {datasheetUpdateModel?.datasheet && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">Current Datasheet:</p>
                <a
                  href={datasheetUpdateModel.datasheet}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono flex items-center gap-2"
                >
                  <FileText className="h-3 w-3" />
                  {datasheetUpdateModel.datasheet.split('/').pop()}
                </a>
              </div>
            )}

            {/* File Upload */}
            <div className="relative h-48 w-full rounded-md border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800">
              <div className="text-center p-6">
                <FileText className="h-16 w-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-2">
                  Upload PDF Datasheet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  Max size: 10MB
                </p>
              </div>
              <input
                id="datasheet-update-input"
                type="file"
                accept=".pdf,application/pdf"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                      toast.error('Please select a PDF file');
                      return;
                    }
                    if (file.size > 10 * 1024 * 1024) {
                      toast.error('PDF size should be less than 10MB');
                      return;
                    }
                  }
                }}
              />
            </div>
            {datasheetUpdateModel && (
              <p className="text-sm text-muted-foreground text-center">
                New datasheet will be saved as: <span className="font-mono text-slate-700 dark:text-slate-300">
                  {datasheetUpdateModel.modelCode.toLowerCase()}.pdf
                </span>
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={closeDatasheetUpdateDialog}>Cancel</Button>
            <Button onClick={handleDatasheetUpdateSubmit}>
              <Upload className="h-4 w-4 mr-2" />
              Update Datasheet
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Update Dialog - Simple, Only Image Upload */}
      <Dialog open={!!imageUpdateModel} onOpenChange={(isOpen) => {
        if (!isOpen) closeImageUpdateDialog();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4 border-b-2 border-slate-200 dark:border-slate-700">
            <DialogTitle className="text-2xl font-bold">
              Update Product Image
            </DialogTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {imageUpdateModel && (
                <>
                  <span className="font-semibold">{imageUpdateModel.brand}</span>{' '}
                  {imageUpdateModel.productLine} {imageUpdateModel.variant}
                  <br />
                  <span className="text-xs font-mono text-slate-500">{imageUpdateModel.modelCode}</span>
                </>
              )}
            </p>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            {/* Current Image Preview */}
            {imageUpdatePreview && (
              <div className="relative h-48 w-full rounded-md border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800">
                <img src={imageUpdatePreview} alt="Image Preview" className="object-contain h-full w-full" />
              </div>
            )}
            
            {/* File Upload */}
            <div className="relative h-48 w-full rounded-md border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800">
              {imageUpdatePreview ? (
                <img src={imageUpdatePreview} alt="Image Preview" className="object-contain h-full w-full" />
              ) : (
                <ImageIcon className="h-16 w-16 text-slate-400 dark:text-slate-600" />
              )}
              <input
                id="image-update-input"
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleImageUpdateUpload}
              />
            </div>
            {imageUpdateModel && (
              <p className="text-sm text-muted-foreground text-center">
                New image will be saved as: <span className="font-mono text-slate-700 dark:text-slate-300">
                  {imageUpdateModel.modelCode.toLowerCase()}.{imageUpdatePreview.split('.').pop() || 'jpg'}
                </span>
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={closeImageUpdateDialog}>Cancel</Button>
            <Button onClick={handleImageUpdateSubmit}>
              <Upload className="h-4 w-4 mr-2" />
              Update Image
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Grid by Category */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <Boxes className="h-12 w-12 text-slate-400 mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Loading models...</p>
          </div>
        </div>
      ) : !models || models.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Boxes className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-muted-foreground">No models found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {renderCategorySection(
            'inverter',
            categorizedModels.inverter,
            <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
            'Inverters',
            'bg-blue-100 dark:bg-blue-900/30'
          )}
          {renderCategorySection(
            'battery',
            categorizedModels.battery,
            <Battery className="h-5 w-5 text-green-600 dark:text-green-400" />,
            'Batteries',
            'bg-green-100 dark:bg-green-900/30'
          )}
          {renderCategorySection(
            'vfd',
            categorizedModels.vfd,
            <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400" />,
            'VFD (Variable Frequency Drives)',
            'bg-orange-100 dark:bg-orange-900/30'
          )}
        </div>
      )}

      {/* Image Update Dialog - Simple, Only Image Upload */}
      <Dialog open={!!imageUpdateModel} onOpenChange={(isOpen) => {
        if (!isOpen) closeImageUpdateDialog();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4 border-b-2 border-slate-200 dark:border-slate-700">
            <DialogTitle className="text-2xl font-bold">
              Update Product Image
            </DialogTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {imageUpdateModel && (
                <>
                  <span className="font-semibold">{imageUpdateModel.brand}</span>{' '}
                  {imageUpdateModel.productLine} {imageUpdateModel.variant}
                  <br />
                  <span className="text-xs font-mono text-slate-500">{imageUpdateModel.modelCode}</span>
                </>
              )}
            </p>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            {/* Current Image Preview */}
            {imageUpdatePreview && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Current Image</Label>
                <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  <img
                    src={imageUpdatePreview}
                    alt="Current product image"
                    className="w-full h-full object-contain p-4"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Image Upload */}
            <div className="space-y-3">
              <Label htmlFor="image-update-input" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Upload className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                Select New Image
              </Label>
              <Input
                id="image-update-input"
                type="file"
                accept="image/*"
                onChange={handleImageUpdateUpload}
                className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300 cursor-pointer"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Image will be renamed to: <span className="font-mono font-semibold">
                  {imageUpdateModel?.modelCode?.toLowerCase()}.{imageUpdatePreview ? 'jpg/png/jpeg' : 'ext'}
                </span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="button"
                variant="outline"
                onClick={closeImageUpdateDialog}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleImageUpdateSubmit}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold"
                disabled={!imageUpdatePreview}
              >
                <Upload className="h-4 w-4 mr-2" />
                Update Image
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Product Model"
          message={`Are you sure you want to delete "${deleteConfirm.modelName}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          variant="danger"
        />
      )}
      </div>
    </div>
  );
}
