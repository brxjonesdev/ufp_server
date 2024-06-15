const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');

const activeRooms = new Set();
const usersInRooms = {}; // to store users in each room
const roomDetails = {}; // to store room details like name and owner
const lockedRooms = new Set();


const server = http.createServer(app);

const io = new Server(server);

io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);
    console.log('active rooms:', activeRooms);
    console.log('locked rooms:', lockedRooms);

    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
        for (const code in usersInRooms) {
            const users = usersInRooms[code].users;
            const index = users.findIndex(user => user.socketId === socket.id);
            if (index !== -1) {
                const username = users[index].userName;
                users.splice(index, 1);
                console.log(`${socket.id} left room ${code}`);
                io.to(code).emit('user-left', {
                    username,
                    usersInRoom: usersInRooms[code],
                });
                if (users.length === 0) {
                    console.log(`Room ${code} is empty, deleting room`);
                    activeRooms.delete(code);
                    lockedRooms.delete(code);
                    delete usersInRooms[code];
                    delete roomDetails[code];
                }
            }

            // if host leaves room, delete room
            if (roomDetails[code] && roomDetails[code].roomOwner === socket.id) {
                console.log(`Room ${code} owner left, deleting room`);
                activeRooms.delete(code);
                lockedRooms.delete(code);
                delete usersInRooms[code];
                delete roomDetails[code];
            }
        }
    });
    
    socket.on('create-room', (roomInfo) => {
        const { roomOwner, roomName, roomCode, users } = roomInfo.infoFromValues;

        if (activeRooms.has(roomCode)) {
            socket.emit('room-exists', roomCode);
            return;
        }
        activeRooms.add(roomCode.toString());
        usersInRooms[roomCode] = { users };
        roomDetails[roomCode] = { roomOwner, roomName };
        socket.join(roomCode.toString());
        console.log(`Room ${roomCode} created by ${roomOwner}`);
        console.log('Room details:', roomDetails[roomCode]);
        console.log('Users in room:', usersInRooms[roomCode]);
        console.log(`${roomOwner}/${socket.id} joined room ${roomCode} as owner`);
        io.to(roomCode).emit('room-created', roomInfo);

    });

    socket.on('join-room', (roomInfo) => {

        const { username, code } = roomInfo;
        const codeString = code.toString();

        if (!activeRooms.has(code.toString())) {
            socket.emit('room-not-found', code);
            return;
        }

        if (lockedRooms.has(code.toString())) {
            socket.emit('room-locked', code.toString());
            return;
        }

        const user = { userName: username, socketId: socket.id, isOwner: false };
        usersInRooms[code].users.push(user);
        socket.join(codeString);
        console.log(`${username}/${socket.id} joined room ${code}`);
        io.to(codeString).emit('user-joined', {
            username,
            roomDetails: roomDetails[code],
            usersInRoom: usersInRooms[code],
        });

    });

    socket.on('toggle-room-lock', (code) => {
        const roomCode = code.toString();
        if (lockedRooms.has(roomCode)) {
            console.log(`Room ${roomCode} unlocked`);
            lockedRooms.delete(roomCode);
        } else {
            console.log(`Room ${roomCode} locked`);
            lockedRooms.add(roomCode);
        }
        io.to(roomCode).emit('room-locked-toggled', lockedRooms.has(roomCode));
    });

    socket.on("simulate-users", (roomCode)=> {
        const codeString = roomCode.toString();
        if (!activeRooms.has(codeString)) {
            socket.emit('room-not-found', codeString);
            return;
        }
        if (lockedRooms.has(codeString)) {
            socket.emit('room-locked', codeString);
            return;
        }
        const userOne = { userName: "Wendy", socketId: "user1", isOwner: false };
        const userTwo = { userName: "Yeri", socketId: "user2", isOwner: false };
        const userThree = { userName: "Joy", socketId: "user3", isOwner: false };
        const userFour = { userName: "Seulgi", socketId: "user4", isOwner: false };
        console.log('Simulating users joining room', codeString);
        setTimeout(() => {
            usersInRooms[codeString].users.push(userOne);
            console.log(`${userOne.userName}/${userOne.socketId} joined room ${codeString}`);
            io.to(codeString).emit('user-joined', {
                username: userOne.userName,
                roomDetails: roomDetails[codeString],
                usersInRoom: usersInRooms[codeString],
            });
        }, 3000);
        setTimeout(() => {
            usersInRooms[codeString].users.push(userTwo);
            console.log(`${userTwo.userName}/${userTwo.socketId} joined room ${codeString}`);
            io.to(codeString).emit('user-joined', {
                username: userTwo.userName,
                roomDetails: roomDetails[codeString],
                usersInRoom: usersInRooms[codeString],
            });
        }, 6000);
        setTimeout(() => {
            usersInRooms[codeString].users.push(userThree);
            console.log(`${userThree.userName}/${userThree.socketId} joined room ${codeString}`);
            io.to(codeString).emit('user-joined', {
                username: userThree.userName,
                roomDetails: roomDetails[codeString],
                usersInRoom: usersInRooms[codeString],
            });
        }, 9000);
        setTimeout(() => {
            usersInRooms[codeString].users.push(userFour);
            console.log(`${userFour.userName}/${userFour.socketId} joined room ${codeString}`);
            io.to(codeString).emit('user-joined', {
                username: userFour.userName,
                roomDetails: roomDetails[codeString],
                usersInRoom: usersInRooms[codeString],
            });
        }, 12000);
    });

    socket.on("start-game", (roomCode) => {
        const codeString = roomCode.toString();
        if (!activeRooms.has(codeString)) {
            socket.emit('room-not-found', codeString);
            console.log('Room not found');
            return;
        }
        // lock the room if it is not already locked
        if (!lockedRooms.has(codeString)) {
            lockedRooms.add(codeString);
            console.log(`Room ${codeString} locked`);
            io.to(codeString).emit('room-locked-toggled', true);
        } else{
            console.log(`Room ${codeString} already locked`);
        }
        // Shuffle the users in the room
        const shuffledUsers = usersInRooms[codeString].users;

        // add a an order property to each user
        shuffledUsers.forEach((user, index) => {
            user.order = index;
        });

        // shuffle the users
        shuffledUsers.sort(() => Math.random() - 0.5);

        io.to(codeString).emit('game-started', shuffledUsers);
    })

    socket.on("start-voting", (roomCode) => {
        const codeString = roomCode.toString();
        
        // Send an event to the first user in the shuffled users array
        const shuffledUsers = usersInRooms[codeString].users;
        const firstUser = shuffledUsers[0];
        io.to(firstUser.socketId).emit('is-voting');
        console.log(`User ${firstUser.userName} is voting`);

        // Send an event to all other users in the room
        shuffledUsers.slice(1).forEach(user => {
            io.to(user.socketId).emit('is-not-voting');
            console.log(`User ${user.userName} is not voting`);
        });
    })

    socket.on('user-voted', (data) => {
        const { roomCode, choice, voter } = data;
        const codeString = roomCode.toString();

        // add the vote to the votes array pf the room
        if (!roomDetails[codeString].votes) {
            roomDetails[codeString].votes = [];
            roomDetails[codeString].votes.push({
                voter: socket.id,
                choice,
            });
        } else{
            roomDetails[codeString].votes.push({
                voter: voter,
                choice,
            });
        }

        // Send an event to the next user in the shuffled users array
        const shuffledUsers = usersInRooms[codeString].users;
        const currentUser = shuffledUsers.find(user => user.socketId === socket.id);
        const currentUserIndex = shuffledUsers.indexOf(currentUser);
        const nextUser = shuffledUsers[currentUserIndex + 1];
        if (nextUser) {
            io.to(nextUser.socketId).emit('is-voting');
            console.log(`User ${nextUser.userName} is voting`);
        }
        // if there is no next user, send an event to all users to reveal the votes and move to the next round
        else{
            io.to(codeString).emit('votes-revealed', roomDetails[codeString].votes)
            console.log('Votes revealed');
            // clear the votes array
        }
    })
});

server.listen(3001, () => {
    console.log('Server is running on port 3001');
});
