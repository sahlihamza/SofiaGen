require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("./logger");

mongoose.set("bufferCommands", false);

const resolveMongoUri = () => {
  const configured = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (configured) {
    return withCharset(configured);
  }

  if (process.env.DOCKER_CONTAINER === "true" || process.env.IS_DOCKER === "true") {
    return "mongodb://mongo:27017/sofiagen?charset=utf8";
  }

  return "mongodb://127.0.0.1:27017/sofiagen?charset=utf8";
};

const withCharset = (uri) => {
  if (!uri) return uri;
  return uri.includes("charset") ? uri : `${uri}${uri.includes("?") ? "&" : "?"}charset=utf8`;
};

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      logger.info("mongodb connection already established");
      return;
    }

    const mongoUri = resolveMongoUri();
    await mongoose.connect(mongoUri, {
      useFindAndModify: false,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    logger.info(`mongodb connection success! ${mongoUri}`);
  } catch (err) {
    logger.error(`mongodb connection failed! ${err.message}`);
    throw err;
  }
};

const waitForMongo = async (retries = 10, delayMs = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    if (mongoose.connection.readyState === 1) {
      return true;
    }

    try {
      await connectDB();
    } catch (error) {
      logger.warn(`MongoDB connection attempt ${attempt}/${retries} failed: ${error.message}`);
    }

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB did not become ready in time");
  }

  return true;
};

const withRetry = async (operation, label, retries = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await waitForMongo();
      return await operation();
    } catch (error) {
      lastError = error;
      logger.warn(`${label} attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  throw lastError;
};

module.exports = {
  connectDB,
  waitForMongo,
  withRetry,
};
