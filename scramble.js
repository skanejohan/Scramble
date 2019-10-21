
const gameCanvas = document.getElementById('gameCanvas');
const gameCtx = gameCanvas.getContext('2d');

const infoCanvas = document.getElementById('infoCanvas');
const infoCtx = infoCanvas.getContext('2d');

var input;
var upperObstacleFactory;
var lowerObstacleFactory;
var defaultCursor;

// ------------------------------ Constants ------------------------------

const initialPlayerX = 100;
const initialPlayerY = 300;
const initialShips = 3;
const scrollSpeed = 50;
const bulletSpeed = 200;
const playerSpeed = 100;
const GameState = {
    IDLE: 1,
    PLAYING: 2,
    LIFELOST: 3,
    GAMEOVER: 4
}

// ------------------------------ Game context ------------------------------

let gameContext = {
    player: createPlayerItem(initialPlayerX, initialPlayerY),
    gameState: GameState.IDLE,
    ships: initialShips,
    score: 0,
    bombs: [],
    bullets: [],
    enemyRockets: [],
    enemySpaceships: [],
    obstacles: [],
}        

function resetGame() {
    gameContext.gameState = GameState.IDLE;
    gameContext.ships = initialShips;
    gameContext.score = 0;
    gameContext.bombs = [];
    gameContext.bullets = [];
    gameContext.enemyRockets = [];
    gameContext.enemySpaceships = [];
    gameContext.obstacles = [];
    addInitialObstacles();
    respawnPlayer();
}

function respawnPlayer() {
    gameContext.player.x = initialPlayerX;
    gameContext.player.y = initialPlayerY;
    gameContext.player.hasCollided = false;
}

function setGameState(newState) {
    gameContext.gameState = newState;
    if (newState == GameState.IDLE) {
        resetGame();
        gameCanvas.style.cursor = defaultCursor;
        gameCanvas.addEventListener('click', () => setGameState(GameState.PLAYING), {once: true});
    }
    if (newState == GameState.LIFELOST) {
        gameContext.ships -= 1;
        if (gameContext.ships == 0) {
            setGameState(GameState.GAMEOVER);
        }
        else {
            setTimeout(() => setGameState(GameState.PLAYING), 1000);
        }
    }
    if (newState == GameState.PLAYING) {
        gameCanvas.style.cursor = "none";
        respawnPlayer();
    }
    if (newState == GameState.GAMEOVER) {
        setTimeout(() => setGameState(GameState.IDLE), 3000);
    }
}

// ------------------------------ Handle input ------------------------------

class Input {

    constructor(doc) {
        this._up = false;
        this._down = false;
        this._right = false;
        this._left = false;
        this._fireBullet = false;
        this._firingBullet = false;
        this._fireBomb = false;
        this._firingBomb = false;
        doc.addEventListener('keydown', this._keyDownHandler.bind(this), false);
        doc.addEventListener('keyup', this._keyUpHandler.bind(this), false);
    }

    get up() { return this._up; }
    get down() { return this._down; }
    get right() { return this._right; }
    get left() { return this._left; }
    get fireBullet() {
        if (this._fireBullet) {
            this._fireBullet = false;
            return true;
        }
    }
    get fireBomb() {
        if (this._fireBomb) {
            this._fireBomb = false;
            return true;
        }
    }

    _keyDownHandler(e) {
        switch (e.keyCode) {
            case 37: 
                this._left = true;
                break;
            case 38: 
                this._up = true;
                break;
            case 39: 
                this._right = true;
                break;
            case 40: 
                this._down = true;
                break;
            case 65:  // 's'
                if (!this._firingBomb) {
                    this._fireBomb = true;
                    this._firingBomb = true;
                }
                break;
        case 83: // 'a'
                if (!this._firingBullet) {
                    this._fireBullet = true;
                    this._firingBullet = true;
                }
                break;
            default:
                console.log(e.keyCode);
                break;
        }
    }
    
    _keyUpHandler(e) {
        switch (e.keyCode) {
            case 37: 
                this._left = false;
                break;
            case 38: 
                this._up = false;
                break;
            case 40: 
                this._down = false;
                break;
            case 39: 
                this._right = false;
                break;
            case 65:
                this._firingBomb = false;
                break;
            case 83:
                this._firingBullet = false;
                break;
        }
    }    
}

