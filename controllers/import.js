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
import _ from "lodash";


function arrayEquals(a, b) {
  return Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index]);
}
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
     var mapRow=[];
     var mapDatabase=[];
     for(var i in rows){
       if(i==0)
       {
         for(var j=0;j<rows[i].length;j++){
           var str1=_.camelCase(rows[i][j]);
           mapRow.push(rows[i][j]);
           mapDatabase.push(str1);
         }
        continue;
       }
       await Master.findOne({product:rows[i][3]},async(err,foundMaster)=>{
      if(!foundMaster){

      var supplier=new Supplier({
        product:rows[i][mapDatabase.indexOf("product")],
        name:"Supplier A",
        price:rows[i][mapDatabase.indexOf("usd")],
        quantity:rows[i][mapDatabase.indexOf("quantity")]
      });
      supplier.save();
      var details={identifier:[],type:null,locale:"US"}
      if(rows[i][mapDatabase.indexOf("upc")]){
        details.identifier.push(rows[i][mapDatabase.indexOf("upc")]);
        details.type="upc";
      }
      else if(rows[i][mapDatabase.indexOf("ean")]){
        details.identifier.push(rows[i][mapDatabase.indexOf("ean")]);
        details.type="ean";
        details.locale="UK";
      }
    //   var master=new Master({
    //   sku:rows[i][0],
    //   productType:rows[i][1],
    //   brand:rows[i][2],
    //   product:rows[i][3],
    //   note:rows[i][4],
    //   newProduct:rows[i][6],
    //   goodPrice:rows[i][7],
    //   ean:rows[i][8],
    //   upc:rows[i][9],
    //   supplier:[supplier],
    //   ascii:"9695271054",
    // });
      let obj = {};
      mapDatabase.forEach((e, index)=>{
        obj[e] = rows[i][index];
      })
      console.log(obj);
        var master=new Master(obj)
        master.supplier=[supplier];
        // master.mapDatabase.push(mapDatabase);
        mapDatabase.forEach(md=>{
          master.mapDatabase.push(md);
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
        if(!arrayEquals(foundMaster.mapDatabase,mapDatabase)){
          // console.log(foundMaster.mapDatabase);
          // console.log(mapDatabase);
          mapDatabase.forEach(async md=>{
            console.log(foundMaster.mapDatabase.indexOf(md)+" "+md);
            if(foundMaster.mapDatabase.indexOf(md)==-1){
            await  Master.updateOne({_id: foundMaster._id}, {[md]:rows[i][mapDatabase.indexOf(md)], '$push' : {'mapDatabase': md}});
              // foundMaster[[md]]=rows[i][mapDatabase.indexOf(md)];
              // console.log(foundMaster[[md]]+" "+mapDatabase.indexOf(md));
              //foundMaster.dandom=mapDatabase.indexOf(md);
              //foundMaster.mapDatabase[0].push(md);
            }

          });

        }
        mapDatabase.forEach(async md=>{
          foundMaster[[md]]=rows[i][mapDatabase.indexOf(md)];
        });
        await foundMaster.save();
        //
        // await Supplier.findOne({product:rows[i][mapDatabase.indexOf("product")],name:"Supplier A"},async(err,foundSupplier)=>{
        //
        //   if(foundSupplier){
        //   await  Supplier.updateOne({product:rows[i][mapDatabase.indexOf("product")],name:"Supplier A"}, {price:rows[i][mapDatabase.indexOf("usd")], quantity:rows[i][mapDatabase.indexOf("quantity")]});
        //   await Master.findOne({product:rows[i][3]},(err,foundProduct)=>{
        //     //console.log(foundProduct.product);
        //     if(foundProduct){
        //     foundProduct.supplier.forEach(splr=>{
        //       if(splr.name==="Supplier A")
        //       {
        //         splr.price=rows[i][mapDatabase.indexOf("price")],
        //         splr.quantity=rows[i][mapDatabase.indexOf("quantity")];
        //       }
        //     });
        //     foundProduct.save();}
        //   });
        //   }
        //   else{
        //     var supplier=new Supplier({
        //       product:rows[i][mapDatabase.indexOf("product")],
        //       name:"Supplier A",
        //       price:rows[i][mapDatabase.indexOf("usd")],
        //       quantity:rows[i][mapDatabase.indexOf("quantity")]
        //     });
        //     supplier.save();
        //    await  Master.updateOne({product:rows[i][mapDatabase.indexOf("product")]},{'$push': {'supplier': supplier}});
        //   }
        // });
      }

       });

     }

   }).catch(err=>{console.log(err.message);});
   res.redirect("/");
}
