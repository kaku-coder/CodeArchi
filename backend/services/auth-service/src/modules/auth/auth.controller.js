import {
  createAccount,
  findUserFromToken,
  signIn
} from "./auth.service.js";

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/"
});

export async function signup(req, res, next) {
  try {
    const { user, token } = await createAccount(req.body);
    res.cookie("token", token, {
      ...cookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { user, token } = await signIn(req.body);
    res.cookie("token", token, {
      ...cookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = await findUserFromToken(req.cookies.token);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export function logout(_req, res) {
  res.clearCookie("token", cookieOptions());
  res.json({ message: "Logged out successfully." });
}