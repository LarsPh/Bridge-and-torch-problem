let canvas = document.getElementById("canvas1")
let ctx = canvas.getContext("2d")
const PLACING_AREA_LEFT = 928.5
const PLACING_AREA_RIGHT = 1071.5
const PLACING_AREA_TOP = 580
const PLACING_AREA_BOTTOM = 640
const MAX_ARROW_LENGTH_SQ = 50*50
const MINI_ARROW_LENGTH_SQ = 10*10
const FULL_ICE_AREA_LEFT = 928.5
const FULL_ICE_AREA_RIGHT = 1071.5
const FULL_ICE_AREA_TOP = 0
const FULL_ICE_AREA_BOTTOM = 640
const LEAST_SPEED_SQ = 0.04 * 0.04
const DAMPING = 0.92
const RADIUS = 10
let clientNum
let player1 = {} //properties: name, color, clientNum
let player2 = {}
let timer
let curlingSetIndex = -1
let curlingMovedIndex = -1
let curlingMovedNum = 0
let arrowEnd = {
  x: -1,
  y: -1
}
let curlings = []
let initialData = {}
let socket = io('http://' + window.document.location.host)

socket.on("initialData", function(data){
  initialData = JSON.parse(data)
  console.log("initialData recieved from server:")
  console.log(initialData)
  clientNum = initialData.clientNum
  initialization()
})

socket.on("newPlayer", function(data){
  newPlayer = JSON.parse(data)
  console.log("newPlayer recieved from server:")
  console.log(newPlayer)
  if(JSON.stringify(player1) === "{}"){
    player1 = newPlayer
    $("div").empty()
    $("div").append(`<p>${player1.color.toUpperCase()}: ${player1.name}</p><br>`,
    `<p>Only one place for registration!</p>`, `<input id='player2Name' type='text' value='Name'></input>`,
    `<button type='button' onclick="showPrompt('player2In')">Submit!</button><br>`,
    `<button type='button' onclick="handleQuit('quit2')">Quit game!</button>`)
  }
  else{
    player2 = newPlayer
    showPrompt("player2In")
  }
})

socket.on("collisionPosition", function(data){
  collisionPositionData = JSON.parse(data)
  curlings[collisionPositionData.collide.index].x = collisionPositionData.collide.x
  curlings[collisionPositionData.collide.index].y = collisionPositionData.collide.y
  curlings[collisionPositionData.collided.index].x = collisionPositionData.collided.x
  curlings[collisionPositionData.collided.index].y = collisionPositionData.collided.y
  drawBackground()
})

socket.on("movingPosition", function(data){
  movingPosition = JSON.parse(data)
  curlings[movingPosition.index].x = movingPosition.x
  curlings[movingPosition.index].y = movingPosition.y
  drawBackground()
})

function initialization(){
  if(initialData.state === "waitFor2" || initialData.state === "waitFor1"){
    for (let i=0; i<6; i++){
      curlings[i] = {
          x : 940 + 4*i + 2*RADIUS*i,//next x = previous x + gap + 2*rad
          y : 630,
          rad : RADIUS,
          offset :  {
          x : 0,
          y : 0
        },
        moved : false
      }
      if(parseInt(i) < 3)
        curlings[i].color = "red"
      else
        curlings[i].color = "yellow"
    }

    if (initialData.state === "waitFor2"){
      $("div").append(`<p>  Register and choose your color!</p>`,
      `<input id='player1Name' type='text' value='Name'></input>`,
      `<button type='button' onclick="showPrompt('red')" style='color:red;'>Submit!</button>`,
      `<button type='button' onclick="showPrompt('yellow')" style='color:yellow;'>Submit!</button>`)
    }
    else {
      player1 = initialData.player1
      $("div").append(`<p>${player1.color.toUpperCase()}: ${player1.name}</p><br>`,
      `<p>Only one place for registration!</p>`, `<input id='player2Name' type='text' value='Name'></input>`,
      `<button type='button' onclick="showPrompt('player2In')">Submit!</button><br>`,
      `<button type='button' onclick="handleQuit('quit2')">Quit game!</button>`)
    }
  }

  else{
    player1 = initialData.player1
    player2 = initialData.player2
    if(JSON.stringify(initialData.serverCurlings) === "[]"){
      for (let i=0; i<6; i++){
        curlings[i] = {
            x : 940 + 4*i + 2*RADIUS*i,//next x = previous x + gap + 2*rad
            y : 630,
            rad : RADIUS,
            offset :  {
            x : 0,
            y : 0
          },
          moved : false
        }
      }
      showPrompt('player2In')
    }
    else{
      for (let i=0; i<6; i++){
        curlings[i] = {
            x : initialData.serverCurlings[i].x,
            y : initialData.serverCurlings[i].y,
            rad : RADIUS,
            offset :  {
            x : 0,
            y : 0
          },
          moved : false
        }
      }
    }
    showPrompt('player2In')
  }

  drawBackground()
}

