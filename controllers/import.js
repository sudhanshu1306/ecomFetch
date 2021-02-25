import express from "express";
import Master from "../models/master.js";
import Supplier from "../models/supplier.js";
import xlsxFile from "read-excel-file";
import path from "path";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from "fs";
const __dirname = dirname(fileURLToPath(import.meta.url));
import child_process from 'child_process'
import User from "../models/user.js";

export const getImport=async(req,res)=>{
  var user="";
  await User.findOne({email:req.session.passport.user},(err,foundUser)=>{
    user=foundUser;
  });
  const url=req.protocol+'://'+req.get('host')+'/';
  res.render("import",{user:user,url:url});
}

var pt="",dt="";
export const postImport=async(req,res)=>{
   if(!req.file){
     var user="";
     const url=req.protocol+'://'+req.get('host')+'/';
     await User.findOne({email:req.session.passport.user},(err,foundUser)=>{
       user=foundUser;
     });
     res.render("error",{user:user,url:url});
   }
   else{
  //   console.log(req.file);
    var ext=req.file.originalname.substring(req.file.originalname.indexOf(".")+1);
  if(ext==='xlsx'){
    pt='../uploads/'+req.file.filename;
    console.log(path.join(__dirname,pt));
     fs.readFile('./'+req.file.path,function(err,data){
      if(err)
      throw err;
      else{
        dt= data
      }
     });
  //  res.sendFile(path.join(__dirname,pt))
  //res.sendFile('./uploads/trysheet.xlsx');

  }
  res.redirect("/import/read");}
}
export const getRead=async(req,res)=>{
  //console.log(dt);
  await  xlsxFile(dt).then(async(rows) => {
     for(var i in rows){
       if(i==0)
       continue;
       await Master.findOne({product:rows[i][3]},async(err,foundMaster)=>{
      if(!foundMaster){

      var supplier=new Supplier({
        product:rows[i][3],
        name:"Supplier A",
        price:rows[i][5],
        quantity:rows[i][10]
      });
      supplier.save();
      var details={identifier:[],type:null,locale:"US"}
      if(rows[i][9]){
        details.identifier.push(rows[i][9]);
        details.type="upc";
      }
      else if(rows[i][8]){
        details.identifier.push(rows[i][8]);
        details.type="ean";
        details.locale="UK";
      }
      var master=new Master({
      sku:rows[i][0],
      productType:rows[i][1],
      brand:rows[i][2],
      product:rows[i][3],
      note:rows[i][4],
      newProduct:rows[i][6],
      goodPrice:rows[i][7],
      ean:rows[i][8],
      upc:rows[i][9],
      supplier:[supplier],
    });
    if(details.identifier[0])
    {
      var str='curl "https://v3.synccentric.com/api/v3/products/search" -H "Authorization: Bearer '+process.env.SYNC_TOKEN+'" -d "identifier[]='+details.identifier[0]+'" -d type='+details.type+ ' -d locale='+details.locale;

         child_process.exec(str,(err,data)=>{
        master.details.push(JSON.parse(data));
        //var dt=JSON.parse(data);
        if(master.details[0].data)
        master.status="enriched";
        master.save().catch(err=>{});
      });
    }
    else{
      master.save().catch(err=>{});}
      }
      else{
        await Supplier.findOne({product:rows[i][3],name:"Supplier A"},async(err,foundSupplier)=>{

          if(foundSupplier){
          await  Supplier.updateOne({product:rows[i][3],name:"Supplier A"}, {price:rows[i][5], quantity:rows[i][10]});
          await Master.findOne({product:rows[i][3]},(err,foundProduct)=>{
            //console.log(foundProduct.product);
            if(foundProduct){
            foundProduct.supplier.forEach(splr=>{
              if(splr.name==="Supplier A")
              {
                splr.price=rows[i][5],
                splr.quantity=rows[i][10];
              }
            });
            foundProduct.save();}
          });
          }
          else{
            var supplier=new Supplier({
              product:rows[i][3],
              name:"Supplier A",
              price:rows[i][5],
              quantity:rows[i][10]
            });
            supplier.save();
           await  Master.updateOne({product:rows[i][3]},{'$push': {'supplier': supplier}});
          }
        });
      }

       });

     }

   }).catch(err=>{console.log(err.message);});
   res.redirect("/");
}
