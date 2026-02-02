import User from "../models/User.js";

/**
 * ====================================================
 * DEALER HIERARCHY (Factory View)
 * ====================================================
 *
 * PURPOSE:
 * - Allow FACTORY_ADMIN to see:
 *   • All MAIN dealers
 *   • Their respective SUB-DEALERS
 *
 * DATA RULES:
 * - Main Dealer:
 *   role = "DEALER"
 *   parentDealer = null
 *
 * - Sub Dealer:
 *   role = "SUB_DEALER"
 *   parentDealer = ObjectId (main dealer)
 *
 * ENDPOINT:
 * GET /api/dealers/hierarchy
 *
 * ACCESS:
 * FACTORY_ADMIN only
 */
export const getDealerHierarchy = async (req, res) => {
  try {
    /* --------------------------------------------------
     * 1️⃣ Load MAIN dealers
     * -------------------------------------------------- */
    const dealers = await User.find({
      role: "DEALER",
      parentDealer: null,
      active: true,
    })
      .select("_id name email")
      .lean();

    /* --------------------------------------------------
     * 2️⃣ Load SUB-DEALERS (FIXED)
     * -------------------------------------------------- */
    const subDealers = await User.find({
      role: "SUB_DEALER",          // ✅ CRITICAL FIX
      parentDealer: { $ne: null },
      active: true,
    })
      .select("_id name email parentDealer")
      .lean();

    /* --------------------------------------------------
     * 3️⃣ Build hierarchy tree
     * -------------------------------------------------- */
    const hierarchy = dealers.map(dealer => {
      const children = subDealers.filter(
        sd => String(sd.parentDealer) === String(dealer._id)
      );

      return {
        dealer: {
          id: dealer._id,
          name: dealer.name,
          email: dealer.email,
        },
        subDealers: children.map(sd => ({
          id: sd._id,
          name: sd.name,
          email: sd.email,
        })),
      };
    });

    /* --------------------------------------------------
     * 4️⃣ Response
     * -------------------------------------------------- */
    return res.json({
      count: hierarchy.length,
      data: hierarchy,
    });
  } catch (error) {
    console.error("Get Dealer Hierarchy Error:", error);
    return res.status(500).json({
      message: "Failed to load dealer hierarchy",
    });
  }
};