// ------------------------------ Generate game items ------------------------------

/* All items have the common structure:
        {
            x: ..., // Current x
            y: ..., // Current y
            lines: () => [line]              // All lines comprising the object, for collission detection
            boundingBox: () => boundingBox   // The object's bounding box, for collission detection
            draw: () => { ... }              // Draw the object at given coordinates
        }

    To create an obstacle, call either upperObstacleItemsFactory.create(x) or lowerObstacleItemsFactory.create(x).
    The factories are needed since a generated obstacle depends on the one generated before it. Also note that 
    the create function returns an array of obstacles, since the blue filled areas above / below the actual 
    obstacles also count. To create the player, call createPlayerItem(x, y). To create a rocket, call 
    createRocketItem(x, y).
*/

function createPlayerItem(x, y) {
    var obj = {
        x : x,
        y : y,
    };
    obj.draw = function(){
        gameCtx.lineWidth = 2;
        gameCtx.strokeStyle = "#FFFFFF";
        gameCtx.beginPath();
        gameCtx.moveTo(this.x-20, this.y-10);
        gameCtx.lineTo(this.x+20, this.y);
        gameCtx.lineTo(this.x-20, this.y+10);
        gameCtx.lineTo(this.x-20, this.y-10);
        gameCtx.stroke();
    };
    obj.lines = function() {
        return [
            { x1 : this.x-20, y1 : this.y-10, x2 : this.x+20, y2 : this.y    },
            { x1 : this.x+20, y1 : this.y,    x2 : this.x-20, y2 : this.y+10 },
            { x1 : this.x-20, y1 : this.y+10, x2 : this.x-20, y2 : this.y-10 },
        ]
    };
    obj.boundingBox = function() {
        return { left : this.x-20, top : this.y-10, right : this.x+20, bottom : this.y+10 } 
    };
    return obj;
}

function createRocketItem(x, y) {
    var obj = {
        x : x,
        y : y,
    };
    obj.draw = function() {
        gameCtx.lineWidth = 2;
        gameCtx.strokeStyle = "#3ED6C4";
        gameCtx.beginPath();
        gameCtx.moveTo(this.x-5, this.y+10);
        gameCtx.lineTo(this.x,   this.y-10);
        gameCtx.lineTo(this.x+5, this.y+10);
        gameCtx.lineTo(this.x-5, this.y+10);
        gameCtx.stroke();
    };
    obj.lines = function() {
        return [
            { x1 : this.x-5, y1 : this.y+10, x2 : this.x,   y2 : this.y-10 },
            { x1 : this.x,   y1 : this.y-10, x2 : this.x+5, y2 : this.y+10 },
            { x1 : this.x+5, y1 : this.y+10, x2 : this.x-5, y2 : this.y+10 },
        ]
    };
    obj.boundingBox = function() {
        return { left : this.x-5, top : this.y-10, right : this.x+5, bottom : this.y+10 } 
    };
    obj.liftOffAtX = 400 + 300 * Math.random();
    return obj;
}

class ObstacleFactory {

    constructor(upper, onLowerFlatEdgeAdded) {
        this._upper = upper;
        this._y = upper ? 0 : 600;
        this.onLowerFlatEdgeAdded = onLowerFlatEdgeAdded;
    }

    create(x) {
        var result = [];
        var newY = this._getNewY();
        result.push(this._createObstacle(x, this._y, newY));
        if (this._y == 200 || newY == 200 || (this._y == 100 && newY == 100)) {
            result.push(this._createBlock(x, 0));
        }
        if (this._y == 400 || newY == 400 || (this._y == 500 && newY == 500)) {
            result.push(this._createBlock(x, 500));
        }
        this._y = newY;
        return result;
    }

    _getNewY() {
        if (this._y == 0)   { return Math.random() < 0.5 ? 0 : 100; }
        if (this._y == 100) { return Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? 200 : 100; }
        if (this._y == 200) { return 100; }
        if (this._y == 400) { return 500; }
        if (this._y == 500) { return Math.random() < 0.5 ? 600 : Math.random() < 0.5 ? 400 : 500; }
        if (this._y == 600) { return Math.random() < 0.5 ? 600 : 500; }
    }

