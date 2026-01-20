//basic Express with local json db

require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const fs = require("fs");
const path = require("path");

const authenticateToken = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;
const usersFile = path.join(__dirname, "users.json");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================
// Validation helpers
// ======================
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidName = (name) =>
  typeof name === "string" && name.trim().length >= 3;

const isValidEmail = (email) =>
  typeof email === "string" && emailRegex.test(email);

const isValidId = (id) => Number.isInteger(id) && id > 0;

// ======================
// Utility helpers
// ======================
const readUsers = (callback) => {
  fs.readFile(usersFile, "utf8", (err, data) => {
    if (err) return callback(err);

    try {
      const users = JSON.parse(data);
      if (!Array.isArray(users)) throw new Error("Invalid DB");
      callback(null, users);
    } catch (e) {
      callback(e);
    }
  });
};

const writeUsers = (users, callback) => {
  fs.writeFile(usersFile, JSON.stringify(users, null, 2), "utf8", callback);
};

// ======================
// Routes
// ======================
app.get("/", (req, res) => {
  res.send("Hello World");
});

// GET all users
app.get("/api/users", (req, res) => {
  readUsers((err, users) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error leyendo usuarios" });
    }
    res.json(users);
  });
});

app.get("/api/users/:id", (req, res) => {
  const userId = parseInt(req.params.id, 10);

  if (!isValidId(userId)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  readUsers((err, users) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error leyendo usuarios" });
    }
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(users[index]);
  });
});

// POST create user
app.post("/api/users", (req, res) => {
  const { name, email } = req.body;

  if (!isValidName(name)) {
    return res
      .status(400)
      .json({ message: "Name must have at least 3 characters" });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Invalid email" });
  }

  readUsers((err, users) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error leyendo db" });
    }

    if (users.some((u) => u.email === email)) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const newUser = {
      id: users.length ? users[users.length - 1].id + 1 : 1,
      name: name.trim(),
      email: email.toLowerCase(),
    };

    users.push(newUser);

    writeUsers(users, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error guardando usuario" });
      }

      res.status(201).json({
        message: "User created successfully",
        user: newUser,
      });
    });
  });
});

// PUT update user
app.put("/api/users/:id", (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { name, email } = req.body;

  if (!isValidId(userId)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  if (name && !isValidName(name)) {
    return res
      .status(400)
      .json({ message: "Name must have at least 3 characters" });
  }

  if (email && !isValidEmail(email)) {
    return res.status(400).json({ message: "Invalid email" });
  }

  readUsers((err, users) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error leyendo db" });
    }

    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      return res.status(404).json({ message: "User not found" });
    }

    if (email && users.some((u) => u.email === email && u.id !== userId)) {
      return res.status(409).json({ message: "Email already exists" });
    }

    users[index] = {
      ...users[index],
      ...(name && { name: name.trim() }),
      ...(email && { email: email.toLowerCase() }),
    };

    writeUsers(users, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error updating user" });
      }

      res.json({
        message: "User updated successfully",
        user: users[index],
      });
    });
  });
});

// DELETE user
app.delete("/api/users/:id", (req, res) => {
  const userId = parseInt(req.params.id, 10);

  if (!isValidId(userId)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  readUsers((err, users) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error leyendo db" });
    }

    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      return res.status(404).json({ message: "User not found" });
    }

    const deletedUser = users.splice(index, 1)[0];

    writeUsers(users, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error deleting user" });
      }

      res.json({
        message: "User deleted successfully",
        user: deletedUser,
      });
    });
  });
});

app.get("/db-users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error reading db" });
  }
});

app.get("/protected", authenticateToken, (req, res) => {
  res.json({ message: "This is a protected route", user: req.user });
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "USER",
    },
  });

  res.status(201).json({ message: "User created successfully", user: newUser });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );
  res.json({ message: "User logged in successfully", token });
});

// ======================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
