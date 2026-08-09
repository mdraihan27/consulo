import { Router } from "express";
import { AvailabilityController } from "./availability.controller";
import { SessionController } from "./session.controller";

const schedulingRoutes = Router();
const availabilityController = new AvailabilityController();
const sessionController = new SessionController();

// ---- Availability (consultant manages their own calendar) ----

schedulingRoutes.get("/availability/me", (req, res, next) =>
	availabilityController.getMyAvailability(req, res, next)
);

schedulingRoutes.put("/availability/me", (req, res, next) =>
	availabilityController.updateMyAvailability(req, res, next)
);

schedulingRoutes.post("/availability/me/time-off", (req, res, next) =>
	availabilityController.addTimeOff(req, res, next)
);

schedulingRoutes.delete("/availability/me/time-off/:timeOffId", (req, res, next) =>
	availabilityController.removeTimeOff(req, res, next)
);

// ---- Open slots (what a client can book) ----

schedulingRoutes.get("/consultants/:consultantId/slots", (req, res, next) =>
	availabilityController.getConsultantSlots(req, res, next)
);

// ---- Sessions ----

schedulingRoutes.get("/sessions", (req, res, next) =>
	sessionController.getMySessions(req, res, next)
);

schedulingRoutes.post("/sessions", (req, res, next) =>
	sessionController.bookSession(req, res, next)
);

schedulingRoutes.get("/bookings/:bookingId/sessions", (req, res, next) =>
	sessionController.getSessionsForBooking(req, res, next)
);

schedulingRoutes.post("/sessions/:sessionId/reschedule", (req, res, next) =>
	sessionController.rescheduleSession(req, res, next)
);

schedulingRoutes.post("/sessions/:sessionId/cancel", (req, res, next) =>
	sessionController.cancelSession(req, res, next)
);

schedulingRoutes.post("/sessions/:sessionId/complete", (req, res, next) =>
	sessionController.completeSession(req, res, next)
);

schedulingRoutes.post("/sessions/:sessionId/no-show", (req, res, next) =>
	sessionController.markNoShow(req, res, next)
);

export { schedulingRoutes };