function showPrompt(submitInfo){
  if(submitInfo === "red" || submitInfo === "yellow"){
    player1.name = $('#player1Name').val()
    player1.color = submitInfo
    player1.clientNum = clientNum
    socket.emit("newPlayer", JSON.stringify(player1))
    console.log("player1 sent to server:")
    console.log(player1)
    $("div").empty()
    $("div").append(`<p>${submitInfo.toUpperCase()}: ${player1.name}</p><br>`,
    `<p>Only one place for registration!</p>`, `<input id='player2Name' type='text' value='Name'></input>`,
    `<button type='button' onclick="showPrompt('doNothing')">Submit!</button><br>`,
    `<button type='button' onclick="handleQuit('quit2')">Quit game!</button>`)
    drawBackground()
  }
  else if(submitInfo === "player2In"){
    if(typeof(player2.name) === 'undefined'){
      player2.name = $('#player2Name').val()
      if(player1.color === "red")
        player2.color = "yellow"
      else
        player2.color = "red"
      player2.clientNum = clientNum
    }
    $("div").empty()
    $("div").append(`<p>${player1.color.toUpperCase()}: ${player1.name}</p>`,
    `<p>${player2.color.toUpperCase()}: ${player2.name}</p><br>`,
    `<p>Game started!</p><br>`,
    `<button type='button' onclick="handleQuit('quit1')">Quit game!</button>`)
    if(player2.clientNum === clientNum){
      socket.emit("newPlayer", JSON.stringify(player2))
      console.log("player2 sent to server:")
      console.log(player2)
    }
    if(player1.clientNum === clientNum || player2.clientNum === clientNum)
      $("#canvas1").mousedown(handleMouseDown)
    drawBackground()
    }
  }

function highlight(color){
  if(color === "red"){
    for(let i in curlings){
      if(parseInt(i)<3){
        ctx.strokeStyle = "blue"
        ctx.beginPath()
        ctx.arc(curlings[i].x, curlings[i].y, curlings[i].rad, 0, 2*Math.PI)
        ctx.stroke()
        ctx.strokeStyle = "black"
      }
    }
  }
  else{
    for(let i in curlings){
      if(parseInt(i)>=3){
        ctx.strokeStyle = "blue"
        ctx.beginPath()
        ctx.arc(curlings[i].x, curlings[i].y, curlings[i].rad, 0, 2*Math.PI)
        ctx.stroke()
        ctx.strokeStyle = "black"
      }
    }
  }
}

function handleQuit(submitInfo){
  if(player1.clientNum === clientNum || player2.clientNum === clientNum)
  if(submitInfo === "quit1"){
    if(clientNum === player1)
      socket.emit("quit", JSON.stringify({clientNum : player1.clientNum}))
    else
      socket.emit("quit", JSON.stringify({clientNum : player2.clientNum}))
  }
  else{ //quit2
    socket.emit("quit", JSON.stringify({}))
  }
}

