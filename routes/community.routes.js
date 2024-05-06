const express = require("express");
const auth = require("../middlewares/auth");
const { USER_ROLE } = require("../enums/user");
const {
  createCommunity,
  getCommunity,
  removeCommunityMember,
  updateCommunity,
} = require("../controllers/community.controller");
const router = express.Router();

router.post("/create-community", auth(USER_ROLE.USER), createCommunity);
router.patch("/remove-member/:id", auth(USER_ROLE.USER), removeCommunityMember);
router.patch("/:id", auth(USER_ROLE.USER), updateCommunity);
router.get("/", auth(USER_ROLE.USER, USER_ROLE.ARTIST), getCommunity);

module.exports = router;
