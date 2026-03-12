//models/User.js - MODEL layer 
// Responsible for all data access and business rules related to users

// No http knowledge. No req/res
//Pur data logic

const bcrypt = require('bcryptjs');
const {db, id} = require('../db');

const SALT_ROUNDS = 12;

class User {

    // Find a user by their ID 
    // @param {string} userId
    //@returns {object|null}

    static findById(userId){
        return db.users.find(u=> u.id === userId) || null;
    }

    //fIND A USER BY THEIR EMAIL ADDRESS
    //@param {string} email
    //@returns {object|null}

    static findByEmail(email){
        return db.users.find(u=>u.email === email) || null;
    }

    //create a new user account and empty profile 
    // @param {object} data - {email, password(plain), name, role}
    // @ returns {object} new user (password hashed)

    static async create({email, password, name, role = 'alumni'}){
        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        const now= new Date().toISOString();

        const newUser = {
            id : id(),
            email,
            password : hashed,
            name,
            role,
            emailVerified: false,
            createdAt: now,
            updatedAt: now,
        };

        db.users.push(newUser);


        if(role === 'alumni') {
            db.profiles.push({
                id: id(),
                userId: newUser.id,
                graduationYear:  null,
                bio:   '',
                linkedInUrl: '',
                photoUrl:     null,
                currentRole: '',
                currentEmployer: '',
                location:  '',
                walletBalance:  0,
                appearanceCount:   0,
                appearanceCountMonth:  now.slice(0,7),
                isActiveToday: false,
                profileCompleted:   false,
                createdAt:      now,
            });
        }

        return newUser;
    }

    //check if an email is already registered 
    //param {string} email
    // @returns  {boolean}

    static emailExists(email){
        return db.users.some(u => u.email === email);
    }

    // compare a plain text passworrd against a stored bcrypt hash
    // param {string} plainPassword
    //param {string} hashedpassword 
    //returns {Promise<boolean>}
    
    static async verifyPassword(plainPassword, hashedpassword){
        return bcrypt.compare(plainPassword,hashedpassword);
    }

    static markEmailVerified(userId){
        const user = User.findById(userId);
        if (user){
            user.emailVerified = true;
            user.updatedAt = new Date().toISOString();
        }
    }

    //update a user's password
    //param {strinf} userId
    // param {string} newPassword plain-text

    static async updatePassword(userId, newPassword){
        const user = User.findById(userId);
        if(user){
            user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
            user.updatedAt = new Date().toISOString();
        }
    }

    //Return user object without senesitive fields (password)
    //param {object} user
    //return {object}

    static toPublic(user){
        const {password, ...safe} = user;
        return safe;
    }
}

Module.exports = User; 