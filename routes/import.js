import express from "express";
import {isAuthenticated} from "../controllers/registration.js";
import {getImport,postImport,getRead} from "../controllers/import.js";
import multer from "multer";
import path from "path";
import alert from "alert"
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    //console.log(file.mimetype.substring(file.mimetype.indexOf("/")));
    var ext=file.originalname.substring(file.originalname.indexOf(".")+1);
    cb(null, Date.now() +"."+ ext) //Appending extension
  }
});
const upload=multer({errorHandling: 'manual' ,storage:storage,
  fileFilter:(req,file,callback)=>{
    var ext=path.extname(file.originalname);
    if(ext!=='.csv' && ext!=='.xlsx'){
    //console.log(ext);
  //  alert("Only excel sheet or csv files allowed");
    return callback(new Error('Only excel sheet or csv files allowed'))
  }
  callback(null,true);}


});
const data=upload.single('data');

const router=express.Router();

router.get("/",isAuthenticated,getImport);
router.post("/",data,postImport);
router.get("/read",isAuthenticated,getRead);

export default router;
