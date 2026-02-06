import User from "../models/User.js";

/**
 * ====================================================
 * DEALER HIERARCHY (Factory View + Dealer's own sub-dealers)
 * ====================================================
 *
 * PURPOSE:
 * - FACTORY_ADMIN: full hierarchy (all dealers + sub-dealers)
 * - DEALER: only own node with their sub-dealers (for Sub-Dealers page)
 *
 * ENDPOINT:
 * GET /api/dealers/hierarchy
 *
 * ACCESS:
 * FACTORY_ADMIN or DEALER
 */
export const getDealerHierarchy = async (req, res) => {
  try {
    const isDealer = req.user && req.user.role === "DEALER";
    const dealerId = req.user?.userId;

    if (isDealer && dealerId) {
      /* --------------------------------------------------
       * DEALER: return only this dealer's node with their sub-dealers
       * -------------------------------------------------- */
      const dealer = await User.findOne({
        _id: dealerId,
        role: "DEALER",
        active: true,
      })
        .select("_id name email")
        .lean();

      if (!dealer) {
        return res.status(404).json({ message: "Dealer not found" });
      }

      const children = await User.find({
        role: "SUB_DEALER",
        parentDealer: dealerId,
        active: true,
      })
        .select("_id name email createdAt")
        .lean();

      const hierarchy = [
        {
          dealer: {
            id: dealer._id,
            name: dealer.name,
            email: dealer.email,
          },
          subDealers: children.map((sd) => ({
            id: sd._id,
            name: sd.name,
            email: sd.email,
            createdAt: sd.createdAt,
          })),
        },
      ];

      return res.json({
        count: hierarchy.length,
        data: hierarchy,
      });
    }

    /* --------------------------------------------------
     * FACTORY_ADMIN: full hierarchy
     * -------------------------------------------------- */
    const dealers = await User.find({
      role: "DEALER",
      parentDealer: null,
      active: true,
    })
      .select("_id name email")
      .lean();

    const subDealers = await User.find({
      role: "SUB_DEALER",
      parentDealer: { $ne: null },
      active: true,
    })
      .select("_id name email parentDealer createdAt")
      .lean();

    const hierarchy = dealers.map((dealer) => {
      const children = subDealers.filter(
        (sd) => String(sd.parentDealer) === String(dealer._id)
      );

      return {
        dealer: {
          id: dealer._id,
          name: dealer.name,
          email: dealer.email,
        },
        subDealers: children.map((sd) => ({
          id: sd._id,
          name: sd.name,
          email: sd.email,
          createdAt: sd.createdAt,
        })),
      };
    });

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
