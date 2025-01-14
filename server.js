const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket communication for signaling
io.on('connection', (socket) => {
    console.log('A user connected'); // ログ: クライアントが接続した

    // Forward messages to other users
    socket.on('message', (message) => {
        console.log('Relaying message:', message); // ログ: メッセージ受信と転送
        socket.broadcast.emit('message', message); // 他のクライアントに転送
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected'); // ログ: クライアントが切断
    });
});

// Use environment variable for port or default to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
