import { Router } from "express";
import { ReviewController } from "./review.controller";

const reviewRoutes = Router();
const reviewController = new ReviewController();

reviewRoutes.post("/reviews", (req, res, next) =>
	reviewController.submitReview(req, res, next)
);

reviewRoutes.get("/reviews/contract/:contractId", (req, res, next) =>
	reviewController.getContractReviews(req, res, next)
);

reviewRoutes.post("/reviews/:reviewId/reply", (req, res, next) =>
	reviewController.addReply(req, res, next)
);

reviewRoutes.get("/reviews/user/:userId", (req, res, next) =>
	reviewController.getPublicReviewsForUser(req, res, next)
);

export { reviewRoutes };
