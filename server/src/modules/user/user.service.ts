
import {UserRepository} from "./user.repository"
import {User} from "./user.model";
import {Regex} from "../../utils/regex";
import { ConsuloError } from "../../utils/errorHandler";
import { EncryptionHandler } from "../../utils/encryptionHandler";
import { RandomGenerator } from "../../utils/randomGenerator";

class UserService{
    
    userRepository = new UserRepository();
    regex = new Regex();
    encryptionHandler = new EncryptionHandler();
    randomGenerator = new RandomGenerator();

    async createUser(user:User){

        if(!user.email || !user.password || !user.role){
            throw new ConsuloError(406 ,"Email, username, category and password are required");
        }

        if(!this.regex.isValidEmail(user.email)){
            throw new ConsuloError(406, "Invalid email format");
        }

        if(await this.userRepository.getUserByEmail(user.email)){
            throw new ConsuloError(409, "Email already exists");
        }

        if(!this.regex.isValidPassword(user.password)){
            throw new ConsuloError(406, "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character");
        }

        if(user.role !== "freelancer" && user.role !== "client"){
            throw new ConsuloError(406, "Role must be either admin, freelancer or client");
        }

        user.id = this.randomGenerator.generateRandomString(32);
        user.username = this.randomGenerator.generateUserName(user.firstName, user.lastName);

        user.password = await this.encryptionHandler.hashPassword(user.password);

        this.userRepository.createUser(user);
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            firstName: user.firstName,
            lastName: user.lastName
        };

    }

   
        
}

export { UserService };