const jwt = require("jsonwebtoken");
const logger = require("../config/logger");
const User = require("../models/User");
const Customer = require("../models/Customer");

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

let io = null;

// Cache of active sessions: socketId -> { userId, customerId, role, storeIds, storeId, roles, joinedRooms }
// In production this should be backed by Redis; the in-process Map is sufficient for a
// single-instance deployment and keeps socket lifecycle management simple.
const authenticatedSockets = new Map();

const buildCorsOptions = () => {
  const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    origin: (origin, callback) => {
      const isProduction = process.env.NODE_ENV === "production";

      // No origin  non-browser client (e.g. socket.io client, curl). Allow.
      if (!origin) return callback(null, true);

      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return callback(null, true);
      }

      // In production, never fall back to localhost/127.0.0.1.
      if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  };
};

/**
 * Verifies the JWT from the socket handshake and resolves the caller's identity.
 *
 * Security: we NEVER trust `socket.handshake.auth` blindly  the token must be
 * verified against the DB so that revoked/deleted/inactive accounts cannot
 * connect even with a valid (but stale) JWT.
 */
const authenticateSocket = async (socket) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return { userId: null, customerId: null };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // --- User path ---
    if (decoded.userId) {
      const user = await User.findOne({
        _id: decoded.userId,
        deletedAt: null,
        status: { $in: ["Active", "active"] },
      })
        .select("_id storeIds currentStoreId")
        .lean();

      if (!user) return { userId: null, customerId: null };

      return {
        userId: String(user._id),
        customerId: null,
        roles: decoded.roles || [],
        storeIds: (user.storeIds || []).map(String),
        storeId: user.currentStoreId ? String(user.currentStoreId) : (user.storeIds?.[0] ? String(user.storeIds[0]) : null),
      };
    }

    // --- Customer path ---
    // Customer tokens carry `_id` / `id` (see config/jwt.js signInToken).
    const customerId = decoded._id || decoded.id || decoded.customerId;
    if (customerId) {
      const customer = await Customer.findOne({
        _id: customerId,
        deletedAt: null,
        status: "active",
      })
        .select("_id storeId")
        .lean();

      if (!customer) return { userId: null, customerId: null };

      return {
        userId: null,
        customerId: String(customer._id),
        storeId: customer.storeId ? String(customer.storeId) : null,
      };
    }

    return { userId: null, customerId: null };
  } catch (err) {
    logger.warn(`socket: JWT verification failed for ${socket.id}: ${err.message}`);
    return { userId: null, customerId: null };
  }
};

