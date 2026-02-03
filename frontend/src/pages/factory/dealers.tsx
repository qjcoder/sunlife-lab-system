import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDealer } from '@/api/dealer-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const dealerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type DealerFormData = z.infer<typeof dealerSchema>;

export default function Dealers() {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DealerFormData>({
    resolver: zodResolver(dealerSchema),
  });

  const mutation = useMutation({
    mutationFn: createDealer,
    onSuccess: () => {
      toast.success('Dealer created successfully');
      reset();
      queryClient.invalidateQueries({ queryKey: ['dealers'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create dealer');
    },
  });

  const onSubmit = (data: DealerFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Dealer</h1>
        <p className="text-muted-foreground">Create a new dealer account</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dealer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create Dealer'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
