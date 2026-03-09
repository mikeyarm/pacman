let board;
const tileSize = 100;
const rowCount = 21;
const columnCount = 19;
const boardWidth = columnCount * tileSize;
const boardHeight = rowCount * tileSize;
let context;
let requestID;

// --- Camera and Shake State ---
let camera = { x: 0, y: 0 };
const lerpSpeed = 0.08; // How smooth the camera follows
let shakeIntensity = 0;
let shakeTimer = 0;

let highScore = localStorage.getItem("pacman-high-score") || 0;
let ghostScared = false;
let ghostScaredTimer = 0;
let level = 1;
let levelFlashTimer = 0;

let blueGhostImage, orangeGhostImage, pinkGhostImage, redGhostImage, scaredGhostImage;
let pacmanUpImage, pacmanDownImage, pacmanLeftImage, pacmanRightImage;
let wallImage;

const tileMap = [
    "XXXXXXXXXXXXXXXXXXX",
    "X                 X",
    "X XX XXX X XXX XX X",
    "X                 X",
    "X XX X XXXXX X XX X",
    "X    X       X    X",
    "XXXX XXXX XXXX XXXX",
    "OOOX X       X XOOO",
    "XXXX X XXrXX X XXXX",
    "O      bpo      O",
    "XXXX X XXXXX X XXXX",
    "OOOX X       X XOOO",
    "XXXX X XXXXX X XXXX",
    "X                 X",
    "X XX XXX X XXX XX X",
    "X  X     P     X  X",
    "XX X X XXXXX X X XX",
    "X    X   X   X    X",
    "X XXXXXX X XXXXXX X",
    "X                 X",
    "XXXXXXXXXXXXXXXXXXX"
];

const walls = new Set();
const foods = new Set();
const powerPellets = new Set();
const ghosts = new Set();
let pacman;

const directions = ['U', 'D', 'L', 'R'];
let score = 0;
let lives = 3;
let gameOver = false;

window.onload = function() {
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d");
    loadImages();
    restartGame();
    document.addEventListener("keydown", handleInput);
};

// --- Camera Smoothing Logic ---

function updateCamera() {
    let targetX = -pacman.x + board.width / 2 - 50;
    let targetY = -pacman.y + board.height / 2 - 50;
    
    // Linear Interpolation (LERP)
    camera.x += (targetX - camera.x) * lerpSpeed;
    camera.y += (targetY - camera.y) * lerpSpeed;
    
    // Clamp to map boundaries
    camera.x = Math.min(0, Math.max(camera.x, board.width - boardWidth));
    camera.y = Math.min(0, Math.max(camera.y, board.height - boardHeight));
}

function loadImages() {
    wallImage = new Image(); wallImage.src = "img/wall.png";
    blueGhostImage = new Image(); blueGhostImage.src = "img/blueGhost.png";
    orangeGhostImage = new Image(); orangeGhostImage.src = "img/orangeGhost.png";
    pinkGhostImage = new Image(); pinkGhostImage.src = "img/pinkGhost.png";
    redGhostImage = new Image(); redGhostImage.src = "img/redGhost.png";
    scaredGhostImage = new Image(); scaredGhostImage.src = "img/scaredghostleft.png";
    pacmanUpImage = new Image(); pacmanUpImage.src = "img/pacmanUp.png";
    pacmanDownImage = new Image(); pacmanDownImage.src = "img/pacmanDown.png";
    pacmanLeftImage = new Image(); pacmanLeftImage.src = "img/pacmanLeft.png";
    pacmanRightImage = new Image(); pacmanRightImage.src = "img/pacmanRight.png";
}

function restartGame() {
    level = 1;
    score = 0;
    lives = 3;
    nextLevel();
}

function nextLevel() {
    cancelAnimationFrame(requestID);
    gameOver = false;
    ghostScared = false;
    ghostScaredTimer = 0;
    levelFlashTimer = 100; 
    loadMap();
    resetPositions();
    requestID = requestAnimationFrame(update);
}

function loadMap() {
    walls.clear(); foods.clear(); ghosts.clear(); powerPellets.clear();
    let emptySpaces = [];
    for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < columnCount; c++) {
            if (tileMap[r][c] == ' ') emptySpaces.push({r, c});
        }
    }
    emptySpaces.sort(() => Math.random() - 0.5);
    let powerPelletCoords = emptySpaces.splice(0, 4);

    for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < columnCount; c++) {
            const char = tileMap[r][c];
            const x = c * tileSize, y = r * tileSize;
            if (char == 'X') walls.add(new Block(wallImage, x, y, tileSize, tileSize));
            else if (char == 'b') ghosts.add(new Block(blueGhostImage, x, y, tileSize, tileSize));
            else if (char == 'o') ghosts.add(new Block(orangeGhostImage, x, y, tileSize, tileSize));
            else if (char == 'p') ghosts.add(new Block(pinkGhostImage, x, y, tileSize, tileSize));
            else if (char == 'r') ghosts.add(new Block(redGhostImage, x, y, tileSize, tileSize));
            else if (char == 'P') pacman = new Block(pacmanRightImage, x, y, tileSize, tileSize);
            else if (char == ' ') {
                if (powerPelletCoords.some(coord => coord.r === r && coord.c === c)) powerPellets.add(new Block(null, x + 30, y + 30, 40, 40));
                else foods.add(new Block(null, x + 42, y + 42, 16, 16));
            }
        }
    }
}

