const Gig = require("../models/gig.model");
const User = require("../models/user.model");
const Video = require("../models/video.model");
const sendResponse = require("../shared/sendResponse");
const ApiError = require("../errors/ApiError");
const httpStatus = require("http-status");
const catchAsync = require("../shared/catchAsync");

exports.getAllVideo = catchAsync(async (req, res) => {
  const result = await Video.find()
    .sort({ createdAt: -1 })
    .populate(["artist"]);

  // Sending response for video metadata
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All video retrieved successfully",
    data: result,
  });

  // Streaming video data using fs.createReadStream
  result.forEach(async (vd) => {
    const video = vd.video;
    if (video && video.path) {
      const videoStream = fs.createReadStream(video.path);
      videoStream.on("open", () => {
        videoStream.pipe(res);
      });
      videoStream.on("error", (err) => {
        console.error("Error reading video file:", err);
        res.status(500).end("Internal Server Error");
      });
    }
  });
});

exports.createComment = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { userId, comment } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(204, "No User Found");
  }

  const result = await Video.findOneAndUpdate(
    { _id: id },
    { $push: { comments: { user: userId, comment } } },
    { new: true }
  );

  if (!result) {
    throw new ApiError(400, "Failed to post comment");
  }

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Comment post successfully",
    data: result,
  });
});

exports.createWishList = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { userId } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(204, "User not found");
  }

  const video = await Video.findById(id);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const index = video.wishList.findIndex(
    (wish) => wish.user.toString() === userId
  );

  if (index === -1) {
    video.wishList.push({ user: userId });
    await video.save();

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User added to wishlist",
      data: video,
    });
  } else {
    video.wishList.splice(index, 1);
    await video.save();

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User removed from wishlist",
      data: video,
    });
  }
});

exports.getWishListByUserId = catchAsync(async (req, res) => {
  const id = req.params.id;

  const result = await Video.find({ "wishList.user": id })
    .sort({
      createdAt: -1,
    })
    .select("gig video")
    .populate("gig");

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Wishlist retrieve successfully",
    data: result,
  });
});
