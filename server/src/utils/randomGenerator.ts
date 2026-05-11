class RandomGenerator {
    generateRandomString(length: number): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    generateUserName(firstName: string, lastName: string): string {
        const randomNum = Math.floor(Math.random() * 1000);
        return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}`;
    }


}

export { RandomGenerator };