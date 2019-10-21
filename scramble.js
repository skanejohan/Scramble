
const gameCanvas = document.getElementById('gameCanvas');
const gameCtx = gameCanvas.getContext('2d');

const infoCanvas = document.getElementById('infoCanvas');
const infoCtx = infoCanvas.getContext('2d');

var input;
var upperObstacleFactory;
var lowerObstacleFactory;

// ------------------------------ Constants ------------------------------

const initialPlayerX = 100;
const initialPlayerY = 300;
const initialShips = 3;
const scrollSpeed = 50;
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
    enemyRockets: [],
    obstacles: [],
}        

function resetGame() {
    gameContext.gameState = GameState.IDLE;
    gameContext.ships = initialShips;
    gameContext.score = 0;
    gameContext.enemyRockets = [];
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
        gameCanvas.addEventListener('click', () => setGameState(GameState.PLAYING), {once: true});
    }
    if (newState == GameState.LIFELOST) {
        gameContext.ships -= 1;
        if (gameContext.ships == 0) {
            setGameState(GameState.GAMEOVER);
        }
        else {
            setGameState(GameState.PLAYING);
        }
    }
    if (newState == GameState.PLAYING) {
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
        doc.addEventListener('keydown', this._keyDownHandler.bind(this), false);
        doc.addEventListener('keyup', this._keyUpHandler.bind(this), false);
    }

    get up() { return this._up; }
    get down() { return this._down; }
    get right() { return this._right; }
    get left() { return this._left; }

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
        gameCtx.lineWidth = 4;
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
        gameCtx.lineWidth = 4;
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
        // TODO randomness
        gameContext.enemyRockets.push(createRocketItem(x+10, y-10));
        gameContext.enemyRockets.push(createRocketItem(x+30, y-10));
        gameContext.enemyRockets.push(createRocketItem(x+50, y-10));
        gameContext.enemyRockets.push(createRocketItem(x+70, y-10));
        gameContext.enemyRockets.push(createRocketItem(x+90, y-10));
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
    if (!boundingBoxesOverlap(item1.boundingBox(), item2.boundingBox())) {
        return false;
    }

    var collission = false;
    item1.lines().forEach(l1 => {
        item2.lines().forEach(l2 => {
            if (linesIntersect(l1, l2)) {
                collission = true;
            }
        });
    });
    return collission;
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

        // Move rockets
        gameContext.enemyRockets.forEach(r => {
            r.x -= scrollSpeed / dt;
            if (r.x < 600) {
                r.y -= scrollSpeed / dt;
            }
        });

        // Perform collission detection
        gameContext.obstacles.forEach(o => {
            if (itemsCollide(o, gameContext.player)) {
                gameContext.player.hasCollided = true;
            }
        });

        gameContext.enemyRockets.forEach(r => {
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
        gameContext.enemyRockets = gameContext.enemyRockets.filter(r => !r.hasCollided);

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
        gameCtx.fillText("SCRAMBLE", 325, 225);
        gameCtx.fillText("click to play", 330, 350);
    }
    if (gameContext.gameState == GameState.GAMEOVER) {
        gameCtx.fillText("GAME OVER", 325, 300);
    }
}

function drawPlayer() {
    if (gameContext.gameState == GameState.PLAYING) {
        gameContext.player.draw();
    }
}

function drawObstacles() {
    gameContext.obstacles.forEach(o => o.draw());
}

function drawEnemyRockets() {
    if (gameContext.gameState == GameState.PLAYING) {
        gameContext.enemyRockets.forEach(r => r.draw());
    }
}

function drawGame() {
    infoCtx.clearRect(0, 0, infoCanvas.width, infoCanvas.height);
    gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    drawObstacles();
    drawPlayer();
    drawEnemyRockets();
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
    
    setGameState(GameState.IDLE);
    gameLoop();
});
