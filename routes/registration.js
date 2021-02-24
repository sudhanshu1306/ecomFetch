import express from "express";
import {getRegister,postRegister} from "../controllers/registration.js";

const router=express.Router();

router.get("/",getRegister);
router.post("/",postRegister);

export default router;
