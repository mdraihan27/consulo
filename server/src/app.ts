import express from "express";
import cors from "cors";
import { ConsuloError } from "./utils/errorHandler";
import { userRoutes } from "./modules/user/user.routes";
import { bookingRoutes } from "./modules/booking/booking.routes";
import { adminRoutes } from "./modules/admin/admin.routes";
import { contractRoutes } from "./modules/contract/contract.routes";
import { disputeRoutes } from "./modules/dispute/dispute.routes";
import { reviewRoutes } from "./modules/review/review.routes";
import { favoriteRoutes } from "./modules/favorite/favorite.routes";
import { notificationRoutes } from "./modules/notification/notification.routes";
import { schedulingRoutes } from "./modules/scheduling/scheduling.routes";
import dotenv from "dotenv";
import { authMiddleware } from "./middlewares/authMiddleware";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.get("/", (req, res) => {
  res.json({
    message: "Consulo Server is Up and Running..."
  });
});

app.use("/api/v1", userRoutes);
app.use("/api/v1", bookingRoutes);
app.use("/api/v1", adminRoutes);
app.use("/api/v1", contractRoutes);
app.use("/api/v1", disputeRoutes);
app.use("/api/v1", reviewRoutes);
app.use("/api/v1", favoriteRoutes);
app.use("/api/v1", notificationRoutes);
app.use("/api/v1", schedulingRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

app.use(
  (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof ConsuloError) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }

    if (process.env.ENVIRONMENT === "dev") {
      console.error("Error:", err);
    }

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
);

export default app;