import { useQuery } from '@tanstack/react-query';
import { getDealerStock } from '@/api/stock-api';
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
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function DealerStock() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['dealer-stock'],
    queryFn: () => getDealerStock(),
  });

  const filteredData = (data?.availableInverters || []).filter(
    (item) => {
      if (!item || !item.inverterModel) return false;
      const serialMatch = item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const modelMatch = item.inverterModel.modelCode?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      return serialMatch || modelMatch;
    }
  );

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
            <p className="text-destructive">Failed to load dealer stock</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 md:px-6 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className={PAGE_HEADING_CLASS}>Dealer Stock</h1>
          <p className={PAGE_SUBHEADING_CLASS}>
            {data?.dealer} - Total: {data?.count || 0} inverters
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 h-11 border-2 border-slate-300 dark:border-slate-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
        </div>
      </div>
      <div className="space-y-4 sm:space-y-5 px-4 sm:px-5 md:px-6 pb-4 pt-0">
      <Card>
        <CardHeader>
          <CardTitle>Available Inverters</CardTitle>
        </CardHeader>
        <CardContent>
          {!filteredData || filteredData.length === 0 ? (
            <p className="text-muted-foreground">No inverters found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Dispatch Date</TableHead>
                  <TableHead>Dispatch Number</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => {
                  if (!item || !item.inverterModel) return null;
                  return (
                    <TableRow key={item.serialNumber}>
                      <TableCell className="font-medium">{item.serialNumber || '-'}</TableCell>
                      <TableCell>
                        {item.inverterModel.brand || ''} {item.inverterModel.modelCode || ''}
                      </TableCell>
                      <TableCell>
                        {item.dispatchedAt ? new Date(item.dispatchedAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>{item.dispatchNumber || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
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
