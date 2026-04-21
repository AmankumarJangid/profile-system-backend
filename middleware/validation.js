const { body, validationResult } = require("express-validator");

const profileValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 60 }).withMessage("Name must be 2–60 characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email")
    .normalizeEmail(),

  body("jobTitle")
    .trim()
    .notEmpty().withMessage("Job title is required")
    .isLength({ max: 80 }).withMessage("Job title cannot exceed 80 characters"),

  body("company")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 80 }).withMessage("Company cannot exceed 80 characters"),

  body("location")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 80 }).withMessage("Location cannot exceed 80 characters"),

  body("bio")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage("Bio cannot exceed 500 characters"),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
    .withMessage("Please enter a valid phone number"),

  body("website")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^https?:\/\/.+/)
    .withMessage("Website must start with http:// or https://"),

  body("skills")
    .optional()
    .customSanitizer((val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try { return JSON.parse(val); } catch { return val.split(",").map((s) => s.trim()).filter(Boolean); }
    })
    .isArray({ max: 10 }).withMessage("Cannot have more than 10 skills"),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array().map((e) => e.msg),
    });
  }
  next();
};

module.exports = { profileValidation, validate };
