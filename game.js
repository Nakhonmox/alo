const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");

// Ajustar canvas al tamaño completo del monitor
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0;
let keys = {};
let mouseX = 0;
let mouseY = 0;
const gravity = 0.6;
const floorY = canvas.height - 60;

// ==========================================
// NUEVOS SISTEMAS: PARTÍCULAS Y TEXTOS FLOTANTES
// ==========================================
let particles = [];
let floatingTexts = [];

function spawnParticles(x, y, color, count, isDeath = false) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * (isDeath ? 8 : 4),
            vy: (Math.random() - 0.5) * (isDeath ? 12 : 6) - (isDeath ? 4 : 0),
            size: Math.random() * (isDeath ? 5 : 3) + 2,
            color: color,
            alpha: 1,
            decay: Math.random() * 0.02 + 0.01,
            isChunk: isDeath && Math.random() > 0.4, // Trozos de stickman
            chunkType: Math.floor(Math.random() * 3) // 0: cabeza, 1: brazo, 2: torso
        });
    }
}

function spawnFloatingText(x, y, text, color) {
    floatingTexts.push({
        x: x,
        y: y,
        text: text,
        color: color,
        alpha: 1,
        vy: -1.5,
        life: 45
    });
}

// ==========================================
// SISTEMA DE ESTADOS DEL JUEGO
// ==========================================
let gameState = "menu"; // "menu", "playing"

const playButton = {
    x: canvas.width / 2 - 100,
    y: canvas.height / 2,
    width: 200,
    height: 60
};

let isPaused = false;
let showShop = false;
let showCheats = false; 

// Sistema de Oleadas / Jefes Especiales
let gameTimer = 0;
let dragonSpawned = false;
let dragonWarning = false;

// SISTEMA DE RONDAS Y MEJORAS DE INTERMEDIO
let currentRound = 1;
let enemiesLeftInRound = 20; 
let enemiesSpawnedInRound = 0;
let isRoundBreak = false;
let roundBreakTimer = 0; 

// NUEVAS VARIABLES PARA RONDAS ESPECIALES (MÚLTIPLOS DE 7)
let specialRoundType = "none"; // "none", "speed", "darkness"

const upgradeOptions = [
    { id: "red_heart", text: "+1 Corazón Rojo Max", color: "#ff2266", x: 0, y: 0, w: 280, h: 70 },
    { id: "blue_heart", text: "+1 Escudo Azul Max", color: "#00bfff", x: 0, y: 0, w: 280, h: 70 },
    { id: "max_ammo", text: "+10 Balas en Cargador", color: "#ffff00", x: 0, y: 0, w: 280, h: 70 }
];

const permanentUpgrades = {
    bonusMaxLives: 0,
    bonusMaxShield: 0,
    bonusMaxAmmo: 0
};

const weaponsCatalog = {
    pistola: { name: "Pistola Base", baseAmmo: 9, cooldown: 400, damage: 1, cost: 0, purchased: true, color: "#ffffff", upgradeLevel: 0 },
    mp5:     { name: "Subfusil MP5", baseAmmo: 20, cooldown: 130, damage: 1, cost: 1000, purchased: false, color: "#ffff00", upgradeLevel: 0 },
    duales:  { name: "Pistolas Duales", baseAmmo: 18, cooldown: 220, damage: 1, cost: 2000, purchased: false, color: "#ff00ff", upgradeLevel: 0 },
    rifle:   { name: "Rifle Pesado", baseAmmo: 5, cooldown: 800, damage: 2, cost: 3000, purchased: false, color: "#00bfff", upgradeLevel: 0 },
    galil:   { name: "Rifle Galil AR", baseAmmo: 25, cooldown: 180, damage: 2, cost: 4000, purchased: false, color: "#00ff66", upgradeLevel: 0 }
};

const packAPunch = {
    x: (canvas.width / 2) - 25, 
    y: (canvas.height - 60) - 420 - 60, 
    width: 50,
    height: 60,
    cost: 10000,
    chargeProgress: 0,
    requiredFrames: 300, 
    isUpgrading: false
};

function getTotalEnemiesForRound(round) {
    if (round === 1) return 20;
    return 20 + (round - 1) * 10; 
}

function startNextRound() {
    currentRound++;
    enemiesSpawnedInRound = 0;
    enemiesLeftInRound = getTotalEnemiesForRound(currentRound);
    isRoundBreak = false;
    
    enemies = [];
    bullets = [];
    enemyBullets = [];
    grenades = [];
    particles = [];
    floatingTexts = [];

    // Lotería de Ronda Especial en múltiplos de 7
    if (currentRound % 7 === 0) {
        specialRoundType = Math.random() > 0.5 ? "speed" : "darkness";
        if (specialRoundType === "speed") {
            spawnFloatingText(canvas.width / 2, canvas.height / 2 - 50, "¡RONDA DE VELOCIDAD!", "#ff4500");
        } else {
            spawnFloatingText(canvas.width / 2, canvas.height / 2 - 50, "¡RONDA DE OSCURIDAD!", "#7b00b8");
        }
    } else {
        specialRoundType = "none";
    }
    
    clearInterval(spawnEnemyInterval);
    clearInterval(spawnFlyingInterval);
    clearInterval(spawnShieldedInterval); 
    
    let baseEnemyTime = 2500;
    let baseFlyingTime = 4000;
    
    let speedIncrements = Math.floor(currentRound / 5);
    if (speedIncrements > 0) {
        baseEnemyTime = Math.max(1000, 2500 - (speedIncrements * 500));
        baseFlyingTime = Math.max(1000, 4000 - (speedIncrements * 500));
    }

    if (specialRoundType === "speed") {
        spawnFlyingInterval = setInterval(spawnFlyingEnemy, 1200);
    } else {
        spawnEnemyInterval = setInterval(spawnEnemy, baseEnemyTime);
        spawnFlyingInterval = setInterval(spawnFlyingEnemy, baseFlyingTime);
        spawnShieldedInterval = setInterval(spawnShieldedEnemy, 10000);
    }
}

const shieldSystem = {
    current: 3,
    max: 3,
    isCharging: false,
    chargeProgress: 0, 
    requiredFrames: 300
};

const player = {
    x: canvas.width / 2,
    y: floorY - 80,
    width: 40,
    height: 80,
    speed: 6,
    jumpForce: 15,
    velocityY: 0,
    isGrounded: false,
    color: "#00ffcc",
    facing: 1,
    lives: 3,
    maxLives: 3,
    isInvulnerable: false,
    invulnerableTimer: 0,
    
    currentWeapon: "pistola", 
    ammo: 9,
    maxAmmo: 9,
    isReloading: false,
    reloadTimer: 0,
    lastShotTime: 0,
    shootCooldown: 400 
};

function updatePlayerStats() {
    player.maxLives = 3 + permanentUpgrades.bonusMaxLives;
    shieldSystem.max = 3 + permanentUpgrades.bonusMaxShield;
    
    const currentWeaponData = weaponsCatalog[player.currentWeapon];
    player.maxAmmo = currentWeaponData.baseAmmo + permanentUpgrades.bonusMaxAmmo;
    player.shootCooldown = currentWeaponData.cooldown;
}

let bullets = [];
let enemyBullets = []; 
let grenades = [];     
let enemies = [];
let medkits = [];
let dragon = null;     

const buildingWidth = 280;

const buildings = [
    { x: canvas.width * 0.12, width: buildingWidth, height: floorY - 140, color: "#3a221d" },  
    { x: (canvas.width / 2) - (buildingWidth / 2), width: buildingWidth, height: floorY - 60, color: "#2d2522" }, 
    { x: canvas.width * 0.88 - buildingWidth, width: buildingWidth, height: floorY - 180, color: "#332624" }   
];

