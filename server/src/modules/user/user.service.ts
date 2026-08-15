import {UserRepository} from "./user.repository"
import {User} from "./user.model";
import {Regex} from "../../utils/regex";
import { ConsuloError } from "../../utils/errorHandler";
import { EncryptionHandler } from "../../utils/encryptionHandler";
import { RandomGenerator } from "../../utils/randomGenerator";
import { CloudinaryHandler } from "../../utils/cloudinaryHandler";
import { AdminInviteService } from "../admin/adminInvite.service";
import { ContractRepository } from "../contract/contract.repository";
import { ReviewRepository } from "../review/review.repository";

export type PublicUser = {
    id: string;
    username: string;
    email: string;
    role: string | null;
    isVerified: boolean;
    firstName: string;
    lastName: string;
    bio?: string;
    profilePicture?: string;
    title?: string;
    testScore?: number | null;
    assessmentScore?: number | null;
    certScore?: number;
    ratingScore?: number;
    bookingsCount?: number;
    certifications?: Array<{ id: string; name: string; url: string; score?: number }>;
};

type GoogleProfile = {
    email: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
};

/** Every field is optional: omitted means "leave alone", "" means "clear". */
type ProfilePatch = {
    firstName?: string;
    lastName?: string;
    username?: string;
    bio?: string;
    title?: string;
    profilePictureBase64?: string;
    removeProfilePicture?: boolean;
};

class UserService{
    
    userRepository = new UserRepository();
    reviewRepository = new ReviewRepository();
    regex = new Regex();
    encryptionHandler = new EncryptionHandler();
    randomGenerator = new RandomGenerator();
    adminInviteService = new AdminInviteService();
    contractRepository = new ContractRepository();

    private async toPublicUser(user: User): Promise<PublicUser> {
        let title: string | undefined = undefined;
        let testScore: number | null = null;
        let assessmentScore: number | null = null;
        let certScore = 0;
        let ratingScore = 0;
        let bookingsCount = 0;
        let certifications: Array<{ id: string; name: string; url: string; score?: number }> = [];

        if (user.role === "freelancer") {
            const profile = await this.userRepository.getFreelancerProfileByUserId(user.id);
            if (profile) {
                title = profile.title;
                testScore = profile.test_score;
                assessmentScore = profile.assessment_score;
                certScore = profile.cert_score;
                ratingScore = profile.rating_score;
            }
            bookingsCount = await this.contractRepository.getContractsCountByUserId(user.id, "freelancer");
            certifications = await this.userRepository.getCertificationsByUserId(user.id);
        } else if (user.role === "client") {
            bookingsCount = await this.contractRepository.getContractsCountByUserId(user.id, "client");
        }

        return {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role ?? null,
            isVerified: user.isVerified,
            firstName: user.firstName,
            lastName: user.lastName,
            bio: user.bio,
            profilePicture: user.profilePicture,
            title,
            testScore,
            assessmentScore,
            certScore,
            ratingScore,
            bookingsCount,
            certifications
        };
    }

