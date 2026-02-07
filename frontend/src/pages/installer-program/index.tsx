/**
 * Installer Program Manager: Program dates, reward rules, milestones, submissions (verify/reject), leaderboard.
 * Role: INSTALLER_PROGRAM_MANAGER
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getActiveProgram,
  listPrograms,
  createProgram,
  listRewardRules,
  upsertRewardRule,
  listMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  listSubmissions,
  verifySubmission,
  rejectSubmission,
  getLeaderboard,
  listInstallers,
  createInstaller,
  REWARD_TYPE_LABELS,
  type InstallerProgram as ProgramType,
  type RewardRule,
  type PointsMilestone,
  type InstallationSubmission,
  type LeaderboardEntry,
} from "@/api/installer-program-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Trophy,
  Calendar,
  Banknote,
  Target,
  FileCheck,
  Award,
  Loader2,
  CheckCircle2,
  XCircle,
  Video,
  Plus,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { cn, PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const TABS = [
  { id: "program", label: "Program", icon: Calendar },
  { id: "rewards", label: "Reward Rules (PKR)", icon: Banknote },
  { id: "milestones", label: "Points Prizes", icon: Target },
  { id: "installers", label: "Installers", icon: Users },
  { id: "submissions", label: "Submissions", icon: FileCheck },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
] as const;

export default function InstallerProgramManager() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("program");
  const [programForm, setProgramForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
  });
  const [milestoneForm, setMilestoneForm] = useState({ pointsRequired: "", prizeName: "", description: "" });
  const [editingMilestone, setEditingMilestone] = useState<PointsMilestone | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [deletingMilestoneId, setDeletingMilestoneId] = useState<string | null>(null);
  const [installerForm, setInstallerForm] = useState({ name: "", username: "", password: "" });
  const queryClient = useQueryClient();

  const { data: activeProgram } = useQuery({
    queryKey: ["installer-program", "active"],
    queryFn: getActiveProgram,
  });
  const { data: programs = [], isLoading: loadingPrograms } = useQuery({
    queryKey: ["installer-program", "programs"],
    queryFn: listPrograms,
  });
  const { data: rewardRules = [] } = useQuery({
    queryKey: ["installer-program", "reward-rules"],
    queryFn: listRewardRules,
  });
  const { data: milestones = [] } = useQuery({
    queryKey: ["installer-program", "milestones"],
    queryFn: listMilestones,
  });
  const { data: submissions = [], isLoading: loadingSubmissions } = useQuery({
    queryKey: ["installer-program", "submissions"],
    queryFn: () => listSubmissions(),
  });
  const { data: leaderboard = [] } = useQuery({
    queryKey: ["installer-program", "leaderboard"],
    queryFn: getLeaderboard,
  });
  const { data: installers = [] } = useQuery({
    queryKey: ["installer-program", "installers"],
    queryFn: listInstallers,
  });

  const createProgramMutation = useMutation({
    mutationFn: createProgram,
    onSuccess: () => {
      toast.success("Program created");
      queryClient.invalidateQueries({ queryKey: ["installer-program"] });
      setProgramForm({ name: "", startDate: "", endDate: "", description: "" });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to create program");
    },
  });

  const rewardRuleMutation = useMutation({
    mutationFn: (payload: { type: string; amountPkr: number; description?: string }) =>
      upsertRewardRule(payload),
    onSuccess: () => {
      toast.success("Reward rule saved");
      queryClient.invalidateQueries({ queryKey: ["installer-program", "reward-rules"] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to save");
    },
  });

  const createMilestoneMutation = useMutation({
    mutationFn: createMilestone,
    onSuccess: () => {
      toast.success("Milestone added");
      queryClient.invalidateQueries({ queryKey: ["installer-program", "milestones"] });
      setMilestoneForm({ pointsRequired: "", prizeName: "", description: "" });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to add milestone");
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PointsMilestone> }) =>
      updateMilestone(id, payload),
    onSuccess: () => {
      toast.success("Milestone updated");
      queryClient.invalidateQueries({ queryKey: ["installer-program", "milestones"] });
      setEditingMilestone(null);
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: deleteMilestone,
    onSuccess: () => {
      toast.success("Milestone deleted");
      queryClient.invalidateQueries({ queryKey: ["installer-program", "milestones"] });
      setDeletingMilestoneId(null);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: verifySubmission,
    onSuccess: () => {
      toast.success("Submission verified");
      queryClient.invalidateQueries({ queryKey: ["installer-program"] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to verify");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectSubmission(id, reason),
    onSuccess: () => {
      toast.success("Submission rejected");
      queryClient.invalidateQueries({ queryKey: ["installer-program"] });
      setRejectingId(null);
      setRejectReason("");
    },
  });

  const createInstallerMutation = useMutation({
    mutationFn: createInstaller,
    onSuccess: () => {
      toast.success("Installer account created");
      queryClient.invalidateQueries({ queryKey: ["installer-program", "installers"] });
      setInstallerForm({ name: "", username: "", password: "" });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to create installer");
    },
  });

  const pendingSubmissions = submissions.filter((s) => s.status === "PENDING");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/20 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-6">
      <div className="space-y-1 mb-6">
        <h1 className={PAGE_HEADING_CLASS}>Installer Program</h1>
        <p className={PAGE_SUBHEADING_CLASS}>
          Manage program dates, cash rewards, points prizes, and verify installation submissions
        </p>
      </div>

      {activeProgram && (
        <Card className="mb-6 border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-violet-800 dark:text-violet-300">
              Active program: <span className="font-bold">{activeProgram.name}</span> —{" "}
              {new Date(activeProgram.startDate).toLocaleDateString()} to{" "}
              {new Date(activeProgram.endDate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Program */}
      {activeTab === "program" && (
        <Card>
          <CardHeader>
            <CardTitle>Program dates</CardTitle>
            <CardDescription>Create a program with start and end date. Only one active at a time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={programForm.name}
                  onChange={(e) => setProgramForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. 2025 Installer Program"
                />
              </div>
              <div>
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={programForm.startDate}
                  onChange={(e) => setProgramForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>End date</Label>
                <Input
                  type="date"
                  value={programForm.endDate}
                  onChange={(e) => setProgramForm((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>
            <Button
              onClick={() =>
                createProgramMutation.mutate({
                  name: programForm.name,
                  startDate: programForm.startDate,
                  endDate: programForm.endDate,
                  description: programForm.description || undefined,
                })
              }
              disabled={!programForm.name || !programForm.startDate || !programForm.endDate || createProgramMutation.isPending}
            >
              {createProgramMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create program
            </Button>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Existing programs</p>
              {loadingPrograms ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  {programs.map((p: ProgramType) => (
                    <li key={p._id}>
                      {p.name} — {new Date(p.startDate).toLocaleDateString()} to {new Date(p.endDate).toLocaleDateString()}
                      {p.isActive ? " (active)" : ""}
                    </li>
                  ))}
                  {programs.length === 0 && <li>No programs yet.</li>}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reward rules */}
      {activeTab === "rewards" && (
        <Card>
          <CardHeader>
            <CardTitle>Cash rewards (PKR)</CardTitle>
            <CardDescription>Amount per installation type. Edit and save to update.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                "SINGLE_BATTERY",
                "SINGLE_INVERTER",
                "SINGLE_VFD",
                "BATTERY_PLUS_INVERTER",
              ].map((type) => {
                const rule = rewardRules.find((r) => r.type === type);
                return (
                  <div key={type} className="flex flex-wrap items-center gap-3">
                    <span className="font-medium w-48">{REWARD_TYPE_LABELS[type] || type}</span>
                    <Input
                      type="number"
                      className="w-32"
                      placeholder="PKR"
                      defaultValue={rule?.amountPkr ?? 0}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isNaN(v)) rewardRuleMutation.mutate({ type, amountPkr: v });
                      }}
                    />
                    <span className="text-sm text-slate-500">PKR</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestones */}
      {activeTab === "milestones" && (
        <Card>
          <CardHeader>
            <CardTitle>Points prizes</CardTitle>
            <CardDescription>e.g. 10 points → Mobile, 25 → Bike. 1 point per verified installation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Points"
                type="number"
                className="w-24"
                value={milestoneForm.pointsRequired}
                onChange={(e) => setMilestoneForm((m) => ({ ...m, pointsRequired: e.target.value }))}
              />
              <Input
                placeholder="Prize name"
                className="w-48"
                value={milestoneForm.prizeName}
                onChange={(e) => setMilestoneForm((m) => ({ ...m, prizeName: e.target.value }))}
              />
              <Button
                onClick={() =>
                  createMilestoneMutation.mutate({
                    pointsRequired: Number(milestoneForm.pointsRequired),
                    prizeName: milestoneForm.prizeName,
                    description: milestoneForm.description || undefined,
                  })
                }
                disabled={!milestoneForm.pointsRequired || !milestoneForm.prizeName || createMilestoneMutation.isPending}
              >
                Add
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Points</TableHead>
                  <TableHead>Prize</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestones.map((m) => (
                  <TableRow key={m._id}>
                    <TableCell>{m.pointsRequired}</TableCell>
                    <TableCell>{m.prizeName}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setDeletingMilestoneId(m._id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ConfirmDialog
              open={!!deletingMilestoneId}
              onClose={() => setDeletingMilestoneId(null)}
              onConfirm={() => deletingMilestoneId && deleteMilestoneMutation.mutate(deletingMilestoneId)}
              title="Delete milestone?"
              description="This cannot be undone."
            />
          </CardContent>
        </Card>
      )}

      {/* Installers */}
      {activeTab === "installers" && (
        <Card>
          <CardHeader>
            <CardTitle>Installer accounts</CardTitle>
            <CardDescription>Create login accounts for installers. They use username + password to submit installations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Name"
                className="w-40"
                value={installerForm.name}
                onChange={(e) => setInstallerForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                placeholder="Username"
                className="w-40"
                value={installerForm.username}
                onChange={(e) => setInstallerForm((f) => ({ ...f, username: e.target.value }))}
              />
              <Input
                type="password"
                placeholder="Password"
                className="w-40"
                value={installerForm.password}
                onChange={(e) => setInstallerForm((f) => ({ ...f, password: e.target.value }))}
              />
              <Button
                onClick={() =>
                  createInstallerMutation.mutate({
                    name: installerForm.name,
                    username: installerForm.username,
                    password: installerForm.password,
                  })
                }
                disabled={!installerForm.name || !installerForm.username || installerForm.password.length < 6 || createInstallerMutation.isPending}
              >
                {createInstallerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add installer
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installers.map((i: { _id: string; name: string; username: string }) => (
                  <TableRow key={i._id}>
                    <TableCell>{i.name}</TableCell>
                    <TableCell>{i.username}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {installers.length === 0 && <p className="text-slate-500 py-2">No installer accounts yet.</p>}
          </CardContent>
        </Card>
      )}

      {/* Submissions */}
      {activeTab === "submissions" && (
        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>Verify or reject pending submissions. Verified = 1 point + cash reward.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSubmissions ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Installer</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Serials</TableHead>
                    <TableHead>Reward type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((s: InstallationSubmission) => (
                    <TableRow key={s._id}>
                      <TableCell>
                        <p className="font-medium">{s.installerName}</p>
                        <p className="text-xs text-slate-500">{s.contactNumber}</p>
                      </TableCell>
                      <TableCell>{s.location}</TableCell>
                      <TableCell className="text-sm">{s.serialNumbers?.join(", ")}</TableCell>
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
                      <TableCell className="text-sm text-slate-500">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ""}
                      </TableCell>
                      <TableCell>
                        {s.status === "PENDING" && (
                          <div className="flex gap-1">
                            {s.videoPath && (
                              <a
                                href={s.videoPath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-violet-600 hover:underline"
                              >
                                <Video className="h-4 w-4" />
                              </a>
                            )}
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => verifyMutation.mutate(s._id)}
                              disabled={verifyMutation.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectingId(s._id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {submissions.length === 0 && !loadingSubmissions && (
              <p className="text-slate-500 py-4">No submissions yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRejectingId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (rejectingId) rejectMutation.mutate({ id: rejectingId, reason: rejectReason });
                }}
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leaderboard */}
      {activeTab === "leaderboard" && (
        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
            <CardDescription>Total points and cash (PKR) per installer (verified only)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Installer</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Cash (PKR)</TableHead>
                  <TableHead>Installations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry: LeaderboardEntry, i: number) => (
                  <TableRow key={entry.installerId}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <p className="font-medium">{entry.installerName}</p>
                      {entry.email && <p className="text-xs text-slate-500">{entry.email}</p>}
                    </TableCell>
                    <TableCell>{entry.totalPoints}</TableCell>
                    <TableCell>{entry.totalCashPkr?.toLocaleString()}</TableCell>
                    <TableCell>{entry.installationCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {leaderboard.length === 0 && <p className="text-slate-500 py-4">No verified submissions yet.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
