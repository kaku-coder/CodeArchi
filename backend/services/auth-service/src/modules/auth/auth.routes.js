import { Router } from "express";
import {
  getCurrentUser,
  login,
  logout,
  signup
} from "./auth.controller.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", getCurrentUser);
router.post("/logout", logout);

export default router;