buildings.forEach(bld => {
    bld.windows = [];
    let rows = Math.floor(bld.height / 55);
    let cols = Math.floor(bld.width / 45);
    for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
            bld.windows.push({
                relX: c * 45,
                relY: r * 55,
                lit: Math.random() > 0.65 
            });
        }
    }
});

const platforms = [
    { x: buildings[0].x - 20, y: floorY - 150, width: 140, height: 15, destroyed: false, repairTimer: 0 },
    { x: buildings[0].x + 140, y: floorY - 270, width: 140, height: 15, destroyed: false, repairTimer: 0 },
    { x: buildings[0].x + 260, y: floorY - 380, width: 120, height: 15, destroyed: false, repairTimer: 0 },
    { x: buildings[1].x + 10, y: floorY - 180, width: 120, height: 15, destroyed: false, repairTimer: 0 },
    { x: buildings[1].x + 150, y: floorY - 300, width: 120, height: 15, destroyed: false, repairTimer: 0 },
    { x: buildings[1].x + 40, y: floorY - 420, width: 200, height: 15, destroyed: false, repairTimer: 0 }, 
    { x: buildings[2].x - 100, y: floorY - 350, width: 120, height: 15, destroyed: false, repairTimer: 0 },
    { x: buildings[2].x + 20, y: floorY - 160, width: 130, height: 15, destroyed: false, repairTimer: 0 },
    { x: buildings[2].x + 130, y: floorY - 290, width: 140, height: 15, destroyed: false, repairTimer: 0 }
];

const stars = [];
for (let i = 0; i < 60; i++) {
    stars.push({ x: Math.random() * canvas.width, y: Math.random() * (canvas.height * 0.6), size: Math.random() * 2 });
}

const backgroundDecorations = [];
for (let i = 0; i < 8; i++) {
    backgroundDecorations.push({
        x: Math.random() * (canvas.width - 60) + 30,
        y: floorY - 35,
        width: 25,
        height: 35,
        color: Math.random() > 0.4 ? "#4a4a5a" : "#2e5c1e", 
        type: Math.random() > 0.4 ? "normal" : "toxic"
    });
}

window.addEventListener("mousemove", e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (gameState === "playing" && !isRoundBreak && !isPaused && !packAPunch.isUpgrading) {
        player.facing = (mouseX >= player.x + player.width / 2) ? 1 : -1;
    }
});

window.addEventListener("click", e => {
    if (gameState === "menu") {
        if (
            mouseX >= playButton.x &&
            mouseX <= playButton.x + playButton.width &&
            mouseY >= playButton.y &&
            mouseY <= playButton.y + playButton.height
        ) {
            gameState = "playing";
        }
        return;
    }
    
    if (gameState === "playing" && isRoundBreak) {
        upgradeOptions.forEach(opt => {
            if (mouseX >= opt.x && mouseX <= opt.x + opt.w && mouseY >= opt.y && mouseY <= opt.y + opt.h) {
                if (opt.id === "red_heart") {
                    permanentUpgrades.bonusMaxLives++;
                    updatePlayerStats();
                    player.lives = player.maxLives; 
                } else if (opt.id === "blue_heart") {
                    permanentUpgrades.bonusMaxShield++;
                    updatePlayerStats();
                    shieldSystem.current = shieldSystem.max; 
                } else if (opt.id === "max_ammo") {
                    permanentUpgrades.bonusMaxAmmo += 10;
                    updatePlayerStats();
                    player.ammo = player.maxAmmo; 
                }
                startNextRound();
            }
        });
    }
});

window.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();

    if (key === "m") {
        if (gameState === "playing") {
            showCheats = !showCheats;
            showShop = false; 
            isPaused = showCheats;
        }
        return;
    }

    if (showCheats) {
        if (key === "1") {
            score += 10000; 
            scoreEl.innerText = score;
            spawnFloatingText(player.x + 20, player.y - 20, "+10000 PTS", "#ffff00");
        }
        return;
    }

    if (key === "t") { 
        if (gameState === "playing") {
            showShop = !showShop; 
            showCheats = false;
            isPaused = showShop; 
        }
        return; 
    }
    
    if (showShop) {
        if (key === "1") { equipWeapon("pistola"); showShop = false; isPaused = false; }
        if (key === "2") {
            if (weaponsCatalog.mp5.purchased) { equipWeapon("mp5"); showShop = false; isPaused = false; } 
            else if (score >= weaponsCatalog.mp5.cost) {
                score -= weaponsCatalog.mp5.cost; scoreEl.innerText = score;
                weaponsCatalog.mp5.purchased = true; equipWeapon("mp5"); showShop = false; isPaused = false;
            }
        }
        if (key === "3") {
            if (weaponsCatalog.duales.purchased) { equipWeapon("duales"); showShop = false; isPaused = false; } 
            else if (score >= weaponsCatalog.duales.cost) {
                score -= weaponsCatalog.duales.cost; scoreEl.innerText = score;
                weaponsCatalog.duales.purchased = true; equipWeapon("duales"); showShop = false; isPaused = false;
            }
        }
        if (key === "4") {
            if (weaponsCatalog.rifle.purchased) { equipWeapon("rifle"); showShop = false; isPaused = false; } 
            else if (score >= weaponsCatalog.rifle.cost) {
                score -= weaponsCatalog.rifle.cost; scoreEl.innerText = score;
                weaponsCatalog.rifle.purchased = true; equipWeapon("rifle"); showShop = false; isPaused = false;
            }
        }
        if (key === "5") {
            if (weaponsCatalog.galil.purchased) { equipWeapon("galil"); showShop = false; isPaused = false; } 
            else if (score >= weaponsCatalog.galil.cost) {
                score -= weaponsCatalog.galil.cost; scoreEl.innerText = score;
                weaponsCatalog.galil.purchased = true; equipWeapon("galil"); showShop = false; isPaused = false;
            }
        }
        return;
    }

    if (gameState === "playing" && !isRoundBreak) {
        keys[e.key === " " ? "space" : key] = true;
    }
});

window.addEventListener("keyup", e => {
    if (gameState === "playing") keys[e.key === " " ? "space" : e.key.toLowerCase()] = false;
});

function equipWeapon(weaponId) {
    player.currentWeapon = weaponId;
    player.isReloading = false; 
    updatePlayerStats(); 
    player.ammo = player.maxAmmo; 
}

window.addEventListener("keydown", e => {
    if (gameState !== "playing" || isRoundBreak || isPaused || packAPunch.isUpgrading) return; 
    
    if (e.key === " " && player.lives > 0) {
        if (player.isReloading) return;
        const now = Date.now();
        if (now - player.lastShotTime < player.shootCooldown) return;

        if (player.ammo > 0) {
            player.ammo--;
            player.lastShotTime = now;

            let originX = player.x + player.width / 2;
            let originY = player.y + 35;
            let angle = Math.atan2(mouseY - originY, mouseX - originX);

            const weaponData = weaponsCatalog[player.currentWeapon];

            let bulletSpreadY = 0;
            if (player.currentWeapon === "duales") {
                bulletSpreadY = (player.ammo % 2 === 0) ? -6 : 6;
            }

            bullets.push({
                x: originX,
                y: originY + bulletSpreadY,
                width: (player.currentWeapon === "rifle" || player.currentWeapon === "galil") ? 18 : 10, 
                height: (player.currentWeapon === "rifle" || player.currentWeapon === "galil") ? 6 : 4,
                speedX: Math.cos(angle) * 18,
                speedY: Math.sin(angle) * 18,
                color: weaponData.color,
                damage: weaponData.damage
            });
            if (player.ammo <= 0) startReload();
        }
    }
});

