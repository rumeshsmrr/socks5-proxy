function makeLogger (level = "info"){
    const levels = ["debug","info","warn","error"];
      const current = levels.indexOf(level);

      function shouldLog(l) {

    return levels.indexOf(l) >= current;
  }

    return{
        debug: (...a) => shouldLog("debug") && console.log("[debug]", ...a),
        info: (...a) => shouldLog("info") && console.log("[info]", ...a),
        warn: (...a) => shouldLog("warn") && console.log("[warn]", ...a),
        error: (...a) => shouldLog("error") && console.log("[error]", ...a)
    }
}

module.exports= {makeLogger};