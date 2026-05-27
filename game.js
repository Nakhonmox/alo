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

// Estructura de las opciones del menú de intermedio
const upgradeOptions = [
    { id: "red_heart", text: "+1 Corazón Rojo Max", color: "#ff2266", x: 0, y: 0, w: 280, h: 70 },
    { id: "blue_heart", text: "+1 Escudo Azul Max", color: "#00bfff", x: 0, y: 0, w: 280, h: 70 },
    { id: "max_ammo", text: "+10 Balas en Cargador", color: "#ffff00", x: 0, y: 0, w: 280, h: 70 }
];

// Modificadores permanentes guardados
const permanentUpgrades = {
    bonusMaxLives: 0,
    bonusMaxShield: 0,
    bonusMaxAmmo: 0
};

// ESTRUCTURA COMPLETA DE ARMAS DE LA TIENDA
const weaponsCatalog = {
    pistola: { name: "Pistola Base", baseAmmo: 9, cooldown: 400, damage: 1, cost: 0, purchased: true, color: "#ffffff" },
    mp5:     { name: "Subfusil MP5", baseAmmo: 20, cooldown: 130, damage: 1, cost: 1000, purchased: false, color: "#ffff00" },
    duales:  { name: "Pistolas Duales", baseAmmo: 18, cooldown: 220, damage: 1, cost: 2000, purchased: false, color: "#ff00ff" },
    rifle:   { name: "Rifle Pesado", baseAmmo: 5, cooldown: 800, damage: 2, cost: 3000, purchased: false, color: "#00bfff" }
};

function getTotalEnemiesForRound(round) {
    if (round === 1) return 20;
    return 20 + (round - 1) * 15; 
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
}

function updatePlayerStats() {
    player.maxLives = 3 + permanentUpgrades.bonusMaxLives;
    shieldSystem.max = 3 + permanentUpgrades.bonusMaxShield;
    
    const currentWeaponData = weaponsCatalog[player.currentWeapon];
    player.maxAmmo = currentWeaponData.baseAmmo + permanentUpgrades.bonusMaxAmmo;
    player.shootCooldown = currentWeaponData.cooldown;
}
// ==========================================

// SISTEMA DE OVERSHIELD
const shieldSystem = {
    current: 3,
    max: 3,
    isCharging: false,
    chargeProgress: 0, 
    requiredFrames: 300
};