    _createObstacle(x, oldY, newY) {
        if (oldY == newY) { return this._createFlatEdge(x, oldY); }    
        if (oldY > newY)  { return this._createRisingEdge(x, oldY); }    
        if (oldY < newY)  { return this._createSlopingEdge(x, oldY); }    
    }
    
    _createFlatEdge(x, y) {
        if (!this.upper && this.onLowerFlatEdgeAdded) {
            this.onLowerFlatEdgeAdded(x, y);
        }
        var obj = { x: x, y: y };
        obj.draw = function() {
            gameCtx.lineWidth = 4;
            gameCtx.strokeStyle = "#FFFFFF";
            gameCtx.beginPath();
            gameCtx.moveTo(this.x-1,   this.y);
            gameCtx.lineTo(this.x+100, this.y);
            gameCtx.stroke();
        };
        obj.lines = function() {
            return [
                { x1 : this.x-1, y1 : this.y, x2 : this.x+100, y2 : this.y },
            ]
        };
        obj.boundingBox = function() {
            return { left : this.x-1, top : this.y, right : this.x+100, bottom : this.y+1 } 
        };
        return obj;
    }
    
    _createRisingEdge(x, y) {
        var obj = { x: x, y: y };
        if (this._upper) {
            obj.draw = function() {
                gameCtx.lineWidth = 1;
                gameCtx.fillStyle = "#7090E7";
                gameCtx.strokeStyle = "#7090E7";
                gameCtx.beginPath();
                gameCtx.moveTo(this.x-1,   this.y);
                gameCtx.lineTo(this.x+100, this.y-100);
                gameCtx.lineTo(this.x-1,   this.y-100);
                gameCtx.lineTo(this.x-1,   this.y);    
                gameCtx.fill();
                gameCtx.lineWidth = 4;
                gameCtx.strokeStyle = "#FFFFFF";
                gameCtx.beginPath();
                gameCtx.moveTo(this.x-1,   this.y    );
                gameCtx.lineTo(this.x+100, this.y-100);
                gameCtx.stroke();
            };
        }
        else {
            obj.draw = function() {
                gameCtx.lineWidth = 1;
                gameCtx.fillStyle = "#7090E7";
                gameCtx.strokeStyle = "#7090E7";
                gameCtx.beginPath();
                gameCtx.moveTo(this.x-1,   this.y);
                gameCtx.lineTo(this.x+100, this.y-100);
                gameCtx.lineTo(this.x+100, this.y);
                gameCtx.lineTo(this.x-1,   this.y);    
                gameCtx.fill();
                gameCtx.lineWidth = 4;
                gameCtx.strokeStyle = "#FFFFFF";
                gameCtx.beginPath();
                gameCtx.moveTo(this.x-1,   this.y    );
                gameCtx.lineTo(this.x+100, this.y-100);
                gameCtx.stroke();
            };
        }
        obj.lines = function() {
            return [
                { x1 : this.x-1, y1 : this.y, x2 : this.x+100, y2 : this.y-100 },
            ]
        };
        obj.boundingBox = function() {
            return { left : this.x-1, top : this.y-100, right : this.x+100, bottom : this.y } 
        };
        return obj;
    }
    
    _createSlopingEdge(x, y) {
        var obj = { x: x, y: y };
        if (this._upper) {
            obj.draw = function() {
                gameCtx.lineWidth = 1;
                gameCtx.fillStyle = "#7090E7";
                gameCtx.strokeStyle = "#7090E7";
                gameCtx.beginPath();
                gameCtx.moveTo(this.x-1,   this.y);
                gameCtx.lineTo(this.x+100, this.y+100);
                gameCtx.lineTo(this.x+100, this.y);
                gameCtx.lineTo(this.x-1,   this.y);    
                gameCtx.fill();
                gameCtx.lineWidth = 4;
                gameCtx.strokeStyle = "#FFFFFF";
                gameCtx.beginPath();
                gameCtx.moveTo(this.x-1,   this.y    );
                gameCtx.lineTo(this.x+100, this.y+100);
                gameCtx.stroke();
            };
        }
        else {
            obj.draw = function() {
                gameCtx.lineWidth = 1;
                gameCtx.fillStyle = "#7090E7";
                gameCtx.strokeStyle = "#7090E7";
                gameCtx.beginPath();
                gameCtx.moveTo(this.x-1,   this.y);
                gameCtx.lineTo(this.x+100, this.y+100);
                gameCtx.lineTo(this.x-1,   this.y+100);
                gameCtx.lineTo(this.x-1,   this.y);    
                gameCtx.fill();
                gameCtx.lineWidth = 4;
                gameCtx.strokeStyle = "#FFFFFF";
                gameCtx.beginPath();
                gameCtx.moveTo(this.x-1,   this.y    );
                gameCtx.lineTo(this.x+100, this.y+100);
                gameCtx.stroke();
            };
        }
        obj.lines = function() {
            return [
                { x1 : this.x-1, y1 : this.y, x2 : this.x+100, y2 : this.y+100 },
            ]
        };
        obj.boundingBox = function() {
            return { left : this.x-1, top : this.y, right : this.x+100, bottom : this.y+100 } 
        };
        return obj;
    }

