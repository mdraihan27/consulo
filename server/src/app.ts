import express from "express";
import cors from "cors";
import { ConsuloError } from "./utils/errorHandler";
import { userRoutes } from "./modules/user/user.routes";
import dotenv from "dotenv";

const app = express();

/*
|--------------------------------------------------------------------------
| Middlewares
|--------------------------------------------------------------------------
*/

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.json({
    message: "Consulo Server is Up and Running..."
  });
});

app.use("/api/v1", userRoutes);

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

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