// Configuración del Jugador
const player = {
    x: 150,
    y: floorY - 80,
    width: 40,
    height: 80,
    speed: 6,
    jumpForce: 14,
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

let bullets = [];
let enemyBullets = []; 
let grenades = [];     
let enemies = [];
let medkits = [];
let dragon = null;     

// Plataformas
const platforms = [
    { x: canvas.width * 0.1, y: floorY - 120, width: 200, height: 15 },
    { x: canvas.width * 0.3, y: floorY - 240, width: 200, height: 15 },
    { x: canvas.width * 0.5, y: floorY - 360, width: 200, height: 15 },
    { x: canvas.width * 0.7, y: floorY - 260, width: 200, height: 15 },
    { x: canvas.width * 0.25, y: floorY - 480, width: 250, height: 15 },
    { x: canvas.width * 0.55, y: floorY - 500, width: 250, height: 15 }
];

// Fondo
const stars = [];
for (let i = 0; i < 60; i++) {
    stars.push({ x: Math.random() * canvas.width, y: Math.random() * (canvas.height * 0.6), size: Math.random() * 2 });
}

window.addEventListener("mousemove", e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isRoundBreak && !isPaused) {
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

// Tienda interactiva
window.addEventListener("keydown", e => {
    if (gameState !== "playing" || isRoundBreak) return; 
    
    const key = e.key.toLowerCase();
    if (key === "t") { showShop = !showShop; isPaused = showShop; return; }
    
    if (showShop) {
        if (key === "1") {
            equipWeapon("pistola");
            showShop = false; isPaused = false;
        }
        if (key === "2") {
            if (weaponsCatalog.mp5.purchased) {
                equipWeapon("mp5");
                showShop = false; isPaused = false;
            } else if (score >= weaponsCatalog.mp5.cost) {
                score -= weaponsCatalog.mp5.cost; scoreEl.innerText = score;
                weaponsCatalog.mp5.purchased = true;
                equipWeapon("mp5");
                showShop = false; isPaused = false;
            }
        }
        if (key === "3") {
            if (weaponsCatalog.duales.purchased) {
                equipWeapon("duales");
                showShop = false; isPaused = false;
            } else if (score >= weaponsCatalog.duales.cost) {
                score -= weaponsCatalog.duales.cost; scoreEl.innerText = score;
                weaponsCatalog.duales.purchased = true;
                equipWeapon("duales");
                showShop = false; isPaused = false;
            }
        }
        if (key === "4") {
            if (weaponsCatalog.rifle.purchased) {
                equipWeapon("rifle");
                showShop = false; isPaused = false;
            } else if (score >= weaponsCatalog.rifle.cost) {
                score -= weaponsCatalog.rifle.cost; scoreEl.innerText = score;
                weaponsCatalog.rifle.purchased = true;
                equipWeapon("rifle");
                showShop = false; isPaused = false;
            }
        }
        return;
    }
    keys[e.key === " " ? "space" : key] = true;
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

// Disparar
window.addEventListener("keydown", e => {
    if (gameState !== "playing" || isRoundBreak || isPaused) return; 
    
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
                width: player.currentWeapon === "rifle" ? 18 : 10, 
                height: player.currentWeapon === "rifle" ? 6 : 4,
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
    else player.reloadTimer = 80;
}

// Reloj interno del juego
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
    if (!sampleEnemySpawn()) return;

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
        lives: 2, 
        lastGrenade: Date.now() + Math.random() * 2000
    });
}
setInterval(spawnEnemy, 2500); 

function sampleFlyingSpawn() {
    let maxForThisRound = getTotalEnemiesForRound(currentRound);
    return (currentRound >= 2 && enemiesSpawnedInRound < maxForThisRound && !isRoundBreak);
}

function spawnFlyingEnemy() {
    if (gameState !== "playing" || player.lives <= 0 || isPaused || dragonSpawned || dragonWarning || isRoundBreak) return; 
    if (!sampleFlyingSpawn()) return;

    enemiesSpawnedInRound++;
    enemies.push({
        x: Math.random() > 0.5 ? canvas.width + 20 : -50,
        y: Math.random() * (floorY - 250) + 50, 
        width: 40, height: 60,
        speed: 2.2,
        color: "#ff8c00",
        isBoss: false,
        isFlying: true,
        lives: 1 
    });
}
setInterval(spawnFlyingEnemy, 4000);

function spawnBoss() {
    if (gameState !== "playing" || player.lives <= 0 || isPaused || dragonSpawned || dragonWarning || isRoundBreak) return; 
    enemies.push({
        x: canvas.width + 100,
        y: floorY - 160,
        width: 80, height: 160,
        velocityY: 0, isGrounded: true,
        speed: 1.0,
        color: "#990000",
        isBoss: true,
        isFlying: false,
        lives: 10, maxLives: 10,
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
    }

    if (isRoundBreak) return;

    if (keys["o"] && !player.isInvulnerable && shieldSystem.current < shieldSystem.max) {
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

    if (!shieldSystem.isCharging) {
        if (keys["a"] && player.x > 0) { player.x -= player.speed; }
        if (keys["d"] && player.x < canvas.width - player.width) { player.x += player.speed; }
        if (keys["w"] && player.isGrounded) { player.velocityY = -player.jumpForce; player.isGrounded = false; }
    }

    player.velocityY += gravity; player.y += player.velocityY;

    if (player.y >= floorY - player.height) { player.y = floorY - player.height; player.velocityY = 0; player.isGrounded = true; }

    platforms.forEach(plat => {
        if (player.velocityY >= 0 && player.x + player.width - 10 > plat.x && player.x + 10 < plat.x + plat.width && player.y + player.height <= plat.y + 8 && player.y + player.height + player.velocityY >= plat.y) {
            player.y = plat.y - player.height; player.velocityY = 0; player.isGrounded = true;
        }
    });

    bullets.forEach((bullet, bIndex) => {
        bullet.x += bullet.speedX;
        bullet.y += bullet.speedY;
        if (bullet.x > canvas.width || bullet.x < 0 || bullet.y > canvas.height || bullet.y < 0) bullets.splice(bIndex, 1);
    });

    enemyBullets.forEach((eb, ebIndex) => {
        eb.x += eb.speedX;
        eb.y += eb.speedY;
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
                    if (enemy.velocityY >= 0 && enemy.x + enemy.width > plat.x && enemy.x < plat.x + plat.width && enemy.y + enemy.height <= plat.y + 8 && enemy.y + enemy.height + enemy.velocityY >= plat.y) {
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
                            width: 14, height: 14, color: "#ffaa00", damage: 2 
                        });
                    }
                }
            }
        }

        if (checkCollision(player, enemy)) { damagePlayer(enemy.isBoss ? 2 : 1); }

        bullets.forEach((bullet, bIndex) => {
            if (checkCollision(bullet, enemy)) {
                enemy.lives -= bullet.damage; 
                bullets.splice(bIndex, 1);
                if (enemy.lives <= 0) {
                    enemies.splice(eIndex, 1);
                    enemiesLeftInRound--; 
                    score += enemy.isBoss ? 150 : 50; 
                    scoreEl.innerText = score;
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
                width: 35, height: 35, color: "#ff4500", damage: 1 
            });
        }

        bullets.forEach((bullet, bIndex) => {
            if (checkCollision(bullet, dragon)) {
                dragon.lives -= bullet.damage;
                bullets.splice(bIndex, 1);
                if (dragon.lives <= 0) {
                    score += 1000; 
                    scoreEl.innerText = score;
                    dragonSpawned = false;
                    dragon = null;
                }
            }
        });
    }

    medkits.forEach((m, mIndex) => { if (checkCollision(player, m)) { if (player.lives < player.maxLives) player.lives++; medkits.splice(mIndex, 1); } });
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;
}

function drawStickman(x, y, color, hasGun, facingRight, isInvulnerable, scale = 1, isFlying = false) {
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

    if (hasGun) {
        let angle = Math.atan2(mouseY - (y + 35), mouseX - cx);

        if (player.currentWeapon === "duales") {
            ctx.save();
            ctx.translate(cx, y + 30);
            ctx.rotate(angle);
            ctx.strokeStyle = color; ctx.lineWidth = 3 * scale;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, -4); ctx.stroke(); 
            ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(18, -4); ctx.lineTo(28, -4); ctx.stroke(); 
            ctx.restore();

            ctx.save();
            ctx.translate(cx, y + 42);
            ctx.rotate(angle);
            ctx.strokeStyle = color; ctx.lineWidth = 3 * scale;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, 4); ctx.stroke();  
            ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(18, 4); ctx.lineTo(28, 4); ctx.stroke();  
            ctx.restore();
        } else {
            ctx.save();
            ctx.translate(cx, y + 35);
            ctx.rotate(angle);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, 0); ctx.stroke();
            ctx.strokeStyle = "#ffffff"; 
            ctx.lineWidth = player.currentWeapon === "mp5" ? 5 : (player.currentWeapon === "rifle" ? 6 : 3);
            ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(player.currentWeapon === "rifle" ? 38 : 30, 0); ctx.stroke();
            ctx.restore();
        }
    } else {
        // ASIGNACIÓN DE KATANA: Solo a enemigos normales pequeños (Rojos, escala 1, terrestres)
        if (color === "#ff3333" && scale === 1 && !isFlying) {
            ctx.save();
            ctx.translate(cx, y + 35);
            
            // Determinar la dirección de ataque en base al movimiento del stickman
            let dir = facingRight ? 1 : -1;
            
            // Rotar el brazo/arma en un ángulo diagonal frontal y añadir un leve bamboleo de animación
            let angleBase = dir === 1 ? -Math.PI / 5 : -Math.PI * 4 / 5;
            let wobble = Math.sin(Date.now() / 100) * 0.1;
            ctx.rotate(angleBase + wobble);

            // Brazo articulado del enemigo
            ctx.strokeStyle = color; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, 0); ctx.stroke();

            // Mango (Tsuka) de la Katana - Marrón oscuro
            ctx.strokeStyle = "#5a3825"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(23, 0); ctx.stroke();

            // Guardamano (Tsuba) - Color dorado metálico
            ctx.strokeStyle = "#e5b800"; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(23, -4); ctx.lineTo(23, 4); ctx.stroke();

            // Hoja (Nagasa) de la katana - Color plateado/gris
            ctx.strokeStyle = "#cccccc"; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(23, 0); ctx.lineTo(50, 0); ctx.stroke();

            // Línea de brillo en el filo - Blanco puro
            ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(25, -1); ctx.lineTo(49, -1); ctx.stroke();

            ctx.restore();
        } else {
            // Brazos normales por defecto para Jefes u otros tipos de enemigos
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
        ctx.fillStyle = "#00ffcc";
        ctx.font = "bold 60px Arial";
        ctx.textAlign = "center";
        ctx.fillText("STICKMAN SURVIVOR", canvas.width / 2, canvas.height * 0.35);

        let isHover = mouseX >= playButton.x && mouseX <= playButton.x + playButton.width &&
                      mouseY >= playButton.y && mouseY <= playButton.y + playButton.height;

        ctx.fillStyle = isHover ? "#00ffcc" : "#3a3a4a";
        ctx.fillRect(playButton.x, playButton.y, playButton.width, playButton.height);
        ctx.strokeStyle = "#00ffcc";
        ctx.lineWidth = 3;
        ctx.strokeRect(playButton.x, playButton.y, playButton.width, playButton.height);
        ctx.fillStyle = isHover ? "#000000" : "#ffffff";
        ctx.font = "bold 24px Arial";
        ctx.fillText("PLAY", canvas.width / 2, canvas.height / 2 + 38);
        ctx.fillStyle = "#888888";
        ctx.font = "16px Arial";
        ctx.fillText("Controles: A/D (Moverse) - W (Saltar) - Espacio (Disparar) - T (Tienda) - O (Escudo)", canvas.width / 2, canvas.height * 0.75);
        ctx.textAlign = "left"; 
        return; 
    }

    ctx.fillStyle = "#111116"; ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(canvas.width*0.25, floorY-120); ctx.lineTo(canvas.width*0.6, floorY); ctx.lineTo(canvas.width*0.85, floorY-180); ctx.lineTo(canvas.width, floorY); ctx.fill();

    ctx.fillStyle = "#1e1e24"; ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
    ctx.fillStyle = "#00ffcc"; ctx.fillRect(0, floorY, canvas.width, 4);
    platforms.forEach(plat => { ctx.fillStyle = "#3a3a4a"; ctx.fillRect(plat.x, plat.y, plat.width, plat.height); ctx.fillStyle = "#00ffcc"; ctx.fillRect(plat.x, plat.y, plat.width, 2); });
    medkits.forEach(m => { ctx.fillStyle = "#ffffff"; ctx.fillRect(m.x, m.y, m.width, m.height); ctx.fillStyle = "#ff0000"; ctx.fillRect(m.x + m.width/2 - 2, m.y + 4, 4, m.height - 8); ctx.fillRect(m.x + 4, m.y + m.height/2 - 2, m.width - 8, 4); });

    grenades.forEach(g => {
        ctx.fillStyle = "rgba(255, 0, 0, 0.35)";
        ctx.beginPath(); ctx.arc(g.x, g.y, g.radius, 0, Math.PI*2); ctx.fill();
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
        drawStickman(enemy.x, enemy.y, enemy.color, false, enemy.facing === 1, false, scale, enemy.isFlying);
        if (enemy.isBoss) {
            ctx.fillStyle = "#333"; ctx.fillRect(enemy.x, enemy.y - 15, 80, 8);
            ctx.fillStyle = "#ff0000"; ctx.fillRect(enemy.x, enemy.y - 15, (enemy.lives / enemy.maxLives) * 80, 8);
        }
    });

    if (dragonSpawned && dragon) {
        ctx.save();
        let firePulse = Math.sin(Date.now() / 150) * 20;
        ctx.fillStyle = "#4a0072"; 
        ctx.beginPath(); ctx.moveTo(canvas.width, dragon.y + 150); ctx.lineTo(dragon.x + 180, dragon.y + 20); ctx.lineTo(dragon.x + 220, dragon.y + 180); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#5c008a"; 
        ctx.beginPath(); ctx.moveTo(canvas.width, dragon.y + 100); ctx.quadraticCurveTo(dragon.x + 120, dragon.y + 150, dragon.x + 100, dragon.y + 250); ctx.lineTo(canvas.width, dragon.y + 380); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#7b00b8"; ctx.lineWidth = 3;
        for(let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(dragon.x + 160 + (i*30), dragon.y + 200 + (i*20), 25, 0, Math.PI); ctx.stroke(); }
        ctx.fillStyle = "#6a009c";
        ctx.beginPath(); ctx.moveTo(dragon.x + 140, dragon.y + 230); ctx.quadraticCurveTo(dragon.x + 60, dragon.y + 150, dragon.x + 40, dragon.y + 100); ctx.lineTo(dragon.x - 20, dragon.y + 80); ctx.lineTo(dragon.x + 30, dragon.y + 130); ctx.lineTo(dragon.x + 100, dragon.y + 160); ctx.quadraticCurveTo(dragon.x + 110, dragon.y + 200, dragon.x + 140, dragon.y + 250); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#4a0072"; ctx.beginPath(); ctx.moveTo(dragon.x + 30, dragon.y + 130); ctx.lineTo(dragon.x - 5, dragon.y + 115); ctx.lineTo(dragon.x + 40, dragon.y + 150); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#9900ff"; ctx.beginPath(); ctx.moveTo(dragon.x + 40, dragon.y + 90); ctx.lineTo(dragon.x + 10, dragon.y + 40); ctx.lineTo(dragon.x + 60, dragon.y + 95); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ffff00"; ctx.shadowColor = "#ffea00"; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(dragon.x + 25, dragon.y + 95, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(dragon.x + 23, dragon.y + 95, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore(); 

        let timeToShot = Date.now() - dragon.lastShot;
        if (timeToShot > 2000) {
            ctx.fillStyle = "rgba(255, 69, 0, " + (0.3 + Math.abs(firePulse/40)) + ")";
            ctx.beginPath(); ctx.arc(dragon.x + 25, dragon.y + 125, 25 + firePulse/2, 0, Math.PI*2); ctx.fill();
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

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px Arial";
    ctx.fillText(`RONDA: ${currentRound}`, 25, 45);
    ctx.font = "18px Arial"; ctx.fillStyle = "#ff3333";
    ctx.fillText(`Enemigos restantes: ${enemiesLeftInRound > 0 ? enemiesLeftInRound : 0}`, 25, 75);

    // MENÚ DE INTERMEDIO
    if (isRoundBreak) {
        ctx.fillStyle = "rgba(12, 12, 28, 0.92)"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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

    ctx.fillStyle = "#ffffff"; ctx.font = "20px Arial";
    ctx.fillText(`Arma: ${player.currentWeapon.toUpperCase()}`, 25, canvas.height - 110);
    ctx.fillText(`Munición: ${player.isReloading ? "RECARGANDO..." : player.ammo + "/" + player.maxAmmo}`, 25, canvas.height - 80);
    ctx.font = "14px Arial"; ctx.fillStyle = "#aaa";
    ctx.fillText("Mantén 'O' quieto por 5s para recargar Overshield", 25, canvas.height - 50);

    if (dragonWarning && !isRoundBreak) {
        ctx.fillStyle = "rgba(255, 0, 0, " + (Math.sin(Date.now() / 100) * 0.3 + 0.4) + ")"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 50px Arial"; ctx.textAlign = "center";
        ctx.fillText("⚠️ ¡EL DRAGÓN SUPREMO DESPIERTA EN 5 SEGUNDOS! ⚠️", canvas.width / 2, canvas.height * 0.4);
        ctx.textAlign = "left";
    }

    // ==========================================
    // RENDERIZADO CORREGIDO DE LA TIENDA DE ARMAS
    // ==========================================
    if (showShop) {
        ctx.fillStyle = "rgba(10, 10, 20, 0.95)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#00ffcc"; ctx.font = "bold 40px Arial"; ctx.textAlign = "center";
        ctx.fillText("TIENDA & ARMERÍA (Juego Pausado)", canvas.width / 2, canvas.height * 0.15);
        ctx.fillStyle = "#ffffff"; ctx.font = "24px Arial"; ctx.fillText(`Tu Puntuación: ${score} pts`, canvas.width / 2, canvas.height * 0.22);
        
        ctx.font = "22px Arial";
        
        // 1. Pistola Base
        if (player.currentWeapon === "pistola") {
            ctx.fillStyle = "#00ffcc"; ctx.fillText("[EQUIPADA ACTUALMENTE] - 1. Pistola Base", canvas.width / 2, canvas.height * 0.38);
        } else {
            ctx.fillStyle = "#ffffff"; ctx.fillText("[Presiona 1] Equipar Pistola Base (Ya Adquirida)", canvas.width / 2, canvas.height * 0.38);
        }

        // 2. Subfusil MP5
        if (player.currentWeapon === "mp5") {
            ctx.fillStyle = "#00ffcc"; ctx.fillText("[EQUIPADA ACTUALMENTE] - 2. Subfusil MP5", canvas.width / 2, canvas.height * 0.48);
        } else if (weaponsCatalog.mp5.purchased) {
            ctx.fillStyle = "#ffff00"; ctx.fillText("[Presiona 2] Equipar Subfusil MP5 (Ya Adquirido)", canvas.width / 2, canvas.height * 0.48);
        } else {
            ctx.fillStyle = score >= weaponsCatalog.mp5.cost ? "#ffffff" : "#ff3333";
            ctx.fillText(`[Presiona 2] Comprar Subfusil MP5 - Costo: ${weaponsCatalog.mp5.cost} pts`, canvas.width / 2, canvas.height * 0.48);
        }

        // 3. Pistolas Duales
        if (player.currentWeapon === "duales") {
            ctx.fillStyle = "#00ffcc"; ctx.fillText("[EQUIPADA ACTUALMENTE] - 3. Pistolas Duales (Doble Brazo)", canvas.width / 2, canvas.height * 0.58);
        } else if (weaponsCatalog.duales.purchased) {
            ctx.fillStyle = "#ff00ff"; ctx.fillText("[Presiona 3] Equipar Pistolas Duales (Ya Adquiridas)", canvas.width / 2, canvas.height * 0.58);
        } else {
            ctx.fillStyle = score >= weaponsCatalog.duales.cost ? "#ffffff" : "#ff3333";
            ctx.fillText(`[Presiona 3] Comprar Pistolas Duales - Costo: ${weaponsCatalog.duales.cost} pts`, canvas.width / 2, canvas.height * 0.58);
        }

        // 4. Rifle Pesado
        if (player.currentWeapon === "rifle") {
            ctx.fillStyle = "#00ffcc"; ctx.fillText("[EQUIPADA ACTUALMENTE] - 4. Rifle Pesado", canvas.width / 2, canvas.height * 0.68);
        } else if (weaponsCatalog.rifle.purchased) {
            ctx.fillStyle = "#00bfff"; ctx.fillText("[Presiona 4] Equipar Rifle Pesado (Ya Adquirido)", canvas.width / 2, canvas.height * 0.68);
        } else {
            ctx.fillStyle = score >= weaponsCatalog.rifle.cost ? "#ffffff" : "#ff3333";
            ctx.fillText(`[Presiona 4] Comprar Rifle Pesado - Costo: ${weaponsCatalog.rifle.cost} pts`, canvas.width / 2, canvas.height * 0.68);
        }
        
        ctx.fillStyle = "#aaa"; ctx.font = "18px Arial"; ctx.fillText("Presiona 'T' para cerrar el menú y volver al juego", canvas.width / 2, canvas.height * 0.82);
        ctx.textAlign = "left";
    }
}

function loop() { 
    update(); 
    draw(); 
    requestAnimationFrame(loop); 
}
loop();
