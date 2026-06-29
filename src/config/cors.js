const parseOrigins = (value) => {
    if (!value) {
        return [];
    }

    return value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
};

const getAllowedOrigins = () => {
    const configuredOrigins = [
        ...parseOrigins(process.env.CLIENT_URL),
        ...parseOrigins(process.env.FRONTEND_URL),
    ];

    const localOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ];

    return [...new Set([...configuredOrigins, ...localOrigins])];
};

const corsOptions = {
    credentials: true,
    origin(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        if (getAllowedOrigins().includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
};

module.exports = {
    corsOptions,
    getAllowedOrigins,
};
