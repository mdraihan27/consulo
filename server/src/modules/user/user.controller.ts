import { Request, Response, NextFunction } from "express";
import { UserService } from "./user.service";
import { User } from "./user.model";
import { RandomGenerator } from "../../utils/randomGenerator";

class UserController {
	userService = new UserService();
	randomGenerator = new RandomGenerator();

	async createUser(req: Request, res: Response, next: NextFunction) {
		try {
			if(process.env.ENVIRONMENT === "dev"){
				console.log("Request Body:", req.body);
			}

			const body = req.body || {};

			const user = new User(
				"",
				body.firstName ?? "",
				body.lastName ?? "",
				body.email,
				body.username,
				body.role,
				body.isVerified ?? false,
				"",
				"",
				body.password
			);


			const result = await this.userService.createUser(user);

			res.status(201).json({
				success: true,
				message: "User created successfully",
				data: result
			});
		} catch (error) {
			next(error);
		}
	}
}

export { UserController };
