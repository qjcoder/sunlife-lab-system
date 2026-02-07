import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getInverterLifecycle } from '@/api/inverter-api';
import { getUnitsByModel } from '@/api/model-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Package, ArrowRight, ArrowLeft, Search, Scan, History } from 'lucide-react';
import { PAGE_HEADING_FIRST, PAGE_HEADING_SECOND, PAGE_SUBHEADING_CLASS, getModelDisplayName } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function InverterLifecycle() {
  const { serialNumber } = useParams<{ serialNumber?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const modelId = searchParams.get('modelId');
  const [serialSearch, setSerialSearch] = useState('');
  const [scannerMode, setScannerMode] = useState(false);
  const serialSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scannerMode && serialSearchRef.current) serialSearchRef.current.focus();
  }, [scannerMode]);

  const { data: lifecycleData, isLoading, error } = useQuery({
    queryKey: ['inverter-lifecycle', serialNumber],
    queryFn: () => {
      if (!serialNumber) throw new Error('Serial number is required');
      return getInverterLifecycle(serialNumber);
    },
    enabled: !!serialNumber,
  });

  const { data: unitsData, isLoading: unitsLoading } = useQuery({
    queryKey: ['units-by-model', modelId],
    queryFn: () => getUnitsByModel(modelId!),
    enabled: !!modelId && !serialNumber,
  });

  const handleSerialSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const sn = serialSearch.trim();
    if (sn) navigate(`/lifecycle/${encodeURIComponent(sn)}`);
  };

  const pageShell = (content: ReactNode) => (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-muted/30">
      <header className="shrink-0 border-b bg-card">
        <div className="px-4 py-2 sm:px-5 sm:py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <h1 className="inline"><span className={PAGE_HEADING_FIRST}>Product </span><span className={PAGE_HEADING_SECOND}>History</span></h1>
            <p className={PAGE_SUBHEADING_CLASS}>View full lifecycle of a product by serial number</p>
          </div>
        </div>
      </header>
      <div className="flex-1 min-h-0 flex flex-col overflow-auto p-3 sm:p-4">
        {content}
      </div>
    </div>
  );

  const topBar = (
    <Card className="mb-6 border-border/80 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 pt-4 px-4 sm:px-6 bg-gradient-to-r from-slate-50 to-indigo-50/50 dark:from-slate-800/50 dark:to-indigo-950/30 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
              <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">Look up by serial number</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Scan or type a serial number to view full lifecycle</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => navigate(-1)} className="w-full sm:w-auto shrink-0 order-first sm:order-none">
            <ArrowLeft className="h-3.5 w-3.5 mr-2" />
            Back
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 px-4 sm:px-6 pb-4">
        <form onSubmit={handleSerialSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={serialSearchRef}
                type="text"
                placeholder={scannerMode ? 'Scan serial then Enter' : 'Search by serial...'}
                value={serialSearch}
                onChange={(e) => setSerialSearch(e.target.value)}
                className={cn(
                  'font-mono flex-1 min-w-0 pl-9 h-11 text-base border-2',
                  scannerMode && 'border-indigo-500 focus-visible:ring-indigo-500/20'
                )}
                autoFocus={scannerMode}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={scannerMode ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-11 shrink-0 gap-1.5',
                  scannerMode && 'bg-indigo-600 hover:bg-indigo-700'
                )}
                onClick={() => {
                  setScannerMode(!scannerMode);
                  if (!scannerMode) setTimeout(() => serialSearchRef.current?.focus(), 100);
                }}
              >
                <Scan className="h-4 w-4" />
                {scannerMode ? 'Scanner ON' : 'Enable Scanner'}
              </Button>
              <Button type="submit" size="sm" disabled={!serialSearch.trim()} className="h-11 shrink-0 gap-1.5">
                <Search className="h-4 w-4" />
                Go
              </Button>
            </div>
          </div>
        </form>
        {scannerMode && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <Scan className="h-3.5 w-3.5" />
            Scanner mode — scan barcode or type serial and press Enter to view lifecycle
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (!serialNumber) {
    if (modelId && unitsData) {
      const { model, units } = unitsData;
      return pageShell(
        <>
          {topBar}
          <Card className="max-w-2xl border-border/80 shadow-sm">
            <CardHeader className="pb-2 border-b border-border/60">
              <CardTitle className="text-lg font-semibold">Full life cycle view — select unit</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Model: {getModelDisplayName(model) || `${model.brand} ${model.productLine} ${model.variant}`.trim()} ({model.modelCode})
              </p>
            </CardHeader>
            <CardContent className="pt-4">
          {unitsLoading ? (
            <div className="flex items-center justify-center p-6 sm:p-8">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
            </div>
          ) : units.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No units registered for this model yet.</p>
          ) : (
            <ul className="divide-y">
              {units.map((u) => (
                <li key={u.serialNumber} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-sm sm:text-base truncate">{u.serialNumber}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground capitalize shrink-0">{u.currentStage}</span>
                  </div>
                  <Button asChild variant="default" size="sm" className="w-full sm:w-auto shrink-0">
                    <Link to={`/lifecycle/${u.serialNumber}`}>View full lifecycle</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
            </CardContent>
          </Card>
        </>
      );
    }
    if (modelId && unitsLoading) {
      return pageShell(
        <>
          {topBar}
          <div className="flex items-center justify-center p-6 sm:p-8">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
          </div>
        </>
      );
    }
    return pageShell(
      <>
        {topBar}
        <Card className="max-w-2xl border-border/80 shadow-sm overflow-hidden">
          <CardContent className="pt-8 pb-8 px-6 sm:px-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/80">
                <Package className="h-7 w-7 text-muted-foreground" />
              </div>
            </div>
            <p className="text-sm sm:text-base text-foreground font-medium">
              Enter a serial number above to view its full lifecycle
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or go back to the previous page
            </p>
            <div className="mt-6 pt-6 border-t border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Example serials</p>
              <p className="font-mono text-sm text-foreground/90 bg-muted/50 rounded-lg px-4 py-2.5 inline-block">
                SL-TRIAL-001, SLI6K-0001
              </p>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  if (isLoading) {
    return pageShell(
      <>
        {topBar}
        <div className="flex items-center justify-center p-6 sm:p-8">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
        </div>
      </>
    );
  }

  if (error) {
    return pageShell(
      <>
        {topBar}
        <Card className="max-w-2xl border-destructive/30 shadow-sm">
          <CardContent className="pt-6 pb-6 px-6 sm:px-8">
            <p className="text-sm sm:text-base text-destructive break-words font-medium">
              Failed to load lifecycle: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  const data = lifecycleData;
  if (!data) {
    return pageShell(
      <>
        {topBar}
        <Card className="max-w-2xl border-border/80 shadow-sm">
          <CardContent className="pt-6 pb-6 px-6 sm:px-8">
            <p className="text-sm sm:text-base text-muted-foreground">No lifecycle data available for this serial.</p>
          </CardContent>
        </Card>
      </>
    );
  }

  const partsYears = data.factory.inverterModel.warranty.partsMonths / 12;
  const serviceYears = data.factory.inverterModel.warranty.serviceMonths / 12;
  const warrantyPartsStr = partsYears === 1 ? '1 year' : partsYears % 1 === 0 ? `${partsYears} years` : `${partsYears.toFixed(1)} years`;
  const warrantyServiceStr = serviceYears === 1 ? '1 year' : serviceYears % 1 === 0 ? `${serviceYears} years` : `${serviceYears.toFixed(1)} years`;
  const directFactorySale = data.soldFrom === 'factory';

  return pageShell(
    <>
      {topBar}
      <Card className="max-w-4xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Inverter Lifecycle</CardTitle>
          <p className="text-sm text-muted-foreground break-all">Serial Number: {serialNumber}</p>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
      {/* Lifecycle flow */}
      <Card>
        <CardHeader>
          <CardTitle>Lifecycle Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1">
              <Package className="h-3.5 w-3.5" /> Production
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            {directFactorySale ? (
              <>
                <span className="inline-flex items-center rounded-md bg-amber-100 dark:bg-amber-900/50 px-2 py-1 font-medium">
                  Direct Factory Sale
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1">Customer</span>
              </>
            ) : (
              <>
                {data.factoryDispatch && (
                  <>
                    <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1">Dealer</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </>
                )}
                {data.dealerTransfers && data.dealerTransfers.length > 0 ? (
                  <>
                    <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1">Sub-dealer</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </>
                ) : null}
                <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1">Customer Sold</span>
              </>
            )}
            {(data.serviceVisitCount ?? 0) > 0 && (
              <>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="rounded-md bg-blue-100 dark:bg-blue-900/50 px-2 py-1">
                  Service center × {data.serviceVisitCount}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

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
              <span className="font-medium">Warranty:</span> {warrantyPartsStr} parts, {warrantyServiceStr} service
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
            <CardTitle>Factory → Dealer Dispatch</CardTitle>
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
            <CardTitle>Dealer → Sub-dealer Transfers</CardTitle>
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
            <CardTitle>{directFactorySale ? 'Direct Factory Sale' : 'Sale to Customer'}</CardTitle>
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
            <CardTitle>
              Service Center — {data.serviceVisitCount ?? data.serviceJobs.length} visit{((data.serviceVisitCount ?? data.serviceJobs.length) !== 1) ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data.serviceJobs.map((item, index) => {
                const job = item.serviceJob;
                return (
                  <div key={index} className="rounded-lg border p-4 space-y-3">
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
                      <span className="font-medium">Warranty at visit:</span> Parts: {job.warrantyStatus.parts ? 'In Warranty' : 'Out of Warranty'}, Service: {job.warrantyStatus.service ? 'In Warranty' : 'Out of Warranty'}
                    </p>
                    {job.remarks && (
                      <p>
                        <span className="font-medium">Remarks:</span> {job.remarks}
                      </p>
                    )}
                    {item.replacedParts && item.replacedParts.length > 0 && (
                      <div className="mt-3">
                        <p className="font-medium mb-2">Replaced parts (full details):</p>
                        <ul className="space-y-2">
                          {item.replacedParts.map((part, partIndex) => (
                            <li key={partIndex} className="border-l-2 pl-3 text-sm">
                              <span className="font-medium">{part.partName}</span> ({part.partCode}) — Qty: {part.quantity}
                              {part.replacementDate && (
                                <> · Date: {new Date(part.replacementDate).toLocaleDateString()}</>
                              )}
                              {part.replacementType && <> · Type: {part.replacementType}</>}
                              {part.costLiability && <> · Cost: {part.costLiability}</>}
                              {part.warrantyClaimEligible !== undefined && (
                                <> · Warranty claim: {part.warrantyClaimEligible ? 'Yes' : 'No'}</>
                              )}
                              {part.dispatch && (
                                <div className="text-muted-foreground mt-1">
                                  Dispatch: {part.dispatch.dispatchNumber} · {part.dispatch.serviceCenter} · {new Date(part.dispatch.dispatchDate).toLocaleDateString()}
                                </div>
                              )}
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
        </CardContent>
      </Card>
    </>
  );
}
