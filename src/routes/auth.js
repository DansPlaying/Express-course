const express = require("express");
const { register, login } = require("../controllers/authController");
const authenticateToken = require("../middleware/auth");
const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/protected", authenticateToken, (req, res) => {
  res.json({ message: "This is a protected route" });
});

module.exports = router;
