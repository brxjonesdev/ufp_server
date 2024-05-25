const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const activeRooms = new Set();
const usersInRooms = {}; // to store users in each room
const roomDetails = {}; // to store room details like name and owner
const lockedRooms = new Set();


app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
        for (const code in usersInRooms) {
            const users = usersInRooms[code].users;
            const index = users.findIndex(user => user.id === socket.id);
            if (index !== -1) {
                const username = users[index].username;
                users.splice(index, 1);
                io.to(code).emit('user-left', {
                    username,
                    usersInRoom: usersInRooms[code],
                });
                if (users.length === 0) {
                    activeRooms.delete(code);
                    delete usersInRooms[code];
                    delete roomDetails[code];
                }
            }
        }
    });
    
    socket.on('create-room', (roomInfo) =>{
        const {owner, name, code} = roomInfo;
        const roomCode = code.toString();
        if(activeRooms.has(code)){
            socket.emit('room-exists', code);
        } else {
            activeRooms.add(code);
            usersInRooms[code] = {
                owner: owner,
                users: [{username: owner, id: socket.id}]
            };;
            roomDetails[code] = {name, owner, code};
            console.log(`Room created with code: ${roomCode} by ${owner}`);
            socket.join(roomCode);
            console.log(`${owner}/${socket.id} joined room ${roomCode}`);
            socket.emit('room-created', {
                details: roomDetails[code],
                usersInRoom: usersInRooms[code],
            });
        }
    })

    socket.on('join-room', (roomInfo) => {
        const {username, code} = roomInfo;
        const roomCode = code.toString();
        if(activeRooms.has(code)){
            usersInRooms[code].users.push({username, id: socket.id});
            console.log(`${username}/${socket.id} joined room ${roomCode}`);
            socket.join(roomCode);
            socket.emit('room-joined', {
                details: roomDetails[code],
                usersInRoom: usersInRooms[code],
            });
            io.to(roomCode).emit('user-joined', {
                usersInRoom: usersInRooms[code],
            });
        } else {
            socket.emit('room-not-found', code);
        }
    });
});

server.listen(3001, () => {
    console.log('Server is running on port 3001');
});
