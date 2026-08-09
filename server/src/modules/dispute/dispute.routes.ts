import { Router } from "express";
import { DisputeController } from "./dispute.controller";
import { requireRole } from "../../middlewares/requireRole";

const disputeRoutes = Router();
const disputeController = new DisputeController();

disputeRoutes.post("/disputes", (req, res, next) =>
	disputeController.raiseDispute(req, res, next)
);

disputeRoutes.get("/disputes/:disputeId", (req, res, next) =>
	disputeController.getDispute(req, res, next)
);

disputeRoutes.get("/admin/disputes", requireRole("admin"), (req, res, next) =>
	disputeController.listAllDisputes(req, res, next)
);

disputeRoutes.post("/admin/disputes/:disputeId/review", requireRole("admin"), (req, res, next) =>
	disputeController.beginReview(req, res, next)
);

disputeRoutes.post("/admin/disputes/:disputeId/resolve", requireRole("admin"), (req, res, next) =>
	disputeController.resolveDispute(req, res, next)
);

export { disputeRoutes };
