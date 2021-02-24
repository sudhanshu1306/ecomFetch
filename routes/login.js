import express from "express";
import {getLogin,postLogin} from "../controllers/login.js";

const router=express.Router();

router.get("/",getLogin);
router.post("/",postLogin);

export default router;
