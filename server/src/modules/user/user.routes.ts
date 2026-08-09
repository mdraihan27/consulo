import { Router } from "express";
import { UserController } from "./user.controller";

const userRoutes = Router();
const userController = new UserController();

userRoutes.get("/auth/google", (req, res, next) =>
	userController.googleStart(req, res, next)
);

userRoutes.get("/auth/google/callback", (req, res, next) =>
	userController.googleCallback(req, res, next)
);

userRoutes.post("/auth/logout", (req, res, next) =>
	userController.logout(req, res, next)
);

userRoutes.get("/user/me", (req, res, next) =>
	userController.getMe(req, res, next)
);

userRoutes.put("/user", (req, res, next) =>
	userController.updateUser(req, res, next)
);

userRoutes.patch("/user/profile", (req, res, next) =>
	userController.updateProfile(req, res, next)
);

userRoutes.get("/user/freelancers/search", (req, res, next) =>
	userController.searchFreelancers(req, res, next)
);

userRoutes.get("/user/freelancers/:id", (req, res, next) =>
	userController.getUserProfile(req, res, next)
);

userRoutes.get("/user/assessment/questions", (req, res, next) =>
	userController.getAssessmentQuestions(req, res, next)
);

userRoutes.post("/user/assessment/submit", (req, res, next) =>
	userController.submitAssessment(req, res, next)
);

userRoutes.post("/user/assessment/reset", (req, res, next) =>
	userController.resetAssessment(req, res, next)
);

userRoutes.post("/user/certifications", (req, res, next) =>
	userController.addCertification(req, res, next)
);

userRoutes.delete("/user/certifications/:id", (req, res, next) =>
	userController.deleteCertification(req, res, next)
);

export { userRoutes };
