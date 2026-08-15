"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMe, logout, updateUserRole, getAssessmentQuestions, submitAssessment, retakeAssessment, addCertification, deleteCertification, getConsultantBookings, type PublicUser } from "../_lib/api";
import { ConsultantSearch } from "../_components/ConsultantSearch";

type UserRole = "freelancer" | "client";

const PREBUILT_FIELDS = [
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

export default function DashboardPage() {
	const router = useRouter();
	const [user, setUser] = useState<PublicUser | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [savingRole, setSavingRole] = useState<UserRole | null>(null);

	const [step, setStep] = useState<"choose_role" | "choose_field">("choose_role");
	const [selectedField, setSelectedField] = useState(PREBUILT_FIELDS[0]);
	const [customField, setCustomField] = useState("");
	const [isCustom, setIsCustom] = useState(false);

	// Assessment States
	const [assessmentStep, setAssessmentStep] = useState<"intro" | "questions" | "grading" | "result">("intro");
	const [questions, setQuestions] = useState<string[]>([]);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState<string[]>([]);
	const [scoreResult, setScoreResult] = useState<{ score: number; totalScore?: number; feedback: string } | null>(null);
	const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
	const [showRetakeConfirm, setShowRetakeConfirm] = useState(false);
	const [isRetaking, setIsRetaking] = useState(false);
	const [isRetakingFlow, setIsRetakingFlow] = useState(false);

	// Certification States
	const [certName, setCertName] = useState("");
	const [certLink, setCertLink] = useState("");
	const [certFileType, setCertFileType] = useState<"link" | "file">("file");
	const [certFileBase64, setCertFileBase64] = useState<string | null>(null);
	const [certFileName, setCertFileName] = useState("");
	const [isAddingCert, setIsAddingCert] = useState(false);
	const [certError, setCertError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;
		(async () => {
			setIsLoading(true);
			setError(null);
			try {
				const me = await getMe();
				if (isMounted) {
					if (me.role === "admin") {
						router.replace("/admin");
						return;
					}
					setUser(me);
					}

			} catch (e: any) {
				if (!isMounted) return;
				setUser(null);
				setError(String(e?.message || "Not authenticated"));
			} finally {
				if (isMounted) setIsLoading(false);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, []);



	async function onChooseRole(role: UserRole, title?: string) {
		setSavingRole(role);
		setError(null);
		try {
			const updatedUser = await updateUserRole(role, title);
			setUser(updatedUser);
		} catch (e: any) {
			setError(String(e?.message || "Could not save role"));
		} finally {
			setSavingRole(null);
		}
	}

	async function startAssessment() {
		setIsLoadingQuestions(true);
		setError(null);
		try {
			const res = await getAssessmentQuestions();
			setQuestions(res.questions);
			setAnswers(new Array(res.questions.length).fill(""));
			setAssessmentStep("questions");
			setCurrentQuestionIndex(0);
		} catch (e: any) {
			setError(String(e?.message || "Failed to load questions"));
		} finally {
			setIsLoadingQuestions(false);
		}
	}

	function handlePrev() {
		if (currentQuestionIndex > 0) {
			setCurrentQuestionIndex(currentQuestionIndex - 1);
		}
	}

	function handleNext() {
		if (currentQuestionIndex < questions.length - 1) {
			setCurrentQuestionIndex(currentQuestionIndex + 1);
		}
	}

	async function handleSubmitAssessment() {
		setAssessmentStep("grading");
		setError(null);
		try {
			const qaPayload = questions.map((q, idx) => ({
				question: q,
				answer: answers[idx] || "No answer provided."
			}));
			const result = await submitAssessment(qaPayload);
			setScoreResult(result);
			setAssessmentStep("result");
			setIsRetakingFlow(false);
			const updatedUser = await getMe();
			setUser(updatedUser);
		} catch (e: any) {
			setError(String(e?.message || "Failed to grade assessment"));
			setAssessmentStep("questions");
		}
	}

	function handleAutoFillAnswers() {
		const fieldName = user?.title || "consulting";
		const dummyAnswers = questions.map((_, i) => `I have over 5 years of professional experience in ${fieldName}, implementing industry best practices for question ${i + 1}.`);
		setAnswers(dummyAnswers);
	}

	async function handleRetakeAssessment() {
		setIsRetaking(true);
		setError(null);
		try {
			await retakeAssessment();
			setShowRetakeConfirm(false);
			setScoreResult(null);
			setAnswers([]);
			setQuestions([]);
			setCurrentQuestionIndex(0);
			setIsRetakingFlow(true);
			setAssessmentStep("intro");
			const me = await getMe();
			setUser(me);
		} catch (e: any) {
			setError(String(e?.message || "Failed to start retake"));
			setShowRetakeConfirm(false);
		} finally {
			setIsRetaking(false);
		}
	}

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setCertFileName(file.name);
		const reader = new FileReader();
		reader.onloadend = () => {
			setCertFileBase64(reader.result as string);
		};
		reader.readAsDataURL(file);
	};

	const handleAddCertSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!certName.trim()) {
			setCertError("Certification name is required.");
			return;
		}

		setIsAddingCert(true);
		setCertError(null);

		try {
			let res;
			if (certFileType === "file") {
				if (!certFileBase64) {
					throw new Error("Please select an image to upload.");
				}
				res = await addCertification(certName, undefined, certFileBase64);
			} else {
				if (!certLink.trim()) {
					throw new Error("Please provide a certification URL.");
				}
				res = await addCertification(certName, certLink, undefined);
			}

			setCertName("");
			setCertLink("");
			setCertFileBase64(null);
			setCertFileName("");
			
			const me = await getMe();
			setUser(me);
		} catch (err: any) {
			setCertError(err.message || "Failed to add certification.");
		} finally {
			setIsAddingCert(false);
		}
	};

	const handleDeleteCert = async (id: string) => {
		setCertError(null);
		try {
			await deleteCertification(id);
			const me = await getMe();
			setUser(me);
		} catch (err: any) {
			setCertError(err.message || "Failed to delete certification.");
		}
	};

	const roleLabel =
		user?.role === "freelancer"
			? `Consultant (${user?.title || "General"})`
			: user?.role === "client"
			? "Client"
			: "";

	return (
		<div className="mx-auto w-full max-w-5xl px-6 py-10">
				
					{isLoading ? (
						<div className="mt-6 rounded-lg border border-border bg-base p-5 text-sm text-text-muted">
							Loading...
						</div>
					) : error && !user ? (
						<div className="mt-6 rounded-lg border border-border bg-base p-5">
							<p className="text-sm text-accent">{error}</p>
							<p className="mt-2 text-sm text-text-body">
								<Link href="/login" className="font-medium text-accent">
									Go to login
								</Link>
							</p>
						</div>
					) : (!user?.role || user?.role === "user") ? (
						step === "choose_role" ? (
							<div className="mt-8 rounded-lg border border-border bg-base p-6">
								<div className="max-w-2xl">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
										Choose account type
									</p>
									<h2 className="mt-2 text-xl font-semibold tracking-tight text-text-primary">
										Are you a consultant or a client?
									</h2>
									<p className="mt-2 text-sm leading-6 text-text-body">
										This sets up your dashboard and booking experience.
									</p>
									{error ? <p className="mt-3 text-sm text-accent">{error}</p> : null}
								</div>

								<div className="mt-6 grid gap-4 md:grid-cols-2">
									<button
										type="button"
										onClick={() => setStep("choose_field")}
										disabled={savingRole !== null}
										className="rounded-lg border border-border bg-bg-soft p-5 text-left hover:border-accent disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
									>
										<span className="text-sm font-semibold text-text-primary">
											Consultant
										</span>
										<span className="mt-2 block text-sm leading-6 text-text-body">
											I want to offer consultations and manage my bookings.
										</span>
										<span className="mt-4 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent cursor-pointer">
											Continue as consultant
										</span>
									</button>

									<button
										type="button"
										onClick={() => onChooseRole("client")}
										disabled={savingRole !== null}
										className="rounded-lg border border-border bg-bg-soft p-5 text-left hover:border-accent disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
									>
										<span className="text-sm font-semibold text-text-primary">
											Client
										</span>
										<span className="mt-2 block text-sm leading-6 text-text-body">
											I want to find consultants and book sessions.
										</span>
										<span className="mt-4 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent cursor-pointer">
											{savingRole === "client" ? "Saving..." : "Continue as client"}
										</span>
									</button>
								</div>
							</div>
						) : (
							<div className="mt-8 rounded-lg border border-border bg-base p-6 max-w-xl mx-auto">
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted font-bold">
										Step 2 of 2
									</p>
									<h2 className="mt-2 text-xl font-semibold tracking-tight text-text-primary">
										Which field are you a consultant of?
									</h2>
									<p className="mt-2 text-sm leading-6 text-text-body">
										Select your area of expertise to help clients find you.
									</p>
									{error ? <p className="mt-3 text-sm text-accent">{error}</p> : null}
								</div>

								<div className="mt-6 flex flex-col gap-4">
									<div>
										<label htmlFor="field-select" className="block text-sm font-medium text-text-primary mb-1">
											Consulting Field
										</label>
										<select
											id="field-select"
											value={isCustom ? "custom" : selectedField}
											onChange={(e) => {
												if (e.target.value === "custom") {
													setIsCustom(true);
												} else {
													setIsCustom(false);
													setSelectedField(e.target.value);
												}
											}}
											className="w-full rounded-md border border-border bg-bg-soft px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
										>
											{PREBUILT_FIELDS.map((f) => (
												<option key={f} value={f}>
													{f}
												</option>
											))}
											<option value="custom">Other (Write your own)</option>
										</select>
									</div>

									{isCustom && (
										<div>
											<label htmlFor="custom-field-input" className="block text-sm font-medium text-text-primary mb-1">
												Specify your field
											</label>
											<input
												id="custom-field-input"
												type="text"
												value={customField}
												onChange={(e) => setCustomField(e.target.value)}
												placeholder="e.g. Behavioral Psychology"
												className="w-full rounded-md border border-border bg-bg-soft px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
											/>
										</div>
									)}

									<div className="mt-4 flex items-center justify-between gap-3">
										<button
											type="button"
											onClick={() => setStep("choose_role")}
											className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-soft cursor-pointer"
										>
											Back
										</button>
										<button
											type="button"
											onClick={() => {
												const finalField = isCustom ? customField.trim() : selectedField;
												if (isCustom && !finalField) {
													setError("Please specify your consulting field");
													return;
												}
												onChooseRole("freelancer", finalField);
											}}
											disabled={savingRole !== null}
											className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-on-accent hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
										>
											{savingRole === "freelancer" ? "Saving..." : "Finish Setup"}
										</button>
									</div>
								</div>
							</div>
						)
					) : (user?.role === "freelancer" && (user?.testScore === null || user?.testScore === undefined)) ? (
						<div className="mt-8">
							{assessmentStep === "intro" && (
								<div className="max-w-xl mx-auto rounded-lg border border-border bg-base p-6 text-center">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted font-bold">
										Expertise Verification
									</p>
									<h2 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary">
										AI Assessment
									</h2>
									<p className="mt-3 text-sm leading-6 text-text-body">
										To verify your profile as a consultant in <strong>{user?.title}</strong>, please complete a short expertise assessment consisting of 20 questions.
									</p>
									{error ? <p className="mt-3 text-sm text-accent">{error}</p> : null}
									
									<button
										type="button"
										onClick={startAssessment}
										disabled={isLoadingQuestions}
										className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-sm font-semibold text-on-accent hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
									>
										{isLoadingQuestions ? "Generating Questions..." : "Start Assessment"}
									</button>
								</div>
							)}

							{assessmentStep === "questions" && questions.length > 0 && (
								<div className="max-w-2xl mx-auto rounded-lg border border-border bg-base p-6">
									<div className="flex items-center justify-between">
										<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted font-bold">
											Question {currentQuestionIndex + 1} of {questions.length}
										</p>
										<button
											type="button"
											onClick={handleAutoFillAnswers}
											className="text-xs font-medium text-accent hover:underline cursor-pointer"
										>
											Auto-fill Demo Answers
										</button>
									</div>

									{/* Progress bar */}
									<div className="w-full bg-bg-soft h-2 rounded-full mt-3 overflow-hidden">
										<div 
											className="bg-accent h-full transition-all duration-300" 
											style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
										/>
									</div>

									<h3 className="mt-6 text-lg font-medium text-text-primary leading-snug">
										{questions[currentQuestionIndex]}
									</h3>

									<textarea
										value={answers[currentQuestionIndex] || ""}
										onChange={(e) => {
											const newAns = [...answers];
											newAns[currentQuestionIndex] = e.target.value;
											setAnswers(newAns);
										}}
										placeholder="Type your answer here..."
										rows={6}
										className="w-full rounded-md border border-border bg-bg-soft px-3 py-2 text-sm text-text-primary mt-4 focus:border-accent focus:outline-none resize-none"
									/>

									<div className="mt-6 flex items-center justify-between">
										<button
											type="button"
											onClick={handlePrev}
											disabled={currentQuestionIndex === 0}
											className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-soft disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
										>
											Previous
										</button>

										{currentQuestionIndex < questions.length - 1 ? (
											<button
												type="button"
												onClick={handleNext}
												disabled={!(answers[currentQuestionIndex]?.trim())}
												className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-on-accent hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
											>
												Next
											</button>
										) : (
											<button
												type="button"
												onClick={handleSubmitAssessment}
												disabled={answers.some(ans => !ans?.trim())}
												className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-on-accent hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
											>
												Submit Assessment
											</button>
										)}
									</div>
								</div>
							)}

							{assessmentStep === "grading" && (
								<div className="max-w-md mx-auto rounded-lg border border-border bg-base p-10 text-center flex flex-col items-center">
									<div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
									<h2 className="mt-6 text-xl font-semibold tracking-tight text-text-primary animate-pulse">
										AI Grading in Progress...
									</h2>
									<p className="mt-3 text-sm text-text-body leading-relaxed">
										The Gemma AI agent is reviewing your answers to verify your domain expertise. This may take a moment.
									</p>
								</div>
							)}

							{assessmentStep === "result" && scoreResult && (
								<div className="max-w-lg mx-auto rounded-lg border border-border bg-base p-6 text-center">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted font-bold">
										Grading Complete
									</p>
									
									<div className="mt-6 flex items-center justify-center gap-6">
										<div className="inline-flex flex-col items-center justify-center w-28 h-28 rounded-full border-4 border-accent bg-bg-soft">
											<span className="text-3xl font-extrabold text-text-primary">{scoreResult.score}</span>
											<span className="text-[11px] font-semibold text-text-muted">/ 50 pts</span>
										</div>
										<div className="text-left">
											<p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Total Score</p>
											<p className="text-2xl font-bold text-text-primary">{scoreResult.totalScore ?? scoreResult.score}/100</p>
											<p className="text-xs text-text-muted mt-1">50% Questionnaire · 30% Certs · 20% Ratings</p>
										</div>
									</div>

									<h3 className="mt-6 text-lg font-semibold text-text-primary">
										{scoreResult.score >= 35 ? "Congratulations, you passed!" : "Assessment Review Completed"}
									</h3>
									
									<p className="mt-3 text-sm leading-relaxed text-text-body bg-bg-soft p-4 rounded-md text-left">
										<strong>Feedback:</strong> {scoreResult.feedback}
									</p>

									<div className="mt-4 rounded-md border border-border bg-bg-soft p-3 text-xs text-text-muted text-left">
										<p className="font-semibold text-text-primary mb-1">How your Expertise Score is composed:</p>
										<ul className="list-disc pl-4 space-y-0.5">
											<li><strong>Questionnaire (50% max):</strong> {scoreResult.score}/50 points earned.</li>
											<li><strong>Certifications (30% max):</strong> Upload credentials to earn up to 30 points.</li>
											<li><strong>Client Ratings (20% max):</strong> 5-star reviews contribute up to 20 points.</li>
										</ul>
									</div>

									<button
										type="button"
										onClick={async () => {
											const me = await getMe();
											setUser(me);
										}}
										className="mt-6 w-full rounded-md bg-accent py-2 text-sm font-semibold text-on-accent hover:opacity-95 cursor-pointer"
									>
										Go to Dashboard
									</button>
								</div>
							)}
						</div>
					) : (
						<>
							<div className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-4">
								<div className="rounded-lg border border-border bg-base p-5">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted font-bold">
										Role
									</p>
									<p className="mt-2 text-sm font-semibold text-text-primary">
										{roleLabel}
									</p>
									<p className="mt-1 text-sm text-text-body">
										booking consultations
									</p>
								</div>

								{user?.role === "freelancer" && user?.testScore !== null && user?.testScore !== undefined && (
									<div className="rounded-lg border border-border bg-base p-5">
										<div className="flex items-center justify-between">
											<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted font-bold">
												Expertise Score
											</p>
											<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
												AI Verified
											</span>
										</div>
										<p className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
											{user?.testScore}/100
										</p>
										<div className="mt-2 space-y-1 text-xs text-text-muted">
											<div className="flex justify-between">
												<span>Test (50%):</span>
												<strong className="text-text-primary">{user?.assessmentScore ?? 0}/50</strong>
											</div>
											<div className="flex justify-between">
												<span>Certs (30%):</span>
												<strong className="text-text-primary">{user?.certScore ?? 0}/30</strong>
											</div>
											<div className="flex justify-between">
												<span>Reviews (20%):</span>
												<strong className="text-text-primary">{user?.ratingScore ?? 0}/20</strong>
											</div>
										</div>
										<button
											type="button"
											onClick={() => {
												setError(null);
												setShowRetakeConfirm(true);
											}}
											className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-md border border-border-strong px-2 text-xs font-semibold text-text-primary hover:bg-bg-soft cursor-pointer"
										>
											Retake Assessment
										</button>
									</div>
								)}

								<div className="rounded-lg border border-border bg-base p-5">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted font-bold">
										Bookings
									</p>
									<p className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
										{user?.bookingsCount ?? 0}
									</p>
									<p className="mt-1 text-sm text-text-body">upcoming</p>
								</div>

								<div className="rounded-lg border border-border bg-base p-5">
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted font-bold">
										Account
									</p>
									<p className="mt-2 text-sm font-semibold text-text-primary">
										{user?.firstName} {user?.lastName}
									</p>
									<p className="mt-1 text-sm text-text-body">@{user?.username}</p>
									<Link
										href="/dashboard/profile"
										className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-border-strong px-3 text-xs font-semibold text-text-primary hover:bg-bg-soft"
									>
										Edit profile
									</Link>
								</div>
							</div>

							{user?.role === "freelancer" && user?.testScore !== null && user?.testScore !== undefined && (
								<div className="mt-6 rounded-lg border border-border bg-base p-6 shadow-sm">
									<div className="flex items-center justify-between flex-wrap gap-2">
										<div>
											<h2 className="text-lg font-semibold tracking-tight text-text-primary">
												Certifications & Credentials
											</h2>
											<p className="mt-1 text-sm text-text-body">
												Certificates are evaluated by AI for credibility and relevance (contributes up to 30 points).
											</p>
										</div>
										<span className="rounded-md border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
											Score Contribution: {user?.certScore ?? 0}/30 pts
										</span>
									</div>

									{user?.certifications && user.certifications.length > 0 ? (
										<div className="mt-4 grid gap-4 sm:grid-cols-2">
											{user.certifications.map((cert) => (
												<div key={cert.id} className="flex items-center justify-between rounded-md border border-border bg-bg-soft p-3 text-sm">
													<div className="flex flex-col min-w-0">
														<span className="font-semibold text-text-primary truncate">{cert.name}</span>
														<a 
															href={cert.url} 
															target="_blank" 
															rel="noopener noreferrer" 
															className="mt-1 text-xs text-accent hover:underline truncate"
														>
															View Credential
														</a>
													</div>
													<button
														type="button"
														onClick={() => handleDeleteCert(cert.id)}
														className="text-xs font-medium text-accent hover:opacity-80 p-2 cursor-pointer transition"
													>
														Remove
													</button>
												</div>
											))}
										</div>
									) : (
										<p className="mt-4 text-sm text-text-body italic">No certifications added yet.</p>
									)}

									<form onSubmit={handleAddCertSubmit} className="mt-6 border-t border-border pt-6">
										<h3 className="text-sm font-semibold text-text-primary">Add New Certification</h3>
										{certError && <p className="mt-2 text-sm text-accent">{certError}</p>}
										
										<div className="mt-4 grid gap-4 md:grid-cols-3">
											<div className="md:col-span-1">
												<label className="block text-xs font-semibold text-text-body uppercase tracking-wider">Certification Name</label>
												<input
													type="text"
													value={certName}
													onChange={(e) => setCertName(e.target.value)}
													placeholder="e.g. AWS Certified Solutions Architect"
													className="mt-1.5 w-full rounded-md border border-border-strong bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
												/>
											</div>

											<div className="md:col-span-2">
												<label className="block text-xs font-semibold text-text-body uppercase tracking-wider">Credential File or Link</label>
												<div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:items-center">
													<div className="flex gap-2">
														<button
															type="button"
															onClick={() => {
																setCertFileType("file");
																setCertError(null);
															}}
															className={`rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
																certFileType === "file" 
																	? "bg-accent text-on-accent" 
																	: "bg-bg-soft text-text-primary hover:bg-border"
															}`}
														>
															Upload Image
														</button>
														<button
															type="button"
															onClick={() => {
																setCertFileType("link");
																setCertError(null);
															}}
															className={`rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
																certFileType === "link" 
																	? "bg-accent text-on-accent" 
																	: "bg-bg-soft text-text-primary hover:bg-border"
															}`}
														>
															Provide Link
														</button>
													</div>

													<div className="flex-1 min-w-0">
														{certFileType === "file" ? (
															<div className="relative flex items-center">
																<input
																	type="file"
																	accept="image/*"
																	onChange={handleFileChange}
																	className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
																/>
																<div className="w-full rounded-md border border-dashed border-border-strong bg-bg-soft px-3 py-2 text-center text-sm text-text-body hover:bg-border transition">
																	{certFileName || "Click to choose image file"}
																</div>
															</div>
														) : (
															<input
																type="url"
																value={certLink}
																onChange={(e) => setCertLink(e.target.value)}
																placeholder="https://example.com/certificate/123"
																className="w-full rounded-md border border-border-strong bg-base px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
															/>
														)}
													</div>
												</div>
											</div>
										</div>

										<div className="mt-4 flex justify-end">
											<button
												type="submit"
												disabled={isAddingCert}
												className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:opacity-95 disabled:opacity-50 cursor-pointer transition"
											>
												{isAddingCert ? "Adding..." : "Add Certification"}
											</button>
										</div>
									</form>
								</div>
							)}

						{user?.role === "client" && <ConsultantSearch />}


						</>
					)}

			{showRetakeConfirm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/50 px-4">
					<div className="w-full max-w-md rounded-lg border border-border bg-base p-6 shadow-lg">
						<p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted font-bold">
							Retake AI Assessment
						</p>
						<h3 className="mt-2 text-lg font-semibold tracking-tight text-text-primary">
							Are you sure you want to retake the test?
						</h3>
						<div className="mt-4 rounded-md border border-border bg-bg-soft p-4 text-sm leading-6 text-text-body">
							<p>
								Your current score is{" "}
								<strong className="text-text-primary">{user?.testScore}/100</strong>.
							</p>
							<p className="mt-2">
								<strong className="text-accent">Warning:</strong> If your new score is lower, your expertise score on your profile will be replaced with the lower result. Only retake if you are confident you can score higher.
							</p>
						</div>

						<div className="mt-6 flex items-center justify-end gap-3">
							<button
								type="button"
								onClick={() => {
									if (isRetaking) return;
									setShowRetakeConfirm(false);
								}}
								disabled={isRetaking}
								className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-soft disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleRetakeAssessment}
								disabled={isRetaking}
								className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
							>
								{isRetaking ? "Starting..." : "Yes, Retake Test"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
