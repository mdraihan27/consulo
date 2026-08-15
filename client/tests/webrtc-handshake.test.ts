/**
 * Drives two CallSession instances against each other with faked WebRTC
 * primitives. The fakes enforce the real browser constraint that matters here:
 * addIceCandidate throws before a remote description exists.
 */
import { CallSession, type CallState } from "../app/_lib/webrtcSession";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
	const ok = String(actual) === String(expected);
	if (!ok) failures += 1;
	console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n      got: ${actual}\n      exp: ${expected}`}`);
}

const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async () => {
	for (let i = 0; i < 30; i += 1) await tick();
};

// ---- fake browser media/WebRTC -------------------------------------------

let stoppedTracks = 0;

class FakeTrack {
	kind: string;
	readyState = "live";
	constructor(kind: string) {
		this.kind = kind;
	}
	stop() {
		this.readyState = "ended";
		stoppedTracks += 1;
	}
}

class FakeStream {
	id: string;
	private tracks: FakeTrack[];
	constructor(id: string, kinds: string[]) {
		this.id = id;
		this.tracks = kinds.map((k) => new FakeTrack(k));
	}
	getTracks() {
		return this.tracks;
	}
}

let gumShouldFail: { name: string; message: string } | null = null;

// Devices the fake machine will hand over. Set these to simulate a webcam held
// by another app, a missing microphone, and so on.
let cameraAvailable = true;
let microphoneAvailable = true;
let fakeDevices = [{ kind: "videoinput" }, { kind: "audioinput" }];
const gumCalls: Array<{ audio: boolean; video: boolean }> = [];

// Node exposes `navigator` as a getter-only global, so it has to be redefined.
let fakeNavigator: any = {
	mediaDevices: {
		enumerateDevices: async () => fakeDevices,
		getUserMedia: async ({ audio, video }: any) => {
			gumCalls.push({ audio: Boolean(audio), video: Boolean(video) });

			if (gumShouldFail) {
				const err: any = new Error(gumShouldFail.message);
				err.name = gumShouldFail.name;
				throw err;
			}
			// The browser fails the whole request if any requested device is
			// unavailable — that is the behaviour the fallback exists for.
			if ((video && !cameraAvailable) || (audio && !microphoneAvailable)) {
				const err: any = new Error("Could not start video source");
				err.name = "NotReadableError";
				throw err;
			}

			const kinds: string[] = [];
			if (audio) kinds.push("audio");
			if (video) kinds.push("video");
			return new FakeStream(`local-${Math.random()}`, kinds);
		}
	}
};

Object.defineProperty(globalThis, "navigator", {
	configurable: true,
	get: () => fakeNavigator
});

(globalThis as any).RTCSessionDescription = class {
	type: string;
	sdp: string;
	constructor(init: any) {
		this.type = init.type;
		this.sdp = init.sdp;
	}
};

(globalThis as any).RTCIceCandidate = class {
	candidate: string;
	constructor(init: any) {
		this.candidate = init.candidate;
	}
};

const liveConnections: FakePeerConnection[] = [];

class FakePeerConnection {
	onicecandidate: ((e: any) => void) | null = null;
	ontrack: ((e: any) => void) | null = null;
	onconnectionstatechange: (() => void) | null = null;
	connectionState = "new";

	localDescription: any = null;
	remoteDescription: any = null;
	appliedCandidates: string[] = [];
	addedTracks: FakeTrack[] = [];
	closed = false;
	label: string;

	constructor() {
		this.label = `pc${liveConnections.length + 1}`;
		liveConnections.push(this);
	}

	addTrack(track: FakeTrack) {
		this.addedTracks.push(track);
	}

	async createOffer() {
		return { type: "offer", sdp: `${this.label}-offer` };
	}

	async createAnswer() {
		return { type: "answer", sdp: `${this.label}-answer` };
	}

	async setLocalDescription(desc: any) {
		this.localDescription = desc;
		// Real ICE gathering is asynchronous and starts right after this.
		setTimeout(() => {
			this.onicecandidate?.({ candidate: { candidate: `${this.label}-cand-1`, toJSON: () => ({ candidate: `${this.label}-cand-1` }) } });
			this.onicecandidate?.({ candidate: { candidate: `${this.label}-cand-2`, toJSON: () => ({ candidate: `${this.label}-cand-2` }) } });
		}, 0);
	}

	async setRemoteDescription(desc: any) {
		this.remoteDescription = desc;
		// The remote's media shows up with their description.
		setTimeout(() => {
			this.ontrack?.({ streams: [new FakeStream(`remote-for-${this.label}`, ["audio", "video"])] });
		}, 0);
	}