function update() {
    if (gameOver) return;
    move();
    draw();
    if (levelFlashTimer > 0) levelFlashTimer--;
    requestID = requestAnimationFrame(update);
}

function draw() {
    context.clearRect(0, 0, board.width, board.height);
    updateCamera();

    context.save();
    context.translate(camera.x, camera.y);

    // Apply Screen Shake
    if (shakeTimer > 0) {
        context.translate((Math.random() - 0.5) * shakeIntensity, (Math.random() - 0.5) * shakeIntensity);
        shakeTimer--;
        shakeIntensity *= 0.9;
    }

    for (let w of walls) context.drawImage(w.image, w.x, w.y, w.width, w.height);
    
    context.fillStyle = "white";
    for (let f of foods) context.fillRect(f.x, f.y, f.width, f.height);
    for (let p of powerPellets) { 
        context.beginPath(); 
        context.arc(p.x + 20, p.y + 20, 20, 0, Math.PI * 2); 
        context.fill(); 
    }

    for (let g of ghosts) {
        let isScaredState = ghostScared && (ghostScaredTimer > 50 || Math.floor(Date.now() / 100) % 2 === 0);
        if (isScaredState) {
            context.save();
            context.translate(g.x + g.width / 2, g.y + g.height / 2);
            let angle = (g.direction == 'U') ? Math.PI / 2 : (g.direction == 'R') ? Math.PI : (g.direction == 'D') ? -Math.PI / 2 : 0;
            context.rotate(angle);
            context.drawImage(scaredGhostImage, -g.width / 2, -g.height / 2, g.width, g.height);
            context.restore();
        } else {
            context.drawImage(g.image, g.x, g.y, g.width, g.height);
        }
    }

    let pacImg = pacmanRightImage;
    if (pacman.direction == 'U') pacImg = pacmanUpImage;
    else if (pacman.direction == 'D') pacImg = pacmanDownImage;
    else if (pacman.direction == 'L') pacImg = pacmanLeftImage;

    if (Math.floor(Date.now() / 150) % 2 == 0 || pacman.direction === null) {
        context.drawImage(pacImg, pacman.x, pacman.y, pacman.width, pacman.height);
    } else { 
        context.fillStyle = "yellow"; 
        context.beginPath(); 
        context.arc(pacman.x + 50, pacman.y + 50, 45, 0, Math.PI * 2); 
        context.fill(); 
    }
    
    context.restore(); // Restore context to original state for UI

    // UI elements (rendered outside the camera/shake effect)
    context.fillStyle = "white"; context.font = "bold 35px sans-serif";
    context.textAlign = "left";
    context.fillText(`SCORE: ${score}  LIVES: ${lives}  LEVEL: ${level}  BEST: ${highScore}`, 20, 50);

    if (levelFlashTimer > 0) {
        context.fillStyle = "yellow";
        context.font = "bold 100px sans-serif";
        context.textAlign = "center";
        context.fillText(`LEVEL ${level}`, board.width / 2, board.height / 2);
    }

    if (gameOver) {
        context.fillStyle = "rgba(0,0,0,0.9)"; context.fillRect(0, 0, board.width, board.height);
        context.fillStyle = "white"; context.font = "150px sans-serif"; context.textAlign = "center";
        context.fillText("GAME OVER", board.width / 2, board.height / 2 - 100);
        context.fillStyle = "#FFD700"; context.font = "60px sans-serif";
        context.fillText(`FINAL: ${score} | PRESS 'R' TO RESTART`, board.width / 2, board.height / 2 + 50);
    }
}

