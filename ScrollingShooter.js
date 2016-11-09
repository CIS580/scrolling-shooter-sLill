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
//Enemy
//Environment
//smokeParticles
//upgradeParticles
//rotate
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
var enemiesRemaining = 1;
var maxEnemiesAtOnce = 1;
var godMode = false;
var enemiesOnScreen = 0;
var gameOverFlag = false;
var newLevelFlag = true;
var bossSpawned = false;
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
var bullets = new BulletPool(150, 500);
var lasers = new LaserPool(10);
var player = new Player(bullets);
var enemies = [];
var fuel = new Fuel();
var environment = new Environment();
var smokeParticles = new SmokeParticles(200);
var upgradeParticles = new UpgradeParticles(200);

//Initialize Html
var instructionsDiv = document.getElementById("instructionsDiv");
instructionsDiv.innerHTML = "<b>W-A-S-D</b> or the arrow keys to move <br><b>Spacebar</b> to fire your primary weapon <br>'<b>F</b>' to fire your secondary weapon <br>'<b>P</b>' to pause the game<br><b>'G'</b> for God/Debugging mode";
var instructionsDiv2 = document.getElementById("instructionsDiv2");
instructionsDiv2.innerHTML = ("&#8226 Each enemy killed boosts your score and increases your attack speed permanently <br>&#8226 Grab powerups to increase weapon strength <br>&#8226 Clear all enemies to advance to the next level <br>&#8226 Run out of fuel or run out of lives and it's game over");
var messageDiv = document.getElementById("messageDiv");
var congratsDiv = document.getElementById("congratsDiv");
var fpsDiv = document.getElementById("fpsDiv");
var scoreDiv = document.getElementById("scoreDiv");
var levelDiv = document.getElementById("levelDiv");
var attackSpeedDiv = document.getElementById("attackSpeedDiv");
var godModeDiv = document.getElementById("godModeDiv");

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
            input.down = false;
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
        case 'g':
            godModeDiv.innerHTML = "GodMode";
            attackSpeed = 100;
            godMode = true;
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
    if (newLevelFlag == true)
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

    //Determine if an enemy should be spawned
    if (enemiesOnScreen < maxEnemiesAtOnce && enemiesRemaining > maxEnemiesAtOnce)
    {
        enemies[enemiesOnScreen] = new Enemy(level);
        enemiesOnScreen++;
    }
    //Determine if boss should be spawned
    if (enemiesOnScreen == 0 &&  enemiesRemaining == 1 && bossSpawned == false)
    {
        bossSpawned = true;
        enemies[enemiesOnScreen] = new Enemy(level + 3);
        enemiesOnScreen++;
    }

    //Determine if a laser should be fired
    if (input.f && lasers.fireable)
    {
        var veloc = { x: 0, y: -8 };
        lasers.add(player.position, veloc);
    }

    //Determine if a bullet should be fired
    if (input.space && timeSinceLastBullet > bullets.rateOfFire)
    {
        var veloc = {x: 0, y: -10};
        player.bullets.add(player.position, veloc);
        timeSinceLastBullet = 0;
    }
    timeSinceLastBullet += elapsedTime;


    // update the camera
    camera.update(player.position);
    //Update fuel
    fuel.update(elapsedTime);

    //Update enemies
    for (var i = 0; i < enemiesOnScreen; i++)
    {
        if (enemies[i].hp <= 0)
        {
            var xDeath = enemies[i].x;
            var yDeath = enemies[i].y;
            smokeParticles.wrapped = true;
            if (enemies[i].rank > 1)
            {
                //Spawn powerup and particles
                upgradeParticles.xOrigin = 500;
                upgradeParticles.yOrigin = player.position.y - 400;
                for (var k = 0; k < upgradeParticles.maxSize / 2; k++) 
                {
                    var randX = 500 + (-1 * (Math.floor(Math.random() * 50) + 1));
                    var randY = (player.position.y - 400) + (-1 * (Math.floor(Math.random() * 50) +1));
                    upgradeParticles.emit({ x: randX, y: randY });
                    upgradeParticles.emit({ x: -randX, y: -randY });
                }

                lasers.upgradeX = upgradeParticles.xOrigin - 25;
                lasers.upgradeY = player.position.y - 430;
                score += 450;
            }
            var temp = enemies;
            for (var j = i; j < enemiesOnScreen-1; j++)
            {
                enemies[j] = temp[j + 1];
            }
            enemies[enemiesOnScreen - 1] = 'undefined';
            enemiesRemaining--;
            score += 50;
            attackSpeed += 1;
            bullets.rateOfFire = 500 - (500 * (attackSpeed / 100));

            //Smoke Particles
            for (var k = 0; k < smokeParticles.max/2; k++)
            {
                var randX = (xDeath + 50) + (-1 * (Math.floor(Math.random() * 50) + 5));
                var randY = (yDeath + 50) + (-1 * (Math.floor(Math.random() * 50) + 5));
                smokeParticles.emit({ x: randX, y: randY });
                smokeParticles.emit({ x: -randX, y: -randY });
            }
            if (bullets.rateOfFire < 0)
            {
                bullets.rateOfFire = 1;
            }
            enemiesOnScreen--;
            i--;
        }
        else
        {
            enemies[i].update(elapsedTime);
        }
    }

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

  smokeParticles.update(elapsedTime);
  upgradeParticles.update(elapsedTime);
  environment.update(elapsedTime);


    //Check player hp
  if (player.spawnInvincibilityTimer > 0)
  {
      player.spawnInvincibilityTimer -= elapsedTime;
  }
  if(player.hp <= 0 && player.spawnInvincibilityTimer <= 0)
  {
      lives--;
      player.spawnInvincibilityTimer = 3000;

      for (var k = 0; k < smokeParticles.max / 2; k++) {
          var randX = (player.position.x + 45) + (-1 * (Math.floor(Math.random() * 50) + 5));
          var randY = (player.position.y + 50) + (-1 * (Math.floor(Math.random() * 50) + 5));
          smokeParticles.emit({ x: randX, y: randY });
          smokeParticles.emit({ x: -randX, y: -randY });
      }

      //Check if it's game over
      if(lives == 0)
      {
          GameOver("GameOver");
          player.hp = 0;
      }
      else
      {
          player.hp = 100;
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
    bullets.render(elapsedTime, ctx, "white");

    //Render the lasers
    lasers.render(elapsedTime, ctx);

    //Render the enemies
    for (var i = 0; i < enemiesOnScreen; i++)
    {
        enemies[i].render(ctx, elapsedTime);
    }

    //Render Particles
    smokeParticles.render(elapsedTime, ctx);
    upgradeParticles.render(ctx, elapsedTime);

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
            this.fuelArr[2 * this.end + 1] = -1*(Math.floor(Math.random() * (-1*(environment.secondRenderY)))) + environment.secondRenderY;
        }
        else
        {
            this.fuelArr[2 * this.end + 1] = -1*(Math.floor(Math.random() * (-1*(environment.firstRenderY)))) + environment.firstRenderY;
        }
        this.end++;
    }
}

