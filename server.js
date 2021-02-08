import dotenv from "dotenv";
dotenv.config();
import express from "express";
const app = express();
import bodyParser from "body-parser";

import child_process from 'child_process'
app.use(bodyParser.urlencoded({
  extended: true
}));
import xlsxFile from "read-excel-file";
import fs from "fs";
import node_xj from "xls-to-json";
import Nylas from "nylas";
import mongoose from "mongoose";
mongoose.connect(process.env.MONGO_URL, {
  useUnifiedTopology: true,
  useNewUrlParser: true
});
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
import axios from "axios";
import csv from "csvtojson";
import ejs from "ejs";
import multer from "multer";

const Port = process.env.PORT;

const server = app.listen(Port, (req, res) => {
  console.log("Server is listening on port " + Port);
});


//mongoose schema
const supplierSchema=new mongoose.Schema({
  product:String,
  name:String,
  price:String,
  quantity:String
},{timestamps:true});
const Supplier=new mongoose.model('Supplier',supplierSchema);
const masterSchema=new mongoose.Schema({
  sku:{type:String,unique:true},
  productType:String,
  brand:String,
  product:{type:String,unique:true},
  note:String,
  usd:String,
  newProduct:String,
  goodPrice:String,
  ean:String,
  upc:String,
  supplier: [supplierSchema],
  details:[],
  changedDetails:[],
  listingDetails:[],
},{
  timestamps:true
});
const Master=new mongoose.model('Master',masterSchema);
const userSchema=new mongoose.Schema({
  email:String,
  password:String
});
const User=new mongoose.model('User',userSchema);

app.use(express.static("public"));
app.use('/uploads',express.static("uploads"));
app.set('view engine','ejs');

//configuring nylas
Nylas.config({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
});
const nylas = Nylas.with(process.env.ACCESS_TOKEN);

var isLoggedIn=false;

const isAuthenticated=(req,res,next)=>{
  if(isLoggedIn)
    return next();
  res.redirect("/login");
}

app.get("/signup",(req,res)=>{
  res.render("signup");
});
app.post("/signup",(req,res)=>{
  const user=new User({email:req.body.email,password:req.body.password});
  user.save();
  res.redirect("/");
});



app.get("/login",(req,res)=>{
  res.render("login");
});
app.post("/login",(req,res)=>{
   User.findOne({email:req.body.email},(err,foundUser)=>{
     if(foundUser&&foundUser.password===req.body.password){
       isLoggedIn=true;
       console.log("logged in");
       res.redirect("/");
     }
     else{
       console.log("incorrect");
       res.redirect("/login");
     }
   });
});






app.get("/editProduct/:id",isAuthenticated,async(req,res)=>{
  await Master.findById(req.params.id,(err,foundMaster)=>{
    if(foundMaster.details.length==0|| !foundMaster.details[0].data)
    {
      var product={id:foundMaster._id,name:foundMaster.product};
      res.render("editProduct",{product:product});
    }
    else if(!foundMaster.changedDetails||foundMaster.changedDetails.length==0){
      // console.log(foundMaster.listingDetails);
    res.render("editProduct",{product:foundMaster.listingDetails[0]});}
    else
    res.render("editProduct",{product:foundMaster.changedDetails[0]});
  });
});



var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    console.log(file.mimetype.substring(file.mimetype.indexOf("/")));
    var ext=file.mimetype.substring(file.mimetype.indexOf("/")+1);
    cb(null, Date.now() +"."+ ext) //Appending extension
  }
});

const upload=multer({storage:storage});
const image=upload.array('images');



app.post("/editProduct",isAuthenticated,image,async(req,res)=>{
  var r=req.body;
//  await Master.updateOne({_id:r.id},{changedDetails:[{description:r.description,weight:r.weight,name:r.name,length:r.length,width:r.width,height:r.height,color:r.color,category:r.category,features:r.features,id:r.id}]});
  await Master.findById(req.body.id).then(async foundMaster=>{
    //console.log(req.body);
    //console.log(foundMaster.changedDetails);

    // foundMaster.changedDetails=[];
    // foundMaster.changedDetails.push();
    var images=foundMaster.listingDetails[0].images;
    if(req.files){
    req.files.forEach(file=>{
      images.push(file.path);
    });}
    console.log(images);
      await Master.updateOne({_id:r.id},{changedDetails:[{images:images,description:r.description,weight:r.weight,name:r.name,length:r.length,width:r.width,height:r.height,color:r.color,category:r.category,features:r.features,id:r.id}]});
    res.redirect("/");
  }).catch(err=>{console.log(err.message);});
});



app.get("/",isAuthenticated, async (req, res) => {
  await Master.find({},(err,foundItems)=>{
    if(err)
    console.log(err.message);
    else{
      res.render("home",{products:foundItems});
    }
  })
});


app.post("/edit",isAuthenticated,async(req,res)=>{
  await Master.findById(req.body.id,(err,foundMaster)=>{
    res.render("edit",{product:foundMaster});
  });
});

