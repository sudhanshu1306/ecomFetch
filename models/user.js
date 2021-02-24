import mongoose from "mongoose";
import passportLocalMongoose from "passport-local-mongoose";
const userSchema=new mongoose.Schema({
  email:String,
  password:String,
  fullname:{type:String,default:"admin"},
  profileImage:{type:String,default:"uploads/defaultProfile.jpg"}
});
userSchema.plugin(passportLocalMongoose, {
  usernameField: 'email'
});
const User=new mongoose.model('User',userSchema);
export default User;
