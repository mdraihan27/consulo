import { pool } from "../../config/db";
import { User } from "./user.model";

class UserRepository{
    private mapRowToUser(row: any): User {
        return new User(
            row.id,
            row.first_name,
            row.last_name,
            row.email,
            row.username,
            row.role,
            row.is_verified,
            row.bio,
            row.profile_picture,
            row.password
        );
    }

    async createUser(user:User){
        const query = `INSERT INTO users (id, first_name, last_name, email, username, password, role, is_verified, bio, profile_picture) VALUES ('${user.id}', '${user.firstName}', '${user.lastName}', '${user.email}', '${user.username}', '${user.password}', '${user.role}', ${user.isVerified}, '${user.bio}', '${user.profilePicture}')`;
        const result = await pool.query(query);
        return result;
    }

    async updateUser(user:User){
        const query = `UPDATE users SET first_name='${user.firstName}', last_name='${user.lastName}', email='${user.email}', username='${user.username}', password='${user.password}', role='${user.role}', is_verified=${user.isVerified}, bio='${user.bio}', profile_picture='${user.profilePicture}' WHERE id='${user.id}'`;
        const result = await pool.query(query);
        return result;
    }

    async deleteUser(id:string){
        const query = `DELETE FROM users WHERE id='${id}'`;
        const result = await pool.query(query);
        return result;
    }

    async getUserById(id:string): Promise<User | null> {
        const query = `SELECT * FROM users WHERE id='${id}'`;
        const result = await pool.query(query);
        if (!result.rows || result.rows.length === 0) {
            return null;
        }
        return this.mapRowToUser(result.rows[0]);
    }

    async getUserByEmail(email:string): Promise<User | null> {
        const query = `SELECT * FROM users WHERE email='${email}'`;
        const result = await pool.query(query);
        if (!result.rows || result.rows.length === 0) {
            return null;
        }
        return this.mapRowToUser(result.rows[0]);
    }

    async getUserByUsername(username:string): Promise<User | null> {
        const query = `SELECT * FROM users WHERE username='${username}'`;
        const result = await pool.query(query);
        if (!result.rows || result.rows.length === 0) {
            return null;
        }
        return this.mapRowToUser(result.rows[0]);
    }

    async getAllUsers(): Promise<User[]> {
        const query = `SELECT * FROM users`;
        const result = await pool.query(query);
        return result.rows.map((row) => this.mapRowToUser(row));
    }
}

export {UserRepository};