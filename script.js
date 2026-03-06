let board;
const tileSize = 100;
const rowCount = 21;
const columnCount = 19;
const boardWidth = columnCount * tileSize;
const boardHeight = rowCount * tileSize;
let context;

let highScore = localStorage.getItem("pacman-high-score") || 0;
let ghostScared = false;
let ghostScaredTimer = 0;

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
    "O       bpo       O",
    "XXXX X XXXXX X XXXX",
    "OOOX X       X XOOO",
    "XXXX X XXXXX X XXXX",
    "X                   X",
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
    loadMap();
    for (let ghost of ghosts) ghost.updateDirection(directions[Math.floor(Math.random() * 4)]);
    update();
    document.addEventListener("keyup", movePacman);
};

function loadImages() {
    wallImage = new Image(); wallImage.src = "img/wall.png";
    blueGhostImage = new Image(); blueGhostImage.src = "img/blueGhost.png";
    orangeGhostImage = new Image(); orangeGhostImage.src = "img/orangeGhost.png";
    pinkGhostImage = new Image(); pinkGhostImage.src = "img/pinkGhost.png";
    redGhostImage = new Image(); redGhostImage.src = "img/redGhost.png";
    scaredGhostImage = new Image(); scaredGhostImage.src = "img/scaredghost1.png";
    pacmanUpImage = new Image(); pacmanUpImage.src = "img/pacmanUp.png";
    pacmanDownImage = new Image(); pacmanDownImage.src = "img/pacmanDown.png";
    pacmanLeftImage = new Image(); pacmanLeftImage.src = "img/pacmanLeft.png";
    pacmanRightImage = new Image(); pacmanRightImage.src = "img/pacmanRight.png";
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
    setTimeout(update, 30);
}

function draw() {
    context.clearRect(0, 0, board.width, board.height);
    for (let w of walls) context.drawImage(w.image, w.x, w.y, w.width, w.height);
    context.fillStyle = "white";
    for (let f of foods) context.fillRect(f.x, f.y, f.width, f.height);
    for (let p of powerPellets) { context.beginPath(); context.arc(p.x + 20, p.y + 20, 20, 0, Math.PI * 2); context.fill(); }

    for (let g of ghosts) {
        let img = (ghostScared && (ghostScaredTimer > 50 || Math.floor(Date.now() / 100) % 2 === 0)) ? scaredGhostImage : g.image;
        context.drawImage(img, g.x, g.y, g.width, g.height);
    }

    let img = (pacman.direction == 'U') ? pacmanUpImage : (pacman.direction == 'D') ? pacmanDownImage : (pacman.direction == 'L') ? pacmanLeftImage : pacmanRightImage;
    if (Math.floor(Date.now() / 150) % 2 == 0) context.drawImage(img, pacman.x, pacman.y, pacman.width, pacman.height);
    else { context.fillStyle = "yellow"; context.beginPath(); context.arc(pacman.x + 50, pacman.y + 50, 45, 0, Math.PI * 2); context.fill(); }
    
    context.fillStyle = "white"; context.font = "bold 35px sans-serif";
    context.fillText(`SCORE: ${score}  LIVES: ${lives}  BEST: ${highScore}`, 20, 50);

    if (gameOver) {
        context.fillStyle = "rgba(0,0,0,0.9)"; context.fillRect(0, 0, board.width, board.height);
        context.fillStyle = "white"; context.font = "150px sans-serif"; context.textAlign = "center";
        context.fillText("GAME OVER", board.width / 2, board.height / 2 - 100);
        context.fillStyle = "#FFD700"; context.font = "60px sans-serif";
        context.fillText(`FINAL: ${score} | BEST: ${highScore}`, board.width / 2, board.height / 2 + 50);
    }
}

