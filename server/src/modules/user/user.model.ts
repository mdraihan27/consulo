class User{

    id:string;
    firstName:string;
    lastName:string;
    email:string;
    username:string;
    role:string;
    isVerified:boolean;
    bio:string;
    profilePicture:string;

    constructor(id:string, 
        firstName:string, 
        lastName:string, 
        email:string, 
        username:string, 
        role:string, 
        isVerified:boolean, 
        bio:string, 
        profilePicture:string){
            
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.username = username;
        this.role = role;
        this.isVerified = isVerified;
        this.bio = bio;
        this.profilePicture = profilePicture;
    }

}