//Checks if gas cans are picked up and if the fuel meter needs to be adjusted
Fuel.prototype.update = function(elapsedTime)
{
    //Determine if the fuel meter will need to be adjusted in the next frame
    if(fiveSeconds > 5000 && godMode == false)
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
        lives--;
        if (lives == 0)
        {
            GameOver("You ran out of fuel<br><br>GameOver");
        }
        player.hp = 100;
    }

    //Check if the fuel object has been grabbed or passed by the player
    var removed = false;
    for(var i = 0; i < this.end*2; i+=2)
    {
        if (removed == true)
        {
            removed = false;
            i -= 2;
        }
        //Within X bounds
        if ((player.position.x > this.fuelArr[i] && player.position.x < (this.fuelArr[i] + 50)) || this.fuelArr[i + 1] > player.position.y + 600)
        {
            //Within Y bounds or passed the player
            if ((player.position.y > this.fuelArr[i + 1] && player.position.y < (this.fuelArr[i + 1] + 50)) || this.fuelArr[i + 1] > player.position.y + 600)
            {
                if (player.position.y > this.fuelArr[i + 1] && player.position.y < (this.fuelArr[i + 1] + 50))
                {
                    this.fuelMeter = 7;
                }

                var newArr = new Float32Array(2 * 20);
                removed = true;
                var k = 0;

                for(var j = 0; j < this.end*2; j+=2)
                {                   
                    //Add all cans to the new array except the one we just hit with our player
                    if(this.fuelArr[i] != this.fuelArr[j] && this.fuelArr[i+1] != this.fuelArr[j+1])
                    {                      
                        newArr[k] = this.fuelArr[j];
                        newArr[k + 1] = this.fuelArr[j + 1];
                        k += 2;
                    }
                }
                this.fuelArr = newArr;
                this.end--;
            }
        }
    }
    for (var i = 0; i < this.end*2; i+=2)
    {
        this.fuelArr[i + 1]++;
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
BulletPool.prototype.render = function (elapsedTime, ctx, color)
{
    // Render the bullets 
  ctx.save();
  ctx.beginPath();

  ctx.fillStyle = color;
  for(var i = 0; i < this.end; i++) {
    ctx.moveTo(this.pool[4*i], this.pool[4*i+1]);
    ctx.arc(this.pool[4*i], this.pool[4*i+1], 4, 0, 2*Math.PI);
  }
  ctx.fill();
  ctx.restore();
}

//Creates a laserPool
function LaserPool(maxSize)
{
    this.pool = new Float32Array(4 * maxSize);
    this.upgradeX = -1;
    this.upgradeY;
    this.end = 0;
    this.max = maxSize;
    this.laserType = 1;
    this.fireable = 1;
    this.cooldown = 1;
    this.runningCooldown = 0;
    this.laserColor = 'orange';
    this.currentMeterHeight = 80;
    this.dmg = 3;
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
            this.laserColor = orange;
            this.dmg = 3;
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

    //Check if any powerups were picked up
    if(player.position.y < this.upgradeY && enemiesRemaining == 0)
    {
        this.upgradeX = -1;
        this.laserColor = "purple";
        this.dmg = 5;
        this.cooldown = 0.5;
        newLevelFlag = true;
        //game.paused = true;
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
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    //Render any powerups
    if (this.upgradeX > -1)
    {
        ctx.beginPath();
        ctx.moveTo(this.upgradeX, this.upgradeY + 20);
        ctx.lineTo(this.upgradeX + 20, this.upgradeY);
        ctx.arc(this.upgradeX, this.upgradeY, 20, 0, Math.PI, true);
        ctx.closePath();
        ctx.fillStyle = "purple";
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(this.upgradeX, this.upgradeY + 20);
        ctx.lineTo(this.upgradeX + 20, this.upgradeY);
        ctx.arc(this.upgradeX, this.upgradeY, 20, 0, Math.PI, true);
        ctx.closePath();
        ctx.strokeStyle = "gold";
        ctx.stroke();
    }
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
    this.currentCenterY = 693;
    this.currentPlayerX = 512;
    this.currentPlayerY = 693;
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
        this.velocity.x -= Math.abs(acceleration.x / 160);
    }
    else if (this.velocity.x < 0) {
        this.velocity.x += Math.abs(acceleration.x / 160);
    }

    if (this.velocity.y > -0.6 && this.velocity.y < 0.6) {
        this.velocity.y = 0;
    }
    else if (this.velocity.y > 0) {
        this.velocity.y -= Math.abs(acceleration.y / 160);
    }
    else if (this.velocity.y < 0) {
        this.velocity.y += Math.abs(acceleration.y / 160);
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
    this.y += -1*Math.abs(this.velocity.y);
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
  this.pauseCanvas = document.createElement('canvas');
  this.pauseCanvas.width = screen.width;
  this.pauseCanvas.height = screen.height;
  this.pauseCtx = this.pauseCanvas.getContext('2d');

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
          congratsDiv.innerHTML = "";
          game.pause(false);
      }
      else
      {
          this.pauseCtx.fillStyle = "Orange";
          this.pauseCtx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
          this.frontCtx.drawImage(this.pauseCanvas, 0, 0);
          congratsDiv.innerHTML = "Level " + level;
          messageDiv.innerHTML = "<center>Press P to continue</center><br>Current Score: " + score;
          game.pause(true);
      }
  }

  if(!this.paused) this.update(elapsedTime);
  this.render(elapsedTime, this.frontCtx);

  // Flip the back buffer
  if (!this.paused)
  {
      this.frontCtx.drawImage(this.backBuffer, 0, 0);
  }
  else
  {
      this.frontCtx.drawImage(this.backBuffer, 0, 0);
      this.frontCtx.drawImage(this.pauseCanvas, 0, 0);
  }
}

