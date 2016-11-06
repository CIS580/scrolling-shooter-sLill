"use strict";


///TableOfContents///
//key functions
//update 
//render
//renderHUD
//renderworld
//renderGUI
//fuel
//bulletpool
//laserPool
//camera
//game
//missile
//player
//Environment
//smokeparticles
//scale
//add
//subtract
//rotate
//dotProduct
//magnitude
//normalize
//UpdateTimers
//NewLevel
//GameOver
//masterloop

/* Global variables */
var canvas = document.getElementById('screen');
var game = new Game(canvas, update, render);
var overlay = new Image();
overlay.src = 'assets/Overlay.png';
var gasCan = new Image();
gasCan.src = 'assets/GasCan.png';
var life = new Image();
life.src = 'assets/Life.png';
var timeSinceLastBullet = 0;
var timeSinceLastFrame = 0;
var framesThisSecond = 0;
var tenthSecond = 0;
var oneSecond = 0;
var fiveSeconds = 0;
var timeOnLevel = 0;
var score = 0;
var level = 0;
var lives = 3;
var attackSpeed = 1;
var enemiesRemaining = 25;
var gameOverFlag = false;
var newLevelFlag = true;
var input = {
    up: false,
    down: false,
    left: false,
    right: false,
    space: false,
    f: false,
    p: false
}


//Initialize Objects
var camera = new Camera(canvas);
var bullets = new BulletPool(10, 500);
var lasers = new LaserPool(10);
var missiles = [];
var player = new Player(bullets, missiles);
var fuel = new Fuel();
var environment = new Environment();

//Initialize Html
var instructionsDiv = document.getElementById("instructionsDiv");
instructionsDiv.innerHTML = "<b>W-A-S-D</b> or the arrow keys to move <br><b>Spacebar</b> to fire your primary weapon <br>'<b>F</b>' to fire your secondary weapon <br>'<b>P</b>' to pause the game";
var instructionsDiv2 = document.getElementById("instructionsDiv2");
instructionsDiv2.innerHTML = ("&#8226 Each enemy killed boosts your score and increases your attack speed permanently <br>&#8226 Grab powerups to increase weapon strength <br>&#8226 Clear all enemies to advance to the next level <br>&#8226 Run out of fuel or run out of lives and it's game over");
var messageDiv = document.getElementById("messageDiv");
var congratsDiv = document.getElementById("congratsDiv");
var fpsDiv = document.getElementById("fpsDiv");
var scoreDiv = document.getElementById("scoreDiv");
var levelDiv = document.getElementById("levelDiv");
var attackSpeedDiv = document.getElementById("attackSpeedDiv");

/**
 * @function onkeydown
 * Handles keydown events
 */
window.onkeydown = function(event) {
    switch(event.key) {
        case "ArrowUp":
        case "w":
            input.up = true;
            event.preventDefault();
            break;
        case "ArrowDown":
        case "s":
            input.down = true;
            event.preventDefault();
            break;
        case "ArrowLeft":
        case "a":
            input.left = true;
            event.preventDefault();
            break;
        case "ArrowRight":
        case "d":
            input.right = true;
            event.preventDefault();
            break;
        case "Space":
        case ' ':
            input.space = true;
            event.preventDefault();
            break;
        case 'f':
            input.f = true;
            event.preventDefault();
            break;
        case 'p':
            input.p = true;
            event.preventDefault();
            break;
    }
}

/**
 * @function onkeyup
 * Handles keydown events
 */
window.onkeyup = function (event) {
    switch (event.key) {
        case "ArrowUp":
        case "w":
            input.up = false;
            event.preventDefault();
            break;
        case "ArrowDown":
        case "s":
            input.down = false;
            event.preventDefault();
            break;
        case "ArrowLeft":
        case "a":
            input.left = false;
            event.preventDefault();
            break;
        case "ArrowRight":
        case "d":
            input.right = false;
            event.preventDefault();
            break;
        case "Space":
        case ' ':
            input.space = false;
            event.preventDefault();
            break;
        case 'f':
            input.f = false;
            event.preventDefault();
            break;
    }
}

/**
 * @function update
 * Updates the game state, moving
 * game objects and handling interactions
 * between them.
 * @param {DOMHighResTimeStamp} elapsedTime indicates
 * the number of milliseconds passed since the last frame.
 */
