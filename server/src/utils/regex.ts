class Regex {
    
    isValidEmail(email: string): boolean {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /** Public handle: lowercase letters, digits, dot, underscore or hyphen. */
    isValidUsername(username: string): boolean {
        const regex = /^[a-z0-9][a-z0-9._-]{2,29}$/;
        return regex.test(username);
    }

    isValidPassword(password: string): boolean {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(password);
    }
}

export {Regex};
