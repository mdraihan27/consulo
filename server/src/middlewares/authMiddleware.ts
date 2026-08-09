import { NextFunction, Request, Response } from "express";
import { ConsuloError } from "../utils/errorHandler";
import { JwtHandler } from "../utils/jwtHandler";

const jwtHandler = new JwtHandler();

const PUBLIC_ROUTES: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/" },
  { method: "GET", path: "/api/v1/auth/google" },
  { method: "GET", path: "/api/v1/auth/google/callback" },
  { method: "POST", path: "/api/v1/auth/logout" }
];

const PUBLIC_ROUTE_PATTERNS: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/api\/v1\/reviews\/user\/[^/]+$/ }
];

const isPublicRoute = (req: Request): boolean => {
  const isExactMatch = PUBLIC_ROUTES.some(
    (route) => route.method === req.method && route.path === req.path
  );
  if (isExactMatch) return true;

  return PUBLIC_ROUTE_PATTERNS.some(
    (route) => route.method === req.method && route.pattern.test(req.path)
  );
};

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("[AuthMiddleware DEBUG]", req.method, JSON.stringify(req.path), "isPublic:", isPublicRoute(req));
    if (req.method === "OPTIONS" || isPublicRoute(req)) {
      return next();
    }

    const header = String(req.headers.authorization || "");
    const tokens: string[] = [];
    if (header.startsWith("Bearer ")) {
      tokens.push(header.replace("Bearer ", "").trim());
    }
    const raw = String(req.headers.cookie || "");
    if (raw) {
      const parts = raw.split(";").map((p) => p.trim());
      for (const part of parts) {
        const idx = part.indexOf("=");
        if (idx === -1) continue;
        const key = part.slice(0, idx);
        if (key === "consulo_access_token") {
          tokens.push(decodeURIComponent(part.slice(idx + 1)));
        }
      }
    }

    if (tokens.length === 0) {
      console.log("[AuthMiddleware] No token found in headers or cookies");
      throw new ConsuloError(401, "Authorization token is required");
    }

    let lastError: any = null;
    let verifiedPayload: any = null;

    for (const tok of tokens) {
      try {
        verifiedPayload = jwtHandler.verifyAccessToken(tok);
        break; // Successfully verified one
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!verifiedPayload) {
      console.error("[AuthMiddleware] All JWT tokens failed verification. Last error:", lastError?.message || lastError);
      throw lastError || new ConsuloError(401, "Invalid or expired token");
    }

    req.user = {
      id: verifiedPayload.sub,
      role: verifiedPayload.role,
      username: verifiedPayload.username,
      email: verifiedPayload.email
    };

    return next();
  } catch (error) {
    if (error instanceof ConsuloError) {
      return next(error);
    }
    return next(new ConsuloError(401, "Invalid or expired token"));
  }
};

export { authMiddleware };
