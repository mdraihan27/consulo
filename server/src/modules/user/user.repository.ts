import { pool } from "../../config/db.ts";
import { User } from "./user.model.ts";

class UserRepository{
    createUser(user:User){
        const query = `INSERT INTO users (id, firstName, lastName, email, username, role, isVerified, bio, profilePicture) VALUES ('${user.id}', '${user.firstName}', '${user.lastName}', '${user.email}', '${user.username}', '${user.role}', ${user.isVerified}, '${user.bio}', '${user.profilePicture}')`;

        const result = pool.query(query);
        return result;
    }

    updateUser(user:User){
        const query = `UPDATE users SET firstName='${user.firstName}', lastName='${user.lastName}', email='${user.email}', username='${user.username}', role='${user.role}', isVerified=${user.isVerified}, bio='${user.bio}', profilePicture='${user.profilePicture}' WHERE id='${user.id}'`;

        const result = pool.query(query);
        return result;
    }

    deleteUser(id:string){
        const query = `DELETE FROM users WHERE id='${id}'`;
        const result = pool.query(query);
        return result;
    }

    getUserById(id:string){
        const query = `SELECT * FROM users WHERE id='${id}'`;
        const result = pool.query(query);
        return result;
    }

    getUserByEmail(email:string){
        const query = `SELECT * FROM users WHERE email='${email}'`;
        const result = pool.query(query);
        return result;
    }

    getUserByUsername(username:string){
        const query = `SELECT * FROM users WHERE username='${username}'`;
        const result = pool.query(query);
        return result;
    }

    getAllUsers(){
        const query = `SELECT * FROM users`;
        const result = pool.query(query);
        return result;
    }
}

export {UserRepository};