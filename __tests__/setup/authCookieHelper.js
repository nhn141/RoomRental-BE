const getAccessTokenCookieValue = (response) => {
    const accessCookie = (response.headers['set-cookie'] || []).find((cookie) => cookie.startsWith('accessToken='));
    return accessCookie?.split(';')[0].split('=').slice(1).join('=');
};

module.exports = {
    getAccessTokenCookieValue,
};