const setServer = async (httpServer) => {
  const { Server } = require("socket.io");
  io = new Server(httpServer, {
    cors: buildCorsOptions(),
    maxHttpBufferSize: 1e6, // 1 MB
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // --- Global authentication middleware ---
  io.use(async (socket, next) => {
    const identity = await authenticateSocket(socket);

    if (!identity.userId && !identity.customerId) {
      // Allow anonymous connections (e.g. live-chat guest) but they cannot join
      // any authenticated room  the "join" handler below enforces this.
      socket.data.anon = true;
      return next();
    }

    socket.data.identity = identity;
    next();
  });

  io.on("connection", (socket) => {
    if (socket.data.anon) {
      logger.info(`socket: ${socket.id} connected anonymously`);
      return;
    }

    const identity = socket.data.identity;

    // --- Auto-join the identity-scoped room ---
    if (identity.userId) {
      const room = `user:${identity.userId}`;
      socket.join(room);
      authenticatedSockets.set(socket.id, {
        ...identity,
        joinedRooms: new Set([room]),
      });
      logger.info(`socket: ${socket.id} authenticated as user:${identity.userId}`);
    }

    if (identity.customerId) {
      const room = `customer:${identity.customerId}`;
      socket.join(room);
      authenticatedSockets.set(socket.id, {
        ...identity,
        joinedRooms: new Set([room]),
      });
      logger.info(`socket: ${socket.id} authenticated as customer:${identity.customerId}`);
    }

    // --- "join" handler with strict authorization ---
    socket.on("join", (room) => {
      if (typeof room !== "string") {
        logger.warn(`socket: ${socket.id} tried to join non-string room`);
        return;
      }

      const session = authenticatedSockets.get(socket.id);
      if (!session) {
        logger.warn(`socket: ${socket.id} tried to join "${room}" without authentication`);
        socket.emit("error:permission", { message: "Authentication required" });
        return;
      }

      // Users can only join their own user room.
      if (room.startsWith("user:") && room !== `user:${session.userId}`) {
        logger.warn(
          `= SECURITY: socket ${socket.id} tried to join unauthorized room ${room} ` +
          `(authenticated as user:${session.userId})`
        );
        socket.emit("error:permission", { message: "You cannot join this room" });
        return;
      }

      // Customers can only join their own customer room.
      if (room.startsWith("customer:") && room !== `customer:${session.customerId}`) {
        logger.warn(
          `= SECURITY: socket ${socket.id} tried to join unauthorized room ${room} ` +
          `(authenticated as customer:${session.customerId})`
        );
        socket.emit("error:permission", { message: "You cannot join this room" });
        return;
      }

      // Store / admin rooms require store access.
      if (room.startsWith("store:") || room.startsWith("admin:")) {
        const targetStoreId = room.replace("store:", "").replace("admin:", "");
        const authorizedStores = session.storeIds || [];
        if (!session.userId || !authorizedStores.includes(targetStoreId)) {
          logger.warn(
            `= SECURITY: socket ${socket.id} tried to join ${room} ` +
            `without store access (stores: ${JSON.stringify(authorizedStores)})`
          );
          socket.emit("error:permission", { message: "Store access required" });
          return;
        }
      }

      socket.join(room);
      session.joinedRooms.add(room);
      const size = io.sockets.adapter.rooms.get(room)?.size || 0;
      logger.info(`socket: ${socket.id} joined ${room} (${size} client(s) in room)`);
    });

    // --- "leave" handler ---
    socket.on("leave", (room) => {
      const session = authenticatedSockets.get(socket.id);
      if (!session) return;

      if (typeof room === "string" && session.joinedRooms.has(room)) {
        socket.leave(room);
        session.joinedRooms.delete(room);
        logger.info(`socket: ${socket.id} left ${room}`);
      }
    });

    // --- Disconnect handler ---
    socket.on("disconnect", (reason) => {
      authenticatedSockets.delete(socket.id);
      logger.info(`socket: ${socket.id} disconnected (${reason})`);
    });
  });

  return io;
};

const getServer = () => io;

const emitToUser = (userId, event, payload) => {
  if (!io || !userId) {
    logger.warn(`socket: cannot emit "${event}" (io initialized: ${Boolean(io)}, userId: ${userId})`);
    return;
  }
  const room = `user:${userId}`;
  const clientCount = io.sockets.adapter.rooms.get(room)?.size || 0;
  logger.info(`socket: emitting "${event}" to ${room} (${clientCount} client(s) in room)`);
  io.to(room).emit(event, payload);
};

const emitToCustomer = (customerId, event, payload) => {
  if (!io || !customerId) {
    logger.warn(`socket: cannot emit "${event}" to customer ${customerId}`);
    return;
  }
  const room = `customer:${customerId}`;
  const clientCount = io.sockets.adapter.rooms.get(room)?.size || 0;
  logger.info(`socket: emitting "${event}" to ${room} (${clientCount} client(s) in room)`);
  io.to(room).emit(event, payload);
};

/**
 * Broadcasts an event to all sockets that joined a given store room.
 */
const emitToStore = (storeId, event, payload) => {
  if (!io || !storeId) return;
  const room = `store:${storeId}`;
  io.to(room).emit(event, payload);
};

module.exports = {
  setServer,
  getServer,
  emitToUser,
  emitToCustomer,
  emitToStore,
};
