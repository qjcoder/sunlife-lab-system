import { useQuery } from '@tanstack/react-query';
import { getDealerHierarchy } from '@/api/dealer-api';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Building2, Users, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DealerHierarchy() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dealer-hierarchy'],
    queryFn: getDealerHierarchy,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load dealer hierarchy</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderNode = (node: any, level = 0) => {
    const hasSubDealers = node.subDealers && node.subDealers.length > 0;
    
    return (
      <div key={node.dealer.id} className="relative">
        {/* Vertical Line */}
        {level > 0 && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-400 to-red-600 dark:from-red-500 dark:to-red-700"></div>
        )}
        
        <div className={cn("flex items-start gap-4", level > 0 && "ml-8")}>
          {/* Connector Line */}
          {level > 0 && (
            <div className="absolute left-0 top-6 w-8 h-0.5 bg-gradient-to-r from-red-400 to-red-600 dark:from-red-500 dark:to-red-700"></div>
          )}
          
          {/* Icon */}
          <div className={cn(
            "relative z-10 flex-shrink-0 rounded-full p-3 shadow-lg",
            level === 0 
              ? "bg-gradient-to-br from-red-600 to-red-700 text-white" 
              : "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
          )}>
            {level === 0 ? (
              <Building2 className="h-5 w-5" />
            ) : (
              <Users className="h-5 w-5" />
            )}
          </div>

          {/* Card */}
          <Card className={cn(
            "flex-1 border-2 shadow-md hover:shadow-lg transition-all duration-200",
            level === 0 
              ? "border-red-200 dark:border-red-900 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-slate-900" 
              : "border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-900"
          )}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {node.dealer.name}
                    </h3>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                      level === 0 
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    )}>
                      {level === 0 ? "Main Dealer" : "Sub-Dealer"}
                    </span>
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Mail className="h-4 w-4" />
                      <span>{node.dealer.email}</span>
                    </div>
                  </div>
                </div>
                {hasSubDealers && (
                  <div className="ml-4 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {node.subDealers.length} Sub-Dealer{node.subDealers.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sub-Dealers */}
        {hasSubDealers && (
          <div className="mt-4 ml-16 space-y-4">
            {node.subDealers.map((subDealer: any) => (
              <div key={subDealer.id}>
                {renderNode({ dealer: subDealer, subDealers: [] }, level + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const totalDealers = data?.length || 0;
  const totalSubDealers = data?.reduce((acc: number, node: any) => acc + (node.subDealers?.length || 0), 0) || 0;

  return (
    <div className="space-y-8 min-h-screen bg-gradient-to-br from-slate-50 via-red-50/30 to-orange-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Dealer Hierarchy
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">View dealer and sub-dealer network structure</p>
        </div>
        <div className="flex gap-4">
          <Card className="border-red-200 dark:border-red-900 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-slate-900">
            <CardContent className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">Main Dealers</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totalDealers}</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-900">
            <CardContent className="p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">Sub-Dealers</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalSubDealers}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <CardContent className="p-8">
            {!data || data.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-muted-foreground">No dealers found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {data.map((node: any) => (
                  <div key={node.dealer.id}>
                    {renderNode(node, 0)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