function update(elapsedTime) {

    //Check for a new level
    if (newLevelFlag)
    {
        NewLevel();
        congratsDiv.innerHTML = "LEVEL " + level;
        fiveSeconds = 0;
    }

    //Update FPS counter
    framesThisSecond++;
    timeSinceLastFrame += elapsedTime;

    //Update Timers
    UpdateTimers(elapsedTime);


    //Determine if a laser should be fired
    if (input.f && lasers.fireable)
    {
        var veloc = { x: 0, y: -8 };
        lasers.add(player.position, veloc);
    }

    //Determine if a bullet should be fired
    if (input.space && timeSinceLastBullet > bullets.rateOfFire)
    {
        var veloc = {x: 0, y: -8};
        player.bullets.add(player.position, veloc);
        timeSinceLastBullet = 0;
    }
    timeSinceLastBullet += elapsedTime;


  // update the camera
    camera.update(player.position);
    //Update fuel
    fuel.update(elapsedTime);

  // update the player
  player.update(elapsedTime, input);


  // Update bullets
  bullets.update(elapsedTime, function(bullet){
    if(!camera.onScreen(bullet)) return true;
    return false;
  });

  //Update lasers
  lasers.update(elapsedTime, function (laser) {
      if (!camera.onScreen(laser)) return true;
      return false;
  });

  // Update missiles
  var markedForRemoval = [];
  missiles.forEach(function(missile, i){
    missile.update(elapsedTime);
    if(Math.abs(missile.position.x - camera.x) > camera.width * 2)
      markedForRemoval.unshift(i);
  });

  environment.update(elapsedTime);

  // Remove missiles that have gone off-screen
  markedForRemoval.forEach(function(index){
    missiles.splice(index, 1);
  });

  //Check player hp
  if(player.hp <= 0)
  {
      lives--;
      //Check if it's game over
      if(lives == 0)
      {
          GameOver();
      }
  }
}

/**
  * @function render
  * Renders the current game state into a back buffer.
  * @param {DOMHighResTimeStamp} elapsedTime indicates
  * the number of milliseconds passed since the last frame.
  * @param {CanvasRenderingContext2D} ctx the context to render to
  */
function render(elapsedTime, ctx)
{
  // Transform the coordinate system using
  // the camera position BEFORE rendering
  // objects in the world - that way they
  // can be rendered in WORLD cooridnates
  // but appear in SCREEN coordinates
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  renderWorld(elapsedTime, ctx);
  ctx.restore();

  //Render HUD
  renderHUD(elapsedTime, ctx);
}


//Renders the HUD of the game world
function renderHUD(elapsedTime, ctx)
{
    //Overlay
    ctx.drawImage(overlay, 0, 0);

    //Secondary fire recharge bar
    ctx.strokeStyle = 'white';
    ctx.rect(8, 600, 12, 80);
    ctx.stroke();

    //Secondary fire symbol
    ctx.beginPath();
    ctx.moveTo(14, 705);
    ctx.lineTo(24, 695);
    ctx.arc(14, 695, 10, 0, Math.PI, true);
    ctx.closePath();
    ctx.fillStyle = lasers.laserColor;
    ctx.fill();

    //Fuel bar
    ctx.strokeStyle = 'white';
    ctx.rect(40, 600, 12, 80);
    ctx.stroke();

    //Fuel
    fuel.renderHUD(ctx);

    //Enemies remaining
    enemiesRemainDiv.innerHTML = enemiesRemaining;

    //2nd Weapon cooldown meter
    lasers.renderMeter(ctx);

    //Score and level
    scoreDiv.innerHTML = score;
    levelDiv.innerHTML = level;

    //Lives
    for(var i = 1; i <= lives; i++)
    {
        ctx.drawImage(life, ((i * 20) - 19), 520);
    }

    //HP bar
    ctx.beginPath();
    ctx.fillStyle = "green";
    ctx.rect(15, 475, 30, -player.hp);
    ctx.closePath();
    ctx.fill();

    //HP bar outline
    ctx.strokeStyle = 'white';
    ctx.rect(15, 375, 30, 100);
    ctx.stroke();

    //Attack speed
    attackSpeedDiv.innerHTML = attackSpeed + "%";
}

/**
  * @function renderWorld
  * Renders the entities in the game world
  * IN WORLD COORDINATES
  * @param {DOMHighResTimeStamp} elapsedTime
  * @param {CanvasRenderingContext2D} ctx the context to render to
  */
