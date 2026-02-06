import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTransfer } from '@/api/transfer-api';
import { getDealerStock } from '@/api/stock-api';
import { getDealerHierarchy } from '@/api/dealer-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Users, Package, FileText, ArrowRight, Loader2, CheckCircle2, Hash, Scan } from 'lucide-react';
import { cn, PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from '@/lib/utils';

export default function Transfer() {
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [subDealerId, setSubDealerId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [scannerMode, setScannerMode] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const scanRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (scannerMode && scanRef.current) scanRef.current.focus();
  }, [scannerMode]);

  const { data: stock } = useQuery({
    queryKey: ['dealer-stock'],
    queryFn: () => getDealerStock(),
  });

  const { data: hierarchy } = useQuery({
    queryKey: ['dealer-hierarchy'],
    queryFn: getDealerHierarchy,
  });

  const mutation = useMutation({
    mutationFn: createTransfer,
    onSuccess: () => {
      toast.success('Transfer created successfully');
      setSelectedSerials([]);
      setSubDealerId('');
      setRemarks('');
      queryClient.invalidateQueries({ queryKey: ['dealer-stock'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create transfer');
    },
  });

  // Extract sub-dealers from hierarchy
  const subDealers: any[] = [];
  const extractSubDealers = (nodes: any[]) => {
    if (!nodes || !Array.isArray(nodes)) return;
    nodes.forEach((node) => {
      if (node && node.subDealers && Array.isArray(node.subDealers) && node.subDealers.length > 0) {
        node.subDealers.forEach((sub: any) => {
          if (sub && sub.dealer) {
            subDealers.push(sub.dealer);
          }
          if (sub && sub.subDealers && Array.isArray(sub.subDealers)) {
            extractSubDealers([sub]);
          }
        });
      }
    });
  };
  if (hierarchy && Array.isArray(hierarchy)) {
    extractSubDealers(hierarchy);
  }

  const handleSubmit = () => {
    if (!subDealerId) {
      toast.error('Please select a sub-dealer');
      return;
    }

    if (selectedSerials.length === 0) {
      toast.error('Please select at least one inverter');
      return;
    }

    mutation.mutate({
      subDealerId,
      serialNumbers: selectedSerials,
      remarks: remarks || undefined,
    });
  };

  const toggleSerial = (serial: string) => {
    setSelectedSerials((prev) =>
      prev.includes(serial) ? prev.filter((s) => s !== serial) : [...prev, serial]
    );
  };

  const availableSerials = (stock?.availableInverters || [])
    .map((item) => item?.serialNumber)
    .filter(Boolean) as string[];

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const serial = scanInput.trim();
    if (!serial) return;
    const normalized = serial.toUpperCase();
    const match = availableSerials.find((s) => s.toUpperCase() === normalized || s === serial);
    if (match) {
      if (!selectedSerials.includes(match)) {
        setSelectedSerials((prev) => [...prev, match]);
        toast.success(`Added ${match}`);
      }
    } else {
      toast.error(`Serial "${serial}" not found in your stock`);
    }
    setScanInput('');
    scanRef.current?.focus();
  };

  return (
    <div className="space-y-8 min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className={PAGE_HEADING_CLASS}>Transfer to Sub-Dealer</h1>
        <p className={PAGE_SUBHEADING_CLASS}>Transfer inverters from dealer to sub-dealers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transfer Information Card */}
        <Card className="border-2 border-purple-200/60 dark:border-purple-800/60 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 dark:from-purple-600 dark:via-pink-600 dark:to-rose-600 border-b-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDMuMzE0LTIuNjg2IDYtNiA2cy02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNnoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
            <CardTitle className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30">
                <ArrowRight className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold text-white block">Transfer Information</span>
                <span className="text-purple-100 text-sm font-medium">Select sub-dealer and products</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 pb-8 px-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="subDealer" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  Sub-Dealer
                </Label>
                <Select value={subDealerId} onValueChange={setSubDealerId}>
                  <SelectTrigger id="subDealer" className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300">
                    <SelectValue placeholder="Select a sub-dealer" />
                  </SelectTrigger>
                  <SelectContent>
                    {subDealers.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground font-medium">No sub-dealers available</p>
                      </div>
                    ) : (
                      subDealers.map((subDealer) => (
                        <SelectItem key={subDealer.id} value={subDealer.id} className="py-2.5">
                          {subDealer.name} ({subDealer.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="remarks" className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-1.5 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                    <FileText className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                  </div>
                  Remarks (Optional)
                </Label>
                <Input
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="h-12 text-base border-2 border-slate-300 dark:border-slate-600 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300"
                  placeholder="Additional notes or remarks"
                />
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/20 rounded-xl border-2 border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Selected Products:</span>
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {selectedSerials.length} inverter{selectedSerials.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-slate-200 dark:border-slate-700">
                <Button
                  onClick={handleSubmit}
                  disabled={mutation.isPending || selectedSerials.length === 0 || !subDealerId}
                  className="w-full h-14 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 text-white font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Transferring {selectedSerials.length} Product{selectedSerials.length !== 1 ? 's' : ''}...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Create Transfer ({selectedSerials.length} product{selectedSerials.length !== 1 ? 's' : ''})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Inverters Card */}
        <Card className="border-2 border-slate-200/60 dark:border-slate-700/60 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-500 via-slate-600 to-slate-700 dark:from-slate-600 dark:via-slate-700 dark:to-slate-800 border-b-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwIDMuMzE0LTIuNjg2IDYtNiA2cy02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNnoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
            <CardTitle className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold text-white block">Available Inverters</span>
                <span className="text-slate-100 text-sm font-medium">Select products to transfer</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 pb-6 px-6">
            {(stock?.availableInverters?.length ?? 0) > 0 && (
              <div className="mb-4 p-3 rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
                <div className="flex items-center gap-2 mb-2">
                  <Scan className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Scan serial to add</span>
                  <Button
                    type="button"
                    variant={scannerMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setScannerMode(!scannerMode);
                      if (!scannerMode) setTimeout(() => scanRef.current?.focus(), 100);
                    }}
                    className={cn("ml-auto", scannerMode && 'bg-green-600 hover:bg-green-700')}
                  >
                    {scannerMode ? 'Scanner ON' : 'Scanner'}
                  </Button>
                </div>
                {scannerMode && (
                  <Input
                    ref={scanRef}
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={handleScanKeyDown}
                    placeholder="Scan or type serial number, press Enter to add"
                    className={cn("h-11", scannerMode && 'border-green-500 focus:ring-green-500')}
                  />
                )}
              </div>
            )}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {!stock || !stock.availableInverters || !Array.isArray(stock.availableInverters) || stock.availableInverters.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                  <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium">No inverters available</p>
                </div>
              ) : (
                stock.availableInverters.map((item) => {
                  if (!item || !item.serialNumber) return null;
                  return (
                    <div
                      key={item.serialNumber}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                        selectedSerials.includes(item.serialNumber)
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-400 shadow-lg scale-[1.02]'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md'
                      )}
                      onClick={() => toggleSerial(item.serialNumber)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSerials.includes(item.serialNumber)}
                        onChange={() => toggleSerial(item.serialNumber)}
                        className="w-5 h-5 cursor-pointer rounded border-2"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Hash className={cn(
                            "h-4 w-4",
                            selectedSerials.includes(item.serialNumber) ? "text-white" : "text-purple-600 dark:text-purple-400"
                          )} />
                          <p className={cn(
                            "font-bold text-base",
                            selectedSerials.includes(item.serialNumber) ? "text-white" : "text-slate-900 dark:text-slate-100"
                          )}>
                            {item.serialNumber}
                          </p>
                        </div>
                        <p className={cn(
                          "text-sm",
                          selectedSerials.includes(item.serialNumber)
                            ? "text-purple-100"
                            : "text-slate-600 dark:text-slate-400"
                        )}>
                          {item.inverterModel?.brand || ''} {item.inverterModel?.modelCode || ''}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