    _createBlock(x, y) { // Here, y represents the top of the block
        var obj = { x: x, y: y };
        obj.draw = function() {
            gameCtx.lineWidth = 1;
            gameCtx.fillStyle = "#7090E7";
            gameCtx.strokeStyle = "#7090E7";
            gameCtx.beginPath();
            gameCtx.moveTo(this.x-1,   this.y);
            gameCtx.lineTo(this.x+100, this.y);
            gameCtx.lineTo(this.x+100, this.y+100);
            gameCtx.lineTo(this.x-1,   this.y+100);
            gameCtx.lineTo(this.x-1,   this.y);    
            gameCtx.fill();
        };
        obj.lines = function() {
            return []                
        };
        obj.boundingBox = function() {
            return { left : this.x-1, top : this.y, right : this.x+100, bottom : this.y+100 } 
        };
        return obj;
    }
}

function addObstacle(x, upper) {
    var factory = upper ? upperObstacleFactory : lowerObstacleFactory;
    var newObstacles = factory.create(x);
    gameContext.obstacles = gameContext.obstacles.concat(newObstacles);
}

function addEnemiesOnLowerFlatEdge(x, y) {
    if (gameContext.gameState == GameState.PLAYING) {
        for (var i=0; i<5; i++) {
            if (Math.random() < 0.1 + gameContext.score * 0.001) {
                if (Math.random() < 0.3) {
                    gameContext.enemySpaceships.push(createSpaceshipItem(x+10+20*i, y-10));
                }
                else {
                    gameContext.enemyRockets.push(createRocketItem(x+10+20*i, y-10));
                }
            }
        }
    }
}

function addInitialObstacles() {
    gameContext.obstacles.push(upperObstacleFactory._createFlatEdge(0, 0));
    gameContext.obstacles.push(upperObstacleFactory._createFlatEdge(100, 0));
    gameContext.obstacles.push(upperObstacleFactory._createFlatEdge(200, 0));
    gameContext.obstacles.push(upperObstacleFactory._createFlatEdge(300, 0));
    gameContext.obstacles.push(upperObstacleFactory._createFlatEdge(400, 0));
    gameContext.obstacles.push(upperObstacleFactory._createFlatEdge(500, 0));
    gameContext.obstacles.push(upperObstacleFactory._createFlatEdge(600, 0));
    gameContext.obstacles.push(upperObstacleFactory._createFlatEdge(700, 0));
    gameContext.obstacles.push(lowerObstacleFactory._createFlatEdge(0, 600));
    gameContext.obstacles.push(lowerObstacleFactory._createFlatEdge(100, 600));
    gameContext.obstacles.push(lowerObstacleFactory._createFlatEdge(200, 600));
    gameContext.obstacles.push(lowerObstacleFactory._createFlatEdge(300, 600));
    gameContext.obstacles.push(lowerObstacleFactory._createFlatEdge(400, 600));
    gameContext.obstacles.push(lowerObstacleFactory._createFlatEdge(500, 600));
    gameContext.obstacles.push(lowerObstacleFactory._createFlatEdge(600, 600));
    gameContext.obstacles.push(lowerObstacleFactory._createFlatEdge(700, 600));
    addObstacle(800, true);
    addObstacle(800, false);


}