const PLAYER_SPEED = 5;
const BULLET_SPEED = 8;

/**
 * @constructor Player
 * Creates a player
 * @param {BulletPool} bullets the bullet pool
 */
function Player(bullets) {
  this.hp = 100;
  this.bullets = bullets;
  this.angle = 0;
  this.startPosition = { x: 512, y: 693 };
  this.position = {x: 512, y: 693};
  this.velocity = {x: 0, y: 0};
  this.img = new Image()
  this.img.src = 'assets/tyrian.shp.007D3C.Edit.png';
  this.spawnInvincibilityTimer = 0;
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
  if(this.position.x > 820) this.position.x = 820;
  if (this.position.y < camera.currentCenterY - 250) this.position.y = camera.currentCenterY - 250;

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
  if (this.spawnInvincibilityTimer <= 0)
  {
      ctx.translate(this.position.x, this.position.y);
      ctx.drawImage(this.img, 48 + offset, 57, 23, 27, -12.5, -12, 23, 27);
  }
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


//Builds a new enemy
function Enemy(t)
{
    this.type = t;
    this.bullets = new BulletPool(10, 500);
    this.hp;
    this.enemyImage = new Image();
    this.width;
    this.height;
    this.x = Math.floor(Math.random() * 800) + 50;
    this.y = camera.currentCenterY -1300;
    this.sWidth;
    this.sHeight;
    this.sx;
    this.sy;
    this.fireRate;
    this.timeSinceLastShot = 500;
    this.bulletCount = 0;
    this.xOffSet;
    this.yOffSet;
    this.rank;

    //Next X Coordinate
    this.gotoX = Math.floor(Math.random() * 800) + 50;;

    switch(this.type)
    {
        //Enemy 1
        case 1:
            this.enemyImage.src = 'assets/Boss2BadGuy4.png';
            this.sWidth = 22;
            this.sHeight = 30;
            this.sx = 25;
            this.sy = 57;
            this.width = 75;
            this.height = 75;
            this.fireRate = 1000;
            this.xOffSet = 40;
            this.yOffSet = 60;
            this.hp = 2;
            this.rank = 1;
            break;
        case 2:
            break;
        case 3:
            break;
            //Boss 1
        case 4:
            this.enemyImage.src = 'assets/Boss1.png';
            this.sWidth = 120;
            this.sHeight = 138;
            this.sx = 0;
            this.sy = 0;
            this.width = 200;
            this.height = 200;
            this.hp = 20;
            this.rank = 2;
            this.inStrafe = false;
            this.roaming = true;
            this.lasers = 0;
            this.laserSx = 160;
            this.laserSy = 140;
            this.laserSWidth = 30;
            this.laserSHeight = 110;
            this.laserWidth = 30;
            this.laserHeight = 800;
            break;
    }
}

//Update enemy movement and firing
Enemy.prototype.update = function(elapsedTime)
{
    if (this.y < (camera.currentCenterY -693))
    {
        this.y += 1.5;
    }
    else if (this.y > (camera.currentPlayerY -690))
    {
        this.y -= 2.5;
    }
    
    //Make progress towards a random X location
    if((this.x + 5 > this.gotoX && this.x -5 < this.gotoX) && this.rank == 1)
    {
        this.gotoX = Math.floor(Math.random() * 850) + 50;
    }
    else
    {
        if((this.gotoX - this.x) > 0)
        {
            this.x += 1;
        }
        else
        {
            this.x += -1;
        }
    }

    //Determine if a bullet should be fired
    if (this.timeSinceLastShot > this.fireRate && this.rank == 1)
    {
        var veloc = { x: 0, y: 4 };
        this.bullets.add({ x: (this.x + this.xOffSet), y: (this.y + this.yOffSet) }, veloc);
        this.timeSinceLastShot = 0;
        this.bulletCount++;
    }
    this.timeSinceLastShot += elapsedTime;

    //Update each bullets position
    this.bullets.update(elapsedTime, function (bullet) {
        if (!camera.onScreen(bullet)) return true;
        return false;
    });

    //Check for bullet hits
    for(var j = 0; j < 4* player.bullets.end; j+=4)
    {
        if(player.bullets.pool[j] > (this.x ) && player.bullets.pool[j] < (this.x + this.width) && player.bullets.pool[j + 1] < (this.y + this.height) && player.bullets.pool[j+1] > this.y)
        {
            player.bullets.pool[j] = player.bullets.pool[3 * player.bullets.end];
            player.bullets.pool[j + 1] = player.bullets.pool[3 * player.bullets.end + 1];
            player.bullets.pool[3 * player.bullets.end] = 'undefined';
            player.bullets.pool[3 * player.bullets.end + 1] = 'undefined';
            player.bullets.end--;
            this.hp--;
            break;
        }
    }

    for (var j = 0; j < 4 * lasers.end; j++)
    {
       if(lasers.pool[j] > this.x && lasers.pool[j] < (this.x + this.width) && lasers.pool[j + 1] < (this.y + this.height) && lasers.pool[j+1] > this.y)
        {
            lasers.pool[j] = lasers.pool[3 * lasers.end];
            lasers.pool[j + 1] = lasers.pool[3 * lasers.end + 1];
            lasers.pool[3 * lasers.end] = 'undefined';
            lasers.pool[3 * lasers.end + 1] = 'undefined';
            lasers.end--;
            this.hp -= lasers.dmg;
            break;
        }
    }

    //Check if player is hit
    for (var j = 0; j < 4 * this.bullets.end; j += 4) {
        if (this.bullets.pool[j] > (player.position.x) && this.bullets.pool[j] < (player.position.x + 30) && this.bullets.pool[j + 1] < (player.position.y + 40) && this.bullets.pool[j + 1] > player.position.y) {
            this.bullets.pool[j] = this.bullets.pool[3 * this.bullets.end];
            this.bullets.pool[j + 1] = this.bullets.pool[3 * this.bullets.end + 1];
            this.bullets.pool[3 * this.bullets.end] = 'undefined';
            this.bullets.pool[3 * this.bullets.end + 1] = 'undefined';
            this.bullets.end--;

            if (godMode == false)
            {
                player.hp -= 25;              
            }
            break;
        }
    }

    //Boss 1 updates
    if (this.rank == 2 && this.roaming == true && this.inStrafe == false)
    {
        this.roaming = false;
        fiveSeconds = 0;
        this.side = Math.floor(Math.random() * 2) + 1;
        if (this.side == 1)
        {
            this.gotoX = 40;
        }
        else
        {
            this.gotoX = 690;
        }
        this.sx = 115;
    }
    //Boss 1 updates
    if(this.inStrafe == false && this.roaming == false && this.x == this.gotoX && this.y > player.position.y - 1100)
    {
        if(fiveSeconds > 3000)
        {
            this.lasers = 1;
            this.inStrafe = true;
        }
    }
    //Boss 1 updates
    if(this.inStrafe == true && this.roaming == false && this.lasers == 1)
    {
        if (this.side == 1 && this.x < 685)
        {
            this.x += 5;
        }
        else if (this.side == 2 && this.x > 45)
        {
            this.x -= 5;
        }
        else
        {
            this.lasers = 0;
            this.roaming = true;
            this.inStrafe = false;
        }
    }

    if(this.rank == 2 && this.lasers == 1 && player.position.x > this.x + 57 && player.position.x < this.x + 97)
    {
        if (godMode == false)
        {
            player.hp = 0;
        }
    }

}

//Renders the enemy unit
Enemy.prototype.render = function(ctx, elapsedTime)
{
    ctx.save();
    //Render enemy
    ctx.drawImage(this.enemyImage, this.sx, this.sy, this.sWidth, this.sHeight, this.x, this.y, this.width, this.height);

    //Render bullets
    this.bullets.render(elapsedTime, ctx, "red");
    ctx.restore();

    //Boss 1 lasers
    if(this.lasers == 1)
    {
        ctx.drawImage(this.enemyImage, this.laserSx, this.laserSy, this.laserSWidth, this.laserSHeight, this.x + 57, this.y + 190, this.laserWidth, this.laserHeight);
        ctx.drawImage(this.enemyImage, this.laserSx, this.laserSy, this.laserSWidth, this.laserSHeight, this.x + 97, this.y + 190, this.laserWidth, this.laserHeight);
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
    this.firstRenderY++;
    this.secondRenderY++;
    if (camera.currentCenterY - 693 < this.firstRenderY && camera.currentCenterY - 693 > this.firstRenderY - this.backgroundLower.height && this.inFirstBackground == false)
    {
        this.secondRenderY -= 2048;
        this.inFirstBackground = true;
    }
    else if (camera.currentCenterY - 693 < this.secondRenderY && camera.currentCenterY - 693 > this.secondRenderY - this.backgroundLower.height && this.inFirstBackground == true)
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

function UpgradeParticles(size)
{
    this.maxSize = size;
    this.pool = new Float32Array(3 * this.maxSize);
    this.start = 0;
    this.end = 0;
    this.wrapped = true;
    this.color = "yellow";
    this.xOrigin;
    this.yOrigin;
}

UpgradeParticles.prototype.emit = function(position)
{
    if (this.end != this.max) {
        this.pool[3 * this.end] = position.x;
        this.pool[3 * this.end + 1] = position.y;
        this.pool[3 * this.end + 2] = 0.0;
        this.end++;
    } else {
        this.pool[3] = position.x;
        this.pool[4] = position.y;
        this.pool[5] = 0.0;
        this.end = 1;
    }
}

UpgradeParticles.prototype.update = function(elapsedTime)
{
    function updateParticle(i) {
        this.pool[3 * i + 2] += elapsedTime;
        if (this.pool[3 * i + 2] > 5000) this.start = i;
    }
    var i;
    if (this.wrapped) {
        for (i = 0; i < this.end; i++) {
            updateParticle.call(this, i);
        }
        for (i = this.start; i < this.max; i++) {
            updateParticle.call(this, i);
        }      
    } else {
        for (i = this.start; i < this.end; i++) {
            updateParticle.call(this, i);
        }
    }
}

UpgradeParticles.prototype.render = function(ctx, elapsedTime)
{
    function renderParticle(i){
        var alpha = 1 - (this.pool[3*i+2] / 1000);
         var radius = 0.1 * this.pool[3 * i + 2];
        if (radius > 5) radius = 5;
        ctx.beginPath();
        ctx.arc(
          this.pool[3 * i],   // X position
          this.pool[3 * i + 1], // y position
          radius, // radius
          0,
          2 * Math.PI
        );
        ctx.fillStyle = 'rgba(204, 204, 0,' + alpha + ')';
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
    level++;
    enemiesRemaining = 20 + (5*level);
    maxEnemiesAtOnce += 2
    newLevelFlag = false;
    bossSpawned = false;
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
