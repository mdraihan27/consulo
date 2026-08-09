import { Router } from "express";
import { FavoriteController } from "./favorite.controller";

const favoriteRoutes = Router();
const favoriteController = new FavoriteController();

favoriteRoutes.get("/favorites", (req, res, next) =>
	favoriteController.getFavorites(req, res, next)
);

favoriteRoutes.post("/favorites/:consultantId", (req, res, next) =>
	favoriteController.addFavorite(req, res, next)
);

favoriteRoutes.delete("/favorites/:consultantId", (req, res, next) =>
	favoriteController.removeFavorite(req, res, next)
);

export { favoriteRoutes };
