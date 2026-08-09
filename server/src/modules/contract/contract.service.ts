import { v4 as uuidv4 } from "uuid";
import { ContractRepository } from "./contract.repository";
import { BookingRepository } from "../booking/booking.repository";
import { NotificationService } from "../notification/notification.service";
import { ConsuloError } from "../../utils/errorHandler";

const PLATFORM_FEE_PERCENT = 5;

export class ContractService {
	private contractRepository = new ContractRepository();
	private bookingRepository = new BookingRepository();
	private notificationService = new NotificationService();

	async createContract(clientId: string, bookingId: string, title: string, amount: number) {
		if (!title || !title.trim()) {
			throw new ConsuloError(400, "Contract title is required");
		}
		if (!Number.isFinite(amount) || amount <= 0) {
			throw new ConsuloError(400, "Contract amount must be a positive number");
		}

		const booking = await this.bookingRepository.getBookingById(bookingId);
		if (!booking) throw new ConsuloError(404, "Booking not found");
		if (booking.clientId !== clientId) throw new ConsuloError(403, "Only the client on this booking can create a contract");
		if (booking.status !== "accepted") throw new ConsuloError(400, "A contract can only be created from an accepted booking");

		const existingContract = await this.contractRepository.getContractByBookingId(bookingId);
		if (existingContract) throw new ConsuloError(409, "A contract already exists for this booking");

		const contract = await this.contractRepository.createContract(
			uuidv4(),
			bookingId,
			clientId,
			booking.consultantId,
			title.trim(),
			amount,
			PLATFORM_FEE_PERCENT
		);

		await this.notificationService.notify(
			booking.consultantId,
			"contract_created",
			"New contract created",
			`A contract "${contract.title}" for $${contract.amount.toFixed(2)} awaits client payment.`,
			`/dashboard/contracts/${contract.id}`
		);

		return contract;
	}

	async payForContract(clientId: string, contractId: string) {
		const contract = await this.contractRepository.getContractById(contractId);
		if (!contract) throw new ConsuloError(404, "Contract not found");
		if (contract.clientId !== clientId) throw new ConsuloError(403, "Only the client can pay for this contract");
		if (contract.status !== "pending_payment") throw new ConsuloError(400, "This contract is not awaiting payment");

		await this.contractRepository.createTransaction(uuidv4(), contractId, "payment", contract.amount);
		const updated = await this.contractRepository.updateContractStatus(contractId, "funded");

		await this.notificationService.notify(
			contract.consultantId,
			"contract_funded",
			"Contract funded",
			`"${contract.title}" has been funded with $${contract.amount.toFixed(2)}. You can now accept and begin work.`,
			`/dashboard/contracts/${contract.id}`
		);

		return updated;
	}

	async acceptContract(consultantId: string, contractId: string) {
		const contract = await this.contractRepository.getContractById(contractId);
		if (!contract) throw new ConsuloError(404, "Contract not found");
		if (contract.consultantId !== consultantId) throw new ConsuloError(403, "Only the consultant can accept this contract");
		if (contract.status !== "funded") throw new ConsuloError(400, "This contract is not funded yet");

		const updated = await this.contractRepository.updateContractStatus(contractId, "in_progress");

		await this.notificationService.notify(
			contract.clientId,
			"contract_accepted",
			"Contract accepted",
			`The consultant accepted "${contract.title}" and work has begun.`,
			`/dashboard/contracts/${contract.id}`
		);

		return updated;
	}

	async requestCompletion(consultantId: string, contractId: string) {
		const contract = await this.contractRepository.getContractById(contractId);
		if (!contract) throw new ConsuloError(404, "Contract not found");
		if (contract.consultantId !== consultantId) throw new ConsuloError(403, "Only the consultant can request completion");
		if (contract.status !== "in_progress") throw new ConsuloError(400, "This contract is not in progress");

		const updated = await this.contractRepository.updateContractStatus(contractId, "completion_requested");

		await this.notificationService.notify(
			contract.clientId,
			"completion_requested",
			"Completion requested",
			`The consultant marked "${contract.title}" as finished. Please confirm to release payment.`,
			`/dashboard/contracts/${contract.id}`
		);

		return updated;
	}

	async confirmCompletion(clientId: string, contractId: string) {
		const contract = await this.contractRepository.getContractById(contractId);
		if (!contract) throw new ConsuloError(404, "Contract not found");
		if (contract.clientId !== clientId) throw new ConsuloError(403, "Only the client can confirm completion");
		if (contract.status !== "completion_requested") throw new ConsuloError(400, "This contract has no pending completion request");

		await this.contractRepository.createTransaction(uuidv4(), contractId, "release", contract.consultantPayoutAmount);
		await this.contractRepository.createTransaction(uuidv4(), contractId, "platform_fee", contract.platformFeeAmount);
		const updated = await this.contractRepository.updateContractStatus(contractId, "completed");

		await this.notificationService.notify(
			contract.consultantId,
			"contract_completed",
			"Payment released",
			`"${contract.title}" is complete. $${contract.consultantPayoutAmount.toFixed(2)} has been released to you.`,
			`/dashboard/contracts/${contract.id}`
		);

		return updated;
	}

	async cancelContract(requesterId: string, contractId: string) {
		const contract = await this.contractRepository.getContractById(contractId);
		if (!contract) throw new ConsuloError(404, "Contract not found");
		if (contract.clientId !== requesterId && contract.consultantId !== requesterId) {
			throw new ConsuloError(403, "Forbidden");
		}
		if (contract.status !== "pending_payment") {
			throw new ConsuloError(400, "Only unfunded contracts can be cancelled");
		}
		return await this.contractRepository.updateContractStatus(contractId, "cancelled");
	}

	async getContract(requesterId: string, contractId: string) {
		const contract = await this.contractRepository.getContractById(contractId);
		if (!contract) throw new ConsuloError(404, "Contract not found");
		if (contract.clientId !== requesterId && contract.consultantId !== requesterId) {
			throw new ConsuloError(403, "Forbidden");
		}
		const transactions = await this.contractRepository.getTransactionsForContract(contractId);
		return { contract, transactions };
	}

	async getMyClientContracts(clientId: string) {
		return await this.contractRepository.getContractsForClient(clientId);
	}

	async getMyConsultantContracts(consultantId: string) {
		return await this.contractRepository.getContractsForConsultant(consultantId);
	}
}