socket.on("quit", function(data){
  if(data === '{}'){
    console.log("quit1 recieved from server")
    player1 = {}
    reset()
    drawBackground()
    $("div").empty()
    $("div").append(`<p>  Register and choose your color!</p>`,
    `<input id='player1Name' type='text' value='Name'></input>`,
    `<button type='button' onclick="showPrompt('red')" style='color:red;'>Submit!</button>`,
    `<button type='button' onclick="showPrompt('yellow')" style='color:yellow;'>Submit!</button>`)
  }
  else{
    console.log("quit1 recieved from server")
    playerQuit = JSON.parse(data)
    if(playerQuit.clientNum === player1.clientNum){
      player1 = player2
      player2 = {}
    }
    else{
      player2 = {}
    }
    reset()
    drawBackground()
    $("div").empty()
    $("div").append(`<p>${player1.color.toUpperCase()}: ${player1.name}</p><br>`,
    `<p>Only one place for registration!</p>`, `<input id='player2Name' type='text' value='Name'></input>`,
    `<button type='button' onclick="showPrompt('player2In')">Submit!</button><br>`,
    `<button type='button' onclick="handleQuit('quit2')">Quit game!</button>`)
  }
})

function reset(){
  if(timer > 0)
    clearTimeout(timer)
  curlingSetIndex = -1
  curlingMovedIndex = -1
  curlingMovedNum = 0
  arrowEnd = {
    x: -1,
    y: -1
  }
  for (let i=0; i<6; i++){
    curlings[i] = {
        x : 940 + 4*i + 2*RADIUS*i,//next x = previous x + gap + 2*rad
        y : 630,
        rad : RADIUS,
        offset :  {
        x : 0,
        y : 0
      },
      moved : false
    }
    if(parseInt(i) < 3)
      curlings[i].color = "red"
    else
      curlings[i].color = "yellow"
  }
}

//draw two rings in blue and red, given the centre of both rings and the radius of the outside ring
function drawRings(x, y, rad){
  const colorsOfRing = ["blue", "white", "red", "white"]
  let interval = rad / 4
  for (let i=0; i<4; i++){
    ctx.beginPath()
    ctx.arc(x, y, rad, 0, 2*Math.PI)
    ctx.fillStyle = colorsOfRing[i]
    ctx.fill()
    rad -= interval
  }
}

function drawCurlingArea(){
  //draw two vertical lines
  ctx.beginPath()
  ctx.moveTo(928.5, 0)
  ctx.lineTo(928.5, 640)
  ctx.stroke()
  ctx.moveTo(1071.5, 0)
  ctx.lineTo(1071.5, 640)
  ctx.stroke()
  //draw the small rings
  drawRings(1000, 106.5, 66.5)
  //draw the horizontal lines
  ctx.beginPath()
  ctx.moveTo(928.5, 580)
  ctx.lineTo(1071.5, 580)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(928.5, 640)
  ctx.lineTo(1071.5, 640)
  ctx.stroke()
  //draw the curlings
  for (let i in curlings){
    ctx.beginPath()
    ctx.arc(curlings[i].x, curlings[i].y, curlings[i].rad, 0, 2*Math.PI)
    ctx.stroke()
    ctx.fillStyle = "grey"
    ctx.fill()
    ctx.beginPath()
    ctx.arc(curlings[i].x, curlings[i].y, curlings[i].rad/2, 0, 2*Math.PI)
      if(i<3)
      ctx.fillStyle = "red"
    else
      ctx.fillStyle = "yellow"
    ctx.fill()
    //draw a curling in large area
    let newRad = curlings[i].rad / 66.5 * 300
    let vecLength = Math.sqrt(vectorLengthSq(curlings[i].x - 1000, curlings[i].y - 106.5))
    let newVecLength = vecLength / 66.5 * 300
    let newX = 400 + newVecLength * ((curlings[i].x - 1000) / vecLength)
    let newY = 350 + newVecLength * ((curlings[i].y - 106.5) / vecLength)
    ctx.beginPath()
    ctx.arc(newX, newY, newRad, 0, 2*Math.PI)
    ctx.stroke()
    ctx.fillStyle = "grey"
    ctx.fill()
    ctx.beginPath()
    ctx.arc(newX, newY, newRad/2, 0, 2*Math.PI)
      if(i<3)
      ctx.fillStyle = "red"
    else
      ctx.fillStyle = "yellow"
    ctx.fill()
  }
  //draw the arrow
  if (arrowEnd.x>0 && arrowEnd.y>0 && inSettingArea(arrowEnd.x,arrowEnd.y)
      && curlingMovedIndex>=0){
       if(vectorLengthSq(arrowEnd.x-curlings[curlingMovedIndex].x, arrowEnd.y-curlings[curlingMovedIndex].y) <=
          MAX_ARROW_LENGTH_SQ &&
          vectorLengthSq(arrowEnd.x-curlings[curlingMovedIndex].x, arrowEnd.y-curlings[curlingMovedIndex].y) >=
          MINI_ARROW_LENGTH_SQ){
         ctx.beginPath()
         ctx.moveTo(curlings[curlingMovedIndex].x, curlings[curlingMovedIndex].y)
         ctx.lineTo(arrowEnd.x + 3,
                    arrowEnd.y - 3)
         ctx.stroke()
         ctx.beginPath()
         ctx.moveTo(curlings[curlingMovedIndex].x, curlings[curlingMovedIndex].y)
         ctx.lineTo(arrowEnd.x - 3,
                    arrowEnd.y + 3)
         ctx.stroke()
    }
  }
}

