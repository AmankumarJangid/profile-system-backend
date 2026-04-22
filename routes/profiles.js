const express = require("express");
const router = express.Router();
const Profile = require("../models/Profile");
const { upload, cloudinary } = require("../config/cloudinary");
const { profileValidation, validate } = require("../middleware/validation");

// GET /api/profiles — list all with optional search & pagination
router.get("/", async (req, res, next) => {
  try {
    const { search, page = 1, limit = 12, sort = "newest" } = req.query;
    const query = { isActive: true };

    if (search && search.trim()) {
      query.$text = { $search: search.trim() };
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name: { name: 1 },
    };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Profile.countDocuments(query);
    const profiles = await Profile.find(query)
      .sort(sortMap[sort] || sortMap.newest)
      .skip(skip)
      .limit(Number(limit))
      .select("-__v");

    res.json({
      success: true,
      data: profiles,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });

    
  } catch (err) {
    next(err);
  }
});

// GET /api/profiles/:id — get single profile
router.get("/:id", async (req, res, next) => {
  try {
    const profile = await Profile.findById(req.params.id).select("-__v");
    if (!profile || !profile.isActive) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

// POST /api/profiles — create profile
router.post(
  "/",
  upload.single("avatar"),
  profileValidation,
  validate,
  async (req, res, next) => {
    try {
      const { name, email, jobTitle, company, location, bio, phone, website, linkedin, github, twitter, skills } = req.body;

      const parsedSkills = skills
        ? Array.isArray(skills)
          ? skills
          : (() => { try { return JSON.parse(skills); } catch { return skills.split(",").map((s) => s.trim()).filter(Boolean); } })()
        : [];

      const profileData = {
        name, email, jobTitle, company, location, bio, phone, website, linkedin, github, twitter,
        skills: parsedSkills,
        avatar: req.file
          ? { url: req.file.path, publicId: req.file.filename }
          : { url: "", publicId: "" },
      };

      const profile = await Profile.create(profileData);
      res.status(201).json({ success: true, message: "Profile created successfully", data: profile });
    } catch (err) {
      // Delete uploaded image if DB save fails
      if (req.file?.filename) {
        await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
      }
      next(err);
    }
  }
);

// PUT /api/profiles/:id — update profile
router.put(
  "/:id",
  upload.single("avatar"),
  profileValidation,
  validate,
  async (req, res, next) => {
    try {
      const existing = await Profile.findById(req.params.id);
      if (!existing || !existing.isActive) {
        return res.status(404).json({ success: false, message: "Profile not found" });
      }

      const { name, email, jobTitle, company, location, bio, phone, website, linkedin, github, twitter, skills } = req.body;

      const parsedSkills = skills
        ? Array.isArray(skills)
          ? skills
          : (() => { try { return JSON.parse(skills); } catch { return skills.split(",").map((s) => s.trim()).filter(Boolean); } })()
        : existing.skills;

      const updateData = {
        name, email, jobTitle, company, location, bio, phone, website, linkedin, github, twitter,
        skills: parsedSkills,
      };

      if (req.file) {
        // Delete old image from Cloudinary
        if (existing.avatar?.publicId) {
          await cloudinary.uploader.destroy(existing.avatar.publicId).catch(() => {});
        }
        updateData.avatar = { url: req.file.path, publicId: req.file.filename };
      }

      const profile = await Profile.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).select("-__v");

      res.json({ success: true, message: "Profile updated successfully", data: profile });
    } catch (err) {
      if (req.file?.filename) {
        await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
      }
      next(err);
    }
  }
);

// DELETE /api/profiles/:id — soft delete
router.delete("/:id", async (req, res, next) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile || !profile.isActive) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    // Delete image from Cloudinary
    if (profile.avatar?.publicId) {
      await cloudinary.uploader.destroy(profile.avatar.publicId).catch(() => {});
    }

    await Profile.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: "Profile deleted successfully" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
