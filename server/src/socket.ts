import { Server as SocketIOServer, Socket } from "socket.io";
import { BookingRepository } from "./modules/booking/booking.repository";
import { UserRepository } from "./modules/user/user.repository";
import { NotificationService } from "./modules/notification/notification.service";
import { SessionService } from "./modules/scheduling/session.service";
import { JwtHandler } from "./utils/jwtHandler";
import { CloudinaryHandler } from "./utils/cloudinaryHandler";
import { v4 as uuidv4 } from "uuid";

const bookingRepo = new BookingRepository();
const userRepo = new UserRepository();
const notificationService = new NotificationService();
const sessionService = new SessionService();
const jwtHandler = new JwtHandler();
const cloudinaryHandler = new CloudinaryHandler();

const onlineUsers = new Map<string, number>();

function markOnline(userId: string) {
	onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);
}

function markOffline(userId: string) {
	const count = (onlineUsers.get(userId) || 1) - 1;
	if (count <= 0) {
		onlineUsers.delete(userId);
	} else {
		onlineUsers.set(userId, count);
	}
}

async function notifyIfOffline(recipientId: string, senderId: string, bookingId: string, preview: string) {
	if (onlineUsers.has(recipientId)) return;
	const sender = await userRepo.getUserById(senderId);
	await notificationService.notify(
		recipientId,
		"new_message",
		`New message from ${sender?.firstName || "Consulo user"}`,
		preview,
		`/dashboard/chat/${bookingId}`
	);
}

async function authenticateSocket(socket: Socket): Promise<string | null> {
	let token = socket.handshake.auth?.token as string | undefined;

	if (!token) {
		const cookieHeader = socket.handshake.headers.cookie || "";
		const cookies = Object.fromEntries(
			cookieHeader.split(";").map((c) => {
				const idx = c.indexOf("=");
				return [c.slice(0, idx).trim(), decodeURIComponent(c.slice(idx + 1).trim())];
			})
		);
		token = cookies["consulo_access_token"];
	}

	if (!token) return null;

	try {
		const payload = jwtHandler.verifyAccessToken(token) as any;
		return payload?.sub || null;
	} catch {
		return null;
	}
}

