import { Request, Response, NextFunction } from "express";
import { UserService } from "./user.service";
import { User } from "./user.model";
import { JwtHandler } from "../../utils/jwtHandler";
import { ConsuloError } from "../../utils/errorHandler";
import crypto from "crypto";

class UserController {
	userService = new UserService();
	jwtHandler = new JwtHandler();

	private getCookie(req: Request, name: string): string | null {
		const raw = String(req.headers.cookie || "");
		if (!raw) return null;
		const parts = raw.split(";").map((p) => p.trim());
		for (const part of parts) {
			const idx = part.indexOf("=");
			if (idx === -1) continue;
			const key = part.slice(0, idx);
			if (key !== name) continue;
			return decodeURIComponent(part.slice(idx + 1));
		}
		return null;
	}

	async googleStart(req: Request, res: Response, next: NextFunction) {
		try {
			const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
			const redirectUri = (process.env.GOOGLE_REDIRECT_URI || "").trim();
			if (!clientId || !redirectUri) {
				throw new ConsuloError(500, "Google OAuth is not configured");
			}

			const state = crypto.randomBytes(16).toString("hex");
			const isSecure = process.env.ENVIRONMENT !== "dev";
			res.cookie("consulo_oauth_state", state, {
				httpOnly: true,
				sameSite: "lax",
				secure: isSecure,
				maxAge: 10 * 60 * 1000,
				path: "/"
			});

			const params = new URLSearchParams({
				client_id: clientId,
				redirect_uri: redirectUri,
				response_type: "code",
				scope: "openid email profile",
				state,
				prompt: "select_account"
			});

			res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
		} catch (error) {
			next(error);
		}
	}

	async googleCallback(req: Request, res: Response, next: NextFunction) {
		try {
			const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
			const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
			const redirectUri = (process.env.GOOGLE_REDIRECT_URI || "").trim();
			const clientOrigin = (process.env.CLIENT_ORIGIN || "http://localhost:3000").trim();
			if (!clientId || !clientSecret || !redirectUri) {
				throw new ConsuloError(500, "Google OAuth is not configured");
			}

			const query = req.query as { code?: string; state?: string; error?: string };
			if (query.error) {
				throw new ConsuloError(401, "Google authentication failed");
			}
			const code = String(query.code || "").trim();
			const state = String(query.state || "").trim();
			if (!code || !state) {
				throw new ConsuloError(401, "Google authentication failed");
			}

			const cookieState = this.getCookie(req, "consulo_oauth_state");
			if (!cookieState || cookieState !== state) {
				throw new ConsuloError(401, "Google authentication failed");
			}

			const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					code,
					client_id: clientId,
					client_secret: clientSecret,
					redirect_uri: redirectUri,
					grant_type: "authorization_code"
				})
			});

			if (!tokenRes.ok) {
				throw new ConsuloError(401, "Google authentication failed");
			}

			const tokenJson = (await tokenRes.json()) as { access_token?: string };
			const googleAccessToken = String(tokenJson.access_token || "").trim();
			if (!googleAccessToken) {
				throw new ConsuloError(401, "Google authentication failed");
			}

			const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
				headers: { Authorization: `Bearer ${googleAccessToken}` }
			});
			if (!infoRes.ok) {
				throw new ConsuloError(401, "Google authentication failed");
			}
			const profile = (await infoRes.json()) as {
				email?: string;
				given_name?: string;
				family_name?: string;
				picture?: string;
			};

			const user = await this.userService.getOrCreateGoogleUser({
				email: String(profile.email || "").trim(),
				firstName: String(profile.given_name || "").trim(),
				lastName: String(profile.family_name || "").trim(),
				profilePicture: String(profile.picture || "").trim()
			});

			const accessToken = this.jwtHandler.signAccessToken({
				sub: user.id,
				username: user.username,
				role: user.role,
				email: user.email
			});
			const refreshToken = this.jwtHandler.signRefreshToken(user.id);

			const isSecure = process.env.ENVIRONMENT !== "dev";
			res.clearCookie("consulo_oauth_state", { path: "/" });
			res.cookie("consulo_access_token", accessToken, {
				httpOnly: true,
				sameSite: "lax",
				secure: isSecure,
				path: "/"
			});
			res.cookie("consulo_refresh_token", refreshToken, {
				httpOnly: true,
				sameSite: "lax",
				secure: isSecure,
				path: "/"
			});

			res.redirect(`${clientOrigin}/dashboard`);
		} catch (error) {
			next(error);
		}
	}

	async logout(req: Request, res: Response, next: NextFunction) {
		try {
			res.clearCookie("consulo_access_token", { path: "/" });
			res.clearCookie("consulo_refresh_token", { path: "/" });
			res.status(200).json({
				success: true,
				message: "Logged out successfully",
				data: { ok: true }
			});
		} catch (error) {
			next(error);
		}
	}

	async getMe(req: Request, res: Response, next: NextFunction) {
		try {
			if (!req.user?.id) {
				throw new ConsuloError(401, "Authorization token is required");
			}

			const user = await this.userService.getUserInfoById(req.user.id);
			res.status(200).json({
				success: true,
				message: "User retrieved successfully",
				data: user
			});
		} catch (error) {
			next(error);
		}
	}

	async updateProfile(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = req.user?.id;
			if (!userId) {
				throw new ConsuloError(401, "Authorization token is required");
			}

			const body = req.body || {};
			const result = await this.userService.updateProfile(userId, {
				firstName: body.firstName,
				lastName: body.lastName,
				username: body.username,
				bio: body.bio,
				title: body.title,
				profilePictureBase64: body.profilePictureBase64,
				removeProfilePicture: Boolean(body.removeProfilePicture)
			});

			// The access token carries the username, so a rename has to refresh it
			// or the rest of the session keeps presenting the old handle.
			const accessToken = this.jwtHandler.signAccessToken({
				sub: result.id,
				username: result.username,
				role: result.role,
				email: result.email
			});
			res.cookie("consulo_access_token", accessToken, {
				httpOnly: true,
				sameSite: "lax",
				secure: process.env.ENVIRONMENT !== "dev",
				path: "/"
			});

			res.status(200).json({
				success: true,
				message: "Profile updated successfully",
				data: result
			});
		} catch (error) {
			next(error);
		}
	}

	async updateUser(req: Request, res: Response, next: NextFunction) {
		try {
			const body = req.body || {};

			if (!req.user?.id) {
				throw new ConsuloError(401, "Authorization token is required");
			}

			if (body.id && body.id !== req.user.id) {
				throw new ConsuloError(403, "Cannot update another user");
			}

			const user = new User(
				body.id || req.user.id,
				body.firstName,
				body.lastName,
				"",
				"",
				body.role,
				false,
				body.bio ?? "",
				body.profilePicture ?? "",
				""
			);

			const result = await this.userService.updateUser(user, body.title);
			if (result.role) {
				const accessToken = this.jwtHandler.signAccessToken({
					sub: result.id,
					username: result.username,
					role: result.role,
					email: result.email
				});
				const isSecure = process.env.ENVIRONMENT !== "dev";
				res.cookie("consulo_access_token", accessToken, {
					httpOnly: true,
					sameSite: "lax",
					secure: isSecure,
					path: "/"
				});
			}

			res.status(200).json({
				success: true,
				message: "User updated successfully",
				data: result
			});


		} catch (error) {
			next(error);
		}

	}

	async getAssessmentQuestions(req: Request, res: Response, next: NextFunction) {
		try {
			if (!req.user?.id) {
				throw new ConsuloError(401, "Authorization token is required");
			}

			const questions = await this.userService.generateAssessmentQuestions(req.user.id);

			res.status(200).json({
				success: true,
				message: "Assessment questions generated successfully",
				data: { questions }
			});
		} catch (error) {
			next(error);
		}
	}

	async submitAssessment(req: Request, res: Response, next: NextFunction) {
		try {
			if (!req.user?.id) {
				throw new ConsuloError(401, "Authorization token is required");
			}

			const body = req.body || {};
			const answers = body.answers as Array<{ question: string; answer: string }>;
			if (!Array.isArray(answers) || answers.length === 0) {
				throw new ConsuloError(400, "Answers are required");
			}

			const result = await this.userService.gradeAssessment(req.user.id, answers);

			res.status(200).json({
				success: true,
				message: "Assessment evaluated successfully",
				data: result
			});

		} catch (error) {
			next(error);
		}
	}

	async resetAssessment(req: Request, res: Response, next: NextFunction) {
		try {
			if (!req.user?.id) {
				throw new ConsuloError(401, "Authorization token is required");
			}

			const result = await this.userService.resetFreelancerAssessment(req.user.id);

			res.status(200).json({
				success: true,
				message: "Assessment reset successfully",
				data: result
			});
		} catch (error) {
			next(error);
		}
	}

	async getUserProfile(req: Request, res: Response, next: NextFunction) {
		try {
			const userId = String(req.params.id || "").trim();
			if (!userId) {
				throw new ConsuloError(400, "User ID is required");
			}

			const user = await this.userService.getUserInfoById(userId);
			res.status(200).json({
				success: true,
				message: "User profile retrieved successfully",
				data: user
			});
		} catch (error) {
			next(error);
		}
	}

	async searchFreelancers(req: Request, res: Response, next: NextFunction) {
		try {
			if (!req.user?.id) {
				throw new ConsuloError(401, "Authorization token is required");
			}

			const query = String(req.query.q || "").trim();
			const minTestScore = req.query.minTestScore ? Number(req.query.minTestScore) : undefined;
			const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
			const sortBy = req.query.sortBy as "relevance" | "rating" | "test_score" | "newest" | undefined;

			if (!query && minTestScore === undefined && minRating === undefined) {
				throw new ConsuloError(400, "A search query or at least one filter is required");
			}

			const results = await this.userService.searchFreelancers({ query, minTestScore, minRating, sortBy });

			res.status(200).json({
				success: true,
				message: "Freelancers retrieved successfully",
				data: { freelancers: results }
			});
		} catch (error) {
			next(error);
		}
	}

	async addCertification(req: Request, res: Response, next: NextFunction) {
		try {
			if (!req.user?.id) {
				throw new ConsuloError(401, "Authorization token is required");
			}

			const body = req.body || {};
			const result = await this.userService.addCertification(
				req.user.id,
				body.name,
				body.url,
				body.imageBase64
			);

			res.status(201).json({
				success: true,
				message: "Certification added successfully",
				data: result
			});
		} catch (error) {
			next(error);
		}
	}

	async deleteCertification(req: Request, res: Response, next: NextFunction) {
		try {
			if (!req.user?.id) {
				throw new ConsuloError(401, "Authorization token is required");
			}

			const certId = String(req.params.id || "").trim();
			await this.userService.deleteCertification(req.user.id, certId);

			res.status(200).json({
				success: true,
				message: "Certification deleted successfully",
				data: { id: certId }
			});
		} catch (error) {
			next(error);
		}
	}
}

export { UserController };
