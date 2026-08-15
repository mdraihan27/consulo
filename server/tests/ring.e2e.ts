import dotenv from "dotenv";
dotenv.config();

import { pool } from "../src/config/db";
import { JwtHandler } from "../src/utils/jwtHandler";

const { io } = require("e:/consulo/client/node_modules/socket.io-client");

const SOCKET_URL = `http://localhost:${process.env.PORT || 4000}`;
const BASE = `${SOCKET_URL}/api/v1`;
const jwt = new JwtHandler();

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
	const ok = String(actual) === String(expected);
	if (!ok) failures += 1;
	console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n      got: ${actual}\n      exp: ${expected}`}`);
}

const CONSULTANT = "e2e-ring-consultant";
const CLIENT = "e2e-ring-client";
const OUTSIDER = "e2e-ring-outsider";

const token = (id: string, role: string) => jwt.signAccessToken({ sub: id, username: id, role, email: `${id}@e.com` });

function connect(userId: string, role: string): Promise<any> {
	return new Promise((resolve, reject) => {
		const socket = io(SOCKET_URL, { auth: { token: token(userId, role) }, transports: ["websocket"] });
		socket.on("connect", () => resolve(socket));
		socket.on("connect_error", reject);
		setTimeout(() => reject(new Error("connect timed out")), 8000);
	});
}

const waitFor = (socket: any, event: string, ms = 5000) =>
	new Promise<any>((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(`timed out waiting for "${event}"`)), ms);
		socket.once(event, (payload: any) => {
			clearTimeout(timer);
			resolve(payload);
		});
	});

async function cleanup() {
	await pool.query(`DELETE FROM users WHERE id IN ($1,$2,$3)`, [CONSULTANT, CLIENT, OUTSIDER]);
}

async function main() {
	await cleanup();
	for (const [id, role, first] of [
		[CONSULTANT, "freelancer", "Casey"],
		[CLIENT, "client", "Robin"],
		[OUTSIDER, "client", "Nosy"]
	] as const) {
		await pool.query(
			`INSERT INTO users (id,first_name,last_name,email,username,password,role,is_verified) VALUES ($1,$2,'Hale',$3,$1,'x',$4,true)`,
			[id, first, `${id}@e.com`, role]
		);
	}
	await pool.query(`INSERT INTO freelancer_profiles (id,user_id,title) VALUES ('e2e-ring-p',$1,'Cloud')`, [CONSULTANT]);

	const res = await fetch(`${BASE}/bookings`, {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${token(CLIENT, "client")}` },
		body: JSON.stringify({ consultantId: CONSULTANT, message: "Need help." })
	});
	const bookingId = (await res.json()).data.id;

	// The caller is in the conversation. The recipient is NOT: their socket never
	// joins the booking room, exactly like sitting on the dashboard.
	const caller = await connect(CLIENT, "client");
	const recipientElsewhere = await connect(CONSULTANT, "freelancer");

	const callerJoined = waitFor(caller, "joined");
	caller.emit("join_booking", { bookingId });
	await callerJoined;

	const ringing = waitFor(recipientElsewhere, "call_signal");
	caller.emit("call_signal", { bookingId, type: "call_offer", callType: "video", payload: { type: "offer", sdp: "SDP" } });

	let offer: any = null;
	try {
		offer = await ringing;
	} catch {
		offer = null;
	}

	check("a call rings someone who is not in the chat page", Boolean(offer), true);
	check("the ring carries the conversation id", offer?.bookingId, bookingId);
	check("the ring says it is a video call", offer?.callType, "video");
	check("the ring names the caller", offer?.fromName, "Robin Hale");
	check("the offer payload arrives intact", offer?.payload?.sdp, "SDP");

	// A second device belonging to the recipient should ring too.
	const recipientSecondDevice = await connect(CONSULTANT, "freelancer");
	const secondRing = waitFor(recipientSecondDevice, "call_signal");
	caller.emit("call_signal", { bookingId, type: "call_offer", callType: "voice", payload: { type: "offer", sdp: "SDP2" } });
	let second: any = null;
	try {
		second = await secondRing;
	} catch {
		second = null;
	}
	check("every device the recipient has open rings", Boolean(second), true);

	// The caller must not receive their own offer back.
	let echoed = false;
	caller.on("call_signal", (e: any) => {
		if (e.type === "call_offer") echoed = true;
	});
	caller.emit("call_signal", { bookingId, type: "call_offer", callType: "video", payload: { sdp: "X" } });
	await new Promise((r) => setTimeout(r, 400));
	check("the caller does not ring itself", echoed, false);

	// Nobody outside the conversation hears anything.
	const outsider = await connect(OUTSIDER, "client");
	let leaked = false;
	outsider.on("call_signal", () => {
		leaked = true;
	});
	caller.emit("call_signal", { bookingId, type: "call_offer", callType: "video", payload: { sdp: "Y" } });
	await new Promise((r) => setTimeout(r, 400));
	check("a call does not leak to other users", leaked, false);

	// Answer travels back to the caller, who is in the room.
	const answerBack = waitFor(caller, "call_signal");
	recipientElsewhere.emit("call_signal", { bookingId, type: "call_answer", callType: "video", payload: { sdp: "ANSWER" } });
	check("the answer reaches the caller", (await answerBack)?.payload?.sdp, "ANSWER");

	// Candidates keep flowing both ways without the room.
	const candidateBack = waitFor(recipientElsewhere, "call_signal");
	caller.emit("call_signal", { bookingId, type: "ice_candidate", payload: { candidate: "C1" } });
	check("candidates still reach the recipient", (await candidateBack)?.payload?.candidate, "C1");

	// Somebody who is not part of the booking cannot ring its members.
	let intrusion = false;
	recipientElsewhere.on("call_signal", (e: any) => {
		if (e.fromUserId === OUTSIDER) intrusion = true;
	});
	outsider.emit("call_signal", { bookingId, type: "call_offer", callType: "video", payload: { sdp: "Z" } });
	await new Promise((r) => setTimeout(r, 400));
	check("a stranger cannot ring a conversation they are not in", intrusion, false);

	caller.disconnect();
	recipientElsewhere.disconnect();
	recipientSecondDevice.disconnect();
	outsider.disconnect();

	await cleanup();
	console.log(failures === 0 ? "\nAll ring checks passed." : `\n${failures} check(s) FAILED.`);
	await pool.end();
	process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
	console.error("E2E ERROR:", err);
	await cleanup().catch(() => {});
	await pool.end().catch(() => {});
	process.exit(1);
});
