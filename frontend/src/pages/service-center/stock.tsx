import { useQuery } from '@tanstack/react-query';
import { getServiceCenterStock } from '@/api/service-api';
import { PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from '@/lib/utils';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 md:px-6 space-y-1">
        <h1 className={PAGE_HEADING_CLASS}>Service Center Stock</h1>
        <p className={PAGE_SUBHEADING_CLASS}>
          {data?.serviceCenter} - Total: {data?.count || 0} parts
        </p>
      </div>
      <div className="space-y-4 sm:space-y-5 px-4 sm:px-5 md:px-6 pb-4 pt-0">
      <Card>
        <CardHeader>
          <CardTitle>Parts Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {!data || !data.parts || !Array.isArray(data.parts) || data.parts.length === 0 ? (
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
                {data.parts.map((part, index) => {
                  if (!part) return null;
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{part.partName || '-'}</TableCell>
                      <TableCell>{part.partCode || '-'}</TableCell>
                      <TableCell>{part.quantity ?? 0}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
