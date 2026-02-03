import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getInverterLifecycle } from '@/api/inverter-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function InverterLifecycle() {
  const { serialNumber } = useParams<{ serialNumber?: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['inverter-lifecycle', serialNumber],
    queryFn: () => {
      if (!serialNumber) {
        throw new Error('Serial number is required');
      }
      return getInverterLifecycle(serialNumber);
    },
    enabled: !!serialNumber,
  });

  if (!serialNumber) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Please navigate to a specific inverter lifecycle or enter a serial number in the URL.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Example: /lifecycle/SLI6K-0001
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <p className="text-destructive">
              Failed to load inverter lifecycle: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inverter Lifecycle</h1>
        <p className="text-muted-foreground">Serial Number: {serialNumber}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Model:</span> {data.factory.inverterModel.brand}{' '}
              {data.factory.inverterModel.productLine} {data.factory.inverterModel.variant} (
              {data.factory.inverterModel.modelCode})
            </p>
            <p>
              <span className="font-medium">Registration Date:</span>{' '}
              {new Date(data.factory.registeredAt).toLocaleDateString()}
            </p>
            <p>
              <span className="font-medium">Warranty:</span> {data.factory.inverterModel.warranty.partsMonths} months
              parts, {data.factory.inverterModel.warranty.serviceMonths} months service
            </p>
            <p>
              <span className="font-medium">Warranty Status:</span> {data.warranty.status}
            </p>
          </div>
        </CardContent>
      </Card>

      {data.factoryDispatch && (
        <Card>
          <CardHeader>
            <CardTitle>Factory Dispatch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Dispatch Number:</span> {data.factoryDispatch.dispatchNumber}
              </p>
              <p>
                <span className="font-medium">Dealer:</span> {data.factoryDispatch.dealer}
              </p>
              <p>
                <span className="font-medium">Dispatch Date:</span>{' '}
                {new Date(data.factoryDispatch.dispatchDate).toLocaleDateString()}
              </p>
              {data.factoryDispatch.remarks && (
                <p>
                  <span className="font-medium">Remarks:</span> {data.factoryDispatch.remarks}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {data.dealerTransfers && data.dealerTransfers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transfer Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.dealerTransfers.map((transfer, index) => (
                <div key={index} className="border-l-2 pl-4">
                  <p>
                    <span className="font-medium">From:</span> {transfer.fromDealer} →{' '}
                    <span className="font-medium">To:</span> {transfer.toSubDealer}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(transfer.transferredAt).toLocaleDateString()}
                  </p>
                  {transfer.remarks && (
                    <p className="text-sm text-muted-foreground">Remarks: {transfer.remarks}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.sale && (
        <Card>
          <CardHeader>
            <CardTitle>Sale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Invoice Number:</span> {data.sale.invoiceNo}
              </p>
              <p>
                <span className="font-medium">Sale Date:</span>{' '}
                {new Date(data.sale.saleDate).toLocaleDateString()}
              </p>
              <p>
                <span className="font-medium">Customer:</span> {data.sale.customerName}
              </p>
              {data.sale.customerContact && (
                <p>
                  <span className="font-medium">Contact:</span> {data.sale.customerContact}
                </p>
              )}
              {data.warranty.startDate && (
                <p>
                  <span className="font-medium">Warranty Start:</span>{' '}
                  {new Date(data.warranty.startDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {data.serviceJobs && data.serviceJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Service Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.serviceJobs.map((item, index) => {
                const job = item.serviceJob;
                return (
                  <div key={index} className="border-l-2 pl-4">
                    <p>
                      <span className="font-medium">Service Center:</span> {job.serviceCenter}
                    </p>
                    <p>
                      <span className="font-medium">Visit Date:</span>{' '}
                      {new Date(job.visitDate).toLocaleDateString()}
                    </p>
                    <p>
                      <span className="font-medium">Reported Fault:</span> {job.reportedFault}
                    </p>
                    <p>
                      <span className="font-medium">Service Type:</span> {job.serviceType || 'N/A'}
                    </p>
                    <p>
                      <span className="font-medium">Warranty Status:</span> Parts: {job.warrantyStatus.parts ? 'In Warranty' : 'Out of Warranty'}, Service: {job.warrantyStatus.service ? 'In Warranty' : 'Out of Warranty'}
                    </p>
                    {job.remarks && (
                      <p>
                        <span className="font-medium">Remarks:</span> {job.remarks}
                      </p>
                    )}
                    {item.replacedParts && item.replacedParts.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Replaced Parts:</p>
                        <ul className="list-disc list-inside ml-4">
                          {item.replacedParts.map((part, partIndex) => (
                            <li key={partIndex}>
                              {part.partName} ({part.partCode}) - Qty: {part.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
