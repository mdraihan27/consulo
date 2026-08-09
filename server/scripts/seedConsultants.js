require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const pool = new Pool({
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT),
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME
});

const SECTORS = [
	"Software Development",
	"Web Development",
	"Mobile App Development",
	"UI/UX Design",
	"Product Management",
	"Cyber Security",
	"Cloud Architecture",
	"DevOps Engineering",
	"Data Science & Analytics",
	"Artificial Intelligence / Machine Learning",
	"IT Consulting",
	"Digital Marketing",
	"Search Engine Optimization (SEO)",
	"Content Strategy",
	"Social Media Management",
	"Brand Strategy",
	"Copywriting",
	"Graphic Design",
	"Video Editing & Production",
	"Motion Graphics",
	"Financial Advisory",
	"Tax Consulting",
	"Bookkeeping & Accounting",
	"Business Strategy",
	"Management Consulting",
	"Human Resources (HR)",
	"Recruiting & Talent Acquisition",
	"Legal Advisory",
	"Intellectual Property Law",
	"Public Relations (PR)",
	"Sales & Business Development",
	"E-commerce Strategy",
	"Supply Chain & Logistics",
	"Real Estate Consulting",
	"Healthcare Consulting",
	"Career Coaching",
	"Life Coaching",
	"Executive Coaching",
	"Educational Consulting",
	"Translation & Localization",
	"Technical Writing",
	"Agile Coaching / Scrum Master",
	"Audio Production / Engineering",
	"Photography",
	"Interior Design",
	"Architecture",
	"Environmental & Sustainability Consulting",
	"Risk Management",
	"Event Planning & Management",
	"Fundraising & Non-Profit Consulting"
];

const FIRST_NAMES = [
	"James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth",
	"William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen",
	"Christopher", "Nancy", "Daniel", "Lisa", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra",
	"Donald", "Ashley", "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
	"Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa", "Timothy", "Deborah",
	"Ronald", "Stephanie", "Edward", "Rebecca", "Jason", "Sharon", "Jeffrey", "Laura", "Ryan", "Cynthia",
	"Jacob", "Kathleen", "Gary", "Amy", "Nicholas", "Shirley", "Eric", "Angela", "Jonathan", "Helen",
	"Stephen", "Anna", "Larry", "Brenda", "Justin", "Pamela", "Scott", "Nicole", "Brandon", "Emma",
	"Benjamin", "Samantha", "Samuel", "Katherine", "Raj", "Priya", "Wei", "Mei", "Ahmed", "Fatima",
	"Carlos", "Sofia", "Yuki", "Hana", "Olumide", "Amara", "Lars", "Freya", "Diego", "Valentina"
];

const LAST_NAMES = [
	"Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
	"Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
	"Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
	"Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
	"Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
	"Patel", "Khan", "Kim", "Chen", "Singh", "Kumar", "Okafor", "Diallo", "Andersson", "Rossi",
	"Silva", "Mueller", "Novak", "Ivanov", "Tanaka", "Suzuki", "Nakamura", "Park", "Choi", "Zhang"
];

const CERT_PROVIDERS = [
	{ name: "AWS Certified Solutions Architect", url: "https://www.credly.com/badges/aws-certified-solutions-architect" },
	{ name: "PMP - Project Management Professional", url: "https://www.pmi.org/certifications/project-management-pmp" },
	{ name: "Google UX Design Certificate", url: "https://www.coursera.org/professional-certificates/google-ux-design" },
	{ name: "Certified ScrumMaster (CSM)", url: "https://www.scrumalliance.org/get-certified/scrum-master-track/certified-scrummaster" },
	{ name: "CFA - Chartered Financial Analyst", url: "https://www.cfainstitute.org/en/programs/cfa" },
	{ name: "HubSpot Content Marketing Certification", url: "https://academy.hubspot.com/courses/content-marketing" },
	{ name: "Certified Information Systems Security Professional (CISSP)", url: "https://www.isc2.org/certifications/cissp" },
	{ name: "Google Data Analytics Certificate", url: "https://www.coursera.org/professional-certificates/google-data-analytics" },
	{ name: "SHRM-CP - HR Certification", url: "https://www.shrm.org/credentials/certification" },
	{ name: "Meta Certified Digital Marketing Associate", url: "https://www.facebook.com/business/learn/certification" }
];

