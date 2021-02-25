import express from "express";
import {isAuthenticated} from "../controllers/registration.js";
import {postEditProduct} from "../controllers/editProduct.js";
import multer from "multer";
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

var router=express.Router();
router.post("/",image,postEditProduct);

export default router;
