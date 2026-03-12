let board, context, requestID;
const tileSize = 30; 
const rowCount = 21;
const columnCount = 19;
const boardWidth = columnCount * tileSize;
const boardHeight = rowCount * tileSize;

let gameStarted = false, isPaused = false, gameOver = false, isTransitioning = false, countdown = "";
let currentDifficulty = "medium";
let score = 0, powerMode = false, lives = 3;
let highScorer = localStorage.getItem("pacmanHighScore") || 0;
let pacman, ghosts = [], pellets = [], powerPellets = [];
let currentLevel = 1, maxLevels = 1;

const maze1 = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,3,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,3,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,0,1,1,1,2,1,2,1,1,1,0,1,1,1,1],
    [2,2,2,1,0,1,2,6,6,6,6,6,2,1,0,1,2,2,2],
    [1,1,1,1,0,1,2,1,1,2,1,1,2,1,0,1,1,1,1],
    [2,2,2,2,0,2,2,1,2,2,2,1,2,2,0,2,2,2,2],
    [1,1,1,1,0,1,2,1,1,1,1,1,2,1,0,1,1,1,1],
    [2,2,2,1,0,1,2,2,2,2,2,2,2,1,0,1,2,2,2],
    [1,1,1,1,0,1,2,1,1,1,1,1,2,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
    [1,3,0,1,0,0,0,0,0,5,0,0,0,0,0,1,0,3,1],
    [1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const getLevelLayout = (lvl) => {
    let layout = maze1.map(row => [...row]);
    if (lvl >= 2) { layout[3][9] = 1; layout[17][9] = 1; }
    if (lvl === 3) { layout[10][4] = 1; layout[10][14] = 1; }
    return layout;
};

const difficultySettings = {
    easy: { ghostSpeed: 2, pacmanSpeed: 3, intelligence: 0.4 },
    medium: { ghostSpeed: 3, pacmanSpeed: 3, intelligence: 0.7 },
    hard: { ghostSpeed: 5, pacmanSpeed: 5, intelligence: 1.0 }
};

const walls = [], loadedImages = {};
const imagesToLoad = ["wall.png", "pacmanRight.png", "pacmanLeft.png", "pacmanUp.png", "pacmanDown.png", "redGhost.png", "pinkGhost.png", "orangeGhost.png", "blueGhost.png", "cherry.png"];

function loadAssets(callback) {
    let count = 0;
    imagesToLoad.forEach(src => {
        let img = new Image();
        img.onload = () => { count++; if (count === imagesToLoad.length) callback(); };
        img.src = "img/" + src;
        loadedImages[src] = img;
    });
}

window.onload = function() {
    board = document.getElementById("board");
    board.width = boardWidth; board.height = boardHeight + 40; 
    context = board.getContext("2d");
    loadAssets(() => console.log("Ready"));
    document.addEventListener("keydown", handleInput);
};

function startGame(choice) {
    currentDifficulty = choice;
    maxLevels = (choice === 'easy') ? 1 : (choice === 'medium') ? 2 : 3;
    currentLevel = 1; lives = 3; score = 0;
    document.getElementById("menu").style.display = "none";
    loadLevel(currentLevel);
}

function loadLevel(lvl) {
    currentLevel = lvl;
    walls.length = 0; pellets.length = 0; powerPellets.length = 0; ghosts = [];
    isTransitioning = false;
    const layout = getLevelLayout(lvl);
    const configs = [{ name: "Blinky", img: "redGhost.png" }, { name: "Pinky", img: "pinkGhost.png" }, { name: "Inky", img: "blueGhost.png" }, { name: "Clyde", img: "orangeGhost.png" }];
    let gIdx = 0;
    for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < columnCount; c++) {
            let x = c * tileSize, y = r * tileSize;
            if (layout[r][c] === 1) walls.push({x, y, width: tileSize, height: tileSize});
            else if (layout[r][c] === 0) pellets.push({x: x + 15, y: y + 15, r: 2});
            else if (layout[r][c] === 3) powerPellets.push({x: x + 15, y: y + 15, r: 5});
            else if (layout[r][c] === 5) pacman = { x, y, width: tileSize, height: tileSize, velX: 0, velY: 0, dir: "Right", nextDir: "Right", speed: difficultySettings[currentDifficulty].pacmanSpeed, startX: x, startY: y };
            else if (layout[r][c] === 6 && gIdx < 4) { ghosts.push({ x, y, width: tileSize, height: tileSize, velX: 0, velY: 0, dir: "Up", startX: x, startY: y, ...configs[gIdx] }); gIdx++; }
        }
    }
    if (!requestID) requestID = requestAnimationFrame(update);
    startCountdown();
}

function startCountdown() {
    let timer = 3; gameStarted = false; countdown = "3";
    let interval = setInterval(() => {
        timer--;
        if (timer > 0) countdown = timer.toString();
        else if (timer === 0) { countdown = "GO!"; pacman.velX = pacman.speed; }
        else { clearInterval(interval); countdown = ""; gameStarted = true; }
    }, 800);
}

function triggerShake() {
    board.classList.add("shake-it");
    setTimeout(() => board.classList.remove("shake-it"), 500);
}

function movePacman() {
    const s = pacman.speed;
    if (pacman.nextDir !== pacman.dir) {
        let v = getVel(pacman.nextDir, s);
        if (canMove(pacman.x + v.x, pacman.y + v.y) && pacman.x % s === 0 && pacman.y % s === 0) { pacman.dir = pacman.nextDir; pacman.velX = v.x; pacman.velY = v.y; }
    }
    if (canMove(pacman.x + pacman.velX, pacman.y + pacman.velY)) { pacman.x += pacman.velX; pacman.y += pacman.velY; }
    else { pacman.velX = 0; pacman.velY = 0; }
}