function createBullet(x, y) {
    var obj = {
        x : x,
        y : y,
    };
    obj.draw = function(){
        gameCtx.lineWidth = 2;
        gameCtx.strokeStyle = "#FFFFFF";
        gameCtx.beginPath();
        gameCtx.moveTo(this.x, this.y);
        gameCtx.lineTo(this.x+3, this.y);
        gameCtx.stroke();
    };
    obj.lines = function() {
        return [
            { x1 : this.x, y1 : this.y, x2 : this.x+3, y2 : this.y },
        ]
    };
    obj.boundingBox = function() {
        return { left : this.x, top : this.y-1, right : this.x+3, bottom : this.y+1 } 
    };
    return obj;
}

function createBomb(x, y) {
    var obj = {
        x : x,
        y : y,
    };
    obj.draw = function() {
        gameCtx.lineWidth = 2;
        gameCtx.strokeStyle = "#FFFFFF";
        gameCtx.beginPath();
        gameCtx.moveTo(this.x,   this.y-2);
        gameCtx.lineTo(this.x+2, this.y);
        gameCtx.lineTo(this.x,   this.y+2);
        gameCtx.lineTo(this.x-2, this.y);
        gameCtx.stroke();
    };
    obj.lines = function() {
        return [
            { x1 : this.x, y1 : this.y-2, x2 : this.x+2, y2 : this.y },
            { x1 : this.x+2, y1 : this.y, x2 : this.x, y2 : this.y+2 },
            { x1 : this.x, y1 : this.y+2, x2 : this.x-2, y2 : this.y },
            { x1 : this.x-2, y1 : this.y, x2 : this.x, y2 : this.y-2 },
        ]
    };
    obj.boundingBox = function() {
        return { left : this.x-2, top : this.y-2, right : this.x+2, bottom : this.y+2 } 
    };
    obj.dir = 0.2;
    return obj;
}

function createSpaceshipItem(x, y) {
    var obj = {
        x : x,
        y : y,
    };
    obj.draw = function() {
        gameCtx.lineWidth = 2;
        gameCtx.strokeStyle = "#FFFFFF";
        gameCtx.beginPath();
        gameCtx.moveTo(this.x-7,  this.y-4);
        gameCtx.lineTo(this.x+7, this.y-4);
        gameCtx.lineTo(this.x,   this.y+4);
        gameCtx.lineTo(this.x-7, this.y-4);
        gameCtx.stroke();
    };
    obj.lines = function() {
        return [
            { x1 : this.x-7, y1 : this.y-4, x2 : this.x+7, y2 : this.y-4 },
            { x1 : this.x+7, y1 : this.y-4, x2 : this.x,   y2 : this.y+4 },
            { x1 : this.x,   y1 : this.y+4, x2 : this.x-7, y2 : this.y-4 },
        ]
    };
    obj.boundingBox = function() {
        return { left : this.x-7, top : this.y-4, right : this.x+7, bottom : this.y+4 } 
    };
    obj.dir = 3 * Math.PI / 2;
    obj.radiusFactor = 1 + 3 * Math.random();
    obj.startRotatingAtY = 500 - 200 * Math.random();
    obj.rotating = false;
    return obj;
}

// ------------------------------ Collission detection ------------------------------

function boundingBoxesOverlap(box1, box2) {
    return !(box1.right < box2.left || box1.bottom < box2.top || box2.right < box1.left || box2.bottom < box1.top);
}

function linesIntersect(line1, line2) {
    var det, gamma, lambda;
    det = (line1.x2 - line1.x1) * (line2.y2 - line2.y1) - (line2.x2 - line2.x1) * (line1.y2 - line1.y1);
    if (det === 0) {
        return false;
    } else {
        lambda = ((line2.y2 - line2.y1) * (line2.x2 - line1.x1) + (line2.x1 - line2.x2) * (line2.y2 - line1.y1)) / det;
        gamma = ((line1.y1 - line1.y2) * (line2.x2 - line1.x1) + (line1.x2 - line1.x1) * (line2.y2 - line1.y1)) / det;
        return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }
};

