import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listModels, createModel } from '@/api/model-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Boxes, Shield, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const modelSchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  productLine: z.string().min(1, 'Product line is required'),
  variant: z.string().min(1, 'Variant is required'),
  modelCode: z.string().min(1, 'Model code is required'),
  partsMonths: z.number().min(0),
  serviceMonths: z.number().min(0),
});

type ModelFormData = z.infer<typeof modelSchema>;

export default function InverterModels() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ModelFormData>({
    resolver: zodResolver(modelSchema),
  });

  const { data: models, isLoading } = useQuery({
    queryKey: ['inverter-models'],
    queryFn: () => listModels(true), // Only show active models on the models page
  });

  const mutation = useMutation({
    mutationFn: createModel,
    onSuccess: () => {
      toast.success('Inverter model created successfully');
      reset();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['inverter-models'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create model');
    },
  });

  const onSubmit = (data: ModelFormData) => {
    mutation.mutate({
      brand: data.brand,
      productLine: data.productLine,
      variant: data.variant,
      modelCode: data.modelCode,
      warranty: {
        partsMonths: data.partsMonths,
        serviceMonths: data.serviceMonths,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inverter Models</h1>
          <p className="text-muted-foreground">Manage inverter models</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Model
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Inverter Model</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" {...register('brand')} />
                {errors.brand && <p className="text-sm text-destructive">{errors.brand.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="productLine">Product Line</Label>
                <Input id="productLine" {...register('productLine')} />
                {errors.productLine && (
                  <p className="text-sm text-destructive">{errors.productLine.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant">Variant</Label>
                <Input id="variant" {...register('variant')} />
                {errors.variant && <p className="text-sm text-destructive">{errors.variant.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelCode">Model Code</Label>
                <Input id="modelCode" {...register('modelCode')} />
                {errors.modelCode && (
                  <p className="text-sm text-destructive">{errors.modelCode.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="partsMonths">Parts Warranty (Months)</Label>
                <Input
                  id="partsMonths"
                  type="number"
                  {...register('partsMonths', { valueAsNumber: true })}
                />
                {errors.partsMonths && (
                  <p className="text-sm text-destructive">{errors.partsMonths.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceMonths">Service Warranty (Months)</Label>
                <Input
                  id="serviceMonths"
                  type="number"
                  {...register('serviceMonths', { valueAsNumber: true })}
                />
                {errors.serviceMonths && (
                  <p className="text-sm text-destructive">{errors.serviceMonths.message}</p>
                )}
              </div>

              <Button type="submit" disabled={mutation.isPending} className="w-full">
                {mutation.isPending ? 'Creating...' : 'Create Model'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Product Grid */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {models.map((model) => (
            <Card
              key={model._id}
              className="group relative overflow-hidden border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-800 hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              {/* Product Image */}
              <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center overflow-hidden">
                {model.image ? (
                  <img
                    src={model.image}
                    alt={model.modelName || `${model.brand} ${model.productLine} ${model.variant}`}
                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      const currentSrc = img.src;
                      // Try .png if .jpg failed
                      if (currentSrc.endsWith('.jpg')) {
                        img.src = currentSrc.replace('.jpg', '.png');
                        return;
                      }
                      // Try .jpg if .png failed
                      if (currentSrc.endsWith('.png')) {
                        img.src = currentSrc.replace('.png', '.jpg');
                        return;
                      }
                      // Fallback to placeholder if both extensions fail
                      img.style.display = 'none';
                      const placeholder = img.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-500/10 to-blue-500/10 dark:from-red-500/20 dark:to-blue-500/20 ${model.image ? 'hidden' : 'flex'}`}
                >
                  <Boxes className="h-20 w-20 text-slate-400 dark:text-slate-500 group-hover:scale-110 transition-transform duration-200" />
                </div>
                {/* Status Badge */}
                {model.active && (
                  <div className="absolute top-3 left-3 px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded">
                    Active
                  </div>
                )}
              </div>

              <CardContent className="p-4">
                {/* Category */}
                <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 uppercase tracking-wide">
                  {model.brand}
                </div>

                {/* Product Name */}
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2 line-clamp-2">
                  {model.productLine} {model.variant}
                </h3>

                {/* Model Code */}
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 font-mono">
                  {model.modelCode}
                </p>

                {/* Warranty Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="text-slate-700 dark:text-slate-300">
                      Parts: <span className="font-semibold">{model.warranty.partsMonths} months</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-green-500" />
                    <span className="text-slate-700 dark:text-slate-300">
                      Service: <span className="font-semibold">{model.warranty.serviceMonths} months</span>
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  variant="outline"
                  className="w-full border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={() => navigate(`/factory/inverter-models/${model._id}`)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
