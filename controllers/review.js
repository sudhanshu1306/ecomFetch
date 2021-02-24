import express from "express";
import Master from "../models/master.js";
import User from "../models/user.js";

export const getReview=async(req,res)=>{
  var user="";
  await User.findOne({email:req.session.passport.user},(err,foundUser)=>{
    user=foundUser;
  });
  await Master.find({},(err,foundItems)=>{
    if(err)
    console.log(err.message);
    else{
      res.render("review",{products:foundItems,user:user});
    }
  })
}
export const getDelete=(req,res)=>{
  Master.findOneAndDelete(req.params.id,(err,foundItem)=>{
    console.log(foundItem);

  });
  res.redirect("/review");
}
export const postChange=(req,res)=>{
  Master.findById(req.body.id,(err,foundMaster)=>{
    foundMaster.review=req.body.review;
    foundMaster.save();
  });
  res.redirect("/review");
}
