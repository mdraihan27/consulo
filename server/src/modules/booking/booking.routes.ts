import { Router } from "express";
import { BookingController } from "./booking.controller";

const bookingRoutes = Router();
const bookingController = new BookingController();

// Client requests a booking with a consultant
bookingRoutes.post("/bookings", (req, res, next) =>
	bookingController.requestBooking(req, res, next)
);

// Consultant responds (accept/decline)
bookingRoutes.patch("/bookings/:bookingId/respond", (req, res, next) =>
	bookingController.respondToBooking(req, res, next)
);

// Consultant: get all incoming bookings
bookingRoutes.get("/bookings/consultant", (req, res, next) =>
	bookingController.getMyConsultantBookings(req, res, next)
);

// Client: get all their sent bookings
bookingRoutes.get("/bookings/client", (req, res, next) =>
	bookingController.getMyClientBookings(req, res, next)
);

// Get chat history for a booking
bookingRoutes.get("/bookings/:bookingId/chat", (req, res, next) =>
	bookingController.getChatHistory(req, res, next)
);

// Unified inbox across all conversations
bookingRoutes.get("/bookings/inbox", (req, res, next) =>
	bookingController.getInbox(req, res, next)
);

// Mark a booking's chat as read
bookingRoutes.post("/bookings/:bookingId/read", (req, res, next) =>
	bookingController.markRead(req, res, next)
);

export { bookingRoutes };