function move() {
    if (pacman.x % tileSize === 0 && pacman.y % tileSize === 0) {
        if (pacman.queuedDirection !== null && pacman.queuedDirection !== pacman.direction && pacman.canMove(pacman.queuedDirection)) {
            pacman.direction = pacman.queuedDirection;
            pacman.updateVelocity();
        }
    }

    pacman.x += pacman.velocityX; 
    pacman.y += pacman.velocityY;

    if (pacman.x < -50) pacman.x = boardWidth - 50; 
    else if (pacman.x > boardWidth - 50) pacman.x = -50;

    for (let w of walls) {
        if (collision(pacman, w)) {
            pacman.x -= pacman.velocityX;
            pacman.y -= pacman.velocityY;
            pacman.velocityX = 0;
            pacman.velocityY = 0;
            break;
        }
    }
    
    for (let g of ghosts) {
        if (pacman.direction !== null) {
            if (g.x % tileSize == 0 && g.y % tileSize == 0) {
                let best = g.direction, min = Infinity;
                for (let d of directions) {
                    if (isOpposite(d, g.direction)) continue;
                    if (g.canMove(d)) {
                        let nx = g.x + (d == 'L' ? -tileSize : d == 'R' ? tileSize : 0);
                        let ny = g.y + (d == 'U' ? -tileSize : d == 'D' ? tileSize : 0);
                        let dist = Math.hypot(pacman.x - nx, pacman.y - ny);
                        if (ghostScared) dist = -dist;
                        let randomness = Math.max(0.05, 0.2 - (level * 0.02));
                        if (g.image !== redGhostImage && Math.random() < randomness) dist += 500;
                        if (dist < min) { min = dist; best = d; }
                    }
                }
                g.direction = best; g.updateVelocity();
            }
            g.x += g.velocityX; g.y += g.velocityY;
        }

        if (collision(g, pacman)) {
            if (ghostScared) { score += 200; g.reset(); }
            else { 
                lives--; 
                // TRIGGER SHAKE
                shakeIntensity = 40;
                shakeTimer = 20;

                if (lives <= 0) { 
                    gameOver = true; 
                    if (score > highScore) localStorage.setItem("pacman-high-score", score); 
                } else { resetPositions(); } 
            }
        }
        if (g.x < -50) g.x = boardWidth - 50; else if (g.x > boardWidth - 50) g.x = -50;
    }

    for (let f of foods) if (collision(pacman, f)) { score += 10; foods.delete(f); break; }
    for (let p of powerPellets) {
        if (collision(pacman, p)) { 
            score += 50; 
            powerPellets.delete(p); 
            ghostScared = true; 
            ghostScaredTimer = Math.max(100, 300 - (level * 20)); 
        }
    }

    if (ghostScared && --ghostScaredTimer <= 0) ghostScared = false;

    if (foods.size === 0 && powerPellets.size === 0) { 
        level++;
        nextLevel(); 
    }
}

function isOpposite(d1, d2) { return (d1 == 'U' && d2 == 'D') || (d1 == 'D' && d2 == 'U') || (d1 == 'L' && d2 == 'R') || (d1 == 'R' && d2 == 'L'); }

function collision(a, b) {
    const padding = 5;
    return a.x + padding < b.x + b.width && a.x + a.width - padding > b.x && a.y + padding < b.y + b.height && a.y + a.height - padding > b.y;
}

function resetPositions() { 
    pacman.reset(); 
    pacman.velocityX = 0; 
    pacman.velocityY = 0; 
    pacman.direction = null; 
    pacman.queuedDirection = null;
    for (let g of ghosts) g.reset(); 
}

function handleInput(e) {
    if (e.code === "KeyR") {
        restartGame();
        return;
    }

    if (e.code === "KeyE") {
        foods.clear();
        powerPellets.clear();
        return;
    }

    const keys = { "ArrowUp": 'U', "KeyW": 'U', "ArrowDown": 'D', "KeyS": 'D', "ArrowLeft": 'L', "KeyA": 'L', "ArrowRight": 'R', "KeyD": 'R' };
    if (keys[e.code]) {
        if (pacman.direction === null) {
            pacman.direction = keys[e.code];
            pacman.queuedDirection = keys[e.code];
            pacman.updateVelocity();
        } else {
            pacman.updateDirection(keys[e.code]);
        }
    }
}

class Block {
    constructor(image, x, y, w, h) { 
        this.image = image; this.x = x; this.y = y; this.width = w; this.height = h; 
        this.startX = x; this.startY = y; 
        this.direction = null; this.queuedDirection = null; 
        this.velocityX = 0; this.velocityY = 0; 
    }
    canMove(d) {
        let s = tileSize / 5;
        let nx = this.x, ny = this.y;
        if (d == 'U') ny -= s; else if (d == 'D') ny += s; else if (d == 'L') nx -= s; else if (d == 'R') nx += s;
        let r = { x: nx, y: ny, width: this.width, height: this.height };
        for (let w of walls) if (collision(r, w)) return false;
        return true;
    }
    updateDirection(d) { this.queuedDirection = d; }
    updateVelocity() {
        if (this.direction === null) return;
        let speedMult = 1 + (level - 1) * 0.1; 
        let s = (this === pacman) ? 10 : 5 * speedMult; 
        this.velocityX = (this.direction == 'L' ? -s : this.direction == 'R' ? s : 0);
        this.velocityY = (this.direction == 'U' ? -s : this.direction == 'D' ? s : 0);
    }
    reset() { 
        this.x = this.startX; this.y = this.startY; 
        this.direction = null; 
        this.queuedDirection = null;
        this.velocityX = 0;
        this.velocityY = 0;
    }
}