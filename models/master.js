import mongoose from "mongoose";
import {supplierSchema} from "./supplier.js";
const masterSchema=new mongoose.Schema({
  sku:{type:String},
  productType:String,
  brand:String,
  product:{type:String,unique:true},
  note:String,
  usd:String,
  newProduct:String,
  goodPrice:String,
  ean:String,
  upc:String,
  asin:String,
  supplier: [supplierSchema],
  details:[],
  changedDetails:[],
  listingDetails:[],
  review:{type:String,default:"Not reviewed"},
  status:{type:String,default:"Not enriched"},
  approval:{type:String,default:"Not checked"}
},{
  timestamps:true
});
const Master=new mongoose.model('Master',masterSchema);
export default Master;
