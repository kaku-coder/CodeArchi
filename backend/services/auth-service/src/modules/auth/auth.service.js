import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "./user.model.js";

const invalidCredentials = () => {
  const error = new Error("Invalid email or password.");
  error.status = 401;
  return error;
};

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

function createToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export async function createAccount({ name, email, password } = {}) {
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 100 ||
    typeof email !== "string" ||
    email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof password !== "string" ||
    password.length < 6 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    const error = new Error("Enter a name of at least 2 characters, a valid email, and a password of 6-72 bytes.");
    error.status = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.exists({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error("An account with this email already exists.");
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash
  });

  return { user: publicUser(user), token: createToken(user._id.toString()) };
}

export async function signIn({ email, password } = {}) {
  if (typeof email !== "string" || typeof password !== "string") {
    const error = new Error("Email and password are required.");
    error.status = 400;
    throw error;
  }
  if (Buffer.byteLength(password, "utf8") > 72) throw invalidCredentials();

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw invalidCredentials();
  }

  return { user: publicUser(user), token: createToken(user._id.toString()) };
}

export async function findUserFromToken(token) {
  if (!token) throw invalidCredentials();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) throw invalidCredentials();
    return publicUser(user);
  } catch (error) {
    if (error.status) throw error;
    throw invalidCredentials();
  }
}