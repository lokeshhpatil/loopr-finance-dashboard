import jwt from "jsonwebtoken";

const getSecret = (name: "ACCESS_TOKEN_SECRET" | "REFRESH_TOKEN_SECRET") => {
  const secret = process.env[name];
  if (!secret) {
    throw new Error(`${name} is not configured`);
  }
  return secret;
};

export const generateAccessToken = (userId: string) => {
  return jwt.sign({ id: userId }, getSecret("ACCESS_TOKEN_SECRET"), { expiresIn: "30m" });
}

export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ id: userId }, getSecret("REFRESH_TOKEN_SECRET"), { expiresIn: "7d" });
}

export const verifyRefreshToken = ( token: string ) => {
  return jwt.verify(token, getSecret("REFRESH_TOKEN_SECRET"));
}