const REVIEW_COMMENTS_POSITIVE = [
	"Exceptional work, delivered ahead of schedule and exceeded expectations.",
	"Extremely knowledgeable and communicated clearly throughout the project.",
	"Would definitely hire again. Professional, responsive, and skilled.",
	"Delivered exactly what we needed. Great attention to detail.",
	"One of the best consultants I've worked with on this platform.",
	"Fantastic experience from start to finish. Highly recommended.",
	"Solved a problem that had been stuck for weeks. Impressive expertise.",
	"Great communicator, kept me updated at every step."
];

const REVIEW_COMMENTS_MIXED = [
	"Good work overall, though communication could have been a bit faster.",
	"Solid results, a couple of revisions were needed but got there.",
	"Met expectations. Would work with again for smaller projects.",
	"Decent experience, delivery took slightly longer than expected."
];

const REVIEW_COMMENTS_NEGATIVE = [
	"Work was acceptable but communication was inconsistent.",
	"Took longer than agreed, though the final result was usable."
];

function randomItem(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

function randomUsername(firstName, lastName) {
	const num = randomInt(1, 9999);
	return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${num}`;
}

async function seedClients(client, count) {
	const clientIds = [];
	for (let i = 0; i < count; i++) {
		const id = uuidv4();
		const firstName = randomItem(FIRST_NAMES);
		const lastName = randomItem(LAST_NAMES);
		const username = randomUsername(firstName, lastName);
		const email = `${username}@seed-client.consulo.test`;
		const password = await bcrypt.hash(uuidv4(), 10);

		await client.query(
			`INSERT INTO users (id, first_name, last_name, email, username, password, role, is_verified, bio, profile_picture)
			 VALUES ($1,$2,$3,$4,$5,$6,'client',true,'','')`,
			[id, firstName, lastName, email, username, password]
		);
		clientIds.push(id);
	}
	return clientIds;
}

async function seedConsultant(client, index, clientIds) {
	const id = uuidv4();
	const firstName = randomItem(FIRST_NAMES);
	const lastName = randomItem(LAST_NAMES);
	const username = randomUsername(firstName, lastName);
	const email = `${username}@seed-consultant.consulo.test`;
	const sector = SECTORS[index % SECTORS.length];
	const password = await bcrypt.hash(uuidv4(), 10);

	const scoreRoll = Math.random();
	let testScore;
	if (scoreRoll < 0.15) {
		testScore = null;
	} else if (scoreRoll < 0.4) {
		testScore = randomInt(40, 59);
	} else if (scoreRoll < 0.75) {
		testScore = randomInt(60, 79);
	} else {
		testScore = randomInt(80, 100);
	}

	const bio = `${firstName} is a consultant specializing in ${sector.toLowerCase()}, helping clients achieve measurable results through practical, hands-on guidance.`;

	await client.query(
		`INSERT INTO users (id, first_name, last_name, email, username, password, role, is_verified, bio, profile_picture)
		 VALUES ($1,$2,$3,$4,$5,$6,'freelancer',true,$7,'')`,
		[id, firstName, lastName, email, username, password, bio]
	);

	const profileId = uuidv4();
	await client.query(
		`INSERT INTO freelancer_profiles (id, user_id, title, test_score) VALUES ($1,$2,$3,$4)`,
		[profileId, id, sector, testScore]
	);

	if (Math.random() < 0.4) {
		const certCount = randomInt(1, 2);
		const certs = shuffle(CERT_PROVIDERS).slice(0, certCount);
		for (const cert of certs) {
			await client.query(
				`INSERT INTO freelancer_certifications (id, user_id, name, url) VALUES ($1,$2,$3,$4)`,
				[uuidv4(), id, cert.name, cert.url]
			);
		}
	}

	const reviewCount = Math.random() < 0.2 ? 0 : randomInt(1, 8);
	for (let r = 0; r < reviewCount; r++) {
		const reviewerId = randomItem(clientIds);

		const bookingId = uuidv4();
		await client.query(
			`INSERT INTO bookings (id, client_id, consultant_id, message, status)
			 VALUES ($1,$2,$3,$4,'completed')`,
			[bookingId, reviewerId, id, `Looking for help with ${sector.toLowerCase()}.`]
		);

		const contractId = uuidv4();
		const amount = randomInt(150, 3000);
		await client.query(
			`INSERT INTO contracts (id, booking_id, client_id, consultant_id, title, amount, platform_fee_percent, status)
			 VALUES ($1,$2,$3,$4,$5,$6,5.00,'completed')`,
			[contractId, bookingId, reviewerId, id, `${sector} engagement`, amount]
		);

		const feeAmount = Math.round(amount * 0.05 * 100) / 100;
		const payoutAmount = Math.round((amount - feeAmount) * 100) / 100;
		await client.query(
			`INSERT INTO contract_transactions (id, contract_id, type, amount) VALUES ($1,$2,'payment',$3)`,
			[uuidv4(), contractId, amount]
		);
		await client.query(
			`INSERT INTO contract_transactions (id, contract_id, type, amount) VALUES ($1,$2,'release',$3)`,
			[uuidv4(), contractId, payoutAmount]
		);
		await client.query(
			`INSERT INTO contract_transactions (id, contract_id, type, amount) VALUES ($1,$2,'platform_fee',$3)`,
			[uuidv4(), contractId, feeAmount]
		);

		const ratingRoll = Math.random();
		let rating, comment;
		if (ratingRoll < 0.65) {
			rating = 5;
			comment = randomItem(REVIEW_COMMENTS_POSITIVE);
		} else if (ratingRoll < 0.85) {
			rating = 4;
			comment = randomItem(REVIEW_COMMENTS_POSITIVE.concat(REVIEW_COMMENTS_MIXED));
		} else if (ratingRoll < 0.95) {
			rating = 3;
			comment = randomItem(REVIEW_COMMENTS_MIXED);
		} else {
			rating = randomInt(1, 2);
			comment = randomItem(REVIEW_COMMENTS_NEGATIVE);
		}

		await client.query(
			`INSERT INTO reviews (id, contract_id, reviewer_id, reviewee_id, rating, comment) VALUES ($1,$2,$3,$4,$5,$6)`,
			[uuidv4(), contractId, reviewerId, id, rating, comment]
		);

		if (Math.random() < 0.3) {
			await client.query(
				`UPDATE reviews SET reply=$1, replied_at=NOW() WHERE contract_id=$2 AND reviewer_id=$3`,
				["Thank you for the feedback, it was a pleasure working with you!", contractId, reviewerId]
			);
		}
	}

	return { id, firstName, lastName, sector, testScore, reviewCount };
}

async function main() {
	const client = await pool.connect();
	try {
		console.log("Seeding fake client accounts...");
		const clientIds = await seedClients(client, 30);
		console.log(`Created ${clientIds.length} client accounts.`);

		console.log("Seeding 100 consultants across all sectors...");
		const results = [];
		for (let i = 0; i < 100; i++) {
			const result = await seedConsultant(client, i, clientIds);
			results.push(result);
			if ((i + 1) % 10 === 0) {
				console.log(`  ${i + 1}/100 consultants created...`);
			}
		}

		console.log("\nDone. Summary:");
		console.log(`  Consultants created: ${results.length}`);
		console.log(`  With test scores: ${results.filter((r) => r.testScore !== null).length}`);
		console.log(`  With no test score yet: ${results.filter((r) => r.testScore === null).length}`);
		console.log(`  With at least one review: ${results.filter((r) => r.reviewCount > 0).length}`);
		console.log(`  Sectors covered: ${new Set(results.map((r) => r.sector)).size}`);
	} finally {
		client.release();
		await pool.end();
	}
}

main().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
