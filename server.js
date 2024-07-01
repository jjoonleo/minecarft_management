const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");
const path = require("path");
const request = require("request");
const { Server } = require("socket.io");
const { spawn } = require("node:child_process");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use("/public", express.static(path.join(__dirname, "/public")));
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

const http = require("http");
const server = http.createServer(app);
const io = new Server(server);

let mc_server = null;
let serverState = 0;

const whiteListFile = fs.readFileSync("./whitelist.json", "utf8");
let whitelist = JSON.parse(whiteListFile);

let playerList = whitelist.map((value) => {
  value["status"] = "offline";
  value["joinTime"] = null;
  return value;
});

console.log(playerList);

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("getState", (callback) => {
    callback(serverState, playerList);
  });

  socket.on("start_server", (fail) => {
    console.log("start_server");
    if (serverState == 1 && serverState == 2) {
      console.log("fail to start server");
      fail("서버가 이미 켜져 있습니다.");
      return;
    }

    mc_server = spawn("java -Xms2G -Xmx2G -jar paper-1.20.2-307.jar --nogui", {
      cwd: "/Users/jjoonleo/paperServer",
      shell: true,
    });

    mc_server.stdout.on("data", (data) => {
      try {
        data = data.toString();
        console.log(data);
        if (data.includes("players online")) {
          let playersList = data.split(": ").slice(1).split(", ");
          io.emit("playerList", playersList);
        } else if (data.includes("Closing Server")) {
          mc_server = null;
          io.emit("server_stopped");
          serverState = 0;
        } else if (data.includes("Done")) {
          io.emit("server_started");
          serverState = 1;
        } else if (data.includes("Failed to start")) {
          serverState = 0;
          io.emit("fail", "서버를 켜는데 에러가 발생하였습니다.", serverState);
        } else if (data.includes("joined the game")) {
          let playerID = data
            .split(" ")[2]
            .replace(
              /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
              ""
            );
          for (let i = 0; i < playerID.length; i++) {
            console.log(playerID[i]);
          }
          let player = playerList.find((e) => e["id"] == playerID);
          console.log(player);
          if (player) {
            player["status"] = "online";
            player["joinTime"] = Date();
            io.emit("playerList", playerList);
          }
        }
        else if (data.includes("left the game")) {
          let playerID = data
            .split(" ")[2]
            .replace(
              /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
              ""
            );
          for (let i = 0; i < playerID.length; i++) {
            console.log(playerID[i]);
          }
          let player = playerList.find((e) => e["id"] == playerID);
          console.log(player);
          if (player) {
            player["status"] = "offline";
            player["joinTime"] = null;
            io.emit("playerList", playerList);
          }
        }
      } catch (error) {
        console.log(error);
      }
    });
    serverState = 2;
    io.emit("success", "start_server");
  });

  socket.on("stop_server", (fail) => {
    if (serverState == 1) {
      console.log("stop_server");
      mc_server.stdin.write("stop");
      mc_server.stdin.end();
      serverState = 2;
      io.emit("success", "stop_server");
    } else {
      fail("서버가 이미 꺼져 있습니다.");
    }
  });
});

const PORT = process.env.PORT || 8000;

let router = express.Router();

app.get("/", (req, res) => {
  console.log("/");
  let serverStatus = "off";
  if (mc_server) {
    serverStatus = "on";
  }
  res.render("home");
});

app.get("/turnon", (req, res) => {
  console.log("turn on the server");

  command.stdin.write("stop");
  command.stdin.end();
});

app.get("/log", (req, res) => {
  console.log(req.query["text"].toString());
  res.send("success");
});

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