function startReload() {
    player.isReloading = true;
    if (player.currentWeapon === "mp5") player.reloadTimer = 60;
    else if (player.currentWeapon === "duales") player.reloadTimer = 70;
    else if (player.currentWeapon === "rifle") player.reloadTimer = 100;
    else if (player.currentWeapon === "galil") player.reloadTimer = 90;
    else player.reloadTimer = 80;
}

setInterval(() => {
    if (gameState !== "playing" || isPaused || player.lives <= 0) return; 
    
    if (isRoundBreak) {
        roundBreakTimer--;
        if (roundBreakTimer <= 0) {
            startNextRound();
        }
        return; 
    }

    gameTimer++;

    if (gameTimer % 180 === 175) {
        dragonWarning = true;
    }

    if (gameTimer % 180 === 0 && gameTimer > 0) {
        dragonWarning = false;
        enemies = []; 
        dragonSpawned = true;
        dragon = {
            x: canvas.width - 320, 
            y: floorY - 380,
            width: 320, height: 380,
            lives: 50, maxLives: 50,
            lastShot: 0
        };
    }
}, 1000);

function sampleEnemySpawn() {
    let maxForThisRound = getTotalEnemiesForRound(currentRound);
    return (enemiesSpawnedInRound < maxForThisRound && !isRoundBreak);
}

function spawnEnemy() {
    if (gameState !== "playing" || player.lives <= 0 || isPaused || dragonSpawned || dragonWarning || isRoundBreak) return; 
    if (specialRoundType === "speed") return; 
    if (!sampleEnemySpawn()) return;

    let extraHealth = Math.floor(currentRound / 5);

    enemiesSpawnedInRound++;
    enemies.push({
        x: Math.random() > 0.5 ? canvas.width + 20 : -50,
        y: floorY - 80,
        width: 40, height: 80,
        velocityY: 0, isGrounded: true,
        speed: Math.random() * (2.5 - 1.2) + 1.2,
        color: "#ff3333",
        isBoss: false,
        isFlying: false,
        isShielded: false,
        lives: 2 + extraHealth, 
        maxLives: 2 + extraHealth,
        lastGrenade: Date.now() + Math.random() * 2000
    });
}
let spawnEnemyInterval = setInterval(spawnEnemy, 2500); 

function sampleFlyingSpawn() {
    let maxForThisRound = getTotalEnemiesForRound(currentRound);
    return ((currentRound >= 2 || specialRoundType === "speed") && enemiesSpawnedInRound < maxForThisRound && !isRoundBreak);
}

function sampleShieldedSpawn() {
    let maxForThisRound = getTotalEnemiesForRound(currentRound);
    return (currentRound >= 5 && enemiesSpawnedInRound < maxForThisRound && !isRoundBreak && specialRoundType !== "speed");
}

function spawnFlyingEnemy() {
    if (gameState !== "playing" || player.lives <= 0 || isPaused || dragonSpawned || dragonWarning || isRoundBreak) return; 
    if (!sampleFlyingSpawn()) return;

    let extraHealth = Math.floor(currentRound / 5);
    let isSpeedRound = specialRoundType === "speed";

    enemiesSpawnedInRound++;
    enemies.push({
        x: Math.random() > 0.5 ? canvas.width + 20 : -50,
        y: Math.random() * (floorY - 250) + 50, 
        width: 40, height: 60,
        speed: isSpeedRound ? 4.8 : 2.2, 
        color: isSpeedRound ? "#ff1493" : "#ff8c00",
        isBoss: false,
        isFlying: true,
        isShielded: false,
        lives: isSpeedRound ? 1 : (1 + extraHealth), 
        maxLives: isSpeedRound ? 1 : (1 + extraHealth)
    });
}
let spawnFlyingInterval = setInterval(spawnFlyingEnemy, 4000);

function spawnShieldedEnemy() {
    if (gameState !== "playing" || player.lives <= 0 || isPaused || dragonSpawned || dragonWarning || isRoundBreak) return;
    if (!sampleShieldedSpawn()) return;

    let extraHealth = Math.floor(currentRound / 5);

    enemiesSpawnedInRound++;
    enemies.push({
        x: Math.random() > 0.5 ? canvas.width + 20 : -50,
        y: floorY - 80,
        width: 45, height: 80,
        velocityY: 0, isGrounded: true,
        speed: 1.5, 
        color: "#4f5d75", 
        isBoss: false,
        isFlying: false,
        isShielded: true,
        lives: 5 + extraHealth, 
        maxLives: 5 + extraHealth,
        lastGrenade: Date.now() + Math.random() * 3000
    });
}
let spawnShieldedInterval = setInterval(spawnShieldedEnemy, 10000);

function spawnBoss() {
    if (gameState !== "playing" || player.lives <= 0 || isPaused || dragonSpawned || dragonWarning || isRoundBreak || specialRoundType === "speed") return; 
    
    let extraHealth = Math.floor(currentRound / 5);

    enemies.push({
        x: canvas.width + 100,
        y: floorY - 160,
        width: 80, height: 160,
        velocityY: 0, isGrounded: true,
        speed: 1.0,
        color: "#990000",
        isBoss: true,
        isFlying: false,
        isShielded: false,
        lives: 10 + extraHealth, maxLives: 10 + extraHealth,
        lastShot: Date.now()
    });
}
setInterval(spawnBoss, 30000);

setInterval(() => { 
    if (gameState === "playing" && player.lives > 0 && !isPaused && !isRoundBreak) medkits.push({ x: Math.random() * (canvas.width - 100) + 50, y: floorY - 25, width: 25, height: 25 }); 
}, 60000);

function damagePlayer(amount) {
    if (player.isInvulnerable || player.lives <= 0 || isRoundBreak) return;
    
    shieldSystem.isCharging = false;
    shieldSystem.chargeProgress = 0;

    if (shieldSystem.current > 0) {
        shieldSystem.current -= amount;
        if (shieldSystem.current < 0) {
            player.lives += shieldSystem.current; 
            shieldSystem.current = 0;
        }
    } else {
        player.lives -= amount;
    }

    player.isInvulnerable = true;
    player.invulnerableTimer = 90; 
    if (player.lives <= 0) {
        alert(`¡Game Over! Puntuación: ${score} | Llegaste a la Ronda: ${currentRound}`);
        document.location.reload();
    }
}

