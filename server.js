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
    console.log('A user connected');

    // Forward messages to other users
    socket.on('message', (message) => {
        socket.broadcast.emit('message', message); // Send to all other users
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Use environment variable for port or default to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