function itemsCollide(item1, item2) {
    var item1boundingBox = item1.travelledBoundingBox ? item1.travelledBoundingBox : item1.boundingBox();
    var item1lines = item1.travelledLine ? [item1.travelledLine] : item1.lines();
    var item2boundingBox = item2.travelledBoundingBox ? item2.travelledBoundingBox : item2.boundingBox();
    var item2lines = item2.travelledLine ? [item2.travelledLine] : item2.lines();

    if (!boundingBoxesOverlap(item1boundingBox, item2boundingBox)) {
        return false;
    }

    var collission = false;
    item1lines.forEach(l1 => {
        item2lines.forEach(l2 => {
            if (linesIntersect(l1, l2)) {
                collission = true;
            }
        });
    });
    return collission;
}

// ------------------------------ Movement ------------------------------

function moveBomb(b, dt)
{
    var dX = (1-b.dir) * bulletSpeed / dt;
    var dY = b.dir * bulletSpeed / dt;
    b.dir = Math.min(b.dir + 0.5 / dt, 1.00);
    b.travelledLine = { x1 : b.x, y1 : b.y, x2 : b.x+dX + 2, y2 : b.y+dY+2 };
    b.travelledBoundingBox = { x1 : b.x, y1 : b.y-1, x2 : b.x+dX + 2, y2 : b.y+dY+2 };
    b.x += dX;
    b.y += dY; 
}

function moveBullet(b, dt) {
    var dX = bulletSpeed / dt;
    b.travelledLine = { x1 : b.x, y1 : b.y, x2 : b.x+dX + 3, y2 : b.y };
    b.travelledBoundingBox = { x1 : b.x, y1 : b.y-1, x2 : b.x+dX + 3, y2 : b.y+2 };
    b.x += dX; 
}

function moveRocket(r, dt) {
    r.x -= scrollSpeed / dt;
    if (r.x < r.liftOffAtX) {
        r.y -= scrollSpeed / dt;
    }
}

function moveSpaceship(b, dt)
{
    var dx, dy;
    if (b.y > b.startRotatingAtY && !b.rotating) {
        dx = 0;
        dy = -scrollSpeed / dt;
    }
    else {
        b.rotating = true;
        dx = scrollSpeed / dt * b.radiusFactor * Math.cos(b.dir);
        dy = scrollSpeed / dt * b.radiusFactor * Math.sin(b.dir);
        b.dir += 0.1;
    }
    b.x += (dx - scrollSpeed / dt);
    b.y += dy;
}

// ------------------------------ Update ------------------------------

function update(dt) {
    if (gameContext.gameState == GameState.PLAYING) {
        // Move the player.
        if (input.left)  { gameContext.player.x -= playerSpeed / dt; }
        if (input.up)    { gameContext.player.y -= playerSpeed / dt; }
        if (input.right) { gameContext.player.x += playerSpeed / dt; }
        if (input.down)  { gameContext.player.y += playerSpeed / dt; }
        if (gameContext.player.x < 100) { gameContext.player.x = 100; }
        if (gameContext.player.x > 700) { gameContext.player.x = 700; }
    
        // Fire
        if (input.fireBullet) { 
            gameContext.bullets.push(createBullet(gameContext.player.x + 20, gameContext.player.y)); 
        }
        if (input.fireBomb) {
            gameContext.bombs.push(createBomb(gameContext.player.x + 10, gameContext.player.y+10))
        }

        // Move the obstacles. Add and remove obstacles as needed.
        var lastX;
        gameContext.obstacles.forEach(o => {
            o.x -= scrollSpeed / dt;
            lastX = o.x;
        });    
        if (lastX < 710) {
            addObstacle(lastX + 100, true);
            addObstacle(lastX + 100, false);
            gameContext.obstacles = gameContext.obstacles.filter(o => o.x > -100);
        }

        gameContext.enemyRockets.forEach(r => moveRocket(r, dt));
        gameContext.bullets.forEach(b => moveBullet(b, dt));
        gameContext.bombs.forEach(b => moveBomb(b, dt));
        gameContext.enemySpaceships.forEach(s => moveSpaceship(s, dt));

        // Perform collission detection
        var enemies = gameContext.enemyRockets.concat(gameContext.enemySpaceships);

        gameContext.obstacles.forEach(o => {
            if (itemsCollide(o, gameContext.player)) {
                gameContext.player.hasCollided = true;
            }
        });

        enemies.forEach(r => {
            if (itemsCollide(r, gameContext.player)) {
                gameContext.player.hasCollided = true;
                r.hasCollided = true;
            }
            gameContext.obstacles.forEach(o => {
                if (itemsCollide(o, r)) {
                    r.hasCollided = true;
                }
            });
        });

        gameContext.bullets.forEach(b => {
            enemies.forEach(r => {
                if (itemsCollide(b, r)) {
                    b.hasCollided = true;
                    r.hasCollided = true;
                    gameContext.score += 10;
                }
            });
        });

        gameContext.bombs.forEach(b => {
            enemies.forEach(r => {
                if (itemsCollide(b, r)) {
                    b.hasCollided = true;
                    r.hasCollided = true;
                    gameContext.score += 10;
                }
            });
            gameContext.obstacles.forEach(o => {
                if (itemsCollide(o, b)) {
                    b.hasCollided = true;
                }
            });
        });

        gameContext.bullets = gameContext.bullets.filter(b => b.x < 810 && !b.hasCollided);
        gameContext.enemyRockets = gameContext.enemyRockets.filter(r => !r.hasCollided);
        gameContext.enemySpaceships = gameContext.enemySpaceships.filter(s => s.x > -10 && !s.hasCollided);
        gameContext.bombs = gameContext.bombs.filter(b => !b.hasCollided);

        if (gameContext.player.hasCollided) {
            setGameState(GameState.LIFELOST);
        }
    }
}

