import mongoose from "mongoose";

/**
 * INSTALLATION SUBMISSION
 * Installer submits: name, location, contact, video, serial(s).
 * Reward type derived from product type(s). 1 point per verified installation.
 */
const installationSubmissionSchema = new mongoose.Schema(
  {
    installer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    installerName: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },

    serialNumbers: [{ type: String, trim: true }],
    videoPath: { type: String, trim: true },

    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
    },
    rejectionReason: { type: String, trim: true },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    verifiedAt: { type: Date, default: null },

    rewardType: {
      type: String,
      enum: ["SINGLE_BATTERY", "SINGLE_INVERTER", "SINGLE_VFD", "BATTERY_PLUS_INVERTER"],
      default: null,
    },
    cashAmountPkr: { type: Number, default: null },
    pointsAwarded: { type: Number, default: 1 },

    program: { type: mongoose.Schema.Types.ObjectId, ref: "InstallerProgram", default: null },
  },
  { timestamps: true }
);

installationSubmissionSchema.index({ installer: 1, status: 1 });
installationSubmissionSchema.index({ serialNumbers: 1 });
installationSubmissionSchema.index({ status: 1 });

export default mongoose.model("InstallationSubmission", installationSubmissionSchema);
