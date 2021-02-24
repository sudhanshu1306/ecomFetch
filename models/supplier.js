import mongoose from "mongoose";
export const supplierSchema=new mongoose.Schema({
  product:String,
  name:String,
  price:String,
  quantity:String,
  deactivated:{type:String,default:"false"}
},{timestamps:true});
const Supplier=new mongoose.model('Supplier',supplierSchema);
export default Supplier;
