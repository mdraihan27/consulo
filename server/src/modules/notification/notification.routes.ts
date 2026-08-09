import { Router } from "express";
import { NotificationController } from "./notification.controller";

const notificationRoutes = Router();
const notificationController = new NotificationController();

notificationRoutes.get("/notifications", (req, res, next) =>
	notificationController.getForUser(req, res, next)
);

notificationRoutes.post("/notifications/:notificationId/read", (req, res, next) =>
	notificationController.markRead(req, res, next)
);

notificationRoutes.post("/notifications/read-all", (req, res, next) =>
	notificationController.markAllRead(req, res, next)
);

export { notificationRoutes };
