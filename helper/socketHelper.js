const Deal = require("../models/deal.model");
const Message = require("../models/message.model");

const socketHandler = (io) => {

    io.on("connection", (socket) => {
        console.log(`Socket connected with ${socket.id}`);
        socket.on("joinChat", (conversationId)=>{
            socket.join(conversationId)
        })
       

        //send and get message
        socket.on("sendMessage", async({ conversationId, senderId, text, deal }) => {

            const type =  Object.keys(deal).length ? "Deal" : "Text";

            // save to DB
            const message = {
                conversationId: conversationId,
                sender: senderId,
                text: text,
                deal: type === "Deal" ? {...deal, status: "Pending"} : null ,
                messageType: type
            }

            const response =  await Message.create(message);
            if(response.deal !== null){
                await Deal.create({...response.deal, conversationId: conversationId})
            }
            io.to(conversationId).emit("getMessage", response);
           
        });

        socket.on("changeStatus", async({messageId, status, conversationId})=>{
            const message  = await Message.findOneAndUpdate({_id: messageId}, {"deal.status": status}, {new: true});
            io.to(conversationId).emit("getMessage", message);
            await Deal.findOneAndUpdate(
                {conversationId: conversationId}, 
                {$set: {status : status}},
                {new: true}
            )
        })

        //when disconnect
        socket.on("disconnect", () => {
            console.log("a user disconnected!");     
        });

    });
};

module.exports = socketHandler;
