/*
To test:
Open serveral browsers at http://localhost:3000/canvasWithTimer.html
//Cntl+C to stop server
*/

const app = require("http").createServer(handler) //need to http
const io = require('socket.io')(app) //wrap server app in socket io capability
const fs = require("fs") //need to read static files
const url = require("url") //to parse url strings
const PORT = process.env.PORT || 3000
app.listen(PORT) //start server listening on PORT

const ROOT_DIR = "html" //dir to serve static files from

const MIME_TYPES = {
  css: "text/css",
  gif: "image/gif",
  htm: "text/html",
  html: "text/html",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "application/javascript",
  json: "application/json",
  png: "image/png",
  svg: "image/svg+xml",
  txt: "text/plain"
}

function get_mime(filename) {
  for (let ext in MIME_TYPES) {
    if (filename.indexOf(ext, filename.length - ext.length) !== -1) {
      return MIME_TYPES[ext]
    }
  }
  return MIME_TYPES["txt"]
}

function handler(request, response) {
    let urlObj = url.parse(request.url, true, false)
    console.log("\n============================")
    console.log("PATHNAME: " + urlObj.pathname)
    console.log("REQUEST: " + ROOT_DIR + urlObj.pathname)
    console.log("METHOD: " + request.method)

        fs.readFile(ROOT_DIR + urlObj.pathname, function(err, data) {
          if (err) {
            //report error to console
            console.log("ERROR: " + JSON.stringify(err))
            //respond with not found 404 to client
            response.writeHead(404)
            response.end(JSON.stringify(err))
            return
          }
          response.writeHead(200, {
            "Content-Type": get_mime(urlObj.pathname)
          })
          response.end(data)
        })

}
let clientsCounter = 0
let serverCurlings = []
//properties of a client: clientNum, charactor,
//if it is a player: name, color
let clients = []
let initialData = {
  player1 : {}, //properties: name, color, clientNum
  player2 : {},
  state : undefined,
  clientNum : undefined,
  serverCurlings : serverCurlings
}
//initialize curlings on server side
for (let i=0; i<6; i++){
  serverCurlings[i] = {
      x : 940 + 4*i + 2*10*i,//next x = previous x + gap + 2*rad
      y : 630
  }
}
function reset(clientNum){
  for (let i=0; i<6; i++){
    serverCurlings[i] = {
        x : 940 + 4*i + 2*10*i,//next x = previous x + gap + 2*rad
        y : 630
    }
  }
  if(clientNum === initialData.player1.clientNum){
    initialData.player1 = initialData.player2
    initialData.player2 = {}
  }
  else
    initialData.player2 = {}
  initialData.serverCurlings = []
}
  io.on('connection', function(socket){
    clientsCounter++
    console.log("client " + clientsCounter + " connected")
    let client = {
      charactor : "spectator",
      clientNum : clientsCounter
    }
    clients.push(client)
    initialData.clientNum = clientsCounter
    let playersCounter = 0
    for(let i in clients){
      if(clients[i].charactor === 'player')
        playersCounter++
      if(playersCounter === 1 &&
         typeof(initialData.player1.name) === "undefined"){
        initialData.player1.name = clients[i].name
        initialData.player1.color = clients[i].color
        initialData.player1.clientNum = clients[i].clientNum
        console.log(i + " " + initialData.player1)
      }
      if(playersCounter === 2){
        initialData.player2.name = clients[i].name
        initialData.player2.color = clients[i].color
        initialData.player2.clientNum = clients[i].clientNum
        initialData.serverCurlings = serverCurlings
        break
      }
    }
    if(playersCounter === 1){
      initialData.state = "waitFor1"
      socket.emit("initialData", JSON.stringify(initialData))
      console.log("initialData(waitFor1) sent to client " + clientsCounter + " :")
      console.log(initialData)
    }
    else if(playersCounter === 2){
      initialData.state = "noSpace"
      socket.emit("initialData", JSON.stringify(initialData))
      console.log("initialData(noSpace) sent to client " + clientsCounter + " :")
      console.log(initialData)
    }
    else{
      initialData.state = "waitFor2"
      socket.emit("initialData", JSON.stringify(initialData))
      console.log("initialData(waitFor2) sent to client " + clientsCounter + " :")
      console.log(initialData)
    }
    socket.on("newPlayer", function(data){
      newPlayer = JSON.parse(data)
      let clientNum = newPlayer.clientNum
      console.log("newPlayer recieved from client " + clientNum + " :")
      console.log(newPlayer)
      clients[clientNum-1] = newPlayer
      clients[clientNum-1].charactor = "player"
      socket.broadcast.emit("newPlayer", JSON.stringify(newPlayer))
      console.log("newPlayer sent to clients except for client " + clientNum + " :")
      console.log(newPlayer)
    })
    socket.on("setPosition", function(data){
      setPositionData = JSON.parse(data)
      serverCurlings[setPositionData.index].x = setPositionData.x
      serverCurlings[setPositionData.index].y = setPositionData.y
      socket.broadcast.emit("setPosition", data)
    })
    socket.on("collisionPosition", function(data){
      collisionPositionData = JSON.parse(data)
      serverCurlings[collisionPositionData.collide.index].x = collisionPositionData.collide.x
      serverCurlings[collisionPositionData.collide.index].y = collisionPositionData.collide.y
      serverCurlings[collisionPositionData.collided.index].x = collisionPositionData.collided.x
      serverCurlings[collisionPositionData.collided.index].y = collisionPositionData.collided.y
      socket.broadcast.emit("collisionPosition", data)
    })
    socket.on("movingPosition", function(data){
      movingPosition = JSON.parse(data)
      serverCurlings[movingPosition.index].x = movingPosition.x
      serverCurlings[movingPosition.index].y = movingPosition.y
      socket.broadcast.emit("movingPosition", data)
    })
    socket.on("quit",function(data){
      playerQuit = JSON.parse(data)
      if(data === "{}"){
        for(let i in clients){
          if(clients[i].charactor === "player"){
            console.log("quit2 recieved from client " + i)
            clients[i].charactor = "spectator"
            delete clients[i].name
            delete clients[i].color
            reset(i)
            break
          }
        }
        io.sockets.emit("quit", data)
        console.log("quit1 sent to all clients")
      }
      else{
        console.log("quit1 recieved from client " + playerQuit.clientNum)
        clients[playerQuit.clientNum-1].charactor = "spectator"
        delete clients[playerQuit.clientNum-1].name
        delete clients[playerQuit.clientNum-1].color
        reset(playerQuit.clientNum)
        io.sockets.emit("quit", data)
        console.log("quit1 sent to all clients")
      }
    })
  })
console.log("Server Running at PORT: 3000  CNTL-C to quit")
console.log("To Test:")
console.log("Open several browsers at: http://localhost:3000/canvasWithTimer.html")
