import { Router } from "express";
import { ContractController } from "./contract.controller";

const contractRoutes = Router();
const contractController = new ContractController();

contractRoutes.post("/contracts", (req, res, next) =>
	contractController.createContract(req, res, next)
);

contractRoutes.get("/contracts/client", (req, res, next) =>
	contractController.getMyClientContracts(req, res, next)
);

contractRoutes.get("/contracts/consultant", (req, res, next) =>
	contractController.getMyConsultantContracts(req, res, next)
);

contractRoutes.get("/contracts/:contractId", (req, res, next) =>
	contractController.getContract(req, res, next)
);

contractRoutes.post("/contracts/:contractId/pay", (req, res, next) =>
	contractController.payForContract(req, res, next)
);

contractRoutes.post("/contracts/:contractId/accept", (req, res, next) =>
	contractController.acceptContract(req, res, next)
);

contractRoutes.post("/contracts/:contractId/request-completion", (req, res, next) =>
	contractController.requestCompletion(req, res, next)
);

contractRoutes.post("/contracts/:contractId/confirm-completion", (req, res, next) =>
	contractController.confirmCompletion(req, res, next)
);

contractRoutes.post("/contracts/:contractId/cancel", (req, res, next) =>
	contractController.cancelContract(req, res, next)
);

export { contractRoutes };