function renderWorld(elapsedTime, ctx)
{
    //Render the environment
    environment.render(elapsedTime, ctx);

    //Update fps
    if (timeSinceLastFrame > 1000)
    {
        timeSinceLastFrame = 0;
        fpsDiv.innerHTML = framesThisSecond;
        framesThisSecond = 0;
    }

    fuel.renderObjects(ctx);

    // Render the bullets
    bullets.render(elapsedTime, ctx);

    //Render the lasers
    lasers.render(elapsedTime, ctx);

    // Render the missiles
    missiles.forEach(function (missile)
    {
      missile.render(elapsedTime, ctx);
    });

    // Render the player
    player.render(elapsedTime, ctx);
}

//Creates a fuel function with no parameters
function Fuel()
{
    this.fuelArr = new Float32Array(2 * 20);
    this.fuelMeter = 7;
    this.fuelSpawn = (Math.floor(Math.random() * 3) + 2) * 1000;
    this.spawnTimer = 0;
    this.end = 0;
}

Fuel.prototype.add = function ()
{
    //Insert a fuel can into the array to be rendered in the next frame
    if (this.end < 20)
    {
        this.fuelArr[2 * this.end] = Math.floor(Math.random() * 850) + 35;
        
        if (environment.secondRenderY < environment.firstRenderY)
        {
            this.fuelArr[2 * this.end + 1] = -1*(Math.floor(Math.random() * (-1*(environment.secondRenderY - 1024)))) - environment.secondRenderY - 1024;
        }
        else
        {
            this.fuelArr[2 * this.end + 1] = -1*(Math.floor(Math.random() * (-1*(environment.firstRenderY - 1024)))) - environment.firstRenderY - 1024;
        }
        this.end++;
    }
}

//Checks if gas cans are picked up and if the fuel meter needs to be adjusted
Fuel.prototype.update = function(elapsedTime)
{
    //Determine if the fuel meter will need to be adjusted in the next frame
    if(fiveSeconds > 5000)
    {
        this.fuelMeter -= 1;
    }

    if (this.spawnTimer > this.fuelSpawn)
    {
        this.spawnTimer = 0;
        this.fuelSpawn = (Math.floor(Math.random() * 3) + 2) * 1000;
        this.add();
    }
    this.spawnTimer += elapsedTime;

    //Check if out of fuel. Game over if so
    if(this.fuelMeter == 0)
    {
        GameOver("You ran out of fuel<br><br>GameOver");
    }
}