// ------------------------------ Draw ------------------------------

function drawInfo() {
    infoCtx.fillStyle = "white";
    infoCtx.font = "18px Arial";
    infoCtx.fillText("SCORE:", 10, 21);
    var rest = gameContext.score;
    var sc1 = Math.floor(rest / 10000);
    rest = rest - sc1 * 10000;
    var sc2 = Math.floor(rest / 1000);
    rest = rest - sc2 * 1000;
    var sc3 = Math.floor(rest / 100);
    rest = rest - sc3 * 100;
    var sc4 = Math.floor(rest / 10);
    var sc5 = rest - sc4 * 10;
    infoCtx.fillText(sc1, 100, 21);
    infoCtx.fillText(sc2, 115, 21);
    infoCtx.fillText(sc3, 130, 21);
    infoCtx.fillText(sc4, 145, 21);
    infoCtx.fillText(sc5, 160, 21);
    infoCtx.fillText("SHIPS:", 250, 21);
    infoCtx.fillText(gameContext.ships, 340, 21);
}

function drawOverlay() {
    gameCtx.fillStyle = "white";
    gameCtx.font = "24px Arial";
    if (gameContext.gameState == GameState.IDLE) {
        gameCtx.fillText("SCRAMBLE", 325, 170);
        gameCtx.fillText("control your ship with the arrow keys", 200, 250);
        gameCtx.fillText("drop bombs with 'a'", 285, 290);
        gameCtx.fillText("fire missiles with 's'", 287, 330);
        gameCtx.fillText("click to play", 330, 420);
    }
    if (gameContext.gameState == GameState.LIFELOST) {
        gameCtx.fillText("GET READY", 325, 300);
    }
    if (gameContext.gameState == GameState.GAMEOVER) {
        gameCtx.fillText("GAME OVER", 325, 300);
    }
}

function drawGame() {
    infoCtx.clearRect(0, 0, infoCanvas.width, infoCanvas.height);
    gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    gameContext.obstacles.forEach(o => o.draw());
    if (gameContext.gameState == GameState.PLAYING) {
        gameContext.player.draw();
    }
    gameContext.enemyRockets.forEach(r => r.draw());
    gameContext.enemySpaceships.forEach(s => s.draw());
    gameContext.bullets.forEach(b => b.draw());
    gameContext.bombs.forEach(b => b.draw());
    drawOverlay();
    drawInfo();
}

// ------------------------------ Game loop ------------------------------

let lastTime = Date.now();

function gameLoop() {
    let now = Date.now();
    let dt = (now - lastTime);

    drawGame();
    update(dt);

    requestAnimationFrame(gameLoop);
    lastTime = now;
}

// ------------------------------ Event listeners ------------------------------

window.addEventListener('load', () => {
    input = new Input(document);
    upperObstacleFactory = new ObstacleFactory(true);
    lowerObstacleFactory = new ObstacleFactory(false, addEnemiesOnLowerFlatEdge);
    defaultCursor = gameCanvas.style.cursor; 
    
    setGameState(GameState.IDLE);
    gameLoop();
});
