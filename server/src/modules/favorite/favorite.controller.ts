import { Request, Response, NextFunction } from "express";
import { FavoriteService } from "./favorite.service";
import { ConsuloError } from "../../utils/errorHandler";

export class FavoriteController {
	private favoriteService = new FavoriteService();

	async addFavorite(req: Request, res: Response, next: NextFunction) {
		try {
			const clientId = req.user?.id;
			if (!clientId) throw new ConsuloError(401, "Authorization token is required");

			const consultantId = String(req.params.consultantId || "");
			const favorite = await this.favoriteService.addFavorite(clientId, consultantId);
			res.status(201).json({ success: true, message: "Consultant added to favorites", data: favorite });
		} catch (error) {
			next(error);
		}
	}

	async removeFavorite(req: Request, res: Response, next: NextFunction) {
		try {
			const clientId = req.user?.id;
			if (!clientId) throw new ConsuloError(401, "Authorization token is required");

			const consultantId = String(req.params.consultantId || "");
			await this.favoriteService.removeFavorite(clientId, consultantId);
			res.status(200).json({ success: true, message: "Consultant removed from favorites", data: { consultantId } });
		} catch (error) {
			next(error);
		}
	}

	async getFavorites(req: Request, res: Response, next: NextFunction) {
		try {
			const clientId = req.user?.id;
			if (!clientId) throw new ConsuloError(401, "Authorization token is required");

			const favorites = await this.favoriteService.getFavorites(clientId);
			res.status(200).json({ success: true, message: "Favorites retrieved successfully", data: { favorites } });
		} catch (error) {
			next(error);
		}
	}
}