Fuel.prototype.renderHUD = function(ctx)
{
    //Warn the player if they are low on fuel
    if (this.fuelMeter > 2)
    {
        ctx.fillStyle = 'gold';
    }
    else
    {
        ctx.fillStyle = 'red';
    }

    ctx.save();

    //Fuel can for HUD
    ctx.drawImage(gasCan, 27, 675);

    ctx.beginPath();
    //Draw fuel remaining
    for (var i = 0; i < this.fuelMeter; i++)
    {
        ctx.rect(42, 668 - (i*11), 7, 9);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

Fuel.prototype.renderObjects = function(ctx)
{
    //Render fuel cans
    ctx.save();
    for (var i = 0; i < this.end * 2; i += 2) {
        ctx.drawImage(gasCan, this.fuelArr[i], this.fuelArr[i + 1]);
    }
    ctx.restore();
}

/**
 * @constructor BulletPool
 * Creates a BulletPool of the specified size
 * @param {uint} size the maximum number of bullets to exits concurrently
 */
function BulletPool(maxSize, fireRate)
{
  this.pool = new Float32Array(4 * maxSize);
  this.end = 0;
  this.max = maxSize;
  this.rateOfFire = fireRate;
}

/**
 * @function add
 * Adds a new bullet to the end of the BulletPool.
 * If there is no room left, no bullet is created.
 * @param {Vector} position where the bullet begins
 * @param {Vector} velocity the bullet's velocity
*/
BulletPool.prototype.add = function (position, velocity)
{
    if(this.end < this.max) {
        this.pool[4*this.end] = position.x;
        this.pool[4*this.end+1] = position.y;
        this.pool[4*this.end+2] = velocity.x;
        this.pool[4*this.end+3] = velocity.y;
        this.end++;
    }
}

/**
 * @function update
 * Updates the bullet using its stored velocity, and
 * calls the callback function passing the transformed
 * bullet.  If the callback returns true, the bullet is
 * removed from the pool.
 * Removed bullets are replaced with the last bullet's values
 * and the size of the bullet array is reduced, keeping
 * all live bullets at the front of the array.
 * @param {DOMHighResTimeStamp} elapsedTime
 * @param {function} callback called with the bullet's position,
 * if the return value is true, the bullet is removed from the pool
 */
BulletPool.prototype.update = function (elapsedTime, callback) {
    for (var i = 0; i < this.end; i++) {
        // Move the bullet
        this.pool[4 * i] += this.pool[4 * i + 2];
        this.pool[4 * i + 1] += this.pool[4 * i + 3];

        // If a callback was supplied, call it
        if (callback && callback({
            x: this.pool[4 * i],
            y: this.pool[4 * i + 1]
        })) {
            // Swap the current and last bullet if we
            // need to remove the current bullet
            this.pool[4 * i] = this.pool[4 * (this.end - 1)];
            this.pool[4 * i + 1] = this.pool[4 * (this.end - 1) + 1];
            this.pool[4 * i + 2] = this.pool[4 * (this.end - 1) + 2];
            this.pool[4 * i + 3] = this.pool[4 * (this.end - 1) + 3];
            // Reduce the total number of bullets by 1
            this.end--;
            // Reduce our iterator by 1 so that we update the
            // freshly swapped bullet.
            i--;
        }
    }

}

/**
 * @function render
 * Renders all bullets in our array.
 * @param {DOMHighResTimeStamp} elapsedTime
 * @param {CanvasRenderingContext2D} ctx
 */
BulletPool.prototype.render = function (elapsedTime, ctx)
{
    // Render the bullets 
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = "white";
  for(var i = 0; i < this.end; i++) {
    ctx.moveTo(this.pool[4*i], this.pool[4*i+1]);
    ctx.arc(this.pool[4*i], this.pool[4*i+1], 2, 0, 2*Math.PI);
  }
  ctx.fill();
  ctx.restore();
}

//Creates a laserPool
function LaserPool(maxSize)
{
    this.pool = new Float32Array(4 * maxSize);
    this.end = 0;
    this.max = maxSize;
    this.laserType = 1;
    this.fireable = 1;
    this.cooldown = 1;
    this.runningCooldown = 0;
    this.laserColor = 'orange';
    this.currentMeterHeight = 80;
}

//Add a laser to the array
LaserPool.prototype.add = function (position, velocity) {
    if (this.end < this.max) {
        this.pool[4 * this.end] = position.x;
        this.pool[4 * this.end + 1] = position.y;
        this.pool[4 * this.end + 2] = velocity.x;
        this.pool[4 * this.end + 3] = velocity.y;
        this.end++;
    }

    this.fireable = false;
    this.runningCooldown = this.cooldown;
    this.currentMeterHeight = 0;
}

LaserPool.prototype.newType = function(type)
{
    switch (this.laserType)
    {
        //Normal laser
        case 1:
            this.cooldown = 1;
            this.laserColor = orange
            break;
    }
}
//Update laser array and positions and update the HUD meter
LaserPool.prototype.update = function (elapsedTime, callback)
{
    for (var i = 0; i < this.end; i++) {
        // Move the laser
        this.pool[4 * i] += this.pool[4 * i + 2];
        this.pool[4 * i + 1] += this.pool[4 * i + 3];
        // If a callback was supplied, call it
        if (callback && callback({
            x: this.pool[4 * i],
            y: this.pool[4 * i + 1]
        })) {
            // Swap the current and last lasers if we
            // need to remove the current laser
            this.pool[4 * i] = this.pool[4 * (this.end - 1)];
            this.pool[4 * i + 1] = this.pool[4 * (this.end - 1) + 1];
            this.pool[4 * i + 2] = this.pool[4 * (this.end - 1) + 2];
            this.pool[4 * i + 3] = this.pool[4 * (this.end - 1) + 3];
            // Reduce the total number of lasers by 1
            this.end--;
            // Reduce our iterator by 1 so that we update the
            // freshly swapped laser.
            i--;
        }
    }
}

//Renders the lasers
LaserPool.prototype.render = function(elapsedTime, ctx)
{
    //Render the lasers
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = this.laserColor;
   
    switch(this.laserType)
    {
        case 1:
        for (var i = 0; i < this.end; i++) {
        ctx.moveTo(this.pool[4 * i], this.pool[4 * i + 1] + 10);
        ctx.lineTo(this.pool[4 * i] + 10, this.pool[4 * i + 1]);
        ctx.arc(this.pool[4 * i], this.pool[4 * i + 1], 10, 0, Math.PI, true);
        break;
    }
    }
    ctx.fill();
    ctx.restore();
}

//Render the cooldown meter for the HUD
LaserPool.prototype.renderMeter = function(ctx)
{
    //Render the updated cooldown meter
    ctx.beginPath();
    ctx.fillStyle = 'gold';
    ctx.rect(8, 680, 12, -this.currentMeterHeight);
    ctx.closePath();
    ctx.fill();

    //Increase the height as the cooldown decreases over time
    if (tenthSecond > 100 && this.currentMeterHeight < 80)
    {
        this.currentMeterHeight += (8 / this.cooldown);
    }
}

/**
 * @constructor Camera
 * Creates a camera
 * @param {Rect} screen the bounds of the screen
 */
function Camera(screen) {
    this.x = 0;
    this.y = 0;
    this.currentCenterX = 512;
    this.currentCenterY = 393;
    this.currentPlayerX = 512;
    this.currentPlayerY = 393;
    this.width = screen.width;
    this.height = screen.height;
    this.maxVelocity = 10;
    this.distanceFromPlayer = 0;
    this.velocity = {
        x: 0,
        y: 0
    };
}

/**
 * @function update
 * Updates the camera based on the supplied target
 * @param {Vector} target what the camera is looking at
 */
Camera.prototype.update = function (target) {

    //Camera acceleration
    var acceleration = {
        x: 0,
        y: 0
    }

    //Determine if the difference in x is bigger or the difference in y
    var differenceinX = Math.abs(this.currentCenterX - player.position.x);
    var differenceinY = Math.abs(this.currentCenterY - player.position.y);
    if (player.position.x > this.currentCenterX) {
        acceleration.x = -((differenceinX / 1400) * this.maxVelocity);
    }
    else if (player.position.x < this.currentCenterX) {
        acceleration.x = ((differenceinX / 1400) * this.maxVelocity);
    }
    if (player.position.y > this.currentCenterY) {
        acceleration.y = -((differenceinY / canvas.clientHeight) * this.maxVelocity);
    }
    else if (player.position.y < this.currentCenterY) {
        acceleration.y = ((differenceinY / canvas.clientHeight) * this.maxVelocity);
    }


    this.velocity.x = acceleration.x;
    this.velocity.y = acceleration.y;

    // Movement decay  
    if (this.velocity.x > -0.6 && this.velocity.x < 0.6) {
        this.velocity.x = 0;
    }
    else if (this.velocity.x > 0) {
        this.velocity.x -= Math.abs(acceleration.x / 40);
    }
    else if (this.velocity.x < 0) {
        this.velocity.x += Math.abs(acceleration.x / 40);
    }

    if (this.velocity.y > -0.6 && this.velocity.y < 0.6) {
        this.velocity.y = 0;
    }
    else if (this.velocity.y > 0) {
        this.velocity.y -= Math.abs(acceleration.y / 40);
    }
    else if (this.velocity.y < 0) {
        this.velocity.y += Math.abs(acceleration.y / 40);
    }

    this.currentPlayerX += -this.velocity.x;
    this.currentPlayerY += -this.velocity.y;
    this.currentCenterX += -this.velocity.x;
    this.currentCenterY += -this.velocity.y;

    //Check if near an edge
    if (this.currentPlayerX < 450) {
        this.velocity.x = -0.005;
    }
    else if (this.currentPlayerX > 880) {
        this.velocity.x = 0.005;
    }

    // Apply velocity
    this.x += -this.velocity.x;
    this.y += (-this.velocity.y);
}


/**
 * @function onscreen
 * Determines if an object is within the camera's gaze
 * @param {Vector} target a point in the world
 * @return true if target is on-screen, false if not
 */
Camera.prototype.onScreen = function(target) {

    var isOnScreen = false;

    if (target.x >= this.x && target.x <= this.x + this.width && target.y >= this.y && target.y <= this.y + this.height)
    {
        isOnScreen = true;
    }

    return isOnScreen;
}

/**
 * @constructor Game
 * Creates a new game object
 * @param {canvasDOMElement} screen canvas object to draw into
 * @param {function} updateFunction function to update the game
 * @param {function} renderFunction function to render the game
 */
function Game(screen, updateFunction, renderFunction) {
  this.update = updateFunction;
  this.render = renderFunction;

  // Set up buffers
  this.frontBuffer = screen;
  this.frontCtx = screen.getContext('2d');
  this.backBuffer = document.createElement('canvas');
  this.backBuffer.width = screen.width;
  this.backBuffer.height = screen.height;
  this.backCtx = this.backBuffer.getContext('2d');

  // Start the game loop
  this.oldTime = performance.now();
  this.paused = false;
}

/**
 * @function pause
 * Pause or unpause the game
 * @param {bool} pause true to pause, false to start
 */
Game.prototype.pause = function(flag) {
  this.paused = flag;
}

/**
 * @function loop
 * The main game loop.
 * @param{time} the current time as a DOMHighResTimeStamp
 */
Game.prototype.loop = function(newTime) {
  var game = this;
  var elapsedTime = newTime - this.oldTime;
  this.oldTime = newTime;

    //Check for pauses
  if (input.p)
  {
      input.p = false;
      if (game.paused)
      {
          messageDiv.innerHTML = "";
          game.pause(false);
      }
      else
      {
          messageDiv.innerHTML = "<center>Paused</center><br>Press P again to unpause";
          game.pause(true);
      }
  }

  if(!this.paused) this.update(elapsedTime);
  this.render(elapsedTime, this.frontCtx);

  // Flip the back buffer
  this.frontCtx.drawImage(this.backBuffer, 0, 0);
}

/* Constants */
const MISSILE_SPEED = 8;

/**
 * @constructor Missile
 * Creates a missile
 * @param {Vector} position the position of the missile
 * @param {Object} target the target of the missile
 */
function Missile(position, target) {
  this.position = {x: position.x, y:position.y}
  this.target = target;
  this.angle = 0;
  this.img = new Image()
  this.img.src = 'assets/helicopter.png';
  this.smokeParticles = new SmokeParticles(400);
}

/**
 * @function update
 * Updates the missile, steering it towards a locked
 * target or straight ahead
 * @param {DOMHighResTimeStamp} elapedTime
 */
Missile.prototype.update = function(elapsedTime) {

  // set the velocity
  var velocity = {x: MISSILE_SPEED, y: 0}
  if(this.target) {
    var direction = Vector.subtract(this.position, this.target);
    velocity = Vector.scale(Vector.normalize(direction), MISSILE_SPEED);
  }

  // determine missile angle
  this.angle = Math.atan2(velocity.y, velocity.x);

  // move the missile
  this.position.x += velocity.x;
  this.position.y += velocity.y;

  // emit smoke
  this.smokeParticles.emit(this.position);

  // update smoke
  this.smokeParticles.update(elapsedTime);
}

/**
 * @function render
 * Renders the missile in world coordinates
 * @param {DOMHighResTimeStamp} elapsedTime
 * @param {CanvasRenderingContext2D} ctx
 */
Missile.prototype.render = function(elapsedTime, ctx) {
  // Draw Missile
  ctx.save();
  ctx.translate(this.position.x, this.position.y);
  ctx.rotate(this.angle);
  ctx.drawImage(this.img, 76, 56, 16, 8, 0, -4, 16, 8);
  ctx.restore();
  // Draw Smoke
  this.smokeParticles.render(elapsedTime, ctx);
}

/* Constants */
const PLAYER_SPEED = 5;
const BULLET_SPEED = 10;

/**
 * @constructor Player
 * Creates a player
 * @param {BulletPool} bullets the bullet pool
 */
function Player(bullets, missiles) {
  this.hp = 100;
  this.missiles = missiles;
  this.missileCount = 4;
  this.bullets = bullets;
  this.angle = 0;
  this.startPosition = { x: 512, y: 393 };
  this.position = {x: 512, y: 393};
  this.velocity = {x: 0, y: 0};
  this.img = new Image()
  this.img.src = 'assets/tyrian.shp.007D3C.Edit.png';
}

/**
 * @function update
 * Updates the player based on the supplied input
 * @param {DOMHighResTimeStamp} elapedTime
 * @param {Input} input object defining input, must have
 * boolean properties: up, left, right, down
 */
Player.prototype.update = function (elapsedTime, input) {
  // set the velocity
  this.velocity.x = 0;
  if(input.left) this.velocity.x -= PLAYER_SPEED;
  if(input.right) this.velocity.x += PLAYER_SPEED;
  this.velocity.y = 0;
  if(input.up) this.velocity.y -= PLAYER_SPEED / 2;
  if(input.down) this.velocity.y += PLAYER_SPEED / 2;

  // determine player angle
  this.angle = 0;
  if(this.velocity.x < 0) this.angle = -1;
  if(this.velocity.x > 0) this.angle = 1;

  // move the player
  this.position.x += this.velocity.x;
  this.position.y += this.velocity.y;

  // don't let the player move off-screen
  if(this.position.x < 20) this.position.x = 20;
  if(this.position.x > 900) this.position.x = 900;
  if(this.position.y > 786) this.position.y = 786;
}

/**
 * @function render
 * Renders the player helicopter in world coordinates
 * @param {DOMHighResTimeStamp} elapsedTime
 * @param {CanvasRenderingContext2D} ctx
 */
Player.prototype.render = function(elapasedTime, ctx) {
  var offset = this.angle * 23;
  ctx.save();
  ctx.translate(this.position.x, this.position.y);
  ctx.drawImage(this.img, 48+offset, 57, 23, 27, -12.5, -12, 23, 27);
  ctx.restore();
}

/**
 * @function fireBullet
 * Fires a bullet
 * @param {Vector} direction
 */
Player.prototype.fireBullet = function(direction) {
  var position = Vector.add(this.position, {x:30, y:30});
  var velocity = Vector.scale(Vector.normalize(direction), BULLET_SPEED);
  this.bullets.add(position, velocity);
}

/**
 * @function fireMissile
 * Fires a missile, if the player still has missiles
 * to fire.
 */
Player.prototype.fireMissile = function() {
  if(this.missileCount > 0){
    var position = Vector.add(this.position, {x:0, y:30})
    var missile = new Missile(position);
    this.missiles.push(missile);
    this.missileCount--;
  }
}

//Builds and maintains the environment
function Environment()
{
    this.backgroundLower = new Image();
    this.backgroundLower.src = 'assets/TileMaps/Clouds.png';
    this.backgroundMiddle = new Image();
    this.backgroundTop = new Image();
    this.firstRenderY = 0;
    this.secondRenderY = -1024;
    this.inFirstBackground = true;
}

//Update environment animations
Environment.prototype.update = function(elapsedTime)
{
    if (camera.currentCenterY - 393 < this.firstRenderY && camera.currentCenterY - 393 > this.firstRenderY - this.backgroundLower.height && this.inFirstBackground == false)
    {
        this.secondRenderY -= 2048;
        this.inFirstBackground = true;
    }
    else if (camera.currentCenterY - 393 < this.secondRenderY && camera.currentCenterY - 393 > this.secondRenderY - this.backgroundLower.height && this.inFirstBackground == true)
    {
        this.firstRenderY -= 2048;
        this.inFirstBackground = false;
    }
}

//Renders the background to several different canvas so that they may be shifted around
Environment.prototype.render = function(elapsedTime, ctx)
{
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.drawImage(this.backgroundLower, -300, this.firstRenderY);
    ctx.drawImage(this.backgroundLower, 0, this.secondRenderY);
    ctx.restore();
}

/**
 * @constructor SmokeParticles
 * Creates a SmokeParticles engine of the specified size
 * @param {uint} size the maximum number of particles to exist concurrently
 */
function SmokeParticles(maxSize) {
  this.pool = new Float32Array(3 * maxSize);
  this.start = 0;
  this.end = 0;
  this.wrapped = false;
  this.max = maxSize;
}

/**
 * @function emit
 * Adds a new particle at the given position
 * @param {Vector} position
*/
SmokeParticles.prototype.emit = function(position) {
  if(this.end != this.max) {
    this.pool[3*this.end] = position.x;
    this.pool[3*this.end+1] = position.y;
    this.pool[3*this.end+2] = 0.0;
    this.end++;
  } else {
    this.pool[3] = position.x;
    this.pool[4] = position.y;
    this.pool[5] = 0.0;
    this.end = 1;
  }
}

/**
 * @function update
 * Updates the particles
 * @param {DOMHighResTimeStamp} elapsedTime
 */
SmokeParticles.prototype.update = function(elapsedTime) {
  function updateParticle(i) {
    this.pool[3*i+2] += elapsedTime;
    if(this.pool[3*i+2] > 2000) this.start = i;
  }
  var i;
  if(this.wrapped) {
    for(i = 0; i < this.end; i++){
      updateParticle.call(this, i);
    }
    for(i = this.start; i < this.max; i++){
      updateParticle.call(this, i);
    }
  } else {
    for(i = this.start; i < this.end; i++) {
      updateParticle.call(this, i);
    }
  }
}

/**
 * @function render
 * Renders all bullets in our array.
 * @param {DOMHighResTimeStamp} elapsedTime
 * @param {CanvasRenderingContext2D} ctx
 */
SmokeParticles.prototype.render = function(elapsedTime, ctx) {
  function renderParticle(i){
    var alpha = 1 - (this.pool[3*i+2] / 1000);
    var radius = 0.1 * this.pool[3*i+2];
    if(radius > 5) radius = 5;
    ctx.beginPath();
    ctx.arc(
      this.pool[3*i],   // X position
      this.pool[3*i+1], // y position
      radius, // radius
      0,
      2*Math.PI
    );
    ctx.fillStyle = 'rgba(160, 160, 160,' + alpha + ')';
    ctx.fill();
  }

  // Render the particles individually
  var i;
  if(this.wrapped) {
    for(i = 0; i < this.end; i++){
      renderParticle.call(this, i);
    }
    for(i = this.start; i < this.max; i++){
      renderParticle.call(this, i);
    }
  } else {
    for(i = this.start; i < this.end; i++) {
      renderParticle.call(this, i);
    }
  }
}

/**
 * @function rotate
 * Scales a vector
 * @param {Vector} a - the vector to scale
 * @param {float} scale - the scalar to multiply the vector by
 * @returns a new vector representing the scaled original
 */
function scale(a, scale) {
 return {x: a.x * scale, y: a.y * scale};
}

/**
 * @function add
 * Computes the sum of two vectors
 * @param {Vector} a the first vector
 * @param {Vector} b the second vector
 * @return the computed sum
*/
function add(a, b) {
 return {x: a.x + b.x, y: a.y + b.y};
}

/**
 * @function subtract
 * Computes the difference of two vectors
 * @param {Vector} a the first vector
 * @param {Vector} b the second vector
 * @return the computed difference
 */
function subtract(a, b) {
  return {x: a.x - b.x, y: a.y - b.y};
}

/**
 * @function rotate
 * Rotates a vector about the Z-axis
 * @param {Vector} a - the vector to rotate
 * @param {float} angle - the angle to roatate by (in radians)
 * @returns a new vector representing the rotated original
 */
function rotate(a, angle) {
  return {
    x: a.x * Math.cos(angle) - a.y * Math.sin(angle),
    y: a.x * Math.sin(angle) + a.y * Math.cos(angle)
  }
}

/**
 * @function dotProduct
 * Computes the dot product of two vectors
 * @param {Vector} a the first vector
 * @param {Vector} b the second vector
 * @return the computed dot product
 */
function dotProduct(a, b) {
  return a.x * b.x + a.y * b.y
}

/**
 * @function magnitude
 * Computes the magnitude of a vector
 * @param {Vector} a the vector
 * @returns the calculated magnitude
 */
function magnitude(a) {
  return Math.sqrt(a.x * a.x + a.y * a.y);
}

/**
 * @function normalize
 * Normalizes the vector
 * @param {Vector} a the vector to normalize
 * @returns a new vector that is the normalized original
 */
function normalize(a) {
  var mag = magnitude(a);
  return {x: a.x / mag, y: a.y / mag};
}

function UpdateTimers(elapsedTime)
{
    //Update tenth-second timer
    if (tenthSecond > 100)
    {
        tenthSecond = 0;
    }
    tenthSecond += elapsedTime;

    //Update one second timer
    if (oneSecond > 1000) {
        timeOnLevel++;
        oneSecond = 0;

        if (lasers.runningCooldown > 0) {
            lasers.runningCooldown--;
        }
        else if (lasers.runningCooldown == 0) {
            lasers.fireable = true;
        }
    }
    oneSecond += elapsedTime;

    //Update five second timer
    if (fiveSeconds > 5000)
    {
        fiveSeconds = 0;
        congratsDiv.innerHTML = "";
    }
    fiveSeconds += elapsedTime;
}

function NewLevel()
{
    timeOnLevel = 0;
    newLevelFlag = false;
    level++;
}

function GameOver(message)
{
    gameOverFlag = true;
    messageDiv.innerHTML = message;
}

/**
 * @function masterLoop
 * Advances the game in sync with the refresh rate of the screen
 * @param {DOMHighResTimeStamp} timestamp the current time
 */
var masterLoop = function (timestamp) {
    game.loop(timestamp);
    window.requestAnimationFrame(masterLoop);
}
masterLoop(performance.now());
