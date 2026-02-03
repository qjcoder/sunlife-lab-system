import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTransfer } from '@/api/transfer-api';
import { getDealerStock } from '@/api/stock-api';
import { getDealerHierarchy } from '@/api/dealer-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function Transfer() {
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [subDealerId, setSubDealerId] = useState('');
  const [remarks, setRemarks] = useState('');
  const queryClient = useQueryClient();

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transfer to Sub-Dealer</h1>
        <p className="text-muted-foreground">Transfer inverters to sub-dealers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Transfer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subDealer">Sub-Dealer</Label>
                <Select
                  id="subDealer"
                  value={subDealerId}
                  onChange={(e) => setSubDealerId(e.target.value)}
                >
                  <option value="">Select a sub-dealer</option>
                  {subDealers.map((subDealer) => (
                    <option key={subDealer.id} value={subDealer.id}>
                      {subDealer.name} ({subDealer.email})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Input id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Selected: {selectedSerials.length} inverter(s)
                </p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={mutation.isPending || selectedSerials.length === 0 || !subDealerId}
              >
                {mutation.isPending ? 'Transferring...' : 'Create Transfer'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Inverters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {!stock || stock.availableInverters.length === 0 ? (
                <p className="text-muted-foreground">No inverters available</p>
              ) : (
                stock.availableInverters.map((item) => (
                  <div
                    key={item.serialNumber}
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                      selectedSerials.includes(item.serialNumber)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => toggleSerial(item.serialNumber)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSerials.includes(item.serialNumber)}
                      onChange={() => toggleSerial(item.serialNumber)}
                      className="cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.serialNumber}</p>
                      <p className="text-sm opacity-80">
                        {item.inverterModel.brand} {item.inverterModel.modelCode}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
