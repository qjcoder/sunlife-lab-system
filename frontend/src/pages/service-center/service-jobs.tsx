import { useQuery } from '@tanstack/react-query';
import { listServiceJobs } from '@/api/service-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ServiceJobs() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['service-jobs'],
    queryFn: listServiceJobs,
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
            <p className="text-destructive">Failed to load service jobs</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Jobs</h1>
          <p className="text-muted-foreground">Manage service jobs and repairs</p>
        </div>
        <Button onClick={() => navigate('/service-center/create-job')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Job
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Service Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {!data || data.length === 0 ? (
            <p className="text-muted-foreground">No service jobs found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Inverter Serial</TableHead>
                  <TableHead>Service Center</TableHead>
                  <TableHead>Visit Date</TableHead>
                  <TableHead>Reported Fault</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((job) => (
                  <TableRow key={job._id}>
                    <TableCell className="font-medium">{job._id.slice(-8)}</TableCell>
                    <TableCell>{job.serialNumber}</TableCell>
                    <TableCell>{job.serviceCenter}</TableCell>
                    <TableCell>{new Date(job.visitDate).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-xs truncate">{job.reportedFault}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link
                          to={`/service-center/jobs/${job._id}`}
                          className="text-primary hover:underline"
                        >
                          View Details
                        </Link>
                        <span className="text-muted-foreground">|</span>
                        <Link
                          to={`/lifecycle/${job.serialNumber}`}
                          className="text-primary hover:underline"
                        >
                          Lifecycle
                        </Link>
                      </div>
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
