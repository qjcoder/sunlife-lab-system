import mongoose from "mongoose";

/**
 * INSTALLER PROGRAM
 * Annual (or periodic) program with start/end dates.
 * Only submissions within this window are eligible.
 */
const installerProgramSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("InstallerProgram", installerProgramSchema);
