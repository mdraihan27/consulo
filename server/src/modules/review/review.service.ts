import { v4 as uuidv4 } from "uuid";
import { ReviewRepository } from "./review.repository";
import { ContractRepository } from "../contract/contract.repository";
import { NotificationService } from "../notification/notification.service";
import { UserService } from "../user/user.service";
import { ConsuloError } from "../../utils/errorHandler";
import { Review } from "./review.model";

export class ReviewService {
	private reviewRepository = new ReviewRepository();
	private contractRepository = new ContractRepository();
	private notificationService = new NotificationService();

	async submitReview(reviewerId: string, contractId: string, rating: number, comment: string): Promise<Review> {
		if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
			throw new ConsuloError(400, "Rating must be an integer between 1 and 5");
		}
		if (!comment || !comment.trim()) {
			throw new ConsuloError(400, "A comment is required");
		}

		const contract = await this.contractRepository.getContractById(contractId);
		if (!contract) throw new ConsuloError(404, "Contract not found");
		if (contract.status !== "completed") {
			throw new ConsuloError(400, "Reviews can only be submitted for completed contracts");
		}

		let revieweeId: string;
		if (contract.clientId === reviewerId) {
			revieweeId = contract.consultantId;
		} else if (contract.consultantId === reviewerId) {
			revieweeId = contract.clientId;
		} else {
			throw new ConsuloError(403, "Only contract participants can leave a review");
		}

		const existing = await this.reviewRepository.getReviewByContractAndReviewer(contractId, reviewerId);
		if (existing) {
			throw new ConsuloError(409, "You have already reviewed this contract");
		}

		const review = await this.reviewRepository.createReview(uuidv4(), contractId, reviewerId, revieweeId, rating, comment.trim());

		// Recalculate consultant composite score (ratings contribute up to 20 points)
		if (contract.consultantId === revieweeId) {
			try {
				const userService = new UserService();
				await userService.recalculateFreelancerTotalScore(revieweeId);
			} catch (e) {
				console.error("Failed to recalculate freelancer score on review submission:", e);
			}
		}

		const allReviews = await this.reviewRepository.getReviewsByContractId(contractId);
		if (allReviews.length === 2) {
			await Promise.all(
				allReviews.map((r) =>
					this.notificationService.notify(
						r.revieweeId,
						"review_received",
						"New review received",
						`You received a ${r.rating}-star review for "${contract.title}".`,
						`/dashboard/consultant/${r.revieweeId}`
					)
				)
			);
		}

		return review;
	}

	async getContractReviews(requesterId: string, contractId: string) {
		const contract = await this.contractRepository.getContractById(contractId);
		if (!contract) throw new ConsuloError(404, "Contract not found");
		if (contract.clientId !== requesterId && contract.consultantId !== requesterId) {
			throw new ConsuloError(403, "Forbidden");
		}

		const reviews = await this.reviewRepository.getReviewsByContractId(contractId);
		const myReview = reviews.find((r) => r.reviewerId === requesterId) || null;
		const theirReview = reviews.find((r) => r.reviewerId !== requesterId) || null;

		return {
			myReview,
			theirReview: myReview && theirReview ? theirReview : null,
			isBlind: !myReview
		};
	}

	async addReply(revieweeId: string, reviewId: string, reply: string) {
		if (!reply || !reply.trim()) {
			throw new ConsuloError(400, "Reply cannot be empty");
		}
		const updated = await this.reviewRepository.addReply(reviewId, revieweeId, reply.trim());
		if (!updated) {
			throw new ConsuloError(404, "Review not found");
		}

		await this.notificationService.notify(
			updated.reviewerId,
			"review_reply",
			"Someone replied to your review",
			"You received a reply to the review you left.",
			`/dashboard/consultant/${revieweeId}`
		);

		return updated;
	}

	async getPublicReviewsForUser(userId: string) {
		const reviews = await this.reviewRepository.getReviewsForUser(userId);
		const { average, count } = await this.reviewRepository.getAverageRatingForUser(userId);
		return { reviews, averageRating: average, reviewCount: count };
	}
}