function update() {
    if (gameState !== "playing" || player.lives <= 0 || isPaused) return; 

    // Actualización de Partículas
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.isChunk) { p.vy += 0.3; } 
        p.alpha -= p.decay;
        if (p.alpha <= 0) particles.splice(i, 1);
    }

    // Actualización de Textos Flotantes
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.life--;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    // Temporizadores de regeneración de plataformas
    platforms.forEach(plat => {
        if (plat.destroyed) {
            plat.repairTimer--;
            if (plat.repairTimer <= 0) {
                plat.destroyed = false;
                spawnParticles(plat.x + plat.width / 2, plat.y, "#ffaa44", 15);
            }
        }
    });

    if (enemiesLeftInRound <= 0 && !isRoundBreak) {
        isRoundBreak = true;
        roundBreakTimer = 10; 
        keys = {}; 
        enemies = [];
        bullets = [];
        enemyBullets = [];
        grenades = [];
        dragonSpawned = false;
        dragon = null;
        specialRoundType = "none";
    }

    if (isRoundBreak) return;

    if (keys["o"] && !player.isInvulnerable && shieldSystem.current < shieldSystem.max && !packAPunch.isUpgrading) {
        shieldSystem.isCharging = true;
        shieldSystem.chargeProgress++;
        if (shieldSystem.chargeProgress >= shieldSystem.requiredFrames) {
            shieldSystem.current = shieldSystem.max;
            shieldSystem.isCharging = false;
            shieldSystem.chargeProgress = 0;
        }
    } else {
        shieldSystem.isCharging = false;
        shieldSystem.chargeProgress = 0;
    }

    if (player.isReloading) {
        player.reloadTimer--;
        if (player.reloadTimer <= 0) { player.ammo = player.maxAmmo; player.isReloading = false; }
    }

    if (player.isInvulnerable) {
        player.invulnerableTimer--;
        if (player.invulnerableTimer <= 0) player.isInvulnerable = false;
    }

    // PACK-A-PUNCH
    let playerCenterX = player.x + player.width / 2;
    let playerCenterY = player.y + player.height / 2;
    let nearPackAPunch = (playerCenterX > packAPunch.x - 30 && playerCenterX < packAPunch.x + packAPunch.width + 30 &&
                          playerCenterY > packAPunch.y - 30 && playerCenterY < packAPunch.y + packAPunch.height + 30);

    if (keys["u"] && nearPackAPunch && score >= packAPunch.cost) {
        packAPunch.isUpgrading = true;
        packAPunch.chargeProgress++;

        if (packAPunch.chargeProgress >= packAPunch.requiredFrames) {
            let currentWeaponData = weaponsCatalog[player.currentWeapon];
            currentWeaponData.upgradeLevel++;
            currentWeaponData.damage += 1;
            currentWeaponData.name = currentWeaponData.name.split(" +")[0] + " +" + currentWeaponData.upgradeLevel;
            
            score -= packAPunch.cost;
            scoreEl.innerText = score;

            spawnFloatingText(packAPunch.x + 25, packAPunch.y - 40, "¡ARMA MEJORADA!", "#00ffcc");

            packAPunch.isUpgrading = false;
            packAPunch.chargeProgress = 0;
        }
    } else {
        packAPunch.isUpgrading = false;
        packAPunch.chargeProgress = 0;
    }

    if (!shieldSystem.isCharging && !packAPunch.isUpgrading) {
        if (keys["a"] && player.x > 0) { player.x -= player.speed; }
        if (keys["d"] && player.x < canvas.width - player.width) { player.x += player.speed; }
        if (keys["w"] && player.isGrounded) { player.velocityY = -player.jumpForce; player.isGrounded = false; }
    }

    player.velocityY += gravity; player.y += player.velocityY;

    if (player.y >= floorY - player.height) { player.y = floorY - player.height; player.velocityY = 0; player.isGrounded = true; }

    platforms.forEach(plat => {
        if (!plat.destroyed && player.velocityY >= 0 && player.x + player.width - 10 > plat.x && player.x + 10 < plat.x + plat.width && player.y + player.height <= plat.y + 8 && player.y + player.height + player.velocityY >= plat.y) {
            player.y = plat.y - player.height; player.velocityY = 0; player.isGrounded = true;
        }
    });

    bullets.forEach((bullet, bIndex) => {
        bullet.x += bullet.speedX;
        bullet.y += bullet.speedY;
        
        if (dragonSpawned && dragon) {
            if (bullet.x > dragon.x && bullet.x < dragon.x + dragon.width &&
                bullet.y > dragon.y && bullet.y < dragon.y + dragon.height) {
                
                dragon.lives -= bullet.damage;
                spawnParticles(bullet.x, bullet.y, "#ff4500", 4);
                spawnFloatingText(bullet.x, bullet.y - 15, `-${bullet.damage}`, "#ff6600");
                bullets.splice(bIndex, 1);
                
                if (dragon.lives <= 0) {
                    score += 1000; 
                    scoreEl.innerText = score;
                    spawnFloatingText(dragon.x + 100, dragon.y + 100, "+1000 PUNTOS", "#ffff00");
                    spawnParticles(dragon.x + 160, dragon.y + 190, "#7b00b8", 80, true);
                    dragon = null;
                    dragonSpawned = false;
                }
                return; 
            }
        }

        if (bullet.x > canvas.width || bullet.x < 0 || bullet.y > canvas.height || bullet.y < 0) {
            bullets.splice(bIndex, 1);
        }
    });

    enemyBullets.forEach((eb, ebIndex) => {
        eb.x += eb.speedX;
        eb.y += eb.speedY;

        // CORRECCIÓN: Filtrar de forma segura si viene del dragón para romper plataformas
        if (eb.isDragonFire) { 
            platforms.forEach(plat => {
                if (!plat.destroyed && eb.x > plat.x && eb.x < plat.x + plat.width && eb.y > plat.y - 15 && eb.y < plat.y + plat.height + 15) {
                    plat.destroyed = true;
                    plat.repairTimer = 3600; // 1 minuto exacto a 60 FPS
                    spawnParticles(plat.x + plat.width / 2, plat.y, "#ff4500", 30, true);
                    spawnFloatingText(plat.x + plat.width / 2, plat.y - 20, "¡PLATAFORMA ROTA!", "#ff3333");
                }
            });
        }

        if (checkCollision(player, eb)) {
            damagePlayer(eb.damage);
            enemyBullets.splice(ebIndex, 1);
            return;
        }
        if (eb.x < -50 || eb.x > canvas.width + 50 || eb.y > canvas.height) {
            enemyBullets.splice(ebIndex, 1);
        }
    });

    grenades.forEach((g, gIndex) => {
        g.timer--;
        if (g.timer <= 0) {
            let distance = Math.sqrt(Math.pow((player.x + player.width/2) - g.x, 2) + Math.pow((player.y + player.height/2) - g.y, 2));
            if (distance < g.radius) { damagePlayer(1); }
            spawnParticles(g.x, g.y, "#ff4500", 25, true);
            grenades.splice(gIndex, 1); 
        }
    });

    enemies.forEach((enemy, eIndex) => {
        if (enemy.isFlying) {
            let diffX = (player.x + player.width/2) - (enemy.x + enemy.width/2);
            let diffY = (player.y + player.height/2) - (enemy.y + enemy.height/2);
            let dist = Math.sqrt(diffX*diffX + diffY*diffY);
            if(dist > 0) {
                enemy.x += (diffX / dist) * enemy.speed;
                enemy.y += (diffY / dist) * enemy.speed;
            }
            enemy.facing = diffX >= 0 ? 1 : -1;
        } else {
            if (enemy.x < player.x) { enemy.x += enemy.speed; enemy.facing = 1; } 
            else { enemy.x -= enemy.speed; enemy.facing = -1; }

            if (!enemy.isBoss) {
                enemy.velocityY += gravity; enemy.y += enemy.velocityY;
                if (enemy.y >= floorY - enemy.height) { enemy.y = floorY - enemy.height; enemy.velocityY = 0; enemy.isGrounded = true; }
                platforms.forEach(plat => {
                    if (!plat.destroyed && enemy.velocityY >= 0 && enemy.x + enemy.width > plat.x && enemy.x < plat.x + plat.width && enemy.y + enemy.height <= plat.y + 8 && enemy.y + enemy.height + enemy.velocityY >= plat.y) {
                        enemy.y = plat.y - enemy.height; enemy.velocityY = 0; enemy.isGrounded = true;
                    }
                });
                if (player.y < enemy.y && enemy.isGrounded && Math.random() < 0.02) { enemy.velocityY = -12; enemy.isGrounded = false; }

                let now = Date.now();
                if (now - enemy.lastGrenade > 5000) {
                    enemy.lastGrenade = now;
                    grenades.push({
                        x: player.x + player.width / 2,
                        y: player.y + player.height / 2,
                        radius: 70,
                        timer: 120 
                    });
                }
            } else {
                if (enemy.y < floorY - enemy.height) enemy.y += 2;
                let now = Date.now();
                if (now - enemy.lastShot > 5000) {
                    enemy.lastShot = now;
                    let distToPlayer = Math.abs(enemy.x - player.x);
                    if (distToPlayer < 350) { 
                        enemyBullets.push({
                            x: enemy.x + (enemy.facing === 1 ? enemy.width : 0), y: enemy.y + 60,
                            speedX: enemy.facing * 8, speedY: (Math.random() - 0.5) * 4,
                            width: 14, height: 14, color: "#ffaa00", damage: 2, isDragonFire: false 
                        });
                    }
                }
            }
        }

        if (checkCollision(player, enemy)) { damagePlayer(enemy.isBoss ? 2 : 1); }

        bullets.forEach((bullet, bIndex) => {
            if (checkCollision(bullet, enemy)) {
                enemy.lives -= bullet.damage; 
                
                let particleColor = enemy.isShielded ? "#00bfff" : "#ff0033";
                spawnParticles(bullet.x, bullet.y, particleColor, 6);
                spawnFloatingText(enemy.x + enemy.width / 2, enemy.y, `-${bullet.damage}`, "#ff3333");

                bullets.splice(bIndex, 1);

                if (enemy.lives <= 0) {
                    let ptsGained = enemy.isBoss ? 150 : (enemy.isShielded ? 100 : 50);
                    score += ptsGained; 
                    scoreEl.innerText = score;

                    spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, particleColor, 25, true);
                    spawnFloatingText(enemy.x + enemy.width / 2, enemy.y - 20, `+${ptsGained}`, "#00ff66");

                    enemies.splice(eIndex, 1);
                    enemiesLeftInRound--; 
                }
            }
        });
    });

    if (dragonSpawned && dragon) {
        let now = Date.now();
        if (now - dragon.lastShot > 3000) {
            dragon.lastShot = now;
            let angle = Math.atan2((player.y + 40) - (dragon.y + 120), player.x - (dragon.x + 30));
            enemyBullets.push({
                x: dragon.x + 30, y: dragon.y + 120,
                speedX: Math.cos(angle) * 8, speedY: Math.sin(angle) * 8,
                width: 35, height: 35, color: "#ff4500", damage: 1, isDragonFire: true 
            });
        }
    }

    medkits.forEach((m, mIndex) => { if (checkCollision(player, m)) { if (player.lives < player.maxLives) player.lives++; medkits.splice(mIndex, 1); } });
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;
}

