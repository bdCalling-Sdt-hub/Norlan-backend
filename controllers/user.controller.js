const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const emailWithNodemailer = require("../config/email.config");
const sendResponse = require("../shared/sendResponse");
const ApiError = require("../errors/ApiError");
const httpStatus = require("http-status");
const catchAsync = require("../shared/catchAsync");
const userTimers = new Map();
const fs = require("fs");
const path = require("path");

exports.userRegister = catchAsync(async (req, res, next) => {
  const { fullName, email, password, confirmPass, termAndCondition, role } =
    req.body;

  if (!fullName && !email && !password && !confirmPass && !termAndCondition) {
    throw new ApiError(400, "All Field are required");
  }

  const isExist = await User.findOne({ email: email });
  if (isExist) {
    throw new ApiError(409, "Email already exist!");
  }

  if (password !== confirmPass) {
    throw new ApiError(400, "Password and confirm password does not match");
  }
  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(password, salt);

  let imageFileName = "";
  if (req.files && req.files.image && req.files.image[0]) {
    imageFileName = `/media/${req.files.image[0].filename}`;
  }

  const emailVerifyCode = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;

  const user = await User.create({
    fullName,
    email,
    password: hashPassword,
    termAndCondition: JSON.parse(termAndCondition),
    emailVerifyCode,
    role: role,
    image: !imageFileName
      ? "https://img.freepik.com/free-photo/young-bearded-man-with-striped-shirt_273609-5677.jpg?size=626&ext=jpg&ga=GA1.1.1700460183.1708560000&semt=sph"
      : imageFileName,
  });

  if (userTimers.has(user?._id)) {
    clearTimeout(userTimers.get(user?._id));
  }
  const userTimer = setTimeout(async () => {
    try {
      user.oneTimeCode = null;
      await user.save();
      // Remove the timer reference from the map
      userTimers.delete(user?._id);
    } catch (error) {
      console.error(
        `Error updating email verify code for user ${user?._id}:`,
        error
      );
    }
  }, 180000); // 3 minutes in milliseconds

  // Store the timer reference in the map
  userTimers.set(user?._id, userTimer);

  const emailData = {
    email,
    subject: "Account Activation Email",
    html: `
                <h1>Hello, ${user?.fullName}</h1>
                <p>Your email verified code is <h3>${emailVerifyCode}</h3> to verify your email</p>
                <small>This Code is valid for 3 minutes</small>
              `,
  };

  emailWithNodemailer(emailData);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Register successfully! Please check your E-mail to verify.",
  });
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { emailVerifyCode, email } = req.body;

  if (!emailVerifyCode && !email) {
    throw new ApiError(400, "All Field are required");
  }

  const user = await User.findOne({ email: email });
  if (!user) {
    throw new ApiError(404, "User Not Found");
  }

  if (user.emailVerifyCode !== emailVerifyCode) {
    throw new ApiError(410, "OTP Don't matched");
  }

  user.emailVerified = true;
  await user.save();
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Email Verified Successfully",
  });
});

exports.userLogin = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  if (!password && !email) {
    throw new ApiError(400, "All Field are required");
  }

  const user = await User.findOne({ email: email });
  if (!user) {
    throw new ApiError(204, "User not Found");
  }

  if (user.emailVerified === false) {
    throw new ApiError(401, "your email is not verified");
  }

  const ismatch = await bcrypt.compare(password, user.password);
  if (!ismatch) {
    throw new ApiError(401, "your credential doesn't match");
  }

  const token = jwt.sign({ userID: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your Are logged in successfully",
    data: user,
    token: token,
  });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(400, "User doesn't exists");
  }

  // Store the OTC and its expiration time in the database
  user.emailVerifyCode = emailVerifyCode;
  user.emailVerified = false;
  await user.save();

  // Prepare email for password reset
  const emailData = {
    email,
    subject: "Password Reset Email",
    html: `
        <h1>Hello, ${user.fullName}</h1>
        <p>Your Email verified Code is <h3>${emailVerifyCode}</h3> to reset your password</p>
        <small>This Code is valid for 3 minutes</small>
      `,
  };

  // Send email
  try {
    await emailWithNodemailer(emailData);
  } catch (emailError) {
    console.error("Failed to send verification email", emailError);
  }

  // Set a timeout to update the oneTimeCode to null after 1 minute
  setTimeout(async () => {
    try {
      user.emailVerifyCode = null;
      await user.save();
      console.log("emailVerifyCode reset to null after 3 minute");
    } catch (error) {
      console.error("Error updating EmailVerifyCode:", error);
    }
  }, 180000); // 3 minute in milliseconds

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Send email Verify Code Successfully",
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { email, password, confirmPassword } = req.body;
  const user = await User.findOne({ email: email });

  if (!user) {
    return sendResponse(res, 400, "User does not exist");
  }

  if (password !== confirmPassword) {
    return sendResponse(
      res,
      400,
      "Password and confirm password does not match"
    );
  }

  if (user.emailVerified === true) {
    const salt = await bcrypt.genSalt(10);
    const hashpassword = await bcrypt.hash(password, salt);
    user.password = hashpassword;
    user.emailVerifyCode = null;
    await user.save();

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Password Updated Successfully",
      data: user,
    });
  }
});

exports.changePassword = catchAsync(async (req, res) => {
  const { currentPass, newPass, confirmPass } = req.body;
  const user = await User.findById(req.user._id);

  if (!currentPass || !newPass || !confirmPass) {
    throw new ApiError(400, "All Fields are required");
  }

  const ismatch = await bcrypt.compare(currentPass, user.password);
  if (!ismatch) {
    throw new ApiError(400, "Current Password is Wrong");
  }

  if (currentPass == newPass) {
    throw new ApiError(400, "New password cannot be the same as old password");
  }

  if (newPass !== confirmPass) {
    throw new ApiError(400, "password and confirm password doesnt match");
  }

  const salt = await bcrypt.genSalt(10);
  const hashpassword = await bcrypt.hash(newPass, salt);
  await User.findByIdAndUpdate(req.user._id, {
    $set: { password: hashpassword },
  });

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password Changed Successfully",
  });
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  if (req.fileValidationError) {
    return res.status(400).json({ messege: req.fileValidationError });
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    return sendResponse(res, 204, "No User Found", user);
  }
  const { fullName, email, mobileNumber, location, about } = req.body;

  let imageFileName = "";
  if (req.files && req.files.image && req.files.image[0]) {
    imageFileName = `/media/${req.files.image[0].filename}`;
  }

  const fileName = user?.image?.split("/").pop();
  const filePath = path.join(__dirname, "..", "uploads", "media", fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  user.fullName = fullName ? fullName : user.fullName;
  user.email = email ? email : user?.email;
  user.mobileNumber = mobileNumber ? mobileNumber : user.mobileNumber;
  user.location = location ? location : user.location;
  user.about = about ? about : user.about;
  user.image = imageFileName ? imageFileName : user.image;
  await user.save();

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile Updated Successfully",
    data: user,
  });
});

exports.makeFollower = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const followers = await User.findById(id);
  if (!followers) {
    throw new ApiError(204, "No User Found");
  }

  const { userId } = req.body;
  const following = await User.findById(userId);
  if (!following) {
    throw new ApiError(204, "No User Found");
  }

  followers.followers.push(userId);
  await followers.save();

  following.following.push(id);
  await following.save();

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Make Following Successfully",
  });
});

exports.deleteAccount = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(204, "No User Found");
  }
  user.status = "DELETE";
  await user.save();
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Account Delete Successfully",
  });
});
