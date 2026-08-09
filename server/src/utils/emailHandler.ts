class EmailHandler {
	async sendEmail(to: string, subject: string, body: string): Promise<void> {
		const smtpConfigured = Boolean((process.env.SMTP_HOST || "").trim());

		if (!smtpConfigured) {
			console.log(`[EmailHandler] (mock) To: ${to} | Subject: ${subject} | Body: ${body}`);
			return;
		}

		console.log(`[EmailHandler] SMTP delivery not yet implemented. Falling back to log. To: ${to} | Subject: ${subject}`);
	}
}

export { EmailHandler };
