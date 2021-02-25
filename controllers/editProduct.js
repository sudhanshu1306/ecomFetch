import express from "express";
import Master from "../models/master.js";



export const postEditProduct=async(req,res)=>{
  var r=req.body;
  //console.log(r);
  await Master.findById(req.body.id).then(async foundMaster=>{
    //console.log(foundMaster);
    var images=foundMaster.listingDetails[0]?foundMaster.listingDetails[0].images:[];
    if(req.files){
    req.files.forEach(file=>{
      images.push(file.path);
    });}
    //console.log(images);
      await Master.updateOne({_id:r.id},{listingDetails:[{images:images,description:r.description,weight:r.weight,name:r.name,length:r.length,width:r.width,height:r.height,color:r.color,category:r.category,features:r.features,id:r.id,status:"enriched"}],status:"enriched"});
    res.redirect("/enrich");
  }).catch(err=>{console.log(err.message);});
}
