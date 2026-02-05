import { useQuery } from '@tanstack/react-query';
import { getDealerStock } from '@/api/stock-api';
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
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function SubDealerStock() {
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
            <p className="text-destructive">Failed to load stock</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Stock
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">Total: {data?.count || 0} inverters</p>
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
                      <TableCell>
                        <Link
                          to={`/lifecycle/${item.serialNumber || ''}`}
                          className="text-primary hover:underline"
                        >
                          View Lifecycle
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
