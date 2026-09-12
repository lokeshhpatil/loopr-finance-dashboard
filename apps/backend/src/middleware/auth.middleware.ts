import { NextFunction, Request, Response } from "express";
import { User } from "../models/user.model";
import ApiError from "../utils/apiError";
import jwt, { JwtPayload } from "jsonwebtoken";

export const verifyJWTMidd = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace(/^Bearer\s+/i, "") ||
    req.header("accessToken");

  if(!token) {
    throw new ApiError(401, "Unauthorized access: No token provided");
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as JwtPayload & {id?: string};

    if(!decodedToken.id) {
      throw new ApiError(401, "Unauthorized Access decodedToken not found");
    }

    const user = await User.findById(decodedToken.id).select("_id").lean();

    if(!user) {
      throw new ApiError(401, "Unauthorized access: Invalid token or user deleted");
    }
    req.user = user;

    next();

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, error instanceof Error ? error.message : "Invalid access token");
  }
}