function drawBackground(){
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 1200, 700)
  //draw the large rings
  drawRings(400, 350, 300)
  drawCurlingArea()
  if(clientNum === player1.clientNum)
    highlight(player1.color)
  if(clientNum === player2.clientNum)
    highlight(player2.color)
  }

function inSettingArea(x, y){
  if(x<PLACING_AREA_RIGHT-3 && x>PLACING_AREA_LEFT+3
     && y<PLACING_AREA_BOTTOM-3 && y>PLACING_AREA_TOP+3)
    return true
  else
    return false
}

function inFullIceArea(x, y){
  if(x<FULL_ICE_AREA_RIGHT-13 && x>FULL_ICE_AREA_LEFT+13
     && y<FULL_ICE_AREA_BOTTOM-13 && y>FULL_ICE_AREA_TOP+13)
    return true
  else
    return false
}
function inWhichCurling(x, y){
  for(let i in curlings){
    if(Math.abs(x-curlings[i].x)<curlings[i].rad && Math.abs(y-curlings[i].y)<curlings[i].rad)
      return i
  }
  return -1
}

function isOverlapped(x, y, curlingSetIndex){
  for(let i in curlings){
    if(vectorLengthSq(x-curlings[i].x, y-curlings[i].y) < 20*20
       && i !== curlingSetIndex)
      return i
  }
  return -1
}

function vectorLengthSq(x, y) {return Math.pow(x, 2) + Math.pow(y, 2)}

function handleFirstClick(e){
    let rect = canvas.getBoundingClientRect()
    let canvasX = e.clientX - rect.left
    let canvasY = e.clientY - rect.top
    console.log("first click: " + canvasX + " " + canvasY)
    curlingSetIndex = curlingMovedIndex
    curlingMovedIndex = -1
}

socket.on("setPosition", function(data){
  setPositionData = JSON.parse(data)
  handleSecondClick(setPositionData)
})

