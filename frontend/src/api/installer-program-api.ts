/**
 * Installer Program API: programs, reward rules, milestones, submissions, leaderboard, submit.
 */
import api from "./axios";

export interface InstallerProgram {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  description?: string;
}

export interface RewardRule {
  _id: string;
  type: "SINGLE_BATTERY" | "SINGLE_INVERTER" | "SINGLE_VFD" | "BATTERY_PLUS_INVERTER";
  amountPkr: number;
  description?: string;
}

export interface PointsMilestone {
  _id: string;
  pointsRequired: number;
  prizeName: string;
  description?: string;
  order?: number;
}

export interface InstallationSubmission {
  _id: string;
  installer: { _id: string; name: string; email?: string };
  installerName: string;
  location: string;
  contactNumber: string;
  serialNumbers: string[];
  videoPath?: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  rejectionReason?: string;
  verifiedBy?: { _id: string; name: string };
  verifiedAt?: string;
  rewardType?: string;
  cashAmountPkr?: number;
  pointsAwarded?: number;
  program?: { _id: string; name: string; startDate: string; endDate: string };
  createdAt: string;
}

export interface LeaderboardEntry {
  installerId: string;
  installerName: string;
  email?: string;
  totalPoints: number;
  totalCashPkr: number;
  installationCount: number;
}

export const REWARD_TYPE_LABELS: Record<string, string> = {
  SINGLE_BATTERY: "Single Battery",
  SINGLE_INVERTER: "Single Inverter",
  SINGLE_VFD: "VFD",
  BATTERY_PLUS_INVERTER: "Battery + Inverter",
};

export async function getActiveProgram(): Promise<InstallerProgram | null> {
  const { data } = await api.get<InstallerProgram | null>("/api/installer-program/program/active");
  return data;
}

export async function listPrograms(): Promise<InstallerProgram[]> {
  const { data } = await api.get<InstallerProgram[]>("/api/installer-program/programs");
  return data;
}

export async function createProgram(payload: {
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
}): Promise<InstallerProgram> {
  const { data } = await api.post<InstallerProgram>("/api/installer-program/programs", payload);
  return data;
}

export async function updateProgram(
  id: string,
  payload: Partial<InstallerProgram>
): Promise<InstallerProgram> {
  const { data } = await api.put<InstallerProgram>(`/api/installer-program/programs/${id}`, payload);
  return data;
}

export async function listRewardRules(): Promise<RewardRule[]> {
  const { data } = await api.get<RewardRule[]>("/api/installer-program/reward-rules");
  return data;
}

export async function upsertRewardRule(payload: {
  type: string;
  amountPkr: number;
  description?: string;
}): Promise<RewardRule> {
  const { data } = await api.post<RewardRule>("/api/installer-program/reward-rules", payload);
  return data;
}

export async function listMilestones(): Promise<PointsMilestone[]> {
  const { data } = await api.get<PointsMilestone[]>("/api/installer-program/milestones");
  return data;
}

export async function createMilestone(payload: {
  pointsRequired: number;
  prizeName: string;
  description?: string;
  order?: number;
}): Promise<PointsMilestone> {
  const { data } = await api.post<PointsMilestone>("/api/installer-program/milestones", payload);
  return data;
}

export async function updateMilestone(
  id: string,
  payload: Partial<PointsMilestone>
): Promise<PointsMilestone> {
  const { data } = await api.put<PointsMilestone>(
    `/api/installer-program/milestones/${id}`,
    payload
  );
  return data;
}

export async function deleteMilestone(id: string): Promise<void> {
  await api.delete(`/api/installer-program/milestones/${id}`);
}

export async function listSubmissions(params?: {
  status?: string;
  installerId?: string;
}): Promise<InstallationSubmission[]> {
  const { data } = await api.get<InstallationSubmission[]>(
    "/api/installer-program/submissions",
    { params }
  );
  return data;
}

export async function verifySubmission(id: string): Promise<InstallationSubmission> {
  const { data } = await api.post<InstallationSubmission>(
    `/api/installer-program/submissions/${id}/verify`
  );
  return data;
}

export async function rejectSubmission(
  id: string,
  rejectionReason?: string
): Promise<InstallationSubmission> {
  const { data } = await api.post<InstallationSubmission>(
    `/api/installer-program/submissions/${id}/reject`,
    { rejectionReason }
  );
  return data;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data } = await api.get<LeaderboardEntry[]>("/api/installer-program/leaderboard");
  return data;
}

export async function listInstallers(): Promise<{ _id: string; name: string; username: string }[]> {
  const { data } = await api.get("/api/installer-program/installers");
  return data;
}

export async function createInstaller(payload: {
  name: string;
  username: string;
  password: string;
}): Promise<{ id: string; name: string; username: string; role: string }> {
  const { data } = await api.post("/api/installer-program/installers", payload);
  return data;
}

export async function submitInstallation(form: {
  installerName: string;
  location: string;
  contactNumber: string;
  serialNumbers: string[];
  video?: File;
}): Promise<InstallationSubmission> {
  const formData = new FormData();
  formData.append("installerName", form.installerName);
  formData.append("location", form.location);
  formData.append("contactNumber", form.contactNumber);
  formData.append("serialNumbers", JSON.stringify(form.serialNumbers));
  if (form.video) formData.append("video", form.video);
  const { data } = await api.post<InstallationSubmission>(
    "/api/installer-program/submit",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return data;
}

export async function listMySubmissions(): Promise<InstallationSubmission[]> {
  const { data } = await api.get<InstallationSubmission[]>("/api/installer-program/my-submissions");
  return data;
}

export async function getMyStats(): Promise<{
  totalPoints: number;
  totalCashPkr: number;
  count: number;
}> {
  const { data } = await api.get("/api/installer-program/my-stats");
  return data;
}
