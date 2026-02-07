/**
 * Installer Portal: Submit installation (name, location, contact, video, serial numbers).
 * Role: INSTALLER (or INSTALLER_PROGRAM_MANAGER).
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/store/auth-store";
import {
  getActiveProgram,
  submitInstallation,
  getMyStats,
  REWARD_TYPE_LABELS,
} from "@/api/installer-program-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Loader2, Video, Hash, MapPin, Phone, User, Plus, X } from "lucide-react";
import { cn, PAGE_HEADING_CLASS, PAGE_SUBHEADING_CLASS } from "@/lib/utils";

const schema = z.object({
  installerName: z.string().min(1, "Name required"),
  location: z.string().min(1, "Location required"),
  contactNumber: z.string().min(1, "Contact required"),
  serial1: z.string().min(1, "At least one serial required"),
  serial2: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function SubmitInstallation() {
  const { user } = useAuth();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const { data: activeProgram, isLoading: loadingProgram } = useQuery({
    queryKey: ["installer-program", "active"],
    queryFn: getActiveProgram,
  });
  const { data: myStats } = useQuery({
    queryKey: ["installer-program", "my-stats"],
    queryFn: getMyStats,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      installerName: user?.name ?? "",
      contactNumber: "",
      location: "",
      serial1: "",
      serial2: "",
    },
  });

  const serial1 = watch("serial1");
  const serial2 = watch("serial2");

  const submitMutation = useMutation({
    mutationFn: (data: FormData) => {
      const serials = [data.serial1.trim()].filter(Boolean);
      if (data.serial2?.trim()) serials.push(data.serial2.trim());
      return submitInstallation({
        installerName: data.installerName,
        location: data.location,
        contactNumber: data.contactNumber,
        serialNumbers: serials,
        video: videoFile || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Installation submitted for verification");
      reset({ installerName: watch("installerName"), serial1: "", serial2: "", location: "", contactNumber: "" });
      setVideoFile(null);
      queryClient.invalidateQueries({ queryKey: ["installer-program"] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Submission failed");
    },
  });

  const onSubmit = (data: FormData) => submitMutation.mutate(data);

  if (loadingProgram) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!activeProgram) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-6">
        <div className="space-y-1 mb-6">
          <h1 className={PAGE_HEADING_CLASS}>Submit Installation</h1>
          <p className={PAGE_SUBHEADING_CLASS}>Earn cash and points for verified installations</p>
        </div>
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6">
            <p className="text-amber-800 dark:text-amber-200 font-medium">
              No active installer program at the moment. Program may have ended or not started yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-6">
      <div className="space-y-1 mb-6">
        <h1 className={PAGE_HEADING_CLASS}>Submit Installation</h1>
        <p className={PAGE_SUBHEADING_CLASS}>
          Program: {activeProgram.name} — 1 point per verified installation + cash reward
        </p>
      </div>

      {myStats && (myStats.count > 0 || myStats.totalPoints > 0) && (
        <Card className="mb-6 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20">
          <CardContent className="pt-4 flex flex-wrap gap-4">
            <span className="font-medium text-teal-800 dark:text-teal-300">
              Your stats: <strong>{myStats.totalPoints}</strong> points ·{" "}
              <strong>{myStats.totalCashPkr?.toLocaleString()}</strong> PKR ·{" "}
              <strong>{myStats.count}</strong> verified
            </span>
          </CardContent>
        </Card>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Installation details</CardTitle>
          <CardDescription>
            Enter your name, location, contact, serial number(s), and optional short video. Serial must be in company database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Name
                </Label>
                <Input {...register("installerName")} placeholder="Your name" />
                {errors.installerName && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{errors.installerName.message}</p>
                )}
              </div>
              <div>
                <Label className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Contact
                </Label>
                <Input {...register("contactNumber")} placeholder="Phone number" />
                {errors.contactNumber && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{errors.contactNumber.message}</p>
                )}
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Location
              </Label>
              <Input {...register("location")} placeholder="City / area" />
              {errors.location && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{errors.location.message}</p>
              )}
            </div>
            <div>
              <Label className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5" /> Serial number (required)
              </Label>
              <Input {...register("serial1")} placeholder="Product serial number" />
              {errors.serial1 && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{errors.serial1.message}</p>
              )}
            </div>
            <div>
              <Label className="text-slate-600 dark:text-slate-400">
                Second serial (optional — for Battery + Inverter combo reward)
              </Label>
              <Input {...register("serial2")} placeholder="Second serial" />
            </div>
            <div>
              <Label className="flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5" /> Installation video (optional, max 50MB)
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                />
                {videoFile && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setVideoFile(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <Button type="submit" disabled={submitMutation.isPending} className="gap-2">
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
