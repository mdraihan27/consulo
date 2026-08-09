import { Request, Response, NextFunction } from "express";
import { ReviewService } from "./review.service";
import { ConsuloError } from "../../utils/errorHandler";

export class ReviewController {
	private reviewService = new ReviewService();

	async submitReview(req: Request, res: Response, next: NextFunction) {
		try {
			const reviewerId = req.user?.id;
			if (!reviewerId) throw new ConsuloError(401, "Authorization token is required");

			const { contractId, rating, comment } = req.body || {};
			const review = await this.reviewService.submitReview(reviewerId, contractId, Number(rating), comment);
			res.status(201).json({ success: true, message: "Review submitted successfully", data: review });
		} catch (error) {
			next(error);
		}
	}

	async getContractReviews(req: Request, res: Response, next: NextFunction) {
		try {
			const requesterId = req.user?.id;
			if (!requesterId) throw new ConsuloError(401, "Authorization token is required");

			const contractId = String(req.params.contractId || "");
			const data = await this.reviewService.getContractReviews(requesterId, contractId);
			res.status(200).json({ success: true, message: "Reviews retrieved successfully", data });
		} catch (error) {
			next(error);
		}
	}

	async addReply(req: Request, res: Response, next: NextFunction) {
		try {
			const revieweeId = req.user?.id;
			if (!revieweeId) throw new ConsuloError(401, "Authorization token is required");

			const reviewId = String(req.params.reviewId || "");
			const { reply } = req.body || {};
			const review = await this.reviewService.addReply(revieweeId, reviewId, reply);
			res.status(200).json({ success: true, message: "Reply added successfully", data: review });
		} catch (error) {
			next(error);
		}
	}

	async getPublicReviewsForUser(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = String(req.params.userId || "");
			const data = await this.reviewService.getPublicReviewsForUser(userId);
			res.status(200).json({ success: true, message: "Reviews retrieved successfully", data });
		} catch (error) {
			next(error);
		}
	}
}