function moveGhostSmart(g) {
    const s = powerMode ? 2 : difficultySettings[currentDifficulty].ghostSpeed;
    const intel = difficultySettings[currentDifficulty].intelligence;
    if (g.x % tileSize === 0 && g.y % tileSize === 0) {
        const dirs = ["Up", "Down", "Left", "Right"];
        const opps = { "Up": "Down", "Down": "Up", "Left": "Right", "Right": "Left" };
        let validMoves = dirs.filter(d => d !== opps[g.dir] && canMove(g.x + getVel(d, s).x, g.y + getVel(d, s).y));
        if (validMoves.length > 0) {
            validMoves.sort((a, b) => {
                let vA = getVel(a, s), vB = getVel(b, s);
                return Math.hypot((g.x + vA.x) - pacman.x, (g.y + vA.y) - pacman.y) - Math.hypot((g.x + vB.x) - pacman.x, (g.y + vB.y) - pacman.y);
            });
            g.dir = (Math.random() > intel) ? validMoves[Math.floor(Math.random() * validMoves.length)] : validMoves[0];
        } else { g.dir = opps[g.dir]; }
        let fV = getVel(g.dir, s); g.velX = fV.x; g.velY = fV.y;
    }
    if (canMove(g.x + g.velX, g.y + g.velY)) { g.x += g.velX; g.y += g.velY; }
}

function canMove(x, y) {
    for (let w of walls) { if (x < w.x + w.width && x + tileSize > w.x && y < w.y + w.height && y + tileSize > w.y) return false; }
    return true;
}

function getVel(dir, speed) {
    if (dir === "Up") return {x: 0, y: -speed};
    if (dir === "Down") return {x: 0, y: speed};
    if (dir === "Left") return {x: -speed, y: 0};
    if (dir === "Right") return {x: speed, y: 0};
    return {x: 0, y: 0};
}

function update() {
    if (gameOver) return;
    if (gameStarted && !isPaused && !isTransitioning) { movePacman(); ghosts.forEach(moveGhostSmart); checkCollisions(); }
    
    context.clearRect(0, 0, board.width, board.height);
    walls.forEach(w => context.drawImage(loadedImages["wall.png"], w.x, w.y, w.width, w.height));
    pellets.forEach(p => { context.fillStyle = "white"; context.beginPath(); context.arc(p.x, p.y, p.r, 0, Math.PI * 2); context.fill(); });
    powerPellets.forEach(p => { context.fillStyle = "pink"; context.beginPath(); context.arc(p.x, p.y, p.r, 0, Math.PI * 2); context.fill(); });
    context.drawImage(loadedImages[`pacman${pacman.dir}.png`], pacman.x, pacman.y, tileSize, tileSize);
    ghosts.forEach(g => context.drawImage(powerMode ? loadedImages["blueGhost.png"] : loadedImages[g.img], g.x, g.y, tileSize, tileSize));
    
    if (countdown) { context.fillStyle = "yellow"; context.font = "bold 50px 'Courier New'"; context.textAlign = "center"; context.fillText(countdown, boardWidth / 2, boardHeight / 2); context.textAlign = "left"; }
    
    if (isTransitioning) {
        context.fillStyle = "rgba(0,0,0,0.8)"; context.fillRect(0, 0, boardWidth, boardHeight);
        context.fillStyle = "yellow"; context.font = "bold 30px 'Courier New'"; context.textAlign = "center";
        context.fillText(`LEVEL ${currentLevel} CLEARED!`, boardWidth/2, boardHeight/2);
        context.font = "20px 'Courier New'"; context.fillText("GET READY...", boardWidth/2, boardHeight/2 + 40);
        context.textAlign = "left";
    }

    context.fillStyle = "white"; context.font = "18px 'Courier New'";
    context.fillText(`SCORE: ${score}`, 10, 20);
    context.fillText(`LEVEL: ${currentLevel}`, boardWidth - 100, 20);
    requestID = requestAnimationFrame(update);
}

function checkCollisions() {
    pellets = pellets.filter(p => Math.hypot(pacman.x + 15 - p.x, pacman.y + 15 - p.y) > 12 || !(score += 10));
    powerPellets = powerPellets.filter(p => { if (Math.hypot(pacman.x + 15 - p.x, pacman.y + 15 - p.y) < 15) { powerMode = true; setTimeout(() => powerMode = false, 7000); return false; } return true; });
    ghosts.forEach(g => { if (Math.hypot(pacman.x - g.x, pacman.y - g.y) < 22) { if (powerMode) { score += 200; g.x = g.startX; g.y = g.startY; } else { triggerShake(); lives--; lives > 0 ? loadLevel(currentLevel) : endGame("LOSE"); } } });
    
    if (pellets.length === 0 && powerPellets.length === 0 && !isTransitioning) {
        if (currentLevel < maxLevels) {
            isTransitioning = true;
            setTimeout(() => loadLevel(++currentLevel), 3000);
        } else endGame("WIN");
    }
}

function endGame(status) {
    gameOver = true;
    if (score > highScorer) {
        localStorage.setItem("pacmanHighScore", score);
        highScorer = score;
    }
    
    // Hide the game board and show the custom end screen
    const endScreen = document.getElementById("end-screen");
    document.getElementById("board").style.display = "none";
    endScreen.style.display = "flex";
    
    document.getElementById("end-message").innerText = status === "WIN" ? "YOU CLEARED THE MAZE!" : "GAME OVER";
    document.getElementById("final-score").innerText = `FINAL SCORE: ${score}`;
}

function handleInput(e) {
    if (e.code === "KeyP") isPaused = !isPaused;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) pacman.nextDir = e.code.replace("Arrow", "");
}