function handleSecondClick(e){
  if(typeof(e.clientX) === "undefined"){
    curlingSetIndex = e.index
    var canvasX = e.x
    var canvasY = e.y
  }
  else{
    let rect = canvas.getBoundingClientRect()
    var canvasX = e.clientX - rect.left
    var canvasY = e.clientY - rect.top
  }
  console.log("second click: " + canvasX + " " + canvasY)
  curlings[curlingSetIndex].x = canvasX
  curlings[curlingSetIndex].y = canvasY
  let setPositionData = {
    index : curlingSetIndex,
    x : canvasX,
    y : canvasY
  }
  if(typeof(e.clientX) !== "undefined")
    socket.emit("setPosition", JSON.stringify(setPositionData))
  curlingSetIndex = -1
  drawBackground()
}
function inWhichColor(x, y){
  for(let i in curlings){
    if(Math.abs(x-curlings[i].x) < RADIUS && Math.abs(y-curlings[i].y) < RADIUS)
      return curlings[i].color
  }
  return -1
}

function handleMouseDown(e) {
  console.log("Mouse down")
  let rect = canvas.getBoundingClientRect()
  let canvasX = e.clientX - rect.left //use event object clientX and clientY
  let canvasY = e.clientY - rect.top
  let color
  curlingMovedIndex = inWhichCurling(canvasX, canvasY)
  if(curlingMovedIndex>=0 && inSettingArea(canvasX, canvasY)){
    if(player1.clientNum === clientNum)
      color = player1.color
    else
      color = player2.color
    console.log(inWhichColor(canvasX, canvasY))
    if(inWhichColor(canvasX, canvasY) === color){
     $("#canvas1").mousemove(handleMouseMove)
     $("#canvas1").mouseup(handleMouseUp)
   }
  }
  else if(inSettingArea(canvasX, canvasY) && curlingSetIndex>=0){
    if(isOverlapped(canvasX, canvasY) !== -1)
      curlingSetIndex = -1
    else{
      arrowEnd.x = -1
      arrowEnd.y = -1
      handleSecondClick(e)
    }
  }
  e.stopPropagation()
  e.preventDefault()
}

function handleMouseMove(e) {
  console.log("Mouse move")
  let rect = canvas.getBoundingClientRect()
  let canvasX = e.clientX - rect.left
  let canvasY = e.clientY - rect.top
  arrowEnd.x = canvasX
  arrowEnd.y = canvasY

  e.stopPropagation()

  drawBackground()
}

function handleMouseUp(e){
  console.log("Mouse up")
  e.stopPropagation()

  $("#canvas1").off("mousemove", handleMouseMove)
  $("#canvas1").off("mouseup", handleMouseUp)
  if ((arrowEnd.x == -1 && arrowEnd.y == -1)
      || vectorLengthSq(arrowEnd.x-curlings[curlingMovedIndex].x, arrowEnd.y-curlings[curlingMovedIndex].y) <
      MINI_ARROW_LENGTH_SQ){
      console.log(arrowEnd.x)
      handleFirstClick(e)
  }
  else{
    curlingMovedNum++
    curlings[curlingMovedIndex].moved = true
    if (curlings[curlingMovedIndex].offset.x == 0 && curlings[curlingMovedIndex].offset.y == 0){
      curlings[curlingMovedIndex].offset.x = curlings[curlingMovedIndex].x - arrowEnd.x
      curlings[curlingMovedIndex].offset.y = curlings[curlingMovedIndex].y - arrowEnd.y
    }
    arrowEnd.x = -1
    arrowEnd.y = -1
    if(typeof(timer) === "undefined" || timer < 0)
      timer = setInterval(handleTimer, 100)
  }
}

function handleMath(vx, vy, x1, x2, y1, y2, mycase, mathObj){
    let v = Math.sqrt(vectorLengthSq(vx, vy))
    let r = curlings[0].rad
    let b = Math.asin((y2 - y1) / 2 / r)
    let d = Math.asin(vx/v)
    let a = Math.PI / 2 - b - d
    if (mycase === 1){
      mathObj.v1 += v * Math.sin(a)
      mathObj.v2 += v * Math.cos(a)
    }
    else if(mycase === 2){
      mathObj.v1 += v * Math.cos(a)
      mathObj.v2 += v * Math.sin(a)
    }
    else {
        mathObj.v1x = mathObj.v1 * Math.cos(b-a)
        mathObj.v1y = mathObj.v1 * Math.sin(b-a)
        mathObj.v2x = mathObj.v2 * Math.cos(b)
        mathObj.v2y = mathObj.v2 * Math.sin(b)
    }
}

