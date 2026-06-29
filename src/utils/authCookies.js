const ACCESS_TOKEN_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || 'accessToken';
const REFRESH_TOKEN_COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME || 'refreshToken';

const DEFAULT_ACCESS_TOKEN_TTL = '15m';
const DEFAULT_REFRESH_TOKEN_TTL = '7d';

const parseDurationToMs = (value, fallbackMs) => {
    if (typeof value === 'number') {
        return value;
    }

    if (!value || typeof value !== 'string') {
        return fallbackMs;
    }

    const match = value.trim().match(/^(\d+)\s*(ms|s|m|h|d)?$/i);
    if (!match) {
        return fallbackMs;
    }

    const amount = Number(match[1]);
    const unit = (match[2] || 'ms').toLowerCase();

    const multipliers = {
        ms: 1,
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };

    return amount * multipliers[unit];
};

const getAccessTokenTtl = () => process.env.ACCESS_TOKEN_EXPIRES_IN || DEFAULT_ACCESS_TOKEN_TTL;

const getRefreshTokenTtl = () => process.env.REFRESH_TOKEN_EXPIRES_IN || DEFAULT_REFRESH_TOKEN_TTL;

const getAccessTokenMaxAge = () => parseDurationToMs(
    getAccessTokenTtl(),
    15 * 60 * 1000
);

const getRefreshTokenMaxAge = () => parseDurationToMs(
    getRefreshTokenTtl(),
    7 * 24 * 60 * 60 * 1000
);

const getCookieBaseOptions = () => ({
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
});

const parseCookieHeader = (cookieHeader = '') => {
    return cookieHeader
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((cookies, part) => {
            const separatorIndex = part.indexOf('=');
            if (separatorIndex === -1) {
                return cookies;
            }

            const name = part.slice(0, separatorIndex);
            const rawValue = part.slice(separatorIndex + 1);

            try {
                cookies[name] = decodeURIComponent(rawValue);
            } catch (error) {
                cookies[name] = rawValue;
            }

            return cookies;
        }, {});
};

const getCookieValue = (cookieHeader, name) => {
    const cookies = parseCookieHeader(cookieHeader);
    return cookies[name];
};

const getBearerToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.split(' ')[1];
};

const getAccessTokenFromRequest = (req) => {
    return getBearerToken(req) || getCookieValue(req.headers.cookie, ACCESS_TOKEN_COOKIE_NAME);
};

const getRefreshTokenFromRequest = (req) => {
    return getCookieValue(req.headers.cookie, REFRESH_TOKEN_COOKIE_NAME);
};

const setAuthCookies = (res, session) => {
    const baseOptions = getCookieBaseOptions();

    res.cookie(ACCESS_TOKEN_COOKIE_NAME, session.accessToken, {
        ...baseOptions,
        maxAge: getAccessTokenMaxAge(),
        path: '/',
    });

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, session.refreshToken, {
        ...baseOptions,
        maxAge: Math.max(0, session.refreshTokenExpiresAt.getTime() - Date.now()),
        path: '/api/auth',
    });
};

const clearAuthCookies = (res) => {
    const baseOptions = getCookieBaseOptions();

    res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, {
        ...baseOptions,
        path: '/',
    });

    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
        ...baseOptions,
        path: '/api/auth',
    });
};

module.exports = {
    ACCESS_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_NAME,
    getAccessTokenTtl,
    getRefreshTokenMaxAge,
    getAccessTokenFromRequest,
    getRefreshTokenFromRequest,
    getCookieValue,
    setAuthCookies,
    clearAuthCookies,
};
