const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { chatRepository } = require('../repositories');

let io = null;

const getAllowedOrigins = () => {
    const configuredOrigins = process.env.CLIENT_URL || process.env.FRONTEND_URL;
    if (!configuredOrigins) {
        return '*';
    }
    return configuredOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
};

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: getAllowedOrigins(),
            credentials: true
        }
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;
            if (!token) {
                return next(new Error('Unauthorized'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (!user || !user.is_active) {
                return next(new Error('Unauthorized'));
            }

            socket.user = user;
            return next();
        } catch (error) {
            return next(new Error('Unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        socket.join(`user:${socket.user.id}`);
        socket.emit('socket:ready', { userId: socket.user.id });

        socket.on('conversation:join', async ({ conversationId }) => {
            if (!conversationId) return;

            const isParticipant = await chatRepository.isParticipant(conversationId, socket.user.id);
            if (isParticipant) {
                socket.join(`conversation:${conversationId}`);
            }
        });

        socket.on('conversation:leave', ({ conversationId }) => {
            if (!conversationId) return;
            socket.leave(`conversation:${conversationId}`);
        });
    });

    return io;
};

const getIO = () => io;

const emitToUser = (userId, event, payload) => {
    if (!io) return;
    io.to(`user:${userId}`).emit(event, payload);
};

const emitToConversation = (conversationId, event, payload) => {
    if (!io) return;
    io.to(`conversation:${conversationId}`).emit(event, payload);
};

module.exports = {
    initializeSocket,
    getIO,
    emitToUser,
    emitToConversation
};
