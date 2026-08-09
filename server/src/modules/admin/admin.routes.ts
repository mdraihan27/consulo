import { Router } from "express";
import { AdminInviteController } from "./adminInvite.controller";
import { AdminOpsController } from "./adminOps.controller";
import { requireRole } from "../../middlewares/requireRole";

const adminRoutes = Router();
const adminInviteController = new AdminInviteController();
const adminOpsController = new AdminOpsController();

// Scoped to the /admin prefix on purpose: this router is mounted at /api/v1
// alongside the others, so an unscoped `use` would gate every route that follows
// it in app.ts behind the admin role.
adminRoutes.use("/admin", requireRole("admin"));

adminRoutes.get("/admin/invites", (req, res, next) =>
	adminInviteController.listInvites(req, res, next)
);

adminRoutes.post("/admin/invites", (req, res, next) =>
	adminInviteController.inviteAdmin(req, res, next)
);

adminRoutes.delete("/admin/invites/:inviteId", (req, res, next) =>
	adminInviteController.revokeInvite(req, res, next)
);

adminRoutes.get("/admin/users", (req, res, next) =>
	adminOpsController.listUsers(req, res, next)
);

adminRoutes.patch("/admin/users/:userId/suspension", (req, res, next) =>
	adminOpsController.setUserSuspension(req, res, next)
);

adminRoutes.get("/admin/analytics", (req, res, next) =>
	adminOpsController.getAnalytics(req, res, next)
);

adminRoutes.get("/admin/audit-log", (req, res, next) =>
	adminOpsController.getAuditLog(req, res, next)
);

export { adminRoutes };
