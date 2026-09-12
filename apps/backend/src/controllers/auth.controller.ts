import { User } from "../models/user.model";
import { CookieOptions } from "express";
import ApiError from "../utils/apiError";
import ApiResponse from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import jwt, { JwtPayload } from "jsonwebtoken";

// const options: CookieOptions = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production",
//   maxAge: 15 * 60 * 1000,
//   sameSite: "lax"
// }

const cookieOptions: CookieOptions = {
  httpOnly: true, // JS cannot access — prevents XSS theft [citation:1][citation:4]
  secure: process.env.NODE_ENV === "production", // HTTPS only in prod
  sameSite: "strict" as const, // CSRF protection [citation:15]
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "Email already exist");
  }

  const user = new User({ name, email, password });

  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  user.refreshToken = refreshToken;
  await user.save();

  res.cookie("refreshToken", refreshToken, cookieOptions);

  const safeUser = {
    _id: user._id,
    name: user.name,
    email: user.email,
  };
  console.log("CREATED USER -> ", user);

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: safeUser, accessToken },
        "Registration successfull",
      ),
    );
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    throw new ApiError(400, "email and password both are required");
  }
  
  const user = await User.findOne({ email }).select("+password");
  // console.log("USER FROM LOGIN -> ", user);
  
  // console.log("USER FROM REQ -> ", req.user);

  if (!user) {
    throw new ApiError(401, "Invalid Credentials");
  }

  const isPassValid = await user.comparePassword(password);

  if (!isPassValid) {
    throw new ApiError(401, "Invalid Credentials");
  }

  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.cookie("refreshToken", refreshToken, cookieOptions);
  const validUser = {
    _id: user._id,
    name: user.name,
    email: user.email,
  };

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: validUser,
        accessToken,
      },
      "Logged in successfully",
    ),
  );
});

export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    },
  );
  return res
    .status(200)
    .clearCookie("refreshToken", cookieOptions)
    .clearCookie("accessToken", cookieOptions)
    .json(new ApiResponse(200, {}, "user logged out."));
});

export const getMe = asyncHandler(async (req, res) => {
  const user = req.user;
  console.log("USER FROM REQ -> ", req.user);
  if(!user) {
    throw new ApiError(401, "Invalid Credentials");
  }
  const userDetails = await User.findById(user._id).select("name email").lean();

  res
    .status(200)
    .json(
      new ApiResponse(
        200, {user: userDetails}, "Profile retrieved sucessfully"
      )
    )
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  console.log('reading incoming refresh token', incomingRefreshToken);
  console.log(req.cookies);
  console.log(req.body);
  if (!incomingRefreshToken) {
    throw new ApiError(400, 'unauthorized access');
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET as string) as JwtPayload;

    console.log('Decoded token : ', decodedToken);

    if (!decodedToken) {
      throw new ApiError(400, 'Invalid Token.');
    }

    if (!decodedToken.id) {
      throw new ApiError(400, 'Invalid Token.');
    }

    const user = await User.findById(decodedToken.id).select('+refreshToken');
    if (!user) {
      throw new ApiError(400, 'Invalid User.');
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, 'Refresh Token Is Expired or Used.');
    }

    const options: CookieOptions = {
      ...cookieOptions,
      secure: process.env.NODE_ENV === "production",
    };

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    await User.findByIdAndUpdate(user._id, { refreshToken });

    return res
      .status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('refreshToken', refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: refreshToken },
          'access token refreshed successfully.'
        )
      );
  } catch (error) {
    if(error instanceof Error) {
      console.log("Error creating refresh token :: error : ", error.message);
    }
    throw new ApiError(401, "Error while creating the refreshToken", error);
  }
});
