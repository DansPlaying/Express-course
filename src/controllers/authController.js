const { registerUser, loginUser } = require("../services/authService");

const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    await registerUser(email, password, name);
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error creating user" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const token = await loginUser(email, password);
    res.status(200).json({ message: "User logged in successfully", token });
  } catch (error) {
    res.status(500).json({ message: "Error logging in user" });
  }
};

module.exports = {
  register,
  login,
};
