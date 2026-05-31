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
// NUEVO SISTEMA DE MONEDAS Y TIENDA PERMANENTE (MENÚ)
// ==========================================
// Guardamos datos en localStorage para que no se pierdan al morir (ya que el juego se reinicia)
let coins = parseInt(localStorage.getItem("stickman_coins")) || 0;
let purchasedHats = JSON.parse(localStorage.getItem("stickman_hats")) || { cowboy: false, top: false };
let equippedHat = localStorage.getItem("stickman_equipped_hat") || "none"; // "none", "cowboy", "top"

function savePersistentData() {
    localStorage.setItem("stickman_coins", coins);
    localStorage.setItem("stickman_hats", JSON.stringify(purchasedHats));
    localStorage.setItem("stickman_equipped_hat", equippedHat);
}

// Botones para la tienda del menú principal
const menuShopButton = { x: canvas.width / 2 - 100, y: canvas.height / 2 + 80, width: 200, height: 50 };
const buyCowboyButton = { x: canvas.width / 2 - 260, y: canvas.height / 2, width: 240, height: 60 };
const buyTopButton = { x: canvas.width / 2 + 20, y: canvas.height / 2, width: 240, height: 60 };
const backToMenuButton = { x: canvas.width / 2 - 100, y: canvas.height / 2 + 150, width: 200, height: 50 };

// ==========================================
// VARIABLES DE NUEVAS MECÁNICAS (COMBO Y DASH)
// ==========================================
let comboCount = 0;
let lastKillTime = 0;
const comboDuration = 3000; // 3 segundos

const dashSystem = {
    isDashing: false,
    duration: 30, // 0.5 segundos a 60fps
    timer: 0,
    cooldown: 0,
    speedX: 0
};

function checkAndResetCombo() {
    if (comboCount > 0 && Date.now() - lastKillTime > comboDuration) {
        comboCount = 0;
    }
}

// ==========================================
// PARTÍCULAS Y TEXTOS FLOTANTES
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
let gameState = "menu"; // "menu", "menu_shop", "playing"

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
    comboCount = 0; // Reiniciar combo al cambiar de ronda

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
    
    resetIntervals();
}

