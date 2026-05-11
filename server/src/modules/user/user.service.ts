
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

        const existingUser = await this.userRepository.getUserByEmail(user.email);

        if(existingUser){
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

    async updateUser(user:User){
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

        if(!user.role){
            user.role = existingUser.role;
        }

        if(user.role !== "freelancer" && user.role !== "client"){
            throw new ConsuloError(406, "Role must be either freelancer or client");
        }

        if(!user.bio){
            user.bio = existingUser.bio;
        }

        if(!user.profilePicture){
            user.profilePicture = existingUser.profilePicture;
        }

        this.userRepository.updateUser(user);
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            firstName: user.firstName,
            lastName: user.lastName,
            bio: user.bio,
            profilePicture: user.profilePicture
        };
    }

        

   
        
}

export { UserService };