    async getOrCreateGoogleUser(profile: GoogleProfile): Promise<PublicUser> {
		const email = (profile.email || "").trim();
		if (!email || !this.regex.isValidEmail(email)) {
			throw new ConsuloError(401, "Google authentication failed");
		}

		const existingUser = await this.userRepository.getUserByEmail(email);
		if (existingUser) {
			if (existingUser.isSuspended) {
				throw new ConsuloError(403, "This account has been suspended. Contact support for assistance.");
			}
			if (existingUser.role !== "admin") {
				const grantedRole = await this.adminInviteService.resolveRoleForNewLogin(email);
				if (grantedRole === "admin") {
					existingUser.role = "admin";
					await this.userRepository.updateUser(existingUser);
				}
			}
			return await this.toPublicUser(existingUser);
		}

		const firstName = (profile.firstName || "").trim();
		const lastName = (profile.lastName || "").trim();
		const baseUsername = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z0-9._-]/g, "");
		let username = baseUsername || "user";
		let counter = 1;
		while (await this.userRepository.getUserByUsername(username)) {
			username = `${baseUsername || "user"}${counter++}`;
		}

		const id = this.randomGenerator.generateRandomString(32);
		const grantedRole = await this.adminInviteService.resolveRoleForNewLogin(email);
		const user = new User(
			id,
			firstName,
			lastName,
			email,
			username,
			grantedRole ?? "user",
			true,
			"",
			(profile.profilePicture || "").trim(),
			await this.encryptionHandler.hashPassword(this.randomGenerator.generateRandomString(32))
		);

		await this.userRepository.createUser(user);
		return await this.toPublicUser(user);
	}

    async getUserInfoById(id: string): Promise<PublicUser> {
        if (!id) {
            throw new ConsuloError(406, "User ID is required");
        }
        const existingUser = await this.userRepository.getUserById(id);
        if (!existingUser) {
            throw new ConsuloError(404, "User not found");
        }
        return await this.toPublicUser(existingUser);
    }

    async updateUser(user:User, title?: string): Promise<PublicUser>{
        if(!user.id){
            throw new ConsuloError(406, "User ID is required");
        }

        const existingUser = await this.userRepository.getUserById(user.id);

        if(!existingUser){
            throw new ConsuloError(404, "User not found");
        }

        user.email = existingUser.email;
        user.username = existingUser.username;
        user.password = existingUser.password;
        user.isVerified = existingUser.isVerified;

        if(!user.firstName){
            user.firstName = existingUser.firstName;
        }

        if(!user.lastName){
            user.lastName = existingUser.lastName;
        }

        if(user.role === undefined){
            user.role = existingUser.role;
        }

        if(existingUser.role === "admin"){
            throw new ConsuloError(403, "Admin role cannot be changed through this endpoint");
        }

        if(user.role !== null && user.role !== "freelancer" && user.role !== "client" && user.role !== "user"){
            throw new ConsuloError(406, "Role must be either freelancer, client, or user");
        }

        if(!user.bio){
            user.bio = existingUser.bio;
        }

        if(!user.profilePicture){
            user.profilePicture = existingUser.profilePicture;
        }

        if (user.role === "freelancer" && title !== undefined) {
            const existingProfile = await this.userRepository.getFreelancerProfileByUserId(user.id);
            if (existingProfile) {
                await this.userRepository.updateFreelancerProfileTitle(user.id, title);
            } else {
                await this.userRepository.createFreelancerProfile(
                    this.randomGenerator.generateRandomString(32),
                    user.id,
                    title
                );
            }
        }

		await this.userRepository.updateUser(user);
		return await this.toPublicUser(user);
    }

    /**
     * Patch a user's own profile.
     *
     * Semantics are deliberately different from updateUser: a field left out is
     * untouched, while an empty string clears it. That is what lets someone
     * actually delete a bio or drop their avatar, which the falsy-fallback
     * behaviour elsewhere makes impossible.
     */
    async updateProfile(userId: string, patch: ProfilePatch): Promise<PublicUser> {
        if (!userId) {
            throw new ConsuloError(406, "User ID is required");
        }

        const existingUser = await this.userRepository.getUserById(userId);
        if (!existingUser) {
            throw new ConsuloError(404, "User not found");
        }

        if (patch.firstName !== undefined) {
            const firstName = String(patch.firstName).trim();
            if (!firstName) throw new ConsuloError(400, "First name cannot be empty");
            if (firstName.length > 60) throw new ConsuloError(400, "First name must be under 60 characters");
            existingUser.firstName = firstName;
        }

        if (patch.lastName !== undefined) {
            const lastName = String(patch.lastName).trim();
            if (!lastName) throw new ConsuloError(400, "Last name cannot be empty");
            if (lastName.length > 60) throw new ConsuloError(400, "Last name must be under 60 characters");
            existingUser.lastName = lastName;
        }

        if (patch.username !== undefined) {
            const username = String(patch.username).trim().toLowerCase();
            if (username !== existingUser.username) {
                if (!this.regex.isValidUsername(username)) {
                    throw new ConsuloError(
                        400,
                        "Usernames are 3-30 characters and may use lowercase letters, numbers, dots, underscores and hyphens"
                    );
                }
                const taken = await this.userRepository.getUserByUsername(username);
                if (taken && taken.id !== userId) {
                    throw new ConsuloError(409, "That username is already taken");
                }
                existingUser.username = username;
            }
        }

        if (patch.bio !== undefined) {
            const bio = String(patch.bio).trim();
            if (bio.length > 1000) throw new ConsuloError(400, "Bio must be under 1000 characters");
            existingUser.bio = bio;
        }

        if (patch.removeProfilePicture) {
            existingUser.profilePicture = "";
        } else if (patch.profilePictureBase64) {
            const cloudinaryHandler = new CloudinaryHandler();
            existingUser.profilePicture = await cloudinaryHandler.uploadProfilePicture(patch.profilePictureBase64);
        }

        if (patch.title !== undefined) {
            if (existingUser.role !== "freelancer") {
                throw new ConsuloError(400, "Only consultants have a professional field");
            }
            const title = String(patch.title).trim();
            if (title.length < 2 || title.length > 100) {
                throw new ConsuloError(400, "Your field must be between 2 and 100 characters");
            }

            const profile = await this.userRepository.getFreelancerProfileByUserId(userId);
            if (profile) {
                await this.userRepository.updateFreelancerProfileTitle(userId, title);
            } else {
                await this.userRepository.createFreelancerProfile(
                    this.randomGenerator.generateRandomString(32),
                    userId,
                    title
                );
            }
        }

        await this.userRepository.updateUser(existingUser);
        return await this.toPublicUser(existingUser);
    }

    async updateFreelancerScore(userId: string, score: number) {
        if (!userId) {
            throw new ConsuloError(406, "User ID is required");
        }
        await this.userRepository.updateFreelancerProfileScore(userId, score);
    }

    async calculateRatingScore(userId: string): Promise<number> {
        try {
            const { average, count } = await this.reviewRepository.getAverageRatingForUser(userId);
            if (!count || average === null) return 0;
            return Math.min(20, Math.max(0, Math.round((average / 5.0) * 20)));
        } catch {
            return 0;
        }
    }

    async evaluateCertificatesWithAI(field: string, certs: Array<{ id?: string; name: string; url: string }>): Promise<{ totalScore: number; feedback: string }> {
        if (!certs || certs.length === 0) {
            return { totalScore: 0, feedback: "No certifications provided." };
        }

        const openrouterApiKey = (process.env.OPENROUTER_API_KEY || "").trim();
        const modelName = (process.env.OPENROUTER_MODEL || "google/gemma-2-27b-it").trim();

        if (!openrouterApiKey) {
            const totalScore = Math.min(30, certs.length * 10);
            return {
                totalScore,
                feedback: `Evaluated ${certs.length} certificate(s).`
            };
        }

        const certListText = certs.map((c, i) => `${i + 1}. Certificate Name: "${c.name}" (URL/File: ${c.url})`).join("\n");

        try {
            const apiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${openrouterApiKey}`
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        {
                            role: "user",
                            content: `You are an expert credential and certification evaluator assessing a consultant specializing in the field of "${field}".
Below are the candidate's ${certs.length} submitted professional certificate(s):
${certListText}

Evaluate how credible, recognized, prestigious, and relevant these certificates are for someone in the field of "${field}".
Score the candidate's certificate portfolio on a scale from 0 to 30 (maximum 30 points).
Scoring Guidelines:
- 25 to 30: Industry-standard, gold-standard, or highly rigorous credentials (e.g. AWS Solutions Architect Pro, CISSP, PMP, Bar Exam, CFA, Board Certifications, CKA).
- 15 to 24: Reputable mid-tier or associate certifications (e.g. CompTIA Security+/Network+, AWS Associate, Certified Scrum Master, Google Associate, Meta Professional).
- 5 to 14: Introductory courses, online completion certificates, bootcamps (e.g. Coursera, Udemy, LinkedIn Learning).
- 0 to 4: Unrecognized, trivial, or completely unrelated certificates.
- Multiple legitimate certificates can combine to increase the score up to the maximum cap of 30.

Return ONLY a JSON object in this exact format:
{
  "totalScore": <integer from 0 to 30>,
  "feedback": "<1-2 sentence explanation of the credential evaluation>"
}
No extra text, markdown formatting or code blocks outside the JSON.`
                        }
                    ]
                })
            });

            if (apiRes.ok) {
                const json = (await apiRes.json()) as any;
                const content = String(json.choices?.[0]?.message?.content || "").trim();
                let clean = content;
                if (clean.startsWith("```")) {
                    const lines = clean.split("\n");
                    if (lines[0].startsWith("```")) lines.shift();
                    if (lines[lines.length - 1].startsWith("```")) lines.pop();
                    clean = lines.join("\n").trim();
                }
                const parsed = JSON.parse(clean);
                const score = typeof parsed.totalScore === "number" ? Math.min(30, Math.max(0, Math.round(parsed.totalScore))) : Math.min(30, certs.length * 10);
                return {
                    totalScore: score,
                    feedback: parsed.feedback || "Certification portfolio reviewed."
                };
            }
        } catch (e) {
            console.error("AI Certificate evaluation error:", e);
        }

        return {
            totalScore: Math.min(30, certs.length * 10),
            feedback: `Evaluated ${certs.length} certificate(s).`
        };
    }

    async recalculateFreelancerTotalScore(userId: string): Promise<number | null> {
        const profile = await this.userRepository.getFreelancerProfileByUserId(userId);
        if (!profile) return null;

        const assessmentScore = profile.assessment_score;
        if (assessmentScore === null) {
            await this.userRepository.updateFreelancerProfileScores(userId, {
                testScore: null,
                assessmentScore: null
            });
            return null;
        }

        const certs = await this.userRepository.getCertificationsByUserId(userId);
        let certScore = 0;
        if (certs.length > 0) {
            const evalResult = await this.evaluateCertificatesWithAI(profile.title, certs);
            certScore = evalResult.totalScore;
        }

        const ratingScore = await this.calculateRatingScore(userId);
        const totalScore = Math.min(100, Math.max(0, assessmentScore + certScore + ratingScore));

        await this.userRepository.updateFreelancerProfileScores(userId, {
            testScore: totalScore,
            assessmentScore,
            certScore,
            ratingScore
        });

        return totalScore;
    }

    async resetFreelancerAssessment(userId: string): Promise<PublicUser> {
        if (!userId) {
            throw new ConsuloError(406, "User ID is required");
        }
        const user = await this.userRepository.getUserById(userId);
        if (!user) {
            throw new ConsuloError(404, "User not found");
        }
        if (user.role !== "freelancer") {
            throw new ConsuloError(400, "Only consultants can reset the AI assessment");
        }
        await this.userRepository.resetFreelancerAssessmentScore(userId);
        return await this.toPublicUser(user);
    }

    async searchFreelancers(options: {
        query?: string;
        minTestScore?: number;
        minRating?: number;
        sortBy?: "relevance" | "rating" | "test_score" | "newest";
    }): Promise<Array<{
        id: string; username: string; firstName: string; lastName: string; title: string;
        testScore: number | null; profilePicture: string; averageRating: number | null; reviewCount: number;
    }>> {
        const rows = await this.userRepository.searchFreelancers(options);
        return rows.map((row) => ({
            id: row.id,
            username: row.username,
            firstName: row.first_name,
            lastName: row.last_name,
            title: row.title,
            testScore: row.test_score,
            profilePicture: row.profile_picture,
            averageRating: row.average_rating,
            reviewCount: row.review_count
        }));
    }

    async addCertification(userId: string, name: string, url?: string, imageBase64?: string): Promise<{ id: string; name: string; url: string; score: number }> {
        if (!userId) {
            throw new ConsuloError(406, "User ID is required");
        }
        if (!name || !name.trim()) {
            throw new ConsuloError(400, "Certification name is required");
        }

        let finalUrl = "";
        if (imageBase64) {
            const cloudinaryHandler = new CloudinaryHandler();
            finalUrl = await cloudinaryHandler.uploadImage(imageBase64);
        } else if (url) {
            finalUrl = url.trim();
        } else {
            throw new ConsuloError(400, "Either a link or an uploaded image is required");
        }

        if (!finalUrl) {
            throw new ConsuloError(400, "Invalid certification URL or image");
        }

        const id = this.randomGenerator.generateRandomString(32);
        const cert = await this.userRepository.addCertification(id, userId, name.trim(), finalUrl, 0);

        await this.recalculateFreelancerTotalScore(userId);

        return cert;
    }

    async deleteCertification(userId: string, certificationId: string): Promise<void> {
        if (!userId) {
            throw new ConsuloError(406, "User ID is required");
        }
        if (!certificationId) {
            throw new ConsuloError(400, "Certification ID is required");
        }
        const deleted = await this.userRepository.deleteCertification(certificationId, userId);
        if (!deleted) {
            throw new ConsuloError(404, "Certification not found");
        }

        await this.recalculateFreelancerTotalScore(userId);
    }

    async generateAssessmentQuestions(userId: string): Promise<string[]> {
        if (!userId) {
            throw new ConsuloError(406, "User ID is required");
        }

        const user = await this.getUserInfoById(userId);
        if (user.role !== "freelancer") {
            throw new ConsuloError(400, "Only consultants can take assessments");
        }

        const field = user.title || "General Consulting";
        const openrouterApiKey = (process.env.OPENROUTER_API_KEY || "").trim();
        const modelName = (process.env.OPENROUTER_MODEL || "google/gemma-2-27b-it").trim();

        if (!openrouterApiKey) {
            return Array.from({ length: 20 }, (_, i) => `Medium Question ${i + 1} for ${field}: Describe your practical experience and approach in this area.`);
        }

        const apiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openrouterApiKey}`
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    {
                        role: "user",
                        content: `Generate exactly 20 professional, medium-difficulty assessment questions for a candidate specializing in the field of "${field}". The questions should be moderate in complexity—not overly hard, deep-niche, or tricky, but assessing standard practical knowledge and core industry practices. Return the questions as a JSON array of strings, like this: ["Question 1", "Question 2", ...]. Return ONLY the JSON array, no extra text, explanations, markdown blocks, or formatting.`
                    }
                ]
            })
        });

        if (!apiRes.ok) {
            const errText = await apiRes.text();
            console.error("OpenRouter error response:", errText);
            throw new ConsuloError(502, "Failed to generate questions from AI service");
        }

        const json = (await apiRes.json()) as any;
        const content = String(json.choices?.[0]?.message?.content || "").trim();
        
        let questions: string[] = [];
        try {
            let clean = content;
            if (clean.startsWith("```")) {
                const lines = clean.split("\n");
                if (lines[0].startsWith("```")) lines.shift();
                if (lines[lines.length - 1].startsWith("```")) lines.pop();
                clean = lines.join("\n").trim();
            }
            questions = JSON.parse(clean);
        } catch {
            const start = content.indexOf("[");
            const end = content.lastIndexOf("]");
            if (start !== -1 && end !== -1) {
                try {
                    questions = JSON.parse(content.slice(start, end + 1));
                } catch {}
            }
        }

        if (!Array.isArray(questions) || questions.length === 0) {
            questions = Array.from({ length: 20 }, (_, i) => `Medium Question ${i + 1} for ${field}: Describe your practical experience and approach in this area.`);
        }

        return questions;
    }

    async gradeAssessment(userId: string, answers: Array<{ question: string; answer: string }>): Promise<{ score: number; totalScore: number; feedback: string }> {
        if (!userId) {
            throw new ConsuloError(406, "User ID is required");
        }
        if (!Array.isArray(answers) || answers.length === 0) {
            throw new ConsuloError(400, "Answers are required");
        }

        const user = await this.getUserInfoById(userId);
        if (user.role !== "freelancer") {
            throw new ConsuloError(400, "Only consultants can take assessments");
        }

        const field = user.title || "General Consulting";
        const openrouterApiKey = (process.env.OPENROUTER_API_KEY || "").trim();
        const modelName = (process.env.OPENROUTER_MODEL || "google/gemma-2-27b-it").trim();

        let questionnaireScore = 38; // out of 50
        let feedback = "Answers submitted successfully.";

        if (openrouterApiKey) {
            const qaText = answers.map((a, i) => `Q${i+1}: ${a.question}\nA: ${a.answer}`).join("\n\n");
            const apiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${openrouterApiKey}`
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        {
                            role: "user",
                            content: `You are an expert interviewer evaluating a candidate for a position in the field of "${field}". Below are 20 questions asked to the candidate, along with their answers. Grade their performance overall and output an integer score out of 50 (this questionnaire contributes 50% to their overall score).\n\nQuestions and Answers:\n${qaText}\n\nProvide your evaluation as a JSON object with two fields:\n1. "score": a single integer from 0 to 50 representing the questionnaire grade.\n2. "feedback": a short paragraph (2-3 sentences) explaining the grade.\n\nReturn ONLY the raw JSON object. Do not include any markdown fences or explanation outside the JSON.`
                        }
                    ]
                })
            });

            if (apiRes.ok) {
                const json = (await apiRes.json()) as any;
                const content = String(json.choices?.[0]?.message?.content || "").trim();
                try {
                    let clean = content;
                    if (clean.startsWith("```")) {
                        const lines = clean.split("\n");
                        if (lines[0].startsWith("```")) lines.shift();
                        if (lines[lines.length - 1].startsWith("```")) lines.pop();
                        clean = lines.join("\n").trim();
                    }
                    const parsed = JSON.parse(clean);
                    if (typeof parsed.score === "number") {
                        questionnaireScore = Math.min(50, Math.max(0, Math.round(parsed.score)));
                    }
                    if (parsed.feedback) {
                        feedback = parsed.feedback;
                    }
                } catch {
                    const start = content.indexOf("{");
                    const end = content.lastIndexOf("}");
                    if (start !== -1 && end !== -1) {
                        try {
                            const parsed = JSON.parse(content.slice(start, end + 1));
                            if (typeof parsed.score === "number") {
                                questionnaireScore = Math.min(50, Math.max(0, Math.round(parsed.score)));
                            }
                            if (parsed.feedback) {
                                feedback = parsed.feedback;
                            }
                        } catch {}
                    }
                }
            } else {
                const errText = await apiRes.text();
                console.error("OpenRouter evaluation error response:", errText);
            }
        } else {
            const totalLength = answers.reduce((sum, a) => sum + String(a.answer || "").length, 0);
            questionnaireScore = Math.min(50, Math.max(15, Math.floor(totalLength / 100) + 20));
            feedback = "Evaluation completed using mock assessor (no API key provided).";
        }

        await this.userRepository.updateFreelancerProfileScores(userId, {
            testScore: questionnaireScore,
            assessmentScore: questionnaireScore
        });

        const totalScore = (await this.recalculateFreelancerTotalScore(userId)) || questionnaireScore;

        return { score: questionnaireScore, totalScore, feedback };
    }
}

export { UserService };
