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

export default function DealerStock() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['dealer-stock'],
    queryFn: () => getDealerStock(),
  });

  const filteredData = data?.availableInverters.filter(
    (item) =>
      item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.inverterModel.modelCode.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dealer Stock</h1>
          <p className="text-muted-foreground">
            {data?.dealer} - Total: {data?.count || 0} inverters
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Available Inverters</CardTitle>
            <Input
              placeholder="Search by serial number or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
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
                {filteredData.map((item) => (
                  <TableRow key={item.serialNumber}>
                    <TableCell className="font-medium">{item.serialNumber}</TableCell>
                    <TableCell>
                      {item.inverterModel.brand} {item.inverterModel.modelCode}
                    </TableCell>
                    <TableCell>
                      {item.dispatchedAt ? new Date(item.dispatchedAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>{item.dispatchNumber || '-'}</TableCell>
                    <TableCell>
                      <Link
                        to={`/lifecycle/${item.serialNumber}`}
                        className="text-primary hover:underline"
                      >
                        View Lifecycle
                      </Link>
                    </TableCell>
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
