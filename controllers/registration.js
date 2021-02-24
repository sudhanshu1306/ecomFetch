import express from "express";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import User from "../models/user.js";



export const getRegister=(req,res)=>{
res.render("signup");
}

export const postRegister=(req,res)=>{
  const details={
    email:req.body.email,
  }
  User.register(details,req.body.password,(err,user)=>{
    if(err){
      res.json({
        success:false,
        message:err.message,
      });
    }
    else{
      res.redirect("/")
    }
  });
}

export const isAuthenticated=(req,res,next)=>{
  if(req.isAuthenticated())
  next();
  else
  {
    res.redirect("/login");
  }
}
