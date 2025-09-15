# What I had to learn
I reviewed the SOCKS5 protocol (RFC 1928 and RFC 1929) and learned how the handshake, authentication, and CONNECT commands work. I also had to carefully study how to parse byte streams in Node.js using only the standard net library, which was new for me. This required me to understand how to manage state across GREETING, AUTH, REQUEST, and TUNNEL phases.

## Personal connection
I had done a small server implementation in my academic lab sessions before, but for this assignment I needed to recall those experiences and study further to build something more complete. That prior exposure helped me understand socket basics, but I still had to deepen my knowledge by reading protocol specifications and experimenting with curl to test different cases.

# How I approached debugging
For debugging, I relied heavily on structured logging with log levels, which made it easy to trace the handshake stages. I also tested using both curl and a local echo server to confirm that traffic was being tunneled correctly. When issues came up, like port permission errors on Windows or typos in template strings, I solved them step by step with trial runs and adjustments.

# What I would improve with more time
If I had more time, I would add UDP Associate and Bind support, implement stronger IPv6 handling, and write unit tests for each parser. I would also package the proxy in a Docker container and add basic security features such as rate limiting and IP allow/deny lists.