// src/socks5.js
const net = require("net");
const {
  VER, METHODS, AUTH_SUBNEGOTIATION_VER,
  CMD, REP, DEFAULTS
} = require("./constants");
const { readExact, readUserPass, readAddr, encodeBindAddr } = require("./utils");

function createSocks5Server({ logger, user, pass }) {
  const log = logger;

  return net.createServer((client) => {
    client.setTimeout(DEFAULTS.IDLE_TIMEOUT_MS);
    client.setNoDelay(true);

    const state = {
      stage: "GREETING",
      buf: Buffer.alloc(0),
      remote: null,
    };

    const t = setTimeout(() => {
      log.warn("Handshake timeout");
      client.destroy();
    }, DEFAULTS.HANDSHAKE_TIMEOUT_MS);

    client.on("data", (chunk) => {
      // Cap buffer growth during handshake
      if (state.buf.length + chunk.length > DEFAULTS.MAX_BUFFER_BYTES) {
        log.warn("Handshake buffer cap exceeded");
        return client.destroy();
      }
      state.buf = Buffer.concat([state.buf, chunk]);
      processState();
    });

    client.on("timeout", () => {
      log.warn("Client idle timeout");
      client.destroy();
    });

    client.on("error", (e) => {
      log.warn("Client error:", e.message);
      cleanup();
    });
    client.on("close", cleanup);

    function cleanup() {
      clearTimeout(t);
      if (state.remote && !state.remote.destroyed) state.remote.destroy();
      state.remote = null;
    }

    function writeSafe(buf) {
      try { client.write(buf); } catch {}
    }

    function reply(rep, bindHost = "0.0.0.0", bindPort = 0) {
      const bnd = encodeBindAddr(bindHost, bindPort);
      writeSafe(Buffer.concat([Buffer.from([VER, rep, 0x00]), bnd]));
    }

    function processState() {
      while (true) {
        if (state.stage === "GREETING") {
          const head = readExact(state, 2); // VER, NMETHODS
          if (!head) return;
          const ver = head[0];
          const nmethods = head[1];
          const methods = readExact(state, nmethods);
          if (!methods) { state.buf = Buffer.concat([head, state.buf]); return; }

          if (ver !== VER) {
            writeSafe(Buffer.from([VER, METHODS.NO_ACCEPTABLE]));
            return client.end();
          }
          // Require USER/PASS
          if (!Array.from(methods).includes(METHODS.USERPASS)) {
            writeSafe(Buffer.from([VER, METHODS.NO_ACCEPTABLE]));
            return client.end();
          }
          writeSafe(Buffer.from([VER, METHODS.USERPASS]));
          state.stage = "AUTH";
          continue;
        }

        if (state.stage === "AUTH") {
          const cred = readUserPass(state);
          if (!cred) return;
          if (cred.ver !== AUTH_SUBNEGOTIATION_VER) {
            writeSafe(Buffer.from([AUTH_SUBNEGOTIATION_VER, 0x01]));
            return client.end();
          }
          const ok = cred.username === (user || "user") && cred.password === (pass || "pass");
          writeSafe(Buffer.from([AUTH_SUBNEGOTIATION_VER, ok ? 0x00 : 0x01]));
          if (!ok) return client.end();
          state.stage = "REQUEST";
          continue;
        }

        if (state.stage === "REQUEST") {
          const head = readExact(state, 4); // VER, CMD, RSV, ATYP
          if (!head) return;
          const ver = head[0];
          const cmd = head[1];
          const rsv = head[2];
          const atyp = head[3];
          if (ver !== VER || rsv !== 0x00) {
            reply(REP.GENERAL_FAILURE);
            return client.end();
          }

          // Put ATYP back then parse address
          state.buf = Buffer.concat([Buffer.from([atyp]), state.buf]);
          const dst = readAddr(state);
          if (!dst) {
            // restore if partial
            state.buf = Buffer.concat([head, state.buf]);
            return;
          }

          if (cmd !== CMD.CONNECT) {
            reply(REP.CMD_NOT_SUPPORTED);
            return client.end();
          }

          log.info(`CONNECT ${client.remoteAddress}:${client.remotePort} -> ${dst.host}:${dst.port}`);

          const remote = net.connect({ host: dst.host, port: dst.port }, () => {
            // Success
            reply(REP.SUCCEEDED, remote.localAddress || "0.0.0.0", remote.localPort || 0);
            client.pipe(remote);
            remote.pipe(client);
            state.stage = "TUNNEL";
          });

          state.remote = remote;

          remote.setTimeout(DEFAULTS.IDLE_TIMEOUT_MS);
          remote.on("timeout", () => {
            log.warn("Remote idle timeout");
            client.destroy();
          });

          remote.on("error", (e) => {
            log.warn("Remote error:", e.code || e.message);
            const rep =
              e.code === "ECONNREFUSED" ? REP.CONNECTION_REFUSED :
              e.code === "ENOTFOUND"    ? REP.HOST_UNREACHABLE :
              e.code === "EHOSTUNREACH"  ? REP.HOST_UNREACHABLE :
              e.code === "ENETUNREACH"   ? REP.NETWORK_UNREACHABLE :
              REP.GENERAL_FAILURE;
            reply(rep);
            client.end();
          });

          remote.on("close", () => client.end());
          continue;
        }

        // TUNNEL: raw piping; nothing to parse.
        return;
      }
    }
  });
}

module.exports = { createSocks5Server };