	async addIceCandidate(candidate: any) {
		// This is the constraint the old code violated.
		if (!this.remoteDescription) {
			throw new Error("InvalidStateError: cannot add ICE candidate before remote description");
		}
		this.appliedCandidates.push(candidate.candidate);
	}

	simulateConnected() {
		this.connectionState = "connected";
		this.onconnectionstatechange?.();
	}

	close() {
		this.closed = true;
	}
}

(globalThis as any).RTCPeerConnection = FakePeerConnection;

// ---- harness --------------------------------------------------------------

type Peer = {
	name: string;
	session: CallSession;
	state: CallState;
	error: string | null;
	localStream: any;
	remoteStream: any;
};

function buildPair() {
	const peers: Record<string, Peer> = {};

	function make(name: string, otherName: string): Peer {
		const peer: Peer = { name, session: null as any, state: "idle", error: null, localStream: null, remoteStream: null };
		peer.session = new CallSession({
			sendSignal: (type, callType, payload) => {
				// Deliver asynchronously, like a socket would.
				setTimeout(() => {
					void peers[otherName]?.session.handleSignal({ type, callType, payload });
				}, 0);
			},
			onStateChange: (s) => {
				peer.state = s;
			},
			onCallTypeChange: () => {},
			onLocalStream: (s) => {
				peer.localStream = s;
			},
			onRemoteStream: (s) => {
				peer.remoteStream = s;
			},
			onError: (e) => {
				peer.error = e;
			}
		});
		return peer;
	}

	peers.caller = make("caller", "callee");
	peers.callee = make("callee", "caller");
	return peers;
}

