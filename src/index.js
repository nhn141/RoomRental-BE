require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initializeSocket } = require('./socket/socket');

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

initializeSocket(server);

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
