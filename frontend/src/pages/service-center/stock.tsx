import { useQuery } from '@tanstack/react-query';
import { getServiceCenterStock } from '@/api/service-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

export default function ServiceCenterStock() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['service-center-stock'],
    queryFn: getServiceCenterStock,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load service center stock</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Service Center Stock</h1>
        <p className="text-muted-foreground">
          {data?.serviceCenter} - Total: {data?.count || 0} parts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parts Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {!data || !data.parts || data.parts.length === 0 ? (
            <p className="text-muted-foreground">No parts in stock</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part Name</TableHead>
                  <TableHead>Part Code</TableHead>
                  <TableHead>Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.parts.map((part, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{part.partName}</TableCell>
                    <TableCell>{part.partCode}</TableCell>
                    <TableCell>{part.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