function move() {
    if (pacman.queuedDirection !== pacman.direction && pacman.canMove(pacman.queuedDirection)) {
        pacman.x = Math.round(pacman.x / tileSize) * tileSize;
        pacman.y = Math.round(pacman.y / tileSize) * tileSize;
        pacman.direction = pacman.queuedDirection;
        pacman.updateVelocity();
    }
    pacman.x += pacman.velocityX; pacman.y += pacman.velocityY;
    if (pacman.x < -50) pacman.x = boardWidth - 50; else if (pacman.x > boardWidth - 50) pacman.x = -50;
    for (let w of walls) if (collision(pacman, w)) { pacman.x -= pacman.velocityX; pacman.y -= pacman.velocityY; break; }
    
    for (let g of ghosts) {
        if (collision(g, pacman)) {
            if (ghostScared) { score += 200; g.reset(); }
            else { lives--; if (lives <= 0) { gameOver = true; if (score > highScore) localStorage.setItem("pacman-high-score", score); } else resetPositions(); }
        }
        if (g.x < -50) g.x = boardWidth - 50; else if (g.x > boardWidth - 50) g.x = -50;
        if (g.x % tileSize == 0 && g.y % tileSize == 0) {
            let best = g.direction, min = Infinity;
            for (let d of directions) {
                if (isOpposite(d, g.direction)) continue;
                if (g.canMove(d)) {
                    let nx = g.x + (d == 'L' ? -tileSize : d == 'R' ? tileSize : 0);
                    let ny = g.y + (d == 'U' ? -tileSize : d == 'D' ? tileSize : 0);
                    let dist = Math.hypot(pacman.x - nx, pacman.y - ny);
                    if (ghostScared) dist = -dist;
                    if (g.image !== redGhostImage && Math.random() < 0.2) dist += 500;
                    if (dist < min) { min = dist; best = d; }
                }
            }
            g.direction = best; g.updateVelocity();
        }
        g.x += g.velocityX; g.y += g.velocityY;
    }
    for (let f of foods) if (collision(pacman, f)) { score += 10; foods.delete(f); break; }
    for (let p of powerPellets) if (collision(pacman, p)) { score += 50; powerPellets.delete(p); ghostScared = true; ghostScaredTimer = 200; }
    if (ghostScared && --ghostScaredTimer <= 0) ghostScared = false;
    if (foods.size == 0 && powerPellets.size == 0) { loadMap(); resetPositions(); }
}

function isOpposite(d1, d2) { return (d1 == 'U' && d2 == 'D') || (d1 == 'D' && d2 == 'U') || (d1 == 'L' && d2 == 'R') || (d1 == 'R' && d2 == 'L'); }
function collision(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
function resetPositions() { pacman.reset(); for (let g of ghosts) g.reset(); }
function movePacman(e) {
    if (gameOver) { lives = 3; score = 0; gameOver = false; loadMap(); resetPositions(); update(); return; }
    const keys = { "ArrowUp": 'U', "KeyW": 'U', "ArrowDown": 'D', "KeyS": 'D', "ArrowLeft": 'L', "KeyA": 'L', "ArrowRight": 'R', "KeyD": 'R' };
    if (keys[e.code]) pacman.updateDirection(keys[e.code]);
}

class Block {
    constructor(image, x, y, w, h) { this.image = image; this.x = x; this.y = y; this.width = w; this.height = h; this.startX = x; this.startY = y; this.direction = 'R'; this.queuedDirection = 'R'; this.velocityX = 0; this.velocityY = 0; }
    canMove(d) {
        let s = (this === pacman) ? tileSize / 5 : tileSize / 10;
        let nx = this.x, ny = this.y;
        if (d == 'U') ny -= s; else if (d == 'D') ny += s; else if (d == 'L') nx -= s; else if (d == 'R') nx += s;
        let r = { x: nx, y: ny, width: this.width, height: this.height };
        for (let w of walls) if (collision(r, w)) return false;
        return true;
    }
    updateDirection(d) { this.queuedDirection = d; }
    updateVelocity() {
        let s = (this === pacman) ? tileSize / 5 : tileSize / 10;
        this.velocityX = (this.direction == 'L' ? -s : this.direction == 'R' ? s : 0);
        this.velocityY = (this.direction == 'U' ? -s : this.direction == 'D' ? s : 0);
    }
    reset() { this.x = this.startX; this.y = this.startY; }
}