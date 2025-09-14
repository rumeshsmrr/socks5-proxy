//listen

const net = require("net");
const { makeLogger } = require("./logger");

console.log('env port',process.env.PORT)

const PORT = parseInt(process.env.PORT || "1080",10);
const HOST =  process.env.Host || '0.0.0.0';
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

const log = makeLogger(LOG_LEVEL);

console.log("port",PORT);
console.log("host",HOST);

const server = net.createServer((socket) =>{
    // console.log(`[cons] ${socket.remoteAddress}:${socket.remotePort}}`);
    log.info(`[cons] ${socket.remoteAddress}:${socket.remotePort}}`);
    socket.on('error',(e)=>console.log("[socket error]", e.message));
    socket.on('close',()=>console.log('[conn] closed'));
})

server.on("listening",()=>{
    // console.log(`SOCKS5 proxy (stub) listning on ${HOST}:${PORT}`);
    log.info(`SOCKS5 proxy (stub) listning on ${HOST}:${PORT}`);
})

server.on("error",(e) =>{
    // console.error("Server error",e.message);
    log.error("Server error",e.message)
    process.exit(1);
})

server.listen(PORT,HOST);