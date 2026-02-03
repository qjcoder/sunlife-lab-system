import { useQuery } from '@tanstack/react-query';
import { getFactoryStock } from '@/api/stock-api';
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
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 100;

export default function FactoryStock() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['factory-stock'],
    queryFn: getFactoryStock,
  });

  const filteredData = useMemo(() => {
    if (!data?.availableInverters) return [];
    return data.availableInverters.filter(
      (item) =>
        item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.inverterModel.modelCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil((filteredData?.length || 0) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedData = filteredData?.slice(startIndex, endIndex) || [];

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

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
            <p className="text-destructive">Failed to load factory stock</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Factory Stock</h1>
          <p className="text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length} inverters
            {searchTerm && ` (filtered from ${data?.count || 0} total)`}
            {!searchTerm && ` (${data?.count || 0} total)`}
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
              onChange={(e) => handleSearchChange(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {!filteredData || filteredData.length === 0 ? (
            <p className="text-muted-foreground">No inverters found</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Product Line</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Model Code</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((item) => (
                    <TableRow key={item.serialNumber}>
                      <TableCell className="font-medium">{item.serialNumber}</TableCell>
                      <TableCell>{item.inverterModel.brand}</TableCell>
                      <TableCell>{item.inverterModel.productLine}</TableCell>
                      <TableCell>{item.inverterModel.variant}</TableCell>
                      <TableCell>{item.inverterModel.modelCode}</TableCell>
                      <TableCell>
                        {item.registrationDate
                          ? new Date(item.registrationDate).toLocaleDateString()
                          : '-'}
                      </TableCell>
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