function drawStickman(x, y, color, hasGun, facingRight, isInvulnerable, scale = 1, isFlying = false, isShielded = false) {
    if (isInvulnerable && Math.floor(Date.now() / 100) % 2 === 0) return;
    ctx.strokeStyle = color; ctx.lineWidth = 3 * scale; ctx.fillStyle = color;
    const w = 40 * scale; const h = 80 * scale; const cx = x + w / 2;
    
    ctx.beginPath(); ctx.arc(cx, y + (15 * scale), 10 * scale, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, y + (25 * scale)); ctx.lineTo(cx, y + (55 * scale)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, y + (55 * scale)); ctx.lineTo(cx - (10 * scale), y + h); ctx.moveTo(cx, y + (55 * scale)); ctx.lineTo(cx + (10 * scale), y + h); ctx.stroke();
    
    if (isFlying) {
        let wingWave = Math.sin(Date.now() / 80) * 15;
        ctx.fillStyle = "rgba(255, 69, 0, 0.6)";
        ctx.beginPath(); ctx.moveTo(cx, y + 35); ctx.lineTo(cx - 35, y + 10 + wingWave); ctx.lineTo(cx - 15, y + 45); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx, y + 35); ctx.lineTo(cx + 35, y + 10 + wingWave); ctx.lineTo(cx + 15, y + 45); ctx.closePath(); ctx.fill();
    }

    if (isShielded) {
        ctx.fillStyle = "rgba(0, 191, 255, 0.4)";
        ctx.strokeStyle = "#00bfff";
        ctx.lineWidth = 3;
        ctx.save();
        let shieldOffset = facingRight ? 20 : -15;
        ctx.beginPath();
        ctx.roundRect(cx + shieldOffset, y + 15, 12 * scale, 55 * scale, 5);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    if (hasGun) {
        let angle = Math.atan2(mouseY - (y + 35), mouseX - cx);

        if (player.currentWeapon === "duales") {
            ctx.save(); ctx.translate(cx, y + 30); ctx.rotate(angle);
            ctx.strokeStyle = color; ctx.lineWidth = 3 * scale;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, -4); ctx.stroke(); 
            ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(18, -4); ctx.lineTo(28, -4); ctx.stroke(); ctx.restore();

            ctx.save(); ctx.translate(cx, y + 42); ctx.rotate(angle);
            ctx.strokeStyle = color; ctx.lineWidth = 3 * scale;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, 4); ctx.stroke();  
            ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(18, 4); ctx.lineTo(28, 4); ctx.stroke(); ctx.restore();
        } else {
            ctx.save(); ctx.translate(cx, y + 35); ctx.rotate(angle);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, 0); ctx.stroke();
            ctx.strokeStyle = "#ffffff"; 
            ctx.lineWidth = player.currentWeapon === "mp5" ? 5 : (player.currentWeapon === "rifle" ? 6 : 3);
            ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo((player.currentWeapon === "rifle" || player.currentWeapon === "galil") ? 38 : 30, 0); ctx.stroke(); ctx.restore();
        }
    } else {
        if (color === "#ff3333" && scale === 1 && !isFlying) {
            ctx.save(); ctx.translate(cx, y + 35);
            let dir = facingRight ? 1 : -1;
            let angleBase = dir === 1 ? -Math.PI / 5 : -Math.PI * 4 / 5;
            let wobble = Math.sin(Date.now() / 100) * 0.1;
            ctx.rotate(angleBase + wobble);
            ctx.strokeStyle = color; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, 0); ctx.stroke();
            ctx.strokeStyle = "#5a3825"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(23, 0); ctx.stroke();
            ctx.strokeStyle = "#e5b800"; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(23, -4); ctx.lineTo(23, 4); ctx.stroke();
            ctx.strokeStyle = "#cccccc"; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(23, 0); ctx.lineTo(50, 0); ctx.stroke();
            ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(25, -1); ctx.lineTo(49, -1); ctx.stroke(); ctx.restore();
        } else {
            let dir = facingRight ? 1 : -1;
            ctx.beginPath(); ctx.moveTo(cx, y + 35); ctx.lineTo(cx + (15 * scale * dir), y + 45); ctx.stroke();
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff"; stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));

    if (gameState === "menu") {
        ctx.fillStyle = "rgba(10, 10, 20, 0.8)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#00ffcc"; ctx.font = "bold 60px Arial";
        ctx.shadowColor = "#00ffcc"; ctx.shadowBlur = 10; ctx.textAlign = "center";
        ctx.fillText("STICKMAN SURVIVOR", canvas.width / 2, canvas.height * 0.35);
        ctx.shadowBlur = 0; 

        let isHover = mouseX >= playButton.x && mouseX <= playButton.x + playButton.width &&
                      mouseY >= playButton.y && mouseY <= playButton.y + playButton.height;

        ctx.fillStyle = isHover ? "#00ffcc" : "#3a3a4a";
        ctx.fillRect(playButton.x, playButton.y, playButton.width, playButton.height);
        ctx.strokeStyle = "#00ffcc"; ctx.lineWidth = 3;
        ctx.strokeRect(playButton.x, playButton.y, playButton.width, playButton.height);
        ctx.fillStyle = isHover ? "#000000" : "#ffffff"; ctx.font = "bold 24px Arial";
        ctx.fillText("PLAY", canvas.width / 2, canvas.height / 2 + 38);
        ctx.fillStyle = "#888888"; ctx.font = "16px Arial";
        ctx.fillText("Controles: A/D (Moverse) - W (Saltar) - Espacio (Disparar) - T (Tienda) - M (Cheats) - U (Pack-A-Punch)", canvas.width / 2, canvas.height * 0.75);
        ctx.textAlign = "left"; 
        return; 
    }

    buildings.forEach(bld => {
        ctx.fillStyle = bld.color; ctx.fillRect(bld.x, floorY - bld.height, bld.width, bld.height);
        ctx.fillStyle = "#1e1513"; ctx.fillRect(bld.x, floorY - bld.height, bld.width, 6);
        bld.windows.forEach(w => {
            ctx.fillStyle = w.lit ? "#ffdd66" : "#1a1211"; 
            ctx.fillRect(bld.x + w.relX, (floorY - bld.height) + w.relY, 16, 16);
        });
    });

    ctx.fillStyle = "#111116"; ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(canvas.width*0.25, floorY-120); ctx.lineTo(canvas.width*0.6, floorY); ctx.lineTo(canvas.width*0.85, floorY-180); ctx.lineTo(canvas.width, floorY); ctx.fill();

    backgroundDecorations.forEach(barrel => {
        ctx.fillStyle = barrel.color; ctx.fillRect(barrel.x, barrel.y, barrel.width, barrel.height);
        ctx.strokeStyle = "#111"; ctx.lineWidth = 2; ctx.strokeRect(barrel.x, barrel.y, barrel.width, barrel.height);
        ctx.beginPath();
        ctx.moveTo(barrel.x, barrel.y + barrel.height / 3); ctx.lineTo(barrel.x + barrel.width, barrel.y + barrel.height / 3);
        ctx.moveTo(barrel.x, barrel.y + (barrel.height / 3) * 2); ctx.lineTo(barrel.x + barrel.width, barrel.y + (barrel.height / 3) * 2); ctx.stroke();
        if (barrel.type === "toxic") { ctx.fillStyle = "#7fff00"; ctx.fillRect(barrel.x + 5, barrel.y + 12, barrel.width - 10, 8); }
    });

    ctx.fillStyle = "#1e1e24"; ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
    ctx.fillStyle = "#00ffcc"; ctx.fillRect(0, floorY, canvas.width, 4);

    platforms.forEach(plat => { 
        if (!plat.destroyed) {
            ctx.fillStyle = "#4e413d"; ctx.fillRect(plat.x, plat.y, plat.width, plat.height); 
            ctx.fillStyle = "#ffaa44"; ctx.fillRect(plat.x, plat.y, plat.width, 2); 
        } else {
            ctx.fillStyle = "rgba(255, 69, 0, 0.15)";
            ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        }
    });

    // PACK-A-PUNCH
    ctx.fillStyle = "#4b0082"; ctx.fillRect(packAPunch.x, packAPunch.y, packAPunch.width, packAPunch.height);
    ctx.strokeStyle = "#da70d6"; ctx.lineWidth = 3; ctx.strokeRect(packAPunch.x, packAPunch.y, packAPunch.width, packAPunch.height);
    ctx.fillStyle = Math.floor(Date.now() / 250) % 2 === 0 ? "#00ffff" : "#ff00ff";
    ctx.fillRect(packAPunch.x + 8, packAPunch.y + 10, 8, 8); ctx.fillRect(packAPunch.x + packAPunch.width - 16, packAPunch.y + 10, 8, 8);

    let playerCenterX = player.x + player.width / 2;
    let playerCenterY = player.y + player.height / 2;
    let nearPackAPunch = (playerCenterX > packAPunch.x - 30 && playerCenterX < packAPunch.x + packAPunch.width + 30 &&
                          playerCenterY > packAPunch.y - 30 && playerCenterY < packAPunch.y + packAPunch.height + 30);
    if (nearPackAPunch && !packAPunch.isUpgrading) {
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 13px Arial"; ctx.textAlign = "center";
        ctx.fillText(score >= packAPunch.cost ? "[Mantén U] Mejorar Arma (10k pts)" : "Pack-A-Punch (10,000 pts)", packAPunch.x + packAPunch.width/2, packAPunch.y - 12);
        ctx.textAlign = "left";
    }

    if (packAPunch.isUpgrading) {
        ctx.fillStyle = "#ffff00"; ctx.font = "bold 16px Arial"; ctx.textAlign = "center";
        ctx.fillText("MEJORANDO...", packAPunch.x + packAPunch.width / 2, packAPunch.y - 25);
        let progressPct = packAPunch.chargeProgress / packAPunch.requiredFrames;
        ctx.fillStyle = "#222"; ctx.fillRect(packAPunch.x - 25, packAPunch.y - 15, 100, 8);
        ctx.fillStyle = "#00ffcc"; ctx.fillRect(packAPunch.x - 25, packAPunch.y - 15, 100 * progressPct, 8);
        ctx.textAlign = "left";
    }

    medkits.forEach(m => { ctx.fillStyle = "#ffffff"; ctx.fillRect(m.x, m.y, m.width, m.height); ctx.fillStyle = "#ff0000"; ctx.fillRect(m.x + m.width/2 - 2, m.y + 4, 4, m.height - 8); ctx.fillRect(m.x + 4, m.y + m.height/2 - 2, m.width - 8, 4); });

    grenades.forEach(g => {
        ctx.fillStyle = "rgba(255, 0, 0, 0.35)"; ctx.beginPath(); ctx.arc(g.x, g.y, g.radius, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "#ff0000"; ctx.lineWidth = 2; ctx.stroke();
    });

    drawStickman(player.x, player.y, player.color, true, player.facing === 1, player.isInvulnerable, 1, false);
    
    if (shieldSystem.isCharging) {
        let pct = shieldSystem.chargeProgress / shieldSystem.requiredFrames;
        ctx.fillStyle = "#222"; ctx.fillRect(player.x - 5, player.y - 20, 50, 6);
        ctx.fillStyle = "#00bfff"; ctx.fillRect(player.x - 5, player.y - 20, 50 * pct, 6);
    }

    enemies.forEach(enemy => {
        const scale = enemy.isBoss ? 2 : 1;
        drawStickman(enemy.x, enemy.y, enemy.color, false, enemy.facing === 1, false, scale, enemy.isFlying, enemy.isShielded);
        
        if (enemy.isBoss) {
            ctx.fillStyle = "#333"; ctx.fillRect(enemy.x, enemy.y - 15, 80, 8);
            ctx.fillStyle = "#ff0000"; ctx.fillRect(enemy.x, enemy.y - 15, (enemy.lives / enemy.maxLives) * 80, 8);
        } else if (enemy.isShielded) {
            ctx.fillStyle = "#222"; ctx.fillRect(enemy.x, enemy.y - 15, 45, 6);
            ctx.fillStyle = "#00bfff"; ctx.fillRect(enemy.x, enemy.y - 15, (enemy.lives / enemy.maxLives) * 45, 6);
        }
    });

    if (dragonSpawned && dragon) {
        ctx.save();
        let firePulse = Math.sin(Date.now() / 150) * 20;
        ctx.fillStyle = "#4a0072"; ctx.beginPath(); ctx.moveTo(canvas.width, dragon.y + 150); ctx.lineTo(dragon.x + 180, dragon.y + 20); ctx.lineTo(dragon.x + 220, dragon.y + 180); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#5c008a"; ctx.beginPath(); ctx.moveTo(canvas.width, dragon.y + 100); ctx.quadraticCurveTo(dragon.x + 120, dragon.y + 150, dragon.x + 100, dragon.y + 250); ctx.lineTo(canvas.width, dragon.y + 380); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#7b00b8"; ctx.lineWidth = 3;
        for(let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(dragon.x + 160 + (i*30), dragon.y + 200 + (i*20), 25, 0, Math.PI); ctx.stroke(); }
        ctx.fillStyle = "#6a009c"; ctx.beginPath(); ctx.moveTo(dragon.x + 140, dragon.y + 230); ctx.quadraticCurveTo(dragon.x + 60, dragon.y + 150, dragon.x + 40, dragon.y + 100); ctx.lineTo(dragon.x - 20, dragon.y + 80); ctx.lineTo(dragon.x + 30, dragon.y + 130); ctx.lineTo(dragon.x + 100, dragon.y + 160); ctx.quadraticCurveTo(dragon.x + 110, dragon.y + 200, dragon.x + 140, dragon.y + 250); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#4a0072"; ctx.beginPath(); ctx.moveTo(dragon.x + 30, dragon.y + 130); ctx.lineTo(dragon.x - 5, dragon.y + 115); ctx.lineTo(dragon.x + 40, dragon.y + 150); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#9900ff"; ctx.beginPath(); ctx.moveTo(dragon.x + 40, dragon.y + 90); ctx.lineTo(dragon.x + 10, dragon.y + 40); ctx.lineTo(dragon.x + 60, dragon.y + 95); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ffff00"; ctx.shadowColor = "#ffea00"; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(dragon.x + 25, dragon.y + 95, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(dragon.x + 23, dragon.y + 95, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore(); 

        let timeToShot = Date.now() - dragon.lastShot;
        if (timeToShot > 2000) {
            ctx.fillStyle = "rgba(255, 69, 0, " + (0.3 + Math.abs(firePulse/40)) + ")"; ctx.beginPath(); ctx.arc(dragon.x + 25, dragon.y + 125, 25 + firePulse/2, 0, Math.PI*2); ctx.fill();
        }
        ctx.fillStyle = "#5c008a"; ctx.beginPath(); ctx.moveTo(dragon.x + 120, dragon.y + 270); ctx.lineTo(dragon.x + 50, dragon.y + 310); ctx.lineTo(dragon.x + 30, dragon.y + 305); ctx.moveTo(dragon.x + 50, dragon.y + 310); ctx.lineTo(dragon.x + 35, dragon.y + 320); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = "#222"; ctx.fillRect(canvas.width / 2 - 200, 30, 400, 20);
        ctx.fillStyle = "#9900ff"; ctx.fillRect(canvas.width / 2 - 200, 30, (dragon.lives / dragon.maxLives) * 400, 20);
        ctx.fillStyle = "#fff"; ctx.font = "bold 14px Arial"; ctx.fillText("DRAGÓN SUPREMO", canvas.width / 2 - 60, 45);
    }

    bullets.forEach(b => { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.width, b.height); });
    enemyBullets.forEach(eb => {
        ctx.fillStyle = eb.color;
        if(eb.width > 15) { 
            ctx.save(); ctx.shadowColor = "#ff4500"; ctx.shadowBlur = 20;
            ctx.beginPath(); ctx.arc(eb.x, eb.y, eb.width/2, 0, Math.PI*2); ctx.fill(); ctx.restore();
        } else { ctx.fillRect(eb.x, eb.y, eb.width, eb.height); }
    });

    // DIBUJAR PARTÍCULAS (Mecánica 1)
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        if (p.isChunk) {
            ctx.strokeStyle = p.color; ctx.lineWidth = 2;
            if (p.chunkType === 0) { 
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.stroke();
            } else if (p.chunkType === 1) { 
                ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.size*2, p.y + p.size); ctx.stroke();
            } else { 
                ctx.fillRect(p.x, p.y, p.size, p.size * 2);
            }
        } else {
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.restore();
    });

    // DIBUJAR NÚMEROS FLOTANTES (Mecánica 2)
    floatingTexts.forEach(ft => {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.font = "bold 16px Courier New";
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    });

    // SISTEMA DE RONDA DE OSCURIDAD (Mecánica 5)
    if (specialRoundType === "darkness") {
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.96)";
        ctx.globalCompositeOperation = "multiply";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = "destination-out";
        let radGrad = ctx.createRadialGradient(mouseX, mouseY, 10, mouseX, mouseY, 150);
        radGrad.addColorStop(0, "rgba(0,0,0,1)");
        radGrad.addColorStop(0.7, "rgba(0,0,0,0.5)");
        radGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = radGrad;
        ctx.beginPath(); ctx.arc(mouseX, mouseY, 150, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    for (let i = 0; i < player.maxLives; i++) {
        let hx = canvas.width - 150 + (i * 35); let hy = 35;
        ctx.fillStyle = i < player.lives ? "#ff2266" : "#441122"; 
        ctx.beginPath(); ctx.arc(hx-7, hy, 7, Math.PI, 0, false); ctx.arc(hx+7, hy, 7, Math.PI, 0, false); ctx.lineTo(hx, hy+12); ctx.closePath(); ctx.fill();
    }

    for (let i = 0; i < shieldSystem.max; i++) {
        let sx = canvas.width - 150 + (i * 35); let sy = 65; 
        ctx.fillStyle = i < shieldSystem.current ? "#00bfff" : "#003355"; 
        ctx.beginPath(); ctx.arc(sx-7, sy, 7, Math.PI, 0, false); ctx.arc(sx+7, sy, 7, Math.PI, 0, false); ctx.lineTo(sx, sy+12); ctx.closePath(); ctx.fill();
    }

    ctx.fillStyle = "#ffffff"; ctx.font = "bold 24px Arial";
    ctx.fillText(`RONDA: ${currentRound} ${specialRoundType === 'speed' ? '[VELOCIDAD]' : (specialRoundType === 'darkness' ? '[OSCURIDAD]' : '')}`, 25, 100);
    ctx.font = "18px Arial"; ctx.fillStyle = "#ff3333";
    ctx.fillText(`Enemigos restantes: ${enemiesLeftInRound > 0 ? enemiesLeftInRound : 0}`, 25, 135);

    if (isRoundBreak) {
        ctx.fillStyle = "rgba(12, 12, 28, 0.92)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#00ffcc"; ctx.font = "bold 42px Arial"; ctx.textAlign = "center";
        ctx.fillText(`¡RONDA COMPLETADA!`, canvas.width / 2, canvas.height * 0.28);
        ctx.fillStyle = "#ffffff"; ctx.font = "20px Arial";
        ctx.fillText(`Siguiente ronda en: ${roundBreakTimer}s`, canvas.width / 2, canvas.height * 0.35);
        ctx.fillStyle = "#aaaaaa"; ctx.fillText(`Haz clic para elegir una mejora permanente de inmediato:`, canvas.width / 2, canvas.height * 0.39);

        const buttonSpacing = 310;
        const totalMenuWidth = (upgradeOptions.length * buttonSpacing) - 30;
        const startX = (canvas.width / 2) - (totalMenuWidth / 2);
        
        upgradeOptions.forEach((opt, index) => {
            opt.x = startX + (index * buttonSpacing); opt.y = canvas.height * 0.48;
            let isHover = mouseX >= opt.x && mouseX <= opt.x + opt.w && mouseY >= opt.y && mouseY <= opt.y + opt.h;
            ctx.fillStyle = isHover ? opt.color : "#222232"; ctx.fillRect(opt.x, opt.y, opt.w, opt.h);
            ctx.strokeStyle = opt.color; ctx.lineWidth = 3; ctx.strokeRect(opt.x, opt.y, opt.w, opt.h);
            ctx.fillStyle = isHover ? "#000000" : "#ffffff"; ctx.font = "bold 18px Arial";
            ctx.fillText(opt.text, opt.x + opt.w / 2, opt.y + opt.h / 2 + 6);
        });
        ctx.textAlign = "left"; 
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(mouseX, mouseY, 6, 0, Math.PI*2); ctx.stroke();

    const currentWeaponData = weaponsCatalog[player.currentWeapon];
    ctx.fillStyle = "#ffffff"; ctx.font = "20px Arial";
    ctx.fillText(`Arma: ${currentWeaponData.name.toUpperCase()} (Daño: ${currentWeaponData.damage})`, 25, canvas.height - 110);
    ctx.fillText(`Munición: ${player.isReloading ? "RECARGANDO..." : player.ammo + "/" + player.maxAmmo}`, 25, canvas.height - 80);
    ctx.font = "14px Arial"; ctx.fillStyle = "#aaa";
    ctx.fillText("Mantén 'O' quieto por 5s para recargar Overshield", 25, canvas.height - 60);

    if (dragonWarning && !isRoundBreak) {
        ctx.fillStyle = "rgba(255, 0, 0, " + (Math.sin(Date.now() / 100) * 0.3 + 0.4) + ")"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 50px Arial"; ctx.textAlign = "center";
        ctx.fillText("⚠️ ¡EL DRAGÓN XD SE VIENE EN 5 SEGUNDOS! ⚠️", canvas.width / 2, canvas.height * 0.4);
        ctx.textAlign = "left";
    }

    if (showShop) {
        ctx.fillStyle = "rgba(10, 10, 20, 0.95)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#00ffcc"; ctx.font = "bold 40px Arial"; ctx.textAlign = "center";
        ctx.fillText("TIENDA & ARMERÍA (Juego Pausado)", canvas.width / 2, canvas.height * 0.12);
        ctx.fillStyle = "#ffffff"; ctx.font = "24px Arial"; ctx.fillText(`Tu Puntuación: ${score} pts`, canvas.width / 2, canvas.height * 0.18);
        ctx.font = "22px Arial";
        
        if (player.currentWeapon === "pistola") { ctx.fillStyle = "#00ffcc"; ctx.fillText(`[EQUIPADA ACTUALMENTE] - 1. ${weaponsCatalog.pistola.name}`, canvas.width / 2, canvas.height * 0.32); } 
        else { ctx.fillStyle = "#ffffff"; ctx.fillText(`[Presiona 1] Equipar ${weaponsCatalog.pistola.name} (Ya Adquirida)`, canvas.width / 2, canvas.height * 0.32); }

        if (player.currentWeapon === "mp5") { ctx.fillStyle = "#00ffcc"; ctx.fillText(`[EQUIPADA ACTUALMENTE] - 2. ${weaponsCatalog.mp5.name}`, canvas.width / 2, canvas.height * 0.41); } 
        else if (weaponsCatalog.mp5.purchased) { ctx.fillStyle = "#ffff00"; ctx.fillText(`[Presiona 2] Equipar ${weaponsCatalog.mp5.name} (Ya Adquirido)`, canvas.width / 2, canvas.height * 0.41); } 
        else { ctx.fillStyle = score >= weaponsCatalog.mp5.cost ? "#ffffff" : "#ff3333"; ctx.fillText(`[Presiona 2] Comprar Subfusil MP5 - Costo: ${weaponsCatalog.mp5.cost} pts`, canvas.width / 2, canvas.height * 0.41); }

        if (player.currentWeapon === "duales") { ctx.fillStyle = "#00ffcc"; ctx.fillText(`[EQUIPADA ACTUALMENTE] - 3. ${weaponsCatalog.duales.name}`, canvas.width / 2, canvas.height * 0.50); } 
        else if (weaponsCatalog.duales.purchased) { ctx.fillStyle = "#ff00ff"; ctx.fillText(`[Presiona 3] Equipar ${weaponsCatalog.duales.name} (Ya Adquiridas)`, canvas.width / 2, canvas.height * 0.50); } 
        else { ctx.fillStyle = score >= weaponsCatalog.duales.cost ? "#ffffff" : "#ff3333"; ctx.fillText(`[Presiona 3] Comprar Pistolas Duales - Costo: ${weaponsCatalog.duales.cost} pts`, canvas.width / 2, canvas.height * 0.50); }

        if (player.currentWeapon === "rifle") { ctx.fillStyle = "#00ffcc"; ctx.fillText(`[EQUIPADA ACTUALMENTE] - 4. ${weaponsCatalog.rifle.name}`, canvas.width / 2, canvas.height * 0.59); } 
        else if (weaponsCatalog.rifle.purchased) { ctx.fillStyle = "#00bfff"; ctx.fillText(`[Presiona 4] Equipar ${weaponsCatalog.rifle.name} (Ya Adquirido)`, canvas.width / 2, canvas.height * 0.59); } 
        else { ctx.fillStyle = score >= weaponsCatalog.rifle.cost ? "#ffffff" : "#ff3333"; ctx.fillText(`[Presiona 4] Comprar Rifle Pesado - Costo: ${weaponsCatalog.rifle.cost} pts`, canvas.width / 2, canvas.height * 0.59); }

        if (player.currentWeapon === "galil") { ctx.fillStyle = "#00ffcc"; ctx.fillText(`[EQUIPADA ACTUALMENTE] - 5. ${weaponsCatalog.galil.name}`, canvas.width / 2, canvas.height * 0.68); } 
        else if (weaponsCatalog.galil.purchased) { ctx.fillStyle = "#00ff66"; ctx.fillText(`[Presiona 5] Equipar ${weaponsCatalog.galil.name} (Ya Adquirido)`, canvas.width / 2, canvas.height * 0.68); } 
        else { ctx.fillStyle = score >= weaponsCatalog.galil.cost ? "#ffffff" : "#ff3333"; ctx.fillText(`[Presiona 5] Comprar Rifle Galil AR - Costo: ${weaponsCatalog.galil.cost} pts`, canvas.width / 2, canvas.height * 0.68); }
        
        ctx.fillStyle = "#aaa"; ctx.font = "18px Arial"; ctx.fillText("Presiona 'T' para cerrar el menú y volver al juego", canvas.width / 2, canvas.height * 0.82);
        ctx.textAlign = "left";
    }

    if (showCheats) {
        ctx.fillStyle = "rgba(25, 10, 10, 0.96)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff3333"; ctx.font = "bold 40px Arial"; ctx.textAlign = "center";
        ctx.fillText("MENÚ DE TRUCOS / CHEATS (Juego Pausado)", canvas.width / 2, canvas.height * 0.2);
        ctx.fillStyle = "#ffffff"; ctx.font = "24px Arial"; ctx.fillText(`Puntuación Actual: ${score} pts`, canvas.width / 2, canvas.height * 0.28);
        ctx.font = "22px Arial"; ctx.fillStyle = "#ffaa00";
        ctx.fillText("[Presiona 1] Añadir +10,000 Puntos Instantáneos", canvas.width / 2, canvas.height * 0.45);
        ctx.fillStyle = "#aaa"; ctx.font = "18px Arial"; ctx.fillText("Presiona 'M' de nuevo para cerrar el menú de trucos", canvas.width / 2, canvas.height * 0.75);
        ctx.textAlign = "left";
    }
}

function loop() { 
    update(); 
    draw(); 
    requestAnimationFrame(loop); 
}
loop();
