import express from "express";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import User from "../models/user.js";

export const getLogin=(req,res)=>{
  res.render("login");
}
export const postLogin=(req,res)=>{
  const user=new User(req.body);
  req.login(user,function(err){
    if(err){
      res.redirect("/login");
    }
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/");
      });
    }
  });
}