export function setupSocketIO(io: SocketIOServer) {
	io.use(async (socket, next) => {
		const userId = await authenticateSocket(socket);
		if (!userId) {
			return next(new Error("Authentication required"));
		}
		(socket as any).userId = userId;
		next();
	});

	io.on("connection", (socket: Socket) => {
		const userId = (socket as any).userId as string;
		markOnline(userId);
		io.emit("presence_update", { userId, isOnline: true });

		socket.on("join_booking", async (data: { bookingId: string }) => {
			const { bookingId } = data;
			if (!bookingId) return;

			const booking = await bookingRepo.getBookingById(bookingId);
			if (!booking) return;

			if (booking.clientId !== userId && booking.consultantId !== userId) {
				socket.emit("error", { message: "Unauthorized" });
				return;
			}

			socket.join(`booking:${bookingId}`);
			const otherUserId = booking.clientId === userId ? booking.consultantId : booking.clientId;
			socket.emit("joined", { bookingId, otherUserOnline: onlineUsers.has(otherUserId) });
		});

		socket.on("send_message", async (data: { bookingId: string; content: string }) => {
			const { bookingId, content } = data;
			if (!bookingId || !content?.trim()) return;

			const booking = await bookingRepo.getBookingById(bookingId);
			if (!booking) return;
			if (booking.clientId !== userId && booking.consultantId !== userId) {
				socket.emit("error", { message: "Unauthorized" });
				return;
			}
			if (booking.status === "declined" || booking.status === "completed") {
				socket.emit("error", { message: "Cannot send messages to a closed booking" });
				return;
			}

			const msgId = uuidv4();
			const message = await bookingRepo.addMessage(msgId, bookingId, userId, content.trim());

			io.to(`booking:${bookingId}`).emit("new_message", {
				id: message.id,
				bookingId: message.bookingId,
				senderId: message.senderId,
				content: message.content,
				messageType: message.messageType,
				fileUrl: message.fileUrl,
				fileName: message.fileName,
				createdAt: message.createdAt
			});

			const recipientId = booking.clientId === userId ? booking.consultantId : booking.clientId;
			await notifyIfOffline(recipientId, userId, bookingId, message.content);
		});

		socket.on("send_file", async (data: { bookingId: string; fileBase64: string; fileName: string }) => {
			const { bookingId, fileBase64, fileName } = data;
			if (!bookingId || !fileBase64 || !fileName) return;

			const booking = await bookingRepo.getBookingById(bookingId);
			if (!booking) return;
			if (booking.clientId !== userId && booking.consultantId !== userId) {
				socket.emit("error", { message: "Unauthorized" });
				return;
			}
			if (booking.status === "declined" || booking.status === "completed") {
				socket.emit("error", { message: "Cannot send files to a closed booking" });
				return;
			}

			try {
				const fileUrl = await cloudinaryHandler.uploadChatFile(fileBase64);
				const msgId = uuidv4();
				const message = await bookingRepo.addMessage(msgId, bookingId, userId, fileName, "file", fileUrl, fileName);

				io.to(`booking:${bookingId}`).emit("new_message", {
					id: message.id,
					bookingId: message.bookingId,
					senderId: message.senderId,
					content: message.content,
					messageType: message.messageType,
					fileUrl: message.fileUrl,
					fileName: message.fileName,
					createdAt: message.createdAt
				});

				const recipientId = booking.clientId === userId ? booking.consultantId : booking.clientId;
				await notifyIfOffline(recipientId, userId, bookingId, `Sent a file: ${fileName}`);
			} catch {
				socket.emit("error", { message: "File upload failed" });
			}
		});

		socket.on("typing", (data: { bookingId: string; isTyping: boolean }) => {
			const { bookingId, isTyping } = data;
			if (!bookingId) return;
			socket.to(`booking:${bookingId}`).emit("typing_update", { bookingId, userId, isTyping });
		});

		socket.on("mark_read", async (data: { bookingId: string }) => {
			const { bookingId } = data;
			if (!bookingId) return;

			const booking = await bookingRepo.getBookingById(bookingId);
			if (!booking) return;
			if (booking.clientId !== userId && booking.consultantId !== userId) return;

			await bookingRepo.markRead(bookingId, userId);
			socket.to(`booking:${bookingId}`).emit("read_receipt", { bookingId, userId, readAt: new Date().toISOString() });
		});

		socket.on("booking_response", async (data: { bookingId: string; action: "accepted" | "declined" }) => {
			const { bookingId, action } = data;
			if (!bookingId || !["accepted", "declined"].includes(action)) return;

			const booking = await bookingRepo.getBookingById(bookingId);
			if (!booking) return;
			if (booking.consultantId !== userId) {
				socket.emit("error", { message: "Only the consultant can respond" });
				return;
			}
			if (booking.status !== "pending") {
				socket.emit("error", { message: "Booking is not pending" });
				return;
			}

			await bookingRepo.updateBookingStatus(bookingId, action);

			// Keep the socket path in step with the REST one: a time proposed with
			// the request is confirmed on accept and released on decline.
			const sessions =
				action === "accepted"
					? await sessionService.confirmPendingSessionsForBooking(bookingId)
					: await sessionService.releasePendingSessionsForBooking(bookingId);

			io.to(`booking:${bookingId}`).emit("booking_updated", {
				bookingId,
				status: action,
				sessionsUpdated: sessions.length
			});
		});

		socket.on("call_signal", async (data: { bookingId: string; type: "call_offer" | "call_answer" | "ice_candidate" | "call_end" | "call_reject"; callType?: "voice" | "video"; payload?: any }) => {
			const { bookingId, type, callType, payload } = data;
			if (!bookingId || !type) return;

			const booking = await bookingRepo.getBookingById(bookingId);
			if (!booking) return;
			if (booking.clientId !== userId && booking.consultantId !== userId) return;

			socket.to(`booking:${bookingId}`).emit("call_signal", { bookingId, type, callType, payload, fromUserId: userId });
		});

		socket.on("disconnect", () => {
			markOffline(userId);
			if (!onlineUsers.has(userId)) {
				io.emit("presence_update", { userId, isOnline: false });
			}
		});
	});
}
