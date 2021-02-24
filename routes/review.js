import express from "express";
import {isAuthenticated} from "../controllers/registration.js";
import {getDelete,getReview,postChange} from "../controllers/review.js";

const router=express.Router();

router.get("/",isAuthenticated,getReview);
router.get("/delete/:id",isAuthenticated,getDelete);
router.post("/change",isAuthenticated,postChange);

export default router;