// Función auxiliar para reiniciar spawn de enemigos de forma limpia
function resetIntervals() {
    clearInterval(spawnEnemyInterval);
    clearInterval(spawnFlyingInterval);
    clearInterval(spawnShieldedInterval); 
    clearInterval(spawnKamikazeInterval); // Limpiar Kamikaze
    
    let baseEnemyTime = 2500;
    let baseFlyingTime = 4000;
    let baseKamikazeTime = 5500; // Frecuencia base para Kamikazes
    
    let speedIncrements = Math.floor(currentRound / 5);
    if (speedIncrements > 0) {
        baseEnemyTime = Math.max(1000, 2500 - (speedIncrements * 500));
        baseFlyingTime = Math.max(1000, 4000 - (speedIncrements * 500));
        baseKamikazeTime = Math.max(2000, 5500 - (speedIncrements * 600));
    }

    if (specialRoundType === "speed") {
        spawnFlyingInterval = setInterval(spawnFlyingEnemy, 1200);
        spawnKamikazeInterval = setInterval(spawnKamikazeEnemy, 1800); // Más kamikazes en ronda veloz
    } else {
        spawnEnemyInterval = setInterval(spawnEnemy, baseEnemyTime);
        spawnFlyingInterval = setInterval(spawnFlyingEnemy, baseFlyingTime);
        spawnShieldedInterval = setInterval(spawnShieldedEnemy, 10000);
        if (currentRound >= 2) { // Aparecen a partir de la ronda 2
            spawnKamikazeInterval = setInterval(spawnKamikazeEnemy, baseKamikazeTime);
        }
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
        if (mouseX >= playButton.x && mouseX <= playButton.x + playButton.width &&
            mouseY >= playButton.y && mouseY <= playButton.y + playButton.height) {
            gameState = "playing";
        }
        if (mouseX >= menuShopButton.x && mouseX <= menuShopButton.x + menuShopButton.width &&
            mouseY >= menuShopButton.y && mouseY <= menuShopButton.y + menuShopButton.height) {
            gameState = "menu_shop";
        }
        return;
    }

    if (gameState === "menu_shop") {
        if (mouseX >= buyCowboyButton.x && mouseX <= buyCowboyButton.x + buyCowboyButton.width &&
            mouseY >= buyCowboyButton.y && mouseY <= buyCowboyButton.y + buyCowboyButton.height) {
            if (!purchasedHats.cowboy && coins >= 5000) {
                coins -= 5000;
                purchasedHats.cowboy = true;
                equippedHat = "cowboy";
            } else if (purchasedHats.cowboy) {
                equippedHat = equippedHat === "cowboy" ? "none" : "cowboy";
            }
            savePersistentData();
        }
        if (mouseX >= buyTopButton.x && mouseX <= buyTopButton.x + buyTopButton.width &&
            mouseY >= buyTopButton.y && mouseY <= buyTopButton.y + buyTopButton.height) {
            if (!purchasedHats.top && coins >= 10000) {
                coins -= 10000;
                purchasedHats.top = true;
                equippedHat = "top";
            } else if (purchasedHats.top) {
                equippedHat = equippedHat === "top" ? "none" : "top";
            }
            savePersistentData();
        }
        if (mouseX >= backToMenuButton.x && mouseX <= backToMenuButton.x + backToMenuButton.width &&
            mouseY >= backToMenuButton.y && mouseY <= backToMenuButton.y + backToMenuButton.height) {
            gameState = "menu";
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

    // AÑADIDO: DASH (SHIFT) - DESPLAZAMIENTO CONGELADO / INVULNERABLE
    if (e.key === "Shift" && gameState === "playing" && !isRoundBreak && !isPaused && !packAPunch.isUpgrading) {
        if (!dashSystem.isDashing && dashSystem.cooldown <= 0 && player.lives > 0) {
            dashSystem.isDashing = true;
            dashSystem.timer = dashSystem.duration;
            dashSystem.cooldown = 45; // Cooldown entre dashes
            dashSystem.speedX = player.facing * 14; // Desplazamiento hacia el lado que mira
            player.isInvulnerable = true;
            player.invulnerableTimer = dashSystem.duration;
            player.velocityY = 0; // Congelar eje vertical
            spawnParticles(player.x + player.width/2, player.y + player.height/2, "#00ffff", 10);
        }
        return;
    }

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
        if (key === "2") {
            spawnFloatingText(canvas.width / 2, canvas.height / 2, "¡RONDA SALTEADA!", "#00ffff");
            enemiesLeftInRound = 0;
            enemiesSpawnedInRound = getTotalEnemiesForRound(currentRound);
            enemies = [];
            showCheats = false;
            isPaused = false;
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
        isKamikaze: false, // Normal
        lives: 2 + extraHealth, 
        maxLives: 2 + extraHealth,
        lastGrenade: Date.now() + Math.random() * 2000
    });
}
let spawnEnemyInterval = setInterval(spawnEnemy, 2500); 

// AÑADIDO: ENEMIGO KAMIKAZE EXPLOSIVO
function spawnKamikazeEnemy() {
    if (gameState !== "playing" || player.lives <= 0 || isPaused || dragonSpawned || dragonWarning || isRoundBreak) return;
    if (!sampleEnemySpawn()) return;

    enemiesSpawnedInRound++;
    enemies.push({
        x: Math.random() > 0.5 ? canvas.width + 20 : -50,
        y: floorY - 80,
        width: 40, height: 80,
        velocityY: 0, isGrounded: true,
        speed: Math.random() * (5.5 - 4.5) + 4.5, // Va a toda velocidad
        color: "#ff0000",
        isBoss: false,
        isFlying: false,
        isShielded: false,
        isKamikaze: true,
        flashTimer: 0,
        lives: 1, // Muere rápido si le disparas de lejos
        maxLives: 1
    });
}
let spawnKamikazeInterval = setInterval(spawnKamikazeEnemy, 5500);

// AÑADIDO: LÓGICA DE EXPLOSIÓN EN CADENA DEL KAMIKAZE
function explodeKamikaze(kx, ky) {
    let radius = 130;
    spawnParticles(kx, ky, "#ff3300", 30, true);
    spawnParticles(kx, ky, "#ffcc00", 15, false);

    // Daño al jugador
    let distPlayer = Math.sqrt(Math.pow((player.x + player.width/2) - kx, 2) + Math.pow((player.y + player.height/2) - ky, 2));
    if (distPlayer < radius) {
        damagePlayer(1);
    }

    // Daño a los demás enemigos cercanos (reacción en cadena)
    for (let i = enemies.length - 1; i >= 0; i--) {
        let en = enemies[i];
        let distEnemy = Math.sqrt(Math.pow((en.x + en.width/2) - kx, 2) + Math.pow((en.y + en.height/2) - ky, 2));
        if (distEnemy < radius) {
            en.lives -= 5; // Daño letal/alto por explosión
            
            if (en.lives <= 0) {
                let pts = en.isBoss ? 150 : (en.isShielded ? 100 : 50);
                score += pts;
                scoreEl.innerText = score;
                
                // Matar enemigos con la explosión mantiene/sube el combo
                comboCount++;
                lastKillTime = Date.now();

                spawnParticles(en.x + en.width/2, en.y + en.height/2, en.color, 15, true);
                spawnFloatingText(en.x + en.width/2, en.y - 20, `+${pts}`, "#00ff66");

                // Reacción en cadena si alcanza a otro Kamikaze vivo
                if (en.isKamikaze) {
                    let nextKx = en.x + en.width/2;
                    let nextKy = en.y + en.height/2;
                    enemies.splice(i, 1);
                    enemiesLeftInRound--;
                    explodeKamikaze(nextKx, nextKy);
                    continue;
                }

                enemies.splice(i, 1);
                enemiesLeftInRound--;
            }
        }
    }
}

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
        isKamikaze: false,
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
        isKamikaze: false,
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
        isKamikaze: false,
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

    // AÑADIDO: Controlar tiempo del combo
    checkAndResetCombo();

    // AÑADIDO: Lógica física del Dash
    if (dashSystem.cooldown > 0) dashSystem.cooldown--;
    if (dashSystem.isDashing) {
        dashSystem.timer--;
        player.x += dashSystem.speedX;
        
        if (player.x < 0) player.x = 0;
        if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
        
        if (dashSystem.timer <= 0) {
            dashSystem.isDashing = false;
            player.isInvulnerable = false;
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.isChunk) { p.vy += 0.3; } 
        p.alpha -= p.decay;
        if (p.alpha <= 0) particles.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.y += ft.vy; ft.life--;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

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
        
        coins += 100;
        savePersistentData();
        spawnFloatingText(player.x + 20, player.y - 40, "+100 MONEDAS", "#00ff66");
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

    // No remover invulnerabilidad ordinaria si el dash sigue activo
    if (player.isInvulnerable && !dashSystem.isDashing) {
        player.invulnerableTimer--;
        if (player.invulnerableTimer <= 0) player.isInvulnerable = false;
    }

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

    // Bloquear movimiento regular durante el Dash
    if (!shieldSystem.isCharging && !packAPunch.isUpgrading && !dashSystem.isDashing) {
        if (keys["a"] && player.x > 0) { player.x -= player.speed; }
        if (keys["d"] && player.x < canvas.width - player.width) { player.x += player.speed; }
        if (keys["w"] && player.isGrounded) { player.velocityY = -player.jumpForce; player.isGrounded = false; }
    }

    // Suspender gravedad sólo en el Dash congelado
    if (!dashSystem.isDashing) {
        player.velocityY += gravity; player.y += player.velocityY;
    }

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
                    score += 1000; scoreEl.innerText = score;
                    comboCount++; lastKillTime = Date.now(); // Añadir a combo
                    spawnFloatingText(dragon.x + 100, dragon.y + 100, "+1000 PUNTOS", "#ffff00");
                    spawnParticles(dragon.x + 160, dragon.y + 190, "#7b00b8", 80, true);
                    dragon = null; dragonSpawned = false;
                }
                return; 
            }
        }

        if (bullet.x > canvas.width || bullet.x < 0 || bullet.y > canvas.height || bullet.y < 0) {
            bullets.splice(bIndex, 1);
        }
    });

    enemyBullets.forEach((eb, ebIndex) => {
        eb.x += eb.speedX; eb.y += eb.speedY;

        if (eb.isDragonFire) { 
            platforms.forEach(plat => {
                if (!plat.destroyed && eb.x > plat.x && eb.x < plat.x + plat.width && eb.y > plat.y - 15 && eb.y < plat.y + plat.height + 15) {
                    plat.destroyed = true; plat.repairTimer = 3600; 
                    spawnParticles(plat.x + plat.width / 2, plat.y, "#ff4500", 30, true);
                    spawnFloatingText(plat.x + plat.width / 2, plat.y - 20, "¡PLATAFORMA ROTA!", "#ff3333");
                }
            });
        }

        if (checkCollision(player, eb)) {
            damagePlayer(eb.damage); enemyBullets.splice(ebIndex, 1); return;
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
        if (enemy.isKamikaze) {
            enemy.flashTimer++;
        }

        if (enemy.isFlying) {
            let diffX = (player.x + player.width/2) - (enemy.x + enemy.width/2);
            let diffY = (player.y + player.height/2) - (enemy.y + enemy.height/2);
            let dist = Math.sqrt(diffX*diffX + diffY*diffY);
            if(dist > 0) {
                enemy.x += (diffX / dist) * enemy.speed; enemy.y += (diffY / dist) * enemy.speed;
            }
            enemy.facing = diffX >= 0 ? 1 : -1;
        } else {
            if (enemy.x < player.x) { enemy.x += enemy.speed; enemy.facing = 1; } 
            else { enemy.x -= enemy.speed; enemy.facing = -1; }

            if (!enemy.isBoss) {
                enemy.velocityY += gravity; enemy.y += enemy.velocityY;
                if (enemy.y >= floorY - enemy.height) {
                    enemy.y = floorY - enemy.height; enemy.velocityY = 0; enemy.isGrounded = true;
                }
                platforms.forEach(plat => {
                    if (!plat.destroyed && enemy.velocityY >= 0 && enemy.x + enemy.width > plat.x && enemy.x < plat.x + plat.width && enemy.y + enemy.height <= plat.y + 8 && enemy.y + enemy.height + enemy.velocityY >= plat.y) {
                        enemy.y = plat.y - enemy.height; enemy.velocityY = 0; enemy.isGrounded = true;
                    }
                });

                if (!enemy.isKamikaze && player.y < enemy.y && enemy.isGrounded && Math.random() < 0.02) {
                    enemy.velocityY = -12; enemy.isGrounded = false;
                }
                
                let now = Date.now();
                if (!enemy.isKamikaze && now - enemy.lastGrenade > 5000) {
                    enemy.lastGrenade = now;
                    grenades.push({ x: player.x + player.width / 2, y: player.y + player.height / 2, radius: 70, timer: 120 });
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

        if (checkCollision(player, enemy)) {
            if (enemy.isKamikaze) {
                let kx = enemy.x + enemy.width/2;
                let ky = enemy.y + enemy.height/2;
                enemies.splice(eIndex, 1);
                enemiesLeftInRound--;
                explodeKamikaze(kx, ky); // Explota encima tuyo
            } else {
                damagePlayer(enemy.isBoss ? 2 : 1);
            }
        }

        bullets.forEach((bullet, bIndex) => {
            if (checkCollision(bullet, enemy)) {
                enemy.lives -= bullet.damage;
                spawnParticles(bullet.x, bullet.y, enemy.color, 6);
                spawnFloatingText(enemy.x + enemy.width / 2, enemy.y, `-${bullet.damage}`, "#ff3333");
                bullets.splice(bIndex, 1);

                if (enemy.lives <= 0) {
                    let ptsGained = enemy.isBoss ? 150 : (enemy.isShielded ? 100 : 50);
                    score += ptsGained; scoreEl.innerText = score;
                    
                    // Aumentar combo al matar con disparos
                    comboCount++;
                    lastKillTime = Date.now();

                    let kx = enemy.x + enemy.width/2;
                    let ky = enemy.y + enemy.height/2;

                    if (enemy.isKamikaze) {
                        enemies.splice(eIndex, 1);
                        enemiesLeftInRound--;
                        explodeKamikaze(kx, ky); // Explota de lejos para cadena
                    } else {
                        spawnParticles(kx, ky, enemy.color, 25, true);
                        spawnFloatingText(enemy.x + enemy.width / 2, enemy.y - 20, `+${ptsGained}`, "#00ff66");
                        enemies.splice(eIndex, 1);
                        enemiesLeftInRound--;
                    }
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

    medkits.forEach((m, mIndex) => {
        if (checkCollision(player, m)) {
            if (player.lives < player.maxLives) player.lives++;
            medkits.splice(mIndex, 1);
        }
    });
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function drawHat(cx, y, scale, facingRight) {
    if (equippedHat === "none") return;
    ctx.save();
    let hatY = y + (5 * scale);
    let hatX = cx;
    if (equippedHat === "cowboy") {
        ctx.fillStyle = "#8b4513"; ctx.strokeStyle = "#5c2e0b"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(hatX, hatY + 2, 16 * scale, 4 * scale, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hatX - 9 * scale, hatY + 2);
        ctx.quadraticCurveTo(hatX - 9 * scale, hatY - 12 * scale, hatX - 6 * scale, hatY - 14 * scale);
        ctx.lineTo(hatX + 6 * scale, hatY - 14 * scale);
        ctx.quadraticCurveTo(hatX + 9 * scale, hatY - 12 * scale, hatX + 9 * scale, hatY + 2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#111111"; ctx.fillRect(hatX - 9 * scale, hatY - 2, 18 * scale, 3 * scale);
    } else if (equippedHat === "top") {
        ctx.fillStyle = "#1a1a1a"; ctx.strokeStyle = "#000000"; ctx.lineWidth = 2;
        ctx.fillRect(hatX - 15 * scale, hatY, 30 * scale, 3 * scale);
        ctx.fillRect(hatX - 9 * scale, hatY - 18 * scale, 18 * scale, 18 * scale);
        ctx.fillStyle = "#ff0000"; ctx.fillRect(hatX - 9 * scale, hatY - 3, 18 * scale, 3 * scale);
    }
    ctx.restore();
}

function drawStickman(cx, cy, color, facingRight, scale = 1, weaponType = "none") {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3.5 * scale;
    ctx.beginPath(); ctx.arc(cx, cy - 25 * scale, 8 * scale, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 17 * scale); ctx.lineTo(cx, cy + 10 * scale); ctx.stroke();
    ctx.beginPath();
    if (weaponType !== "none") {
        ctx.moveTo(cx, cy - 10 * scale); ctx.lineTo(cx + (facingRight * 15 * scale), cy - 5 * scale);
        ctx.moveTo(cx, cy - 10 * scale); ctx.lineTo(cx + (facingRight * 12 * scale), cy + 2 * scale);
    } else {
        ctx.moveTo(cx, cy - 10 * scale); ctx.lineTo(cx - 10 * facingRight * scale, cy);
        ctx.moveTo(cx, cy - 10 * scale); ctx.lineTo(cx + 10 * facingRight * scale, cy);
    }
    ctx.stroke();
    let walkCycle = Math.sin(Date.now() * 0.012);
    ctx.beginPath(); ctx.moveTo(cx, cy + 10 * scale); ctx.lineTo(cx - (10 * scale) + (walkCycle * 6 * scale), cy + 30 * scale);
    ctx.moveTo(cx, cy + 10 * scale); ctx.lineTo(cx + (10 * scale) - (walkCycle * 6 * scale), cy + 30 * scale); ctx.stroke();
    if (color === player.color) { drawHat(cx, cy - 33 * scale, scale, facingRight); }
    ctx.restore();
}

function draw() {
    ctx.fillStyle = specialRoundType === "darkness" ? "#040206" : "#0d0e15";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    stars.forEach(star => { ctx.fillRect(star.x, star.y, star.size, star.size); });

    buildings.forEach(bld => {
        ctx.fillStyle = bld.color; ctx.fillRect(bld.x, floorY - bld.height, bld.width, bld.height);
        bld.windows.forEach(w => {
            ctx.fillStyle = w.lit ? (specialRoundType === "darkness" ? "#9d7bb0" : "#ffdf6d") : "#1b1514";
            ctx.fillRect(bld.x + w.relX, (floorY - bld.height) + w.relY, 14, 18);
        });
    });

    backgroundDecorations.forEach(dec => {
        ctx.fillStyle = dec.color; ctx.fillRect(dec.x, dec.y, dec.width, dec.height);
        if (dec.type === "toxic") { ctx.fillStyle = "rgba(0, 255, 50, 0.3)"; ctx.fillRect(dec.x - 2, dec.y - 4, dec.width + 4, 4); }
    });

    ctx.fillStyle = "#4a154b"; ctx.fillRect(packAPunch.x, packAPunch.y, packAPunch.width, packAPunch.height);
    ctx.fillStyle = "#00ffff"; ctx.fillRect(packAPunch.x + 5, packAPunch.y + 5, packAPunch.width - 10, 12);
    ctx.fillStyle = "#ffffff"; ctx.font = "10px Arial"; ctx.fillText("P-A-P", packAPunch.x + 10, packAPunch.y + 35);

    if (packAPunch.isUpgrading) {
        ctx.fillStyle = "rgba(0, 255, 204, 0.4)"; ctx.fillRect(packAPunch.x - 10, packAPunch.y - 10, packAPunch.width + 20, packAPunch.height + 20);
        ctx.fillStyle = "#00ffcc"; ctx.fillRect(packAPunch.x, packAPunch.y - 18, (packAPunch.width * packAPunch.chargeProgress) / packAPunch.requiredFrames, 5);
    }

    platforms.forEach(plat => {
        if (!plat.destroyed) {
            ctx.fillStyle = "#6b7280"; ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
            ctx.fillStyle = "#4b5563"; ctx.fillRect(plat.x, plat.y + plat.height - 4, plat.width, 4);
        }
    });

    ctx.fillStyle = specialRoundType === "darkness" ? "#15111a" : "#222533";
    ctx.fillRect(0, floorY, canvas.width, 60);
    ctx.fillStyle = specialRoundType === "darkness" ? "#2f1a3a" : "#3b4252";
    ctx.fillRect(0, floorY, canvas.width, 6);

    medkits.forEach(m => {
        ctx.fillStyle = "#ffffff"; ctx.fillRect(m.x, m.y, m.width, m.height);
        ctx.fillStyle = "#ff0000"; ctx.fillRect(m.x + m.width / 2 - 3, m.y + 3, 6, m.height - 6); ctx.fillRect(m.x + 3, m.y + m.height / 2 - 3, m.width - 6, 6);
    });

    bullets.forEach(b => { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.width, b.height); });

    enemyBullets.forEach(eb => {
        ctx.fillStyle = eb.color;
        if (eb.isDragonFire) { ctx.beginPath(); ctx.arc(eb.x + eb.width/2, eb.y + eb.height/2, eb.width/2, 0, Math.PI*2); ctx.fill(); } 
        else { ctx.fillRect(eb.x, eb.y, eb.width, eb.height); }
    });

    grenades.forEach(g => {
        ctx.fillStyle = Math.floor(g.timer / 8) % 2 === 0 ? "#ff0000" : "#ffffff";
        ctx.beginPath(); ctx.arc(g.x, g.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255, 69, 0, 0.2)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2); ctx.stroke();
    });

    enemies.forEach(enemy => {
        let scale = enemy.isBoss ? 2.0 : (enemy.isShielded ? 1.1 : 1.0);
        
        // AÑADIDO: Parpadeo en rojo para el Kamikaze
        let c = enemy.color;
        if (enemy.isKamikaze && Math.floor(enemy.flashTimer / 5) % 2 === 0) {
            c = "#ffffff"; // Al alternar da el efecto rojo/blanco parpadeante rápido
        }

        drawStickman(enemy.x + enemy.width / 2, enemy.y + enemy.height - (30 * scale), c, enemy.facing === 1, scale, enemy.isBoss ? "boss_gun" : "none");

        if (enemy.isShielded) {
            ctx.strokeStyle = "#00bfff"; ctx.lineWidth = 4; ctx.beginPath();
            if (enemy.facing === 1) { ctx.arc(enemy.x + enemy.width + 2, enemy.y + 40, 24, -Math.PI/2, Math.PI/2); } 
            else { ctx.arc(enemy.x - 2, enemy.y + 40, 24, Math.PI/2, -Math.PI/2); }
            ctx.stroke();
        }

        if (enemy.lives < enemy.maxLives) {
            ctx.fillStyle = "#333333"; ctx.fillRect(enemy.x, enemy.y - 12, enemy.width, 5);
            ctx.fillStyle = "#ff3333"; ctx.fillRect(enemy.x, enemy.y - 12, (enemy.width * enemy.lives) / enemy.maxLives, 5);
        }
    });

    if (dragonSpawned && dragon) {
        ctx.fillStyle = "#7b00b8"; ctx.fillRect(dragon.x, dragon.y, dragon.width, dragon.height);
        ctx.fillStyle = "#ff00ff"; ctx.fillRect(dragon.x + 40, dragon.y + 60, 50, 40); 
        ctx.fillStyle = "#ffaa00"; ctx.font = "bold 20px Arial"; ctx.fillText("¡DRAGÓN SUPREMO!", dragon.x + 30, dragon.y - 30);
        ctx.fillStyle = "#333333"; ctx.fillRect(dragon.x, dragon.y - 15, dragon.width, 10);
        ctx.fillStyle = "#a855f7"; ctx.fillRect(dragon.x, dragon.y - 15, (dragon.width * dragon.lives) / dragon.maxLives, 10);
    }

    particles.forEach(p => {
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
        if (p.isChunk) {
            ctx.strokeStyle = p.color; ctx.lineWidth = 3;
            if (p.chunkType === 0) { ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI*2); ctx.fill(); }
            else if (p.chunkType === 1) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 10, p.y + 10); ctx.stroke(); }
            else { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + 15); ctx.stroke(); }
        } else { ctx.fillRect(p.x, p.y, p.size, p.size); }
        ctx.restore();
    });

    if (player.lives > 0) {
        let isPlayerInvisible = player.isInvulnerable && Math.floor(player.invulnerableTimer / 4) % 2 === 0;
        if (!isPlayerInvisible) {
            drawStickman(player.x + player.width / 2, player.y + player.height - 30, player.color, player.facing === 1, 1, player.currentWeapon);

            ctx.save();
            let originX = player.x + player.width / 2; let originY = player.y + 35;
            let angle = Math.atan2(mouseY - originY, mouseX - originX);
            ctx.translate(originX, originY); ctx.rotate(angle);
            ctx.fillStyle = weaponsCatalog[player.currentWeapon].color;
            ctx.fillRect(0, -3, player.currentWeapon === "rifle" ? 28 : 18, 5); ctx.restore();
        }
    }

    floatingTexts.forEach(ft => {
        ctx.save(); ctx.globalAlpha = ft.alpha; ctx.fillStyle = ft.color; ctx.font = "bold 16px Arial";
        ctx.fillText(ft.text, ft.x, ft.y); ctx.restore();
    });

    // ==========================================
    // INTERFAZ DE USUARIO (HUD) ORIGINAL INTACTA
    // ==========================================
    ctx.fillStyle = "#ffffff"; ctx.font = "20px Arial";
    ctx.fillText(`Ronda Actual: ${currentRound}`, 30, 95);
    ctx.fillText(`Enemigos Restantes: ${enemiesLeftInRound}`, 30, 125);
    ctx.fillText(`Monedas Guardadas: $${coins}`, 30, 155);

    let weaponInfo = weaponsCatalog[player.currentWeapon];
    ctx.fillText(`Arma: ${weaponInfo.name}`, 30, 195);
    ctx.fillText(`Cargador: ${player.isReloading ? "Recargando..." : player.ammo + " / " + player.maxAmmo}`, 30, 225);

    ctx.fillStyle = "#ff2266";
    for (let i = 0; i < player.maxLives; i++) {
        if (i < player.lives) ctx.fillText("❤", 30 + (i * 28), 55);
        else { ctx.fillStyle = "#444444"; ctx.fillText("❤", 30 + (i * 28), 55); ctx.fillStyle = "#ff2266"; }
    }

    ctx.fillStyle = "#00bfff";
    for (let i = 0; i < shieldSystem.max; i++) {
        if (i < shieldSystem.current) ctx.fillText("🛡", 160 + (i * 28), 55);
        else { ctx.fillStyle = "#444444"; ctx.fillText("🛡", 160 + (i * 28), 55); ctx.fillStyle = "#00bfff"; }
    }

    if (shieldSystem.isCharging) {
        ctx.fillStyle = "#333333"; ctx.fillRect(160, 65, 100, 6); ctx.fillStyle = "#00bfff";
        ctx.fillRect(160, 65, (100 * shieldSystem.chargeProgress) / shieldSystem.requiredFrames, 6);
    }

    // ==========================================
    // AÑADIDO: INTERFAZ EN LA ESQUINA PARA EL COMBO
    // ==========================================
    if (comboCount > 0) {
        ctx.save();
        ctx.textAlign = "right";
        ctx.font = "bold 32px Arial";
        ctx.fillStyle = comboCount >= 30 ? "#ff2222" : (comboCount >= 20 ? "#ff9900" : (comboCount >= 10 ? "#ffff00" : "#00ffff"));
        ctx.fillText(`X${comboCount} COMBO`, canvas.width - 40, 55);
        ctx.restore();
    }

    if (dragonWarning) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.15)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff3333"; ctx.font = "bold 40px Arial"; ctx.textAlign = "center";
        ctx.fillText("⚠️ ¡ALERTA DE DRAGÓN SUPREMO ACERCÁNDOSE! ⚠️", canvas.width / 2, canvas.height * 0.3); ctx.textAlign = "left";
    }

    if (isRoundBreak) {
        ctx.fillStyle = "rgba(10, 10, 15, 0.85)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 42px Arial"; ctx.textAlign = "center";
        ctx.fillText(`¡RONDA ${currentRound} COMPLETADA!`, canvas.width / 2, canvas.height * 0.25);
        ctx.font = "24px Arial"; ctx.fillStyle = "#00ff66"; ctx.fillText(`Siguiente Ronda comienza en: ${roundBreakTimer} segundos`, canvas.width / 2, canvas.height * 0.33);
        
        ctx.fillStyle = "#ffaa00"; ctx.font = "bold 26px Arial"; ctx.fillText("ELIJE UNA MEJORA GRATUITA PARA TU STICKMAN:", canvas.width / 2, canvas.height * 0.45);

        let startX = (canvas.width / 2) - ((upgradeOptions.length * 320) / 2);
        upgradeOptions.forEach((opt, idx) => {
            opt.x = startX + (idx * 320); opt.y = canvas.height * 0.55;
            ctx.fillStyle = "#1e222b"; ctx.fillRect(opt.x, opt.y, opt.w, opt.h);
            ctx.strokeStyle = opt.color; ctx.lineWidth = 3; ctx.strokeRect(opt.x, opt.y, opt.w, opt.h);
            ctx.fillStyle = "#ffffff"; ctx.font = "18px Arial"; ctx.fillText(opt.text, opt.x + opt.w / 2, opt.y + opt.h / 2 + 6);
        });
        ctx.textAlign = "left";
    }

    if (showShop) {
        ctx.fillStyle = "rgba(15, 15, 25, 0.95)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#00ffcc"; ctx.font = "bold 40px Arial"; ctx.textAlign = "center";
        ctx.fillText("TIENDA DE ARMAS LOGÍSTICAS (Puntos in-game)", canvas.width / 2, canvas.height * 0.15);
        ctx.fillStyle = "#ffffff"; ctx.font = "22px Arial"; ctx.fillText(`Tus Puntos de Puntuación: ${score} pts`, canvas.width / 2, canvas.height * 0.22);

        ctx.font = "20px Arial";
        ctx.fillStyle = weaponsCatalog.pistola.purchased ? "#00ff66" : "#ff3333";
        ctx.fillText(`[Presiona 1] ${weaponsCatalog.pistola.name} - ADQUIRIDA (Equipar)`, canvas.width / 2, canvas.height * 0.32);
        ctx.fillStyle = weaponsCatalog.mp5.purchased ? "#00ff66" : (score >= weaponsCatalog.mp5.cost ? "#ffff00" : "#ff3333");
        ctx.fillText(`[Presiona 2] ${weaponsCatalog.mp5.name} - ` + (weaponsCatalog.mp5.purchased ? "ADQUIRIDA (Equipar)" : `Costo: ${weaponsCatalog.mp5.cost} pts`), canvas.width / 2, canvas.height * 0.41);
        ctx.fillStyle = weaponsCatalog.duales.purchased ? "#00ff66" : (score >= weaponsCatalog.duales.cost ? "#ffff00" : "#ff3333");
        ctx.fillText(`[Presiona 3] ${weaponsCatalog.duales.name} - ` + (weaponsCatalog.duales.purchased ? "ADQUIRIDA (Equipar)" : `Costo: ${weaponsCatalog.duales.cost} pts`), canvas.width / 2, canvas.height * 0.50);
        ctx.fillStyle = weaponsCatalog.rifle.purchased ? "#00ff66" : (score >= weaponsCatalog.rifle.cost ? "#ffff00" : "#ff3333");
        ctx.fillText(`[Presiona 4] ${weaponsCatalog.rifle.name} - ` + (weaponsCatalog.rifle.purchased ? "ADQUIRIDA (Equipar)" : `Costo: ${weaponsCatalog.rifle.cost} pts`), canvas.width / 2, canvas.height * 0.59);
        ctx.fillStyle = weaponsCatalog.galil.purchased ? "#00ff66" : (score >= weaponsCatalog.galil.cost ? "#ffff00" : "#ff3333");
        ctx.fillText(`[Presiona 5] ${weaponsCatalog.galil.name} - ` + (weaponsCatalog.galil.purchased ? "ADQUIRIDA (Equipar)" : `Costo: ${weaponsCatalog.galil.cost} pts`), canvas.width / 2, canvas.height * 0.68);
        
        ctx.fillStyle = "#aaa"; ctx.font = "18px Arial"; ctx.fillText("Presiona 'T' para cerrar el menú y volver al juego", canvas.width / 2, canvas.height * 0.82);
        ctx.textAlign = "left";
    }

    if (showCheats) {
        ctx.fillStyle = "rgba(25, 10, 10, 0.96)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff3333"; ctx.font = "bold 40px Arial"; ctx.textAlign = "center";
        ctx.fillText("MENÚ DE TRUCOS / CHEATS (Juego Pausado)", canvas.width / 2, canvas.height * 0.2);
        ctx.fillStyle = "#ffffff"; ctx.font = "24px Arial"; ctx.fillText(`Puntuación Actual: ${score} pts`, canvas.width / 2, canvas.height * 0.28);
        ctx.font = "22px Arial"; ctx.fillStyle = "#ffaa00";
        ctx.fillText("[Presiona 1] Añadir +10,000 Puntos Instantáneos", canvas.width / 2, canvas.height * 0.42);
        ctx.fillStyle = "#00ffff"; ctx.fillText("[Presiona 2] Saltear Ronda Completamente", canvas.width / 2, canvas.height * 0.50);
        ctx.fillStyle = "#aaa"; ctx.font = "18px Arial"; ctx.fillText("Presiona 'M' para quitar el menú de trucos", canvas.width / 2, canvas.height * 0.75);
        ctx.textAlign = "left";
    }
}

function gameLoop() {
    if (gameState === "playing") {
        update(); draw();
    } else if (gameState === "menu") {
        ctx.fillStyle = "#090a10"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 55px Arial"; ctx.textAlign = "center";
        ctx.fillText("STICKMAN ENDLESS SURVIVOR", canvas.width / 2, canvas.height * 0.25);
        ctx.font = "20px Arial"; ctx.fillStyle = "#00ffcc"; ctx.fillText(`Monedas de Cuenta: $${coins}`, canvas.width / 2, canvas.height * 0.35);

        ctx.fillStyle = "#1e293b"; ctx.fillRect(playButton.x, playButton.y, playButton.width, playButton.height);
        ctx.strokeStyle = "#00ffcc"; ctx.lineWidth = 3; ctx.strokeRect(playButton.x, playButton.y, playButton.width, playButton.height);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 22px Arial"; ctx.fillText("JUGAR", playButton.x + playButton.width / 2, playButton.y + playButton.height / 2 + 8);

        ctx.fillStyle = "#1e293b"; ctx.fillRect(menuShopButton.x, menuShopButton.y, menuShopButton.width, menuShopButton.height);
        ctx.strokeStyle = "#ffaa00"; ctx.strokeRect(menuShopButton.x, menuShopButton.y, menuShopButton.width, menuShopButton.height);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 18px Arial"; ctx.fillText("TIENDA COSMÉTICA", menuShopButton.x + menuShopButton.width / 2, menuShopButton.y + menuShopButton.height / 2 + 6);
        ctx.textAlign = "left";
    } else if (gameState === "menu_shop") {
        ctx.fillStyle = "#0b0c16"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffaa00"; ctx.font = "bold 44px Arial"; ctx.textAlign = "center";
        ctx.fillText("TIENDA DE SOMBREROS PERMANENTES", canvas.width / 2, canvas.height * 0.15);
        ctx.fillStyle = "#ffffff"; ctx.font = "22px Arial"; ctx.fillText(`Tus Monedas: $${coins}`, canvas.width / 2, canvas.height * 0.23);

        ctx.fillStyle = "#1e2230"; ctx.fillRect(buyCowboyButton.x, buyCowboyButton.y, buyCowboyButton.width, buyCowboyButton.height);
        ctx.strokeStyle = equippedHat === "cowboy" ? "#00ffcc" : "#666"; ctx.strokeRect(buyCowboyButton.x, buyCowboyButton.y, buyCowboyButton.width, buyCowboyButton.height);
        ctx.fillStyle = "#ffffff"; ctx.font = "16px Arial";
        let labelCowboy = purchasedHats.cowboy ? (equippedHat === "cowboy" ? "DESEQUIPAR" : "EQUIPAR") : "COMPRAR: $5,000 Monedas";
        ctx.fillText("Sombrero Vaquero", buyCowboyButton.x + buyCowboyButton.width / 2, buyCowboyButton.y + 24);
        ctx.fillStyle = "#ffaa00"; ctx.fillText(labelCowboy, buyCowboyButton.x + buyCowboyButton.width / 2, buyCowboyButton.y + 46);

        ctx.fillStyle = "#1e2230"; ctx.fillRect(buyTopButton.x, buyTopButton.y, buyTopButton.width, buyTopButton.height);
        ctx.strokeStyle = equippedHat === "top" ? "#00ffcc" : "#666"; ctx.strokeRect(buyTopButton.x, buyTopButton.y, buyTopButton.width, buyTopButton.height);
        ctx.fillStyle = "#ffffff";
        let labelTop = purchasedHats.top ? (equippedHat === "top" ? "DESEQUIPAR" : "EQUIPAR") : "COMPRAR: $10,000 Monedas";
        ctx.fillText("Sombrero de Copa", buyTopButton.x + buyTopButton.width / 2, buyTopButton.y + 24);
        ctx.fillStyle = "#ffaa00"; ctx.fillText(labelTop, buyTopButton.x + buyTopButton.width / 2, buyTopButton.y + 46);

        ctx.fillStyle = "#334155"; ctx.fillRect(backToMenuButton.x, backToMenuButton.y, backToMenuButton.width, backToMenuButton.height);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 16px Arial"; ctx.fillText("VOLVER AL MENÚ", backToMenuButton.x + backToMenuButton.width / 2, backToMenuButton.y + backToMenuButton.height / 2 + 5);
        ctx.textAlign = "left";
    }
    requestAnimationFrame(gameLoop);
}

updatePlayerStats();
player.ammo = player.maxAmmo;
gameLoop();
