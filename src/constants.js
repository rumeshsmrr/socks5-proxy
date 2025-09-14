// src/constants.js
module.exports = {
  VER: 0x05, // SOCKS5 version

  METHODS: {
    NO_AUTH: 0x00,
    USERPASS: 0x02,
    NO_ACCEPTABLE: 0xff,
  },

  CMD: {
    CONNECT: 0x01,
  },

  ATYP: {
    IPV4: 0x01,
    DOMAIN: 0x03,
    IPV6: 0x04,
  },

  REP: {
    SUCCEEDED: 0x00,
    GENERAL_FAILURE: 0x01,
    HOST_UNREACHABLE: 0x04,
    CMD_NOT_SUPPORTED: 0x07,
  },
};
