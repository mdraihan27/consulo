import { v4 as uuidv4 } from "uuid";
import { FavoriteRepository } from "./favorite.repository";
import { UserRepository } from "../user/user.repository";
import { ConsuloError } from "../../utils/errorHandler";

export class FavoriteService {
	private favoriteRepository = new FavoriteRepository();
	private userRepository = new UserRepository();

	async addFavorite(clientId: string, consultantId: string) {
		if (clientId === consultantId) {
			throw new ConsuloError(400, "You cannot favorite yourself");
		}
		const consultant = await this.userRepository.getUserById(consultantId);
		if (!consultant || consultant.role !== "freelancer") {
			throw new ConsuloError(404, "Consultant not found");
		}
		return await this.favoriteRepository.addFavorite(uuidv4(), clientId, consultantId);
	}

	async removeFavorite(clientId: string, consultantId: string) {
		const removed = await this.favoriteRepository.removeFavorite(clientId, consultantId);
		if (!removed) {
			throw new ConsuloError(404, "This consultant is not in your favorites");
		}
	}

	async getFavorites(clientId: string) {
		return await this.favoriteRepository.getFavoritesForClient(clientId);
	}

	async getFavoriteConsultantIds(clientId: string) {
		return await this.favoriteRepository.getFavoriteConsultantIds(clientId);
	}
}
