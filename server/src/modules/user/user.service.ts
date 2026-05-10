
import {UserRepository} from "./user.repository"
import {User} from "./user.model";
import {Regex} from "../../utils/regex";
import { ConsuloError } from "../../utils/errorHandler";
import { EncryptionHandler } from "../../utils/encryptionHandler";

class UserService{
    
    userRepository = new UserRepository();
    regex = new Regex();
    encryptionHandler = new EncryptionHandler();

    async createUser(user:User){

        if(!user.email || !user.username || !user.password || !user.role){
            throw new ConsuloError(406 ,"Email, username, category and password are required");
        }

        if(!this.regex.isValidEmail(user.email)){
            throw new Error("Invalid email format");
        }

        if(!this.regex.isValidPassword(user.password)){
            throw new Error("Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character");
        }

        user.password = await this.encryptionHandler.hashPassword(user.password);

        const result = this.userRepository.createUser(user);
        return result;

    }

   
        
}