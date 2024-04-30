const Message = require("../models/message.model");

const socketHandler = (io) => {
    let users = [];

    const addUser = (userId, socketId) => {
        console.log(userId)
        !users.some((user) => user.userId === userId) && users.push({ userId, socketId });
    };

    const removeUser = (socketId) => {
        users = users.filter((user) => user.socketId !== socketId);
    };

    const getUser = (userId) => {
        return users.find((user) => user.userId === userId);
    };



    io.on("connection", (socket) => {
        console.log(`Socket connected with ${socket.id}`);
        
        //take userId and socketId from user
        socket.on("addUser", ({userId}) => {
            addUser(userId, socket.id);
            io.emit("getUsers", users);
        });


        //send and get message
        socket.on("sendMessage", async({ conversationId, senderId, receiverId, text }) => {
            const user = getUser(receiverId);
            io.to(user.socketId).emit("getMessage", { conversationId, senderId, receiverId, text });

            // save to DB
            const message = {
                conversationId: conversationId,
                sender: senderId,
                text: text
            }
            await Message.create(message);


        });

        //when disconnect
        socket.on("disconnect", () => {
            console.log("a user disconnected!");
            removeUser(socket.id);
            io.emit("getUsers", users);
        });

    });
}

module.exports = socketHandler;