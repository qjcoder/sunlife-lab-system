/**
 * Installer Portal: My submissions and my stats.
 * Role: INSTALLER (or INSTALLER_PROGRAM_MANAGER).
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  listMySubmissions,
  getMyStats,
  REWARD_TYPE_LABELS,
} from "@/api/installer-program-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, FileCheck, Trophy, Video, PlusCircle } from "lucide-react";
import { cn, PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from "@/lib/utils";

export default function MySubmissions() {
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["installer-program", "my-submissions"],
    queryFn: listMySubmissions,
  });
  const { data: stats } = useQuery({
    queryKey: ["installer-program", "my-stats"],
    queryFn: getMyStats,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-6">
      <div className="space-y-1 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={PAGE_HEADING_CLASS}>My Submissions</h1>
          <p className={PAGE_SUBHEADING_CLASS}>View status and rewards for your installations</p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/installer/submit">
            <PlusCircle className="h-4 w-4" />
            New submission
          </Link>
        </Button>
      </div>

      {stats && (stats.count > 0 || stats.totalPoints > 0) && (
        <Card className="mb-6 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20">
          <CardContent className="pt-4 flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <span className="font-medium text-teal-800 dark:text-teal-300">
                Points: <strong>{stats.totalPoints}</strong>
              </span>
            </div>
            <div className="font-medium text-teal-800 dark:text-teal-300">
              Cash (PKR): <strong>{stats.totalCashPkr?.toLocaleString()}</strong>
            </div>
            <div className="font-medium text-teal-800 dark:text-teal-300">
              Verified: <strong>{stats.count}</strong>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Submissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serials</TableHead>
                  <TableHead>Reward type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((s) => (
                  <TableRow key={s._id}>
                    <TableCell className="font-mono text-sm">{s.serialNumbers?.join(", ")}</TableCell>
                    <TableCell>{REWARD_TYPE_LABELS[s.rewardType || ""] || s.rewardType}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-xs",
                          s.status === "PENDING" && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
                          s.status === "VERIFIED" && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                          s.status === "REJECTED" && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        )}
                      >
                        {s.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ""}
                    </TableCell>
                    <TableCell>
                      {s.videoPath && (
                        <a href={s.videoPath} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                          <Video className="h-4 w-4" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {submissions.length === 0 && !isLoading && (
            <p className="text-slate-500 py-4">No submissions yet. Submit your first installation to earn rewards.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
