import express from "express";
import * as authCtrl from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import validators from "../validators/auth.validator.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/register",
  validateBody(validators.registerSchema),
  authCtrl.register
);
router.post("/login", validateBody(validators.loginSchema), authCtrl.login);
router.post("/refresh", authCtrl.refreshToken);
router.post("/logout", authCtrl.logout);
router.get("/me", protect, authCtrl.me);

export default router;
