import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

type AccessTokenPayload = {
	sub: string;
	username: string;
	role: string | null;
	email: string;
};

type RefreshTokenPayload = {
	sub: string;
	tokenType: "refresh";
};

class JwtHandler {
	private getAccessSecret(): string {
		return process.env.JWT_ACCESS_SECRET || "consulo_access_secret";
	}

	private getRefreshSecret(): string {
		return process.env.JWT_REFRESH_SECRET || "consulo_refresh_secret";
	}

	private getAccessExpiresIn(): SignOptions["expiresIn"] {
		return (process.env.JWT_ACCESS_EXPIRES_IN || "15m") as SignOptions["expiresIn"];
	}

	private getRefreshExpiresIn(): SignOptions["expiresIn"] {
		return (process.env.JWT_REFRESH_EXPIRES_IN || "7d") as SignOptions["expiresIn"];
	}

	signAccessToken(payload: AccessTokenPayload): string {
		const options: SignOptions = { expiresIn: this.getAccessExpiresIn() };
		return jwt.sign(payload, this.getAccessSecret(), options);
	}

	signRefreshToken(userId: string): string {
		const payload: RefreshTokenPayload = { sub: userId, tokenType: "refresh" };
		const options: SignOptions = { expiresIn: this.getRefreshExpiresIn() };
		return jwt.sign(payload, this.getRefreshSecret(), options);
	}

	verifyAccessToken(token: string): JwtPayload & AccessTokenPayload {
		return jwt.verify(token, this.getAccessSecret()) as JwtPayload & AccessTokenPayload;
	}

	verifyRefreshToken(token: string): JwtPayload & RefreshTokenPayload {
		return jwt.verify(token, this.getRefreshSecret()) as JwtPayload & RefreshTokenPayload;
	}
}

export { JwtHandler };
