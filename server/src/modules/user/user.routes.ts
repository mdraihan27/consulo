import { Router } from "express";
import { UserController } from "./user.controller";

const userRoutes = Router();
const userController = new UserController();

userRoutes.post("/user", (req, res, next) =>
	userController.createUser(req, res, next)
);

export { userRoutes };