app.post("/change",isAuthenticated,async(req,res)=>{
 await Master.updateOne({_id:req.body.id},{sku:req.body.sku,productType:req.body.productType,brand:req.body.brand,product:req.body.product,ean:req.body.ean,upc:req.body.upc})
  res.redirect("/");
});

app.get("/suppliers/:product",isAuthenticated,async(req,res)=>{
  await Master.findById(req.params.product,(err,foundProduct)=>{
    res.render("suppliers",{suppliers:foundProduct.supplier});
  });
});

function round(num){
  num=parseFloat(num);
  return (Math.round((num + Number.EPSILON) * 100) / 100);
}

app.get("/product/:id",isAuthenticated,async(req,res)=>{
  const url=req.protocol+'://'+req.get('host')+'/';
  await Master.findById(req.params.id,async(err,foundMaster)=>{
    if(foundMaster.details.length!==0&&foundMaster.details[0].data){
      if(foundMaster.listingDetails.length!=0&& foundMaster.changedDetails.length==0)
      {res.render("product",{success:true ,product:foundMaster.listingDetails[0],url:url});}
      else if(foundMaster.listingDetails.length!=0&& foundMaster.changedDetails.length!=0)
      {res.render("product",{success:true ,product:foundMaster.changedDetails[0],url:url});}
      else{
      var product={};
      var s=foundMaster.details[0].data[0].attributes;
      product.name=foundMaster.product;
      product.description=s.description;
      product.length=round(s.package_dimensions_length);
      product.width=round(s.package_dimensions_width);
      product.height=round(s.package_dimensions_height);
      product.weight=round(s.package_dimensions_weight);
      product.color=s.color;
      product.images=[];
      product.images.push(s.additional_image_1);
      product.images.push(s.additional_image_2)
      product.images.push(s.additional_image_3);
      product.category=s.category;
      product.features=s.features;
      product.id=foundMaster._id;
      foundMaster.listingDetails[0]=product;
      // foundMaster.save();
        await Master.updateOne({_id:foundMaster._id},{listingDetails:[product]});
      res.render("product",{success:true ,product:product,url:url});}
    }
    else{
      // res.render("product",{product:{}});
      var product={id:foundMaster._id};
      res.render("product",{success:false,product:product});
    }
  });
});





async function myfun(){
  nylas.messages.first({
    in: 'inbox'
  }).then(async message => {
    console.log(`Subject: ${message.subject} | ID: ${message.id} | Unread: ${message.unread}`);
    if(message.files[0]&&message.unread){
    nylas.messages.find(message.id).then(msg=>{
      console.log("Marking unread");
      msg.unread=false;
      msg.save();
    }).catch(err=>{console.log("error "+err.message);});
    const file = await message.files[0].download();
    if(message.files[0].contentType==="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"){
    xlsxFile(file.body).then(async(rows) => {
     for(var i in rows){
       if(i==0)
       continue;
       await Master.findOne({product:rows[i][3]},async(err,foundMaster)=>{
      if(!foundMaster){

      var supplier=new Supplier({
        product:rows[i][3],
        name:message.subject,
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
      /*
      axios.get("https://v3.synccentric.com/api/v3/products/search",{"data":details},{"headers":{"Content-type": "application/json",'Authorization':"Bearer A0OAHmxkMIrKIFK9onponaLFoSGj4GIGp4nsa3YGJmsqwqFY69vBxhN4XZKa"}}).then(res=>{
        console.log(res.data);
      }).catch(err=>{console.log(err.message);});
      */
      var str='curl "https://v3.synccentric.com/api/v3/products/search" -H "Authorization: Bearer '+process.env.SYNC_TOKEN+'" -d "identifier[]='+details.identifier[0]+'" -d type='+details.type+ ' -d locale='+details.locale;

         child_process.exec(str,(err,data)=>{
        master.details.push(JSON.parse(data));
        master.save().catch(err=>{});
      });
    }
    else{
      master.save().catch(err=>{});}
      }
      else{
        await Supplier.findOne({product:rows[i][3],name:message.subject},async(err,foundSupplier)=>{

          if(foundSupplier){
          await  Supplier.updateOne({product:rows[i][3],name:message.subject}, {price:rows[i][5], quantity:rows[i][10]});
          }
          else{
            var supplier=new Supplier({
              product:rows[i][3],
              name:message.subject,
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

   }).catch(err=>{console.log(err.message);});}
    else if(message.files[0].contentType==="application/vnd.ms-excel"){
       //console.log(typeof(file.body));
       var str=(file.body.toString('utf-8'))
       fs.writeFile('username.csv', str, function (err) {
         if (err) return console.log(err);
       });
      const converter=csv()
      .fromFile('./username.csv')
      .then((json)=>{
        console.log(json);
        //add product to collection
        // json.forEach(data=>{
        //   var pro={};
        //   for(var key in data){
        //     pro.key:data[key]
        //   }
        // })
      }).catch(err=>{console.log(err.message);})
    }
  }
  });
}
setInterval(myfun,20000);
