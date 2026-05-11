import { pool } from "../../config/db";
import { User } from "./user.model";

class UserRepository{
    createUser(user:User){
        const query = `INSERT INTO users (id, first_name, last_name, email, username, password, role, is_verified, bio, profile_picture) VALUES ('${user.id}', '${user.firstName}', '${user.lastName}', '${user.email}', '${user.username}', '${user.password}', '${user.role}', ${user.isVerified}, '${user.bio}', '${user.profilePicture}')`;

        const result = pool.query(query);
        return result;
    }

    updateUser(user:User){
        const query = `UPDATE users SET first_name='${user.firstName}', last_name='${user.lastName}', email='${user.email}', username='${user.username}', password='${user.password}', role='${user.role}', is_verified=${user.isVerified}, bio='${user.bio}', profile_picture='${user.profilePicture}' WHERE id='${user.id}'`;

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