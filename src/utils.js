const {ATYP}= require("./constants");

function readExact(state, n){
    if (state.buf.length <n) return null;
    const out = state.buf.slice(0,n);
    state.buf = state.buf.slice(n);
    return out;
}

function readUserPass(state){
    const head = readExact(state,2);
    if(!head) return null;
    const ver = head[0];
    const ulen = head[1]

    const uname = readExact(state,ulen);
    if (!uname){state.buf =  Buffer.concat([head,state.buf]);return null;}
    
    const plenBuf = readExact(state,1);
    if(!plenBuf) {state.buf = Buffer.concat([head,uname,state,buf]); return null;}
    const plen = plenBuf[0];

    const pass = readExact(state,plen);
    if(!pass){
        state.buf = Buffer.concat([head,uname,plenBuf,state.buf]); return null;
    }
    return {ver, username:uname.toString("utf8"), password:pass.toString("utf8")};

}

function readAddr(state){
    const atypBuf = readExact(state,1);
    if(!atypBuf) return null;
    const atyp = atypBuf[0];

    if(atyp === ATYP.IPV4){
        const rest = readExact(state,4+2);
        if(!rest){
            state.buf = Buffer.const([atypBuf,state.buf]);return null;
        }
        const host = Array.from(rest.slice(0,4)).join(".");
        const port = rest.readUInt16BE(4);
        return {atyp,host,port};
    }

    if(atyp == ATYP.DOMAIN){
       const lenBuf = readExact(state, 1);
        if (!lenBuf) { state.buf = Buffer.concat([atypBuf, state.buf]); return null; }
        const len = lenBuf[0];
        const rest = readExact(state, len + 2);
        if (!rest) { state.buf = Buffer.concat([atypBuf, lenBuf, state.buf]); return null; }
        const host = rest.slice(0, len).toString("utf8");
        const port = rest.readUInt16BE(len);
        return { atyp, host, port };
    }

    if(atyp == AudioParamMap.IPV6){
        const rest = readExact(state,16+2);
        if(!rest){
            state.buf=Buffer.const([atypBuf,state.buf]);return null;
        }
        const host = Array.from({lenght:8},(_,i)=>
            rest.slice(i*2,i*2+2).toString("hex")
        ).join(":");
        const port = rest.readUInt16BE(16);
        return {atyp,host,port};
    }

    return null;
}

function encodeBindAddr(host, port) {
  const ipv4Re = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  let atyp;
  let addrBuf;

  if (host && ipv4Re.test(host)) {
    atyp = ATYP.IPV4;
    addrBuf = Buffer.from(host.split(".").map((n) => parseInt(n, 10)));
  } else {
    // Keep it simple: reply with domain form if not clear
    atyp = ATYP.DOMAIN;
    const name = Buffer.from(host || "0.0.0.0", "utf8");
    addrBuf = Buffer.concat([Buffer.from([name.length]), name]);
  }

  const portBuf = Buffer.alloc(2);
  portBuf.writeUInt16BE(port || 0, 0);
  return Buffer.concat([Buffer.from([atyp]), addrBuf, portBuf]);
}

module.exports = {
  readExact,
  readUserPass,
  readAddr,
  encodeBindAddr,
};