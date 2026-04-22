require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const profileRoutes = require("./routes/profiles");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Connect DB
connectDB();

// Security
app.use(helmet());

// 1. Get origins from env, split by comma, and trim any accidental spaces
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map(origin => origin.trim());
// CORS
app.use(
  cors({
    origin: (origin , callback ) => {
      if( !origin || allowedOrigins.includes(origin)){
        callback(null, true);
      }
      else{
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

// Logging
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// To make trust the proxy request and redirect to secure proxy
app.enable('trust proxy');

app.use((req, res, next) =>{
  if( req.secure || req.header['x-forwarded-proto'  ] === 'https'){
    next();
  }
  else{
    res.redirect(`https://${req.headers.host}${req.url}`);
  }
})

// Routes
app.use("/api/profiles", profileRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server is running", timestamp: new Date().toISOString() });
});

// 404
app.use("*", (req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
});

module.exports = app;