async function main() {
	// ---- happy path: full video handshake --------------------------------
	{
		liveConnections.length = 0;
		stoppedTracks = 0;
		const peers = buildPair();

		await peers.caller.session.start("video");
		await settle();

		check("callee is ringing after the offer", peers.callee.state, "ringing");
		check("caller is waiting", peers.caller.state, "calling");

		// Caller's candidates were gathered and sent while the callee was still
		// deciding. They must not be lost.
		const calleePc = () => liveConnections[1];
		check("callee has no peer connection while ringing", liveConnections.length, 1);

		await peers.callee.session.accept();
		await settle();

		check("callee is active", peers.callee.state, "active");
		check("caller is active", peers.caller.state, "active");

		check("callee applied the early candidates", calleePc().appliedCandidates.length, 2);
		check(
			"early candidates applied in order",
			calleePc().appliedCandidates.join(","),
			"pc1-cand-1,pc1-cand-2"
		);
		check("caller applied the callee's candidates", liveConnections[0].appliedCandidates.length, 2);

		check("caller sees remote media", Boolean(peers.caller.remoteStream), true);
		check("callee sees remote media", Boolean(peers.callee.remoteStream), true);
		check("caller published its own media", liveConnections[0].addedTracks.length, 2);
		check("callee published its own media", calleePc().addedTracks.length, 2);
		check("no error on either side", `${peers.caller.error}|${peers.callee.error}`, "null|null");

		// Hanging up releases hardware on both ends.
		peers.caller.session.end();
		await settle();
		check("caller returns to idle", peers.caller.state, "idle");
		check("callee returns to idle", peers.callee.state, "idle");
		check("both peer connections closed", liveConnections.every((pc) => pc.closed), true);
		check("all media tracks stopped", stoppedTracks, 4);
	}

	// ---- voice only ------------------------------------------------------
	{
		liveConnections.length = 0;
		stoppedTracks = 0;
		const peers = buildPair();

		await peers.caller.session.start("voice");
		await settle();
		await peers.callee.session.accept();
		await settle();

		check("voice call connects", `${peers.caller.state}/${peers.callee.state}`, "active/active");
		check("voice call carries audio only", liveConnections[0].addedTracks.length, 1);
	}

	// ---- connection state drives active ----------------------------------
	{
		liveConnections.length = 0;
		const peers = buildPair();
		await peers.caller.session.start("video");
		await settle();
		await peers.callee.session.accept();
		await settle();

		liveConnections[0].simulateConnected();
		await settle();
		check("connected event keeps the call active", peers.caller.state, "active");
	}

	// ---- failure surfaces instead of vanishing ---------------------------
	{
		liveConnections.length = 0;
		const peers = buildPair();

		gumShouldFail = { name: "NotAllowedError", message: "Permission denied" };
		await peers.caller.session.start("video");
		await settle();
		gumShouldFail = null;

		check("blocked camera leaves the dialog open", peers.caller.state, "failed");
		check(
			"blocked camera explains itself",
			peers.caller.error?.includes("blocked"),
			true
		);
		check("callee was never rung", peers.callee.state, "idle");

		peers.caller.session.close();
		check("dismissing clears the error", peers.caller.error, null);
		check("dismissing returns to idle", peers.caller.state, "idle");
	}

	// ---- every device refused --------------------------------------------
	{
		const peers = buildPair();
		gumShouldFail = { name: "NotReadableError", message: "Device in use" };
		await peers.caller.session.start("video");
		await settle();
		gumShouldFail = null;

		check("fully refused hardware reports as failed", peers.caller.state, "failed");
		check(
			"refusal does not blame only another tab",
			peers.caller.error?.includes("antivirus") && peers.caller.error?.includes("Privacy"),
			true
		);
	}

	// ---- microphone unavailable, camera fine -----------------------------
	{
		liveConnections.length = 0;
		gumCalls.length = 0;
		microphoneAvailable = false;
		const peers = buildPair();

		await peers.caller.session.start("video");
		await settle();
		microphoneAvailable = true;

		check("video call still starts without a microphone", peers.caller.state, "calling");
		check("it retried without audio", gumCalls.length, 2);
		check("the retry asked for video only", `${gumCalls[1].audio}/${gumCalls[1].video}`, "false/true");
		check("the caller is told the mic is missing", peers.caller.error?.includes("microphone is unavailable"), true);

		await peers.callee.session.accept();
		await settle();
		check("the degraded call still connects", `${peers.caller.state}/${peers.callee.state}`, "active/active");
	}

	// ---- camera unavailable, microphone fine -----------------------------
	{
		liveConnections.length = 0;
		gumCalls.length = 0;
		cameraAvailable = false;
		const peers = buildPair();

		await peers.caller.session.start("video");
		await settle();
		cameraAvailable = true;

		check("a video call falls back rather than dying", peers.caller.state, "calling");
		check("it tried all the way down to audio only", gumCalls.length, 3);
		check("the caller is told it became a voice call", peers.caller.error?.includes("voice call"), true);

		await peers.callee.session.accept();
		await settle();
		check("the voice fallback connects", `${peers.caller.state}/${peers.callee.state}`, "active/active");
		check("only audio was published", liveConnections[0].addedTracks.length, 1);
	}

	// ---- no camera hardware at all ---------------------------------------
	{
		cameraAvailable = false;
		fakeDevices = [{ kind: "audioinput" }];
		const peers = buildPair();

		// Audio-only fallback succeeds, so this becomes a voice call rather than
		// an error; the useful check is that it never dead-ends.
		await peers.caller.session.start("video");
		await settle();
		check("a machine with no webcam still places a call", peers.caller.state, "calling");

		cameraAvailable = true;
		fakeDevices = [{ kind: "videoinput" }, { kind: "audioinput" }];
	}

	// ---- permission denial is not retried --------------------------------
	{
		gumCalls.length = 0;
		const peers = buildPair();
		gumShouldFail = { name: "NotAllowedError", message: "Permission denied" };
		await peers.caller.session.start("video");
		await settle();
		gumShouldFail = null;

		check("a refused prompt is asked only once", gumCalls.length, 1);
		check("refused permission fails the call", peers.caller.state, "failed");
	}

	// ---- insecure origin -------------------------------------------------
	{
		const peers = buildPair();
		const saved = fakeNavigator;
		fakeNavigator = {};

		await peers.caller.session.start("video");
		await settle();
		fakeNavigator = saved;

		check("missing mediaDevices reports as failed", peers.caller.state, "failed");
		check(
			"insecure origin is explained",
			peers.caller.error?.includes("secure connection"),
			true
		);
	}

	// ---- callee declines -------------------------------------------------
	{
		liveConnections.length = 0;
		stoppedTracks = 0;
		const peers = buildPair();

		await peers.caller.session.start("video");
		await settle();
		peers.callee.session.reject();
		await settle();

		check("caller stops when declined", peers.caller.state, "idle");
		check("declining stops the caller's camera", stoppedTracks, 2);
	}

	// ---- second caller while busy ----------------------------------------
	{
		liveConnections.length = 0;
		const peers = buildPair();
		await peers.caller.session.start("video");
		await settle();
		await peers.callee.session.accept();
		await settle();

		// A third party offers to the callee mid call.
		await peers.callee.session.handleSignal({ type: "call_offer", callType: "voice", payload: { type: "offer", sdp: "x" } });
		await settle();
		check("busy callee stays in its call", peers.callee.state, "active");
	}

	console.log(failures === 0 ? "\nAll call checks passed." : `\n${failures} check(s) FAILED.`);
	process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
	console.error("ERROR:", err);
	process.exit(1);
});
