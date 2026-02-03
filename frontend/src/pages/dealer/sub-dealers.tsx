import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSubDealer, getDealerHierarchy } from '@/api/dealer-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

const subDealerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SubDealerFormData = z.infer<typeof subDealerSchema>;

export default function SubDealers() {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SubDealerFormData>({
    resolver: zodResolver(subDealerSchema),
  });

  const { data: hierarchy } = useQuery({
    queryKey: ['dealer-hierarchy'],
    queryFn: getDealerHierarchy,
  });

  const mutation = useMutation({
    mutationFn: createSubDealer,
    onSuccess: () => {
      toast.success('Sub-dealer created successfully');
      reset();
      queryClient.invalidateQueries({ queryKey: ['dealer-hierarchy'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create sub-dealer');
    },
  });

  const onSubmit = (data: SubDealerFormData) => {
    mutation.mutate(data);
  };

  // Get sub-dealers from hierarchy
  const subDealers: any[] = [];
  const extractSubDealers = (nodes: any[]) => {
    nodes.forEach((node) => {
      if (node.subDealers && node.subDealers.length > 0) {
        node.subDealers.forEach((sub: any) => {
          subDealers.push(sub.dealer);
          if (sub.subDealers) {
            extractSubDealers([sub]);
          }
        });
      }
    });
  };
  if (hierarchy) {
    extractSubDealers(hierarchy);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sub-Dealers</h1>
        <p className="text-muted-foreground">Manage sub-dealer accounts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Sub-Dealer</CardTitle>
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
                {mutation.isPending ? 'Creating...' : 'Create Sub-Dealer'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Sub-Dealers</CardTitle>
          </CardHeader>
          <CardContent>
            {subDealers.length === 0 ? (
              <p className="text-muted-foreground">No sub-dealers found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subDealers.map((subDealer) => (
                    <TableRow key={subDealer.id}>
                      <TableCell>{subDealer.name}</TableCell>
                      <TableCell>{subDealer.email}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
