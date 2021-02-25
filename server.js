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
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import axios from "axios";
import csv from "csvtojson";
import ejs from "ejs";
import multer from "multer";
import objectsToCsv from "objects-to-csv";

const Port = process.env.PORT;

const server = app.listen(Port, (req, res) => {
  console.log("Server is listening on port " + Port);
});
import User from "./models/user.js";
import Supplier from "./models/supplier.js";
import Master from "./models/master.js";
import signupRoute from "./routes/registration.js";
import loginRoute from "./routes/login.js";
import {isAuthenticated} from "./controllers/registration.js";
import importRoute from "./routes/import.js";
import reviewRoute from "./routes/review.js";
import editProductRoute from "./routes/editProduct.js";

app.use(express.static("public"));
app.use('/product',express.static("public"));
app.use('/editProduct',express.static("public"));
app.use('/suppliers',express.static("public"));
app.use('/uploads',express.static("uploads"));
app.use('/editProduct/uploads',express.static("uploads"));
app.use('/suppliers/uploads',express.static("uploads"));
app.use('/product/uploads',express.static("uploads"));
app.set('view engine','ejs');



//setting up passportLocalMongoose

app.use(session({
  secret:process.env.SESSION_SECRET,
  resave:false,
  saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());

//setting up routes
app.use("/signup",signupRoute);
app.use("/login",loginRoute);
app.use("/import",importRoute);
app.use("/review",reviewRoute);
app.use("/editProduct",editProductRoute);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//configuring nylas
Nylas.config({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
});
const nylas = Nylas.with(process.env.ACCESS_TOKEN);


app.get("/editProfile",isAuthenticated,(req,res)=>{
  const url=req.protocol+'://'+req.get('host')+'/';
  User.findOne({email:req.session.passport.user},(err,foundUser)=>{
    if(err)
    console.log(err);
    else
    res.render("editProfile",{user:foundUser,url:url});
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

var upload=multer({storage:storage});
var image=upload.single('image');

app.post("/editProfile",isAuthenticated,image,(req,res)=>{
  User.findOne({email:req.session.passport.user},(err,foundUser)=>{
    if(err)
    console.log(err);
    else{
      foundUser.fullname=req.body.fullname;
      if(req.file){
        foundUser.profileImage=req.file.path;
      }
      foundUser.save();
    }
    res.redirect("/");
  });
});



app.post("/deactivate",async(req,res)=>{
  // console.log(req.body);
  // const obj= await Supplier.updateOne({_id:req.body.id},{deactivated:req.body.deactivated});
  // console.log(obj);
  await Supplier.findById(req.body.id,(err,foundSupplier)=>{
    foundSupplier.deactivated=req.body.deactivated;
    foundSupplier.save();
  });
  await Master.findById(req.body.product,(err,foundProduct)=>{
    foundProduct.supplier.forEach(splr=>{
      if(splr._id.equals(req.body.id))
      splr.deactivated=req.body.deactivated;
    });
    foundProduct.save();
  });
   res.redirect("/suppliers/"+req.body.product);
})

app.get("/enrich",isAuthenticated,async(req,res)=>{
  var user="";
  const url=req.protocol+'://'+req.get('host')+'/';
  await User.findOne({email:req.session.passport.user},(err,foundUser)=>{
    user=foundUser;
  });
  await Master.find({review:"reviewed"},(err,foundItems)=>{
    if(err)
    console.log(err.message);
    else{
      res.render("enrich",{products:foundItems,user:user,url:url});
    }
  })
})



app.get("/editProduct/:id",isAuthenticated,async(req,res)=>{
  var user="";
  const url=req.protocol+'://'+req.get('host')+'/';
  await User.findOne({email:req.session.passport.user},(err,foundUser)=>{
    user=foundUser;
  });
  await Master.findById(req.params.id,(err,foundMaster)=>{
    if((foundMaster.listingDetails && foundMaster.listingDetails[0])){
        res.render("editProduct",{product:foundMaster.listingDetails[0],user:user,url:url});
    }
    else if(foundMaster.details.length==0|| !foundMaster.details[0].data )
    {
      var product={id:foundMaster._id,name:foundMaster.product};
    //  console.log(product);
      res.render("editProduct",{product:product,user:user,url:url});
    }
    else if(!foundMaster.changedDetails||foundMaster.changedDetails.length==0){
      // console.log(foundMaster.listingDetails);
    res.render("editProduct",{product:foundMaster.listingDetails[0],user:user,url:url});}
    else
    res.render("editProduct",{product:foundMaster.changedDetails[0],user:user,url:url});
  });
});








app.get("/",isAuthenticated, async (req, res) => {
  var user="";
  await User.findOne({email:req.session.passport.user},(err,foundUser)=>{
    user=foundUser;
  });
  await Master.find({approval:"approved"},(err,foundItems)=>{
    if(err)
    console.log(err.message);
    else{
      const url=req.protocol+'://'+req.get('host')+'/';
      res.render("home",{products:foundItems,user:user,url:url});
    }
  })
});


app.post("/edit",isAuthenticated,async(req,res)=>{
  var user="";
  await User.findOne({email:req.session.passport.user},(err,foundUser)=>{
    user=foundUser;
  });
  await Master.findById(req.body.id,(err,foundMaster)=>{
    const url=req.protocol+'://'+req.get('host')+'/';
    res.render("edit",{product:foundMaster,user:user,url:url});
  });
});

app.post("/change",isAuthenticated,async(req,res)=>{
 await Master.updateOne({_id:req.body.id},{sku:req.body.sku,productType:req.body.productType,brand:req.body.brand,product:req.body.product,asin:req.body.asin,ean:req.body.ean,upc:req.body.upc})
  res.redirect("/");
});

app.get("/suppliers/:product",isAuthenticated,async(req,res)=>{
  var user="";
  await User.findOne({email:req.session.passport.user},(err,foundUser)=>{
    user=foundUser;
  });
  await Master.findById(req.params.product,(err,foundProduct)=>{
    const url=req.protocol+'://'+req.get('host')+'/';
    res.render("suppliers",{suppliers:foundProduct.supplier,id:req.params.product,user:user,url:url});
  });
});

function round(num){
  num=parseFloat(num);
  return (Math.round((num + Number.EPSILON) * 100) / 100);
}

app.get("/product/:id",isAuthenticated,async(req,res)=>{
  var user="";
  await User.findOne({email:req.session.passport.user},(err,foundUser)=>{
    user=foundUser;
  });
  const url=req.protocol+'://'+req.get('host')+'/';
  await Master.findById(req.params.id,async(err,foundMaster)=>{
    var user="";
    await User.findOne({email:req.session.passport.user},(err,foundUser)=>{
      user=foundUser;
    });
    const url=req.protocol+'://'+req.get('host')+'/';
    if((foundMaster.listingDetails && foundMaster.listingDetails[0])){
      res.render("product",{success:true ,product:foundMaster.listingDetails[0],url:url,user:user});
    }
    else if(foundMaster.details.length!==0&&foundMaster.details[0].data){
      if(foundMaster.listingDetails.length!=0&& foundMaster.changedDetails.length==0)
      {
        var user="";
        await User.findOne({email:req.session.passport.user},(err,foundUser)=>{
          user=foundUser;
        });
        const url=req.protocol+'://'+req.get('host')+'/';
        res.render("product",{success:true ,product:foundMaster.listingDetails[0],url:url,user:user});
      }
      else if(foundMaster.listingDetails.length!=0&& foundMaster.changedDetails.length!=0)
      {
        var user="";
        await User.findOne({email:req.session.passport.user},(err,foundUser)=>{
          user=foundUser;
        });
        const url=req.protocol+'://'+req.get('host')+'/';
        res.render("product",{success:true ,product:foundMaster.changedDetails[0],url:url,user:user});}
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
        var user="";
        await User.findOne({email:req.session.passport.user},(err,foundUser)=>{
          user=foundUser;
        });
        const url=req.protocol+'://'+req.get('host')+'/';
      res.render("product",{success:true ,product:product,url:url,user:user});}
    }
    else{
      var user="";
      await User.findOne({email:req.session.passport.user},(err,foundUser)=>{
        user=foundUser;
      });
      // res.render("product",{product:{}});
      var product={id:foundMaster._id};
      const url=req.protocol+'://'+req.get('host')+'/';
      res.render("product",{success:false,product:product,user:user,url:url});
    }
  });
});



//writing to csv
app.get("/download",async(req,res)=>{
 await  Master.find({},async(err,foundMasters)=>{
   var obj=[];
   foundMasters.forEach(master=>{
     obj.push(master._doc);
   });
    const csv = new objectsToCsv(obj);
    console.log("writing file to disk ");
    console.log(obj[0]);
    await csv.toDisk('./uploads/export.csv');
    res.redirect("/uploads/export.csv");
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
        if(master.details[0].data)
        master.status="enriched";
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
          await Master.findOne({product:rows[i][3]},(err,foundProduct)=>{
            //console.log(foundProduct.product);
            foundProduct.supplier.forEach(splr=>{
              if(splr.name===message.subject)
              {
                splr.price=rows[i][5],
                splr.quantity=rows[i][10];
              }
            });
            foundProduct.save();
          });
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
        //console.log(json);
        json.forEach(product=>{
          const supplier=new Supplier({
            product:product.ID,
            name:"Supplier B",
            price:product.Price,
            quantity:product.Qty
          });
          supplier.save();
          const master=new Master({
            productType:product.Category,
            brand:product.Brand,
            product:product.ID,
            upc:product.upc,
            ean:product.ean,
            supplier:supplier
          });
          master.save().catch(err=>{console.log(err);});
        })
      }).catch(err=>{console.log(err.message);})
    }
  }
  });
}
setInterval(myfun,20000);