function handleTimer(){
  console.log("In timer")
  if(curlingMovedNum === 0){
    console.log("All stopped")
    curlingSetIndex = -1
    clearTimeout(timer)
    timer = -1
  }
for(let i in curlings){
 if(curlings[i].moved){
  if(vectorLengthSq(curlings[i].offset.x, curlings[i].offset.y) < LEAST_SPEED_SQ){
    console.log(i + " Stopped")
    curlings[i].offset.x = 0
    curlings[i].offset.y = 0
    curlings[i].moved = false
    if(curlingMovedNum > 0)
      curlingMovedNum--
    console.log(`Number of moving curlings after curling ${i} stopped: ` + curlingMovedNum)
    drawBackground()
  }
  else if(!inFullIceArea(curlings[i].x, curlings[i].y)){
    console.log("Hit boundary")
    curlings[i].offset.x = 0
    curlings[i].offset.y = 0
    if(curlingMovedNum > 0)
      curlingMovedNum--
    curlings[i].moved = false
    console.log("Number moving after " + i + " stopped: " + curlingMovedNum)
    drawBackground()
  }
  else if (isOverlapped(curlings[i].x, curlings[i].y, i) !== -1){
    var collidedNum = isOverlapped(curlings[i].x, curlings[i].y, i)
    console.log("Collision")
    curlingMovedNum++
    //do the Math
    let mathObj ={
      v1 : 0,
      v2 : 0,
      v1x : 0,
      v1y : 0,
      v2x : 0,
      v2y : 0
    }
    handleMath(curlings[i].offset.x, curlings[i].offset.y,
                     curlings[i].x, curlings[collidedNum].x, curlings[i].y, curlings[collidedNum].y,
                     1, mathObj)
    if(curlings[collidedNum].moved === true){
      curlingMovedNum--
      handleMath(curlings[collidedNum].offset.x, curlings[collidedNum].offset.y,
                       curlings[collidedNum].x, curlings[i].x, curlings[collidedNum].y, curlings[i].y,
                       2, mathObj)
    }
    handleMath(curlings[i].offset.x, curlings[i].offset.y,
                     curlings[i].x, curlings[collidedNum].x, curlings[i].y, curlings[collidedNum].y,
                     3, mathObj)
    curlings[i].offset.x = mathObj.v1x
    curlings[i].offset.y = mathObj.v1y
    curlings[collidedNum].moved = true
    curlings[collidedNum].offset.x = mathObj.v2x
    curlings[collidedNum].offset.y = mathObj.v2y
    //prevent double collision
    curlings[i].x += 1.2 * curlings[i].offset.x
    curlings[i].y += 1.2 * curlings[i].offset.y
    curlings[collidedNum].x += 1.2 * curlings[collidedNum].offset.x
    curlings[collidedNum].y += 1.2 * curlings[collidedNum].offset.y
    let collisionPositionData = {
      collide : {
        index : i,
        x : curlings[i].x,
        y : curlings[i].y
      },
      collided : {
        index : collidedNum,
        x : curlings[collidedNum].x,
        y : curlings[collidedNum].y
      }
    }
    socket.emit("collisionPosition", JSON.stringify(collisionPositionData))
    drawBackground()
  }
  else{
    console.log("Moving")
    console.log(1.2 * curlings[i].offset.x)
    console.log(1.2 * curlings[i].offset.y)
    curlings[i].offset.x *= DAMPING
    curlings[i].offset.y *= DAMPING
    curlings[i].x += 1.2 * curlings[i].offset.x
    curlings[i].y += 1.2 * curlings[i].offset.y
    let movingPositionData = {
      index : i,
      x : curlings[i].x,
      y : curlings[i].y
    }
    socket.emit("movingPosition", JSON.stringify(movingPositionData))
    drawBackground()
  }
 }
}
}
