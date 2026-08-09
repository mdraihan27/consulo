import { NextFunction, Request, Response } from "express";
import { ConsuloError } from "../utils/errorHandler";

const requireRole = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user?.id) {
            return next(new ConsuloError(401, "Authorization token is required"));
        }
        if (!req.user.role || !roles.includes(req.user.role)) {
            return next(new ConsuloError(403, "You do not have permission to perform this action"));
        }
        next();
    };
};

export { requireRole };
