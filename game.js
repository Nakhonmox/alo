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

// ESTADOS DEL JUEGO
let gameState = "MENU"; // Estados posibles: "MENU", "PLAYING", "SKILL_SELECT", "SHOP"
let isPaused = false;
let showShop = false;

// SISTEMA DE RONDAS Y OLEADAS
let currentRound = 1;
let totalEnemiesThisRound = 20;
let enemiesSpawnedThisRound = 0;
let enemiesDefeatedThisRound = 0;
let intermissionTimer = 0; // Segundos restantes para la siguiente ronda
let intermissionInterval = null;
let sniperSpawnCount = 0; // Control para generar exactamente 2 francotiradores por ronda

// Sistema de Temporizadores de Spawn para la gestión de rondas
let lastNormalSpawn = 0;
let lastFlyingSpawn = 0;

// Sistema de Eventos Especiales (Dragón Supremo)
let gameTimer = 0;
let dragonSpawned = false;
let dragonWarning = false;

// SISTEMA DE OVERSHIELD (Escudo de Metal tipo Fortnite)
const shieldSystem = {
    current: 3,
    max: 3,
    isCharging: false,
    chargeProgress: 0, 
    requiredFrames: 300
};

// Modificadores permanentes por habilidades elegidas
const globalUpgrades = {
    extraAmmo: 0
};

// 1. Configuración del Jugador
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
    
    // SISTEMA DE ARMAS
    currentWeapon: "pistola", 
    hasMP5: false,
    hasDuals: false, // NUEVO: Pistolas Duales
    hasRifle: false, 
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

// Botón del Menú de Inicio
const playButton = {
    x: canvas.width / 2 - 100,
    y: canvas.height / 2,
    width: 200,
    height: 60
};

// Plataformas elevadas (se añade una extra alta ideal para los snipers)
const platforms = [
    { x: canvas.width * 0.1, y: floorY - 120, width: 200, height: 15 },
    { x: canvas.width * 0.3, y: floorY - 240, width: 200, height: 15 },
    { x: canvas.width * 0.5, y: floorY - 360, width: 200, height: 15 },
    { x: canvas.width * 0.7, y: floorY - 260, width: 200, height: 15 },
    { x: canvas.width * 0.25, y: floorY - 480, width: 250, height: 15 },
    { x: canvas.width * 0.55, y: floorY - 540, width: 250, height: 15 } // Plataforma muy alta
];

// Fondo (Estrellas)
const stars = [];
for (let i = 0; i < 60; i++) {
    stars.push({ x: Math.random() * canvas.width, y: Math.random() * (canvas.height * 0.6), size: Math.random() * 2 });
}

// Rastrear posición del mouse y clicks
window.addEventListener("mousemove", e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (gameState === "PLAYING") {
        player.facing = (mouseX >= player.x + player.width / 2) ? 1 : -1;
    }
});

window.addEventListener("click", e => {
    if (gameState === "MENU") {
        // Detectar click en el botón de Play
        if (mouseX >= playButton.x && mouseX <= playButton.x + playButton.width &&
            mouseY >= playButton.y && mouseY <= playButton.y + playButton.height) {
            startGame();
        }
    }
});

// Escuchar teclado
window.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();
    
    // Abrir/Cerrar Tienda en Gameplay
    if (key === "t" && (gameState === "PLAYING" || gameState === "SHOP")) { 
        showShop = !showShop; 
        gameState = showShop ? "SHOP" : "PLAYING";
        isPaused = showShop;
        return; 
    }
    
    // Lógica de compra en Tienda
    if (gameState === "SHOP") {
        if (key === "1" && score >= 1000 && !player.hasMP5) {
            score -= 1000; scoreEl.innerText = score;
            player.hasMP5 = true; equipWeapon("mp5");
            showShop = false; gameState = "PLAYING"; isPaused = false;
        }
        if (key === "3" && score >= 2000 && !player.hasDuals) {
            score -= 2000; scoreEl.innerText = score;
            player.hasDuals = true; equipWeapon("duals");
            showShop = false; gameState = "PLAYING"; isPaused = false;
        }
        if (key === "2" && score >= 3000 && !player.hasRifle) {
            score -= 3000; scoreEl.innerText = score;
            player.hasRifle = true; equipWeapon("rifle");
            showShop = false; gameState = "PLAYING"; isPaused = false;
        }
        return;
    }

    // Lógica de elección de Habilidades Roguelike
    if (gameState === "SKILL_SELECT") {
        if (key === "j") { // Habilidad 1: Corazón Rojo
            player.maxLives += 1;
            player.lives = player.maxLives;
            startIntermission();
        }
        if (key === "k") { // Habilidad 2: Corazón Plateado
            shieldSystem.max += 1;
            shieldSystem.current = shieldSystem.max;
            startIntermission();
        }
        if (key === "l") { // Habilidad 3: Cargador Ampliado (+5 balas a todas)
            globalUpgrades.extraAmmo += 5;
            player.maxAmmo += 5;
            player.ammo = player.maxAmmo;
            startIntermission();
        }
        return;
    }

    keys[e.key === " " ? "space" : key] = true;
});

window.addEventListener("keyup", e => keys[e.key === " " ? "space" : e.key.toLowerCase()] = false);

function startGame() {
    gameState = "PLAYING";
    currentRound = 1;
    totalEnemiesThisRound = 20;
    enemiesSpawnedThisRound = 0;
    enemiesDefeatedThisRound = 0;
    sniperSpawnCount = 0;
    intermissionTimer = 0;
    initClock();
}

function equipWeapon(weapon) {
    player.currentWeapon = weapon;
    if (weapon === "pistola") { player.maxAmmo = 9 + globalUpgrades.extraAmmo; player.shootCooldown = 400; }
    if (weapon === "mp5") { player.maxAmmo = 20 + globalUpgrades.extraAmmo; player.shootCooldown = 130; }
    if (weapon === "duals") { player.maxAmmo = 18 + globalUpgrades.extraAmmo; player.shootCooldown = 200; } // Alta cadencia
    if (weapon === "rifle") { player.maxAmmo = 5 + globalUpgrades.extraAmmo; player.shootCooldown = 800; } 
    player.ammo = player.maxAmmo;
    player.isReloading = false;
}

function startIntermission() {
    gameState = "PLAYING";
    intermissionTimer = 15;
    currentRound++;
    totalEnemiesThisRound = 20 + (currentRound - 1) * 50;
    enemiesSpawnedThisRound = 0;
    enemiesDefeatedThisRound = 0;
    sniperSpawnCount = 0;
}

// Disparar con barra espaciadora
window.addEventListener("keydown", e => {
    if (e.key === " " && player.lives > 0 && gameState === "PLAYING" && intermissionTimer <= 0) {
        if (player.isReloading) return;
        const now = Date.now();
        if (now - player.lastShotTime < player.shootCooldown) return;

        if (player.ammo > 0) {
            player.ammo--;
            player.lastShotTime = now;

            let originX = player.x + player.width / 2;
            let originY = player.y + 35;
            let angle = Math.atan2(mouseY - originY, mouseX - originX);

            let bulletDamage = (player.currentWeapon === "rifle") ? 2 : 1;
            let bulletColor = "#ff0055";
            if (player.currentWeapon === "mp5") bulletColor = "#ffff00";
            if (player.currentWeapon === "duals") bulletColor = "#00ffcc";
            if (player.currentWeapon === "rifle") bulletColor = "#00bfff";

            // Si son pistolas duales, alternamos levemente el origen para simular disparos cruzados
            if (player.currentWeapon === "duals") {
                let sideOffset = (player.ammo % 2 === 0) ? 6 : -6;
                originX += Math.cos(angle + Math.PI/2) * sideOffset;
                originY += Math.sin(angle + Math.PI/2) * sideOffset;
            }

            bullets.push({
                x: originX,
                y: originY,
                width: player.currentWeapon === "rifle" ? 18 : 10, 
                height: player.currentWeapon === "rifle" ? 6 : 4,
                speedX: Math.cos(angle) * 18,
                speedY: Math.sin(angle) * 18,
                color: bulletColor,
                damage: bulletDamage
            });
            if (player.ammo <= 0) startReload();
        }
    }
});

function startReload() {
    player.isReloading = true;
    if (player.currentWeapon === "mp5") player.reloadTimer = 60;
    else if (player.currentWeapon === "duals") player.reloadTimer = 70;
    else if (player.currentWeapon === "rifle") player.reloadTimer = 100;
    else player.reloadTimer = 80;
}

// Reloj interno del juego 
function initClock() {
    setInterval(() => {
        if (gameState !== "PLAYING" || player.lives <= 0) return;

        // Descontar tiempo de intermisión entre rondas si corresponde
        if (intermissionTimer > 0) {
            intermissionTimer--;
            return;
        }

        gameTimer++;

        if (gameTimer % 180 === 175) {
            dragonWarning = true;
        }

        if (gameTimer % 180 === 0 && gameTimer > 0) {
            dragonWarning = false;
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
}

// Administrador de Spawns adaptado para la cuota fija por ronda
function manageRoundsSpawns() {
    if (gameState !== "PLAYING" || intermissionTimer > 0 || dragonSpawned || dragonWarning) return;

    let now = Date.now();

    // 1. NUEVO: Francotiradores fijos (Exactamente 2 por ronda en zonas elevadas)
    if (sniperSpawnCount < 2 && enemiesSpawnedThisRound < totalEnemiesThisRound) {
        // Tomar una de las dos plataformas más altas
        let plat = platforms[platforms.length - 1 - sniperSpawnCount];
        enemies.push({
            x: plat.x + plat.width / 2 - 20,
            y: plat.y - 80,
            width: 40, height: 80,
            color: "#ff00ff",
            isBoss: false, isFlying: false,
            isSniper: true, // Identificador único
            lives: 3, maxLives: 3,
            laserTimer: 0, targetX: 0, targetY: 0
        });
        sniperSpawnCount++;
        enemiesSpawnedThisRound++;
    }

    // 2. Enemigos Terrestres Comunes (Cada 4 segundos si no superamos el tope)
    if (now - lastNormalSpawn > 4000 && enemiesSpawnedThisRound < totalEnemiesThisRound) {
        lastNormalSpawn = now;
        enemies.push({
            x: Math.random() > 0.5 ? canvas.width + 20 : -50,
            y: floorY - 80,
            width: 40, height: 80,
            velocityY: 0, isGrounded: true,
            speed: Math.random() * (2.2 - 1.2) + 1.2,
            color: "#ff3333",
            isBoss: false, isFlying: false, isSniper: false,
            lives: 2, 
            lastGrenade: Date.now() + Math.random() * 2000
        });
        enemiesSpawnedThisRound++;
    }

    // 3. Enemigos Voladores (Cada 5 segundos si no superamos el tope)
    if (now - lastFlyingSpawn > 5000 && enemiesSpawnedThisRound < totalEnemiesThisRound) {
        lastFlyingSpawn = now;
        enemies.push({
            x: Math.random() > 0.5 ? canvas.width + 20 : -50,
            y: Math.random() * (floorY - 250) + 50, 
            width: 40, height: 60,
            speed: 2.2,
            color: "#ff8c00",
            isBoss: false, isFlying: true, isSniper: false,
            lives: 1 
        });
        enemiesSpawnedThisRound++;
    }
}

// Generador de Jefes Tanque Externo (Añade caos cada 35 segundos)
setInterval(() => {
    if (gameState !== "PLAYING" || intermissionTimer > 0 || dragonSpawned) return;
    enemies.push({
        x: canvas.width + 100, y: floorY - 160,
        width: 80, height: 160, velocityY: 0, isGrounded: true, speed: 1.0,
        color: "#990000", isBoss: true, isFlying: false, isSniper: false,
        lives: 10, maxLives: 10, lastShot: Date.now()
    });
}, 35000);

setInterval(() => { if (gameState === "PLAYING" && intermissionTimer <= 0) medkits.push({ x: Math.random() * (canvas.width - 100) + 50, y: floorY - 25, width: 25, height: 25 }); }, 60000);

function damagePlayer(amount) {
    if (player.isInvulnerable || player.lives <= 0) return;
    
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
        alert(`¡Game Over! Llegaste a la Ronda ${currentRound}. Puntuación: ${score}`);
        document.location.reload();
    }
}

function update() {
    if (gameState !== "PLAYING") return;

    // Ejecutar lógica de oleadas fijas
    manageRoundsSpawns();

    // Si estamos en pausa de intermisión, no se actualizan las mecánicas de pelea
    if (intermissionTimer > 0) return;

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
        if (enemy.isSniper) {
            // LÓGICA DEL FRANCOTIRADOR LÁSER
            enemy.laserTimer++;
            enemy.targetX = player.x + player.width / 2;
            enemy.targetY = player.y + player.height / 2;

            if (enemy.laserTimer >= 90) { // 1.5 Segundos a 60fps
                enemy.laserTimer = 0;
                let angle = Math.atan2(enemy.targetY - (enemy.y + 35), enemy.targetX - (enemy.x + 20));
                enemyBullets.push({
                    x: enemy.x + 20, y: enemy.y + 35,
                    speedX: Math.cos(angle) * 23, // Bala veloz
                    speedY: Math.sin(angle) * 23,
                    width: 8, height: 8,
                    color: "#ff00ff",
                    damage: 2 // Hace 2 de Daño
                });
            }
        } else if (enemy.isFlying) {
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
                    grenades.push({ x: player.x + player.width / 2, y: player.y + player.height / 2, radius: 70, timer: 120 });
                }
            } else {
                if (enemy.y < floorY - enemy.height) enemy.y += 2;
                let now = Date.now();
                if (now - enemy.lastShot > 5000) {
                    enemy.lastShot = now;
                    if (Math.abs(enemy.x - player.x) < 350) { 
                        enemyBullets.push({ x: enemy.x + (enemy.facing === 1 ? enemy.width : 0), y: enemy.y + 60, speedX: enemy.facing * 8, speedY: (Math.random() - 0.5) * 4, width: 14, height: 14, color: "#ffaa00", damage: 2 });
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
                    score += enemy.isBoss ? 150 : 50; 
                    scoreEl.innerText = score;

                    // Excluir a los Bosses del contador estricto de la ronda si es necesario
                    if (!enemy.isBoss) {
                        enemiesDefeatedThisRound++;
                        if (enemiesDefeatedThisRound >= totalEnemiesThisRound) {
                            gameState = "SKILL_SELECT"; // Pausar y activar Roguelike Perks
                        }
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
            enemyBullets.push({ x: dragon.x + 30, y: dragon.y + 120, speedX: Math.cos(angle) * 8, speedY: Math.sin(angle) * 8, width: 35, height: 35, color: "#ff4500", damage: 1 });
        }

        bullets.forEach((bullet, bIndex) => {
            if (checkCollision(bullet, dragon)) {
                dragon.lives -= bullet.damage;
                bullets.splice(bIndex, 1);
                if (dragon.lives <= 0) {
                    score += 1000; scoreEl.innerText = score;
                    dragonSpawned = false; dragon = null;
                }
            }
        });
    }

    medkits.forEach((m, mIndex) => { if (checkCollision(player, m)) { if (player.lives < player.maxLives) player.lives++; medkits.splice(mIndex, 1); } });
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;
}

function drawStickman(x, y, color, hasGun, facingRight, isInvulnerable, scale = 1, isFlying = false, isSniper = false) {
    if (isInvulnerable && Math.floor(Date.now() / 100) % 2 === 0) return;
    ctx.strokeStyle = color; ctx.lineWidth = 3 * scale; ctx.fillStyle = color;
    const w = 40 * scale; const h = 80 * scale; const cx = x + w / 2;
    
    // Cabeza, Cuerpo y Piernas
    ctx.beginPath(); ctx.arc(cx, y + (15 * scale), 10 * scale, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, y + (25 * scale)); ctx.lineTo(cx, y + (55 * scale)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, y + (55 * scale)); ctx.lineTo(cx - (10 * scale), y + h); ctx.moveTo(cx, y + (55 * scale)); ctx.lineTo(cx + (10 * scale), y + h); ctx.stroke();
    
    if (isFlying) {
        let wingWave = Math.sin(Date.now() / 80) * 15;
        ctx.fillStyle = "rgba(255, 69, 0, 0.6)";
        ctx.beginPath(); ctx.moveTo(cx, y + 35); ctx.lineTo(cx - 35, y + 10 + wingWave); ctx.lineTo(cx - 15, y + 45); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx, y + 35); ctx.lineTo(cx + 35, y + 10 + wingWave); ctx.lineTo(cx + 15, y + 45); ctx.closePath(); ctx.fill();
    }

    if (isSniper) {
        // Detalle estético para identificar al Sniper (Visor tecnológico)
        ctx.fillStyle = "#ff00ff"; ctx.fillRect(cx - 6, y + 10, 12, 4);
    }

    if (hasGun) {
        let angle = Math.atan2(mouseY - (y + 35), mouseX - cx);
        ctx.save();
        ctx.translate(cx, y + 35);
        ctx.rotate(angle);
        
        // ANIMACIÓN: Pistolas Duales (Renderiza dos brazos apuntando al mouse)
        if (player.currentWeapon === "duals") {
            ctx.lineWidth = 3;
            // Brazo/Arma superior
            ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(22, -6); ctx.stroke();
            ctx.strokeStyle = "#ffffff";
            ctx.beginPath(); ctx.moveTo(22, -6); ctx.lineTo(30, -6); ctx.stroke();
            
            // Brazo/Arma inferior
            ctx.strokeStyle = color;
            ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(22, 6); ctx.stroke();
            ctx.strokeStyle = "#ffffff";
            ctx.beginPath(); ctx.moveTo(22, 6); ctx.lineTo(30, 6); ctx.stroke();
        } else {
            // Brazo/Arma estándar única
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, 0); ctx.stroke();
            ctx.strokeStyle = "#ffffff"; 
            ctx.lineWidth = player.currentWeapon === "mp5" ? 5 : (player.currentWeapon === "rifle" ? 6 : 3);
            ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(player.currentWeapon === "rifle" ? 38 : 30, 0); ctx.stroke();
        }
        ctx.restore();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. RENDERIZADO DEL MENÚ DE INICIO
    if (gameState === "MENU") {
        ctx.fillStyle = "#ffffff"; stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));
        
        // Título del juego
        ctx.fillStyle = "#00ffcc"; ctx.font = "bold 60px Arial"; ctx.textAlign = "center";
        ctx.fillText("STICKMAN SURVIVOR: ROGUELIKES RUNDS", canvas.width / 2, canvas.height * 0.35);
        
        // Botón Play
        ctx.fillStyle = "#ff2266"; ctx.fillRect(playButton.x, playButton.y, playButton.width, playButton.height);
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.strokeRect(playButton.x, playButton.y, playButton.width, playButton.height);
        
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 26px Arial";
        ctx.fillText("PLAY", canvas.width / 2, canvas.height / 2 + 40);
        ctx.textAlign = "left";
        return;
    }

    // Fondo y Escenario Base
    ctx.fillStyle = "#ffffff"; stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));
    ctx.fillStyle = "#111116"; ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(canvas.width*0.25, floorY-120); ctx.lineTo(canvas.width*0.6, floorY); ctx.lineTo(canvas.width*0.85, floorY-180); ctx.lineTo(canvas.width, floorY); ctx.fill();

    ctx.fillStyle = "#1e1e24"; ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
    ctx.fillStyle = "#00ffcc"; ctx.fillRect(0, floorY, canvas.width, 4);
    platforms.forEach(plat => { ctx.fillStyle = "#3a3a4a"; ctx.fillRect(plat.x, plat.y, plat.width, plat.height); ctx.fillStyle = "#00ffcc"; ctx.fillRect(plat.x, plat.y, plat.width, 2); });
    medkits.forEach(m => { ctx.fillStyle = "#ffffff"; ctx.fillRect(m.x, m.y, m.width, m.height); ctx.fillStyle = "#ff0000"; ctx.fillRect(m.x + m.width/2 - 2, m.y + 4, 4, m.height - 8); ctx.fillRect(m.x + 4, m.y + m.height/2 - 2, m.width - 8, 4); });

    // Dibujar Zonas Rojas de las Granadas
    grenades.forEach(g => {
        ctx.fillStyle = "rgba(255, 0, 0, 0.35)"; ctx.beginPath(); ctx.arc(g.x, g.y, g.radius, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "#ff0000"; ctx.lineWidth = 2; ctx.stroke();
    });

    // NUEVO: Dibujar Láser de Rastreo de los Francotiradores
    enemies.forEach(enemy => {
        if (enemy.isSniper) {
            // Parpadea la opacidad e incrementa el grosor al estar próximo al disparo (cuadros finales del cooldown)
            let alpha = (enemy.laserTimer > 65 && Math.floor(Date.now() / 60) % 2 === 0) ? 0.2 : 0.7;
            ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
            ctx.lineWidth = enemy.laserTimer > 65 ? 3 : 1.5;
            ctx.beginPath();
            ctx.moveTo(enemy.x + 20, enemy.y + 35);
            ctx.lineTo(enemy.targetX, enemy.targetY);
            ctx.stroke();
        }
    });

    // Dibujar Jugador
    drawStickman(player.x, player.y, player.color, true, player.facing === 1, player.isInvulnerable, 1, false, false);
    
    if (shieldSystem.isCharging) {
        let pct = shieldSystem.chargeProgress / shieldSystem.requiredFrames;
        ctx.fillStyle = "#222"; ctx.fillRect(player.x - 5, player.y - 20, 50, 6);
        ctx.fillStyle = "#00bfff"; ctx.fillRect(player.x - 5, player.y - 20, 50 * pct, 6);
    }

    // Dibujar Enemigos
    enemies.forEach(enemy => {
        const scale = enemy.isBoss ? 2 : 1;
        drawStickman(enemy.x, enemy.y, enemy.color, false, enemy.facing === 1, false, scale, enemy.isFlying, enemy.isSniper);
        if (enemy.isBoss || enemy.isSniper) {
            ctx.fillStyle = "#333"; ctx.fillRect(enemy.x, enemy.y - 15, enemy.isBoss ? 80 : 40, 6);
            ctx.fillStyle = enemy.isSniper ? "#ff00ff" : "#ff0000"; 
            ctx.fillRect(enemy.x, enemy.y - 15, (enemy.lives / enemy.maxLives) * (enemy.isBoss ? 80 : 40), 6);
        }
    });

    // Dragón Supremo Visuales
    if (dragonSpawned && dragon) {
        ctx.save(); let firePulse = Math.sin(Date.now() / 150) * 20;
        ctx.fillStyle = "#4a0072"; ctx.beginPath(); ctx.moveTo(canvas.width, dragon.y + 150); ctx.lineTo(dragon.x + 180, dragon.y + 20); ctx.lineTo(dragon.x + 220, dragon.y + 180); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#5c008a"; ctx.beginPath(); ctx.moveTo(canvas.width, dragon.y + 100); ctx.quadraticCurveTo(dragon.x + 120, dragon.y + 150, dragon.x + 100, dragon.y + 250); ctx.lineTo(canvas.width, dragon.y + 380); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#6a009c"; ctx.beginPath(); ctx.moveTo(dragon.x + 140, dragon.y + 230); ctx.quadraticCurveTo(dragon.x + 60, dragon.y + 150, dragon.x + 40, dragon.y + 100); ctx.lineTo(dragon.x - 20, dragon.y + 80); ctx.lineTo(dragon.x + 30, dragon.y + 130); ctx.lineTo(dragon.x + 100, dragon.y + 160); ctx.quadraticCurveTo(dragon.x + 110, dragon.y + 200, dragon.x + 140, dragon.y + 250); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ffff00"; ctx.shadowColor = "#ffea00"; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(dragon.x + 25, dragon.y + 95, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#222"; ctx.fillRect(canvas.width / 2 - 200, 30, 400, 20); ctx.fillStyle = "#9900ff"; ctx.fillRect(canvas.width / 2 - 200, 30, (dragon.lives / dragon.maxLives) * 400, 20);
    }

    // Proyectiles
    bullets.forEach(b => { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.width, b.height); });
    enemyBullets.forEach(eb => { ctx.fillStyle = eb.color; ctx.fillRect(eb.x, eb.y, eb.width, eb.height); });

    // Interfaz de HUD Estrellas, Vidas y Escudos
    for (let i = 0; i < player.lives; i++) {
        let hx = canvas.width - 150 + (i * 35); let hy = 35;
        ctx.fillStyle = "#ff2266"; ctx.beginPath(); ctx.arc(hx-7, hy, 7, Math.PI, 0, false); ctx.arc(hx+7, hy, 7, Math.PI, 0, false); ctx.lineTo(hx, hy+12); ctx.closePath(); ctx.fill();
    }
    for (let i = 0; i < shieldSystem.current; i++) {
        let sx = canvas.width - 150 + (i * 35); let sy = 65; 
        ctx.fillStyle = "#00bfff"; ctx.beginPath(); ctx.arc(sx-7, sy, 7, Math.PI, 0, false); ctx.arc(sx+7, sy, 7, Math.PI, 0, false); ctx.lineTo(sx, sy+12); ctx.closePath(); ctx.fill();
    }

    // Retículo visual del mouse
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(mouseX, mouseY, 6, 0, Math.PI*2); ctx.stroke();

    // NUEVO HUD DE RONDA Y ENEMIGOS RESTANTES (Fijado superior izquierdo)
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 26px Arial";
    ctx.fillText(`RONDA ${currentRound}`, 25, 45);
    
    let enemiesLeft = totalEnemiesThisRound - enemiesDefeatedThisRound;
    ctx.fillStyle = "#ff3333"; ctx.font = "18px Arial";
    ctx.fillText(`Enemigos restantes: ${Math.max(0, enemiesLeft)}`, 25, 75);

    // Munición e interfaz de armas inferior
    ctx.fillStyle = "#ffffff"; ctx.font = "20px Arial";
    ctx.fillText(`Arma: ${player.currentWeapon.toUpperCase()}`, 25, canvas.height - 110);
    ctx.fillText(`Munición: ${player.isReloading ? "RECARGANDO..." : player.ammo + "/" + player.maxAmmo}`, 25, canvas.height - 80);

    // NUEVA Intermisión en Pantalla (Espera de 15 segundos entre rondas)
    if (intermissionTimer > 0) {
        ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#00ffcc"; ctx.font = "bold 38px Arial"; ctx.textAlign = "center";
        ctx.fillText(`¡PREPÁRATE PARA LA RONDA ${currentRound + 1}!`, canvas.width / 2, canvas.height * 0.4);
        ctx.fillStyle = "#ffffff"; ctx.font = "24px Arial";
        ctx.fillText(`La batalla continúa en: ${intermissionTimer} segundos`, canvas.width / 2, canvas.height * 0.48);
        ctx.textAlign = "left";
    }

    // Advertencia Dragón
    if (dragonWarning) {
        ctx.fillStyle = "rgba(255, 0, 0, " + (Math.sin(Date.now() / 100) * 0.3 + 0.4) + ")"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 50px Arial"; ctx.textAlign = "center";
        ctx.fillText("⚠️ ¡EL DRAGÓN SUPREMO DESPIERTA EN 5 SEGUNDOS! ⚠️", canvas.width / 2, canvas.height * 0.4);
        ctx.textAlign = "left";
    }

    // NUEVA INTERFAZ ROGUELIKE: SELECTOR DE 3 HABILIDADES
    if (gameState === "SKILL_SELECT") {
        ctx.fillStyle = "rgba(10, 10, 18, 0.95)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#00ffcc"; ctx.font = "bold 42px Arial"; ctx.textAlign = "center";
        ctx.fillText("¡RONDA COMPLETADA! SELECCIONA UNA HABILIDAD", canvas.width / 2, canvas.height * 0.22);
        
        let cardW = 260, cardH = 320, startX = canvas.width / 2 - 430;
        let cardY = canvas.height * 0.35;

        // Opción J: Corazón Rojo
        ctx.fillStyle = "#1c1c24"; ctx.fillRect(startX, cardY, cardW, cardH);
        ctx.strokeStyle = "#ff2266"; ctx.strokeRect(startX, cardY, cardW, cardH);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 20px Arial"; ctx.fillText("[ J ]", startX + 130, cardY + 50);
        ctx.fillStyle = "#ff2266"; ctx.font = "16px Arial"; ctx.fillText("VITALIDAD", startX + 130, cardY + 130);
        ctx.fillStyle = "#aaa"; ctx.font = "14px Arial"; ctx.fillText("+1 Corazón Máximo", startX + 130, cardY + 200);
        ctx.fillText("Sana vida por completo", startX + 130, cardY + 230);

        // Opción K: Corazón Plateado (Overshield Máximo)
        ctx.fillStyle = "#1c1c24"; ctx.fillRect(startX + 300, cardY, cardW, cardH);
        ctx.strokeStyle = "#00bfff"; ctx.strokeRect(startX + 300, cardY, cardW, cardH);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 20px Arial"; ctx.fillText("[ K ]", startX + 430, cardY + 50);
        ctx.fillStyle = "#00bfff"; ctx.font = "16px Arial"; ctx.fillText("ESCUDO PESADO", startX + 430, cardY + 130);
        ctx.fillStyle = "#aaa"; ctx.font = "14px Arial"; ctx.fillText("+1 Ranura Permanente", startX + 430, cardY + 200);
        ctx.fillText("de Overshield Azul", startX + 430, cardY + 230);

        // Opción L: Cargador Ampliado (+5 balas globales)
        ctx.fillStyle = "#1c1c24"; ctx.fillRect(startX + 600, cardY, cardW, cardH);
        ctx.strokeStyle = "#ffff00"; ctx.strokeRect(startX + 600, cardY, cardW, cardH);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 20px Arial"; ctx.fillText("[ L ]", startX + 730, cardY + 50);
        ctx.fillStyle = "#ffff00"; ctx.font = "16px Arial"; ctx.fillText("CARGADOR AMPLIO", startX + 730, cardY + 130);
        ctx.fillStyle = "#aaa"; ctx.font = "14px Arial"; ctx.fillText("+5 Balas Extra", startX + 730, cardY + 200);
        ctx.fillText("A todas tus armas", startX + 730, cardY + 230);

        ctx.textAlign = "left";
    }

    // Tienda
    if (gameState === "SHOP") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#00ffcc"; ctx.font = "bold 40px Arial"; ctx.textAlign = "center";
        ctx.fillText("TIENDA DE ARMAS (Juego Pausado)", canvas.width / 2, canvas.height * 0.25);
        ctx.fillStyle = "#ffffff"; ctx.font = "24px Arial"; ctx.fillText(`Tu Puntuación: ${score} pts`, canvas.width / 2, canvas.height * 0.35);
        
        ctx.fillStyle = player.hasMP5 ? "#555" : (score >= 1000 ? "#00ffcc" : "#ff3333");
        ctx.fillText(player.hasMP5 ? "[COMPRADO] 1. Subfusil MP5 (Rápido)" : "[Presiona 1] Comprar MP5 - Costo: 1000 pts", canvas.width / 2, canvas.height * 0.45);
        
        ctx.fillStyle = player.hasDuals ? "#555" : (score >= 2000 ? "#00ffcc" : "#ff3333");
        ctx.fillText(player.hasDuals ? "[COMPRADO] 3. Pistolas Duales" : "[Presiona 3] Comprar Pistolas Duales - Costo: 2000 pts", canvas.width / 2, canvas.height * 0.55);

        ctx.fillStyle = player.hasRifle ? "#555" : (score >= 3000 ? "#00bfff" : "#ff3333");
        ctx.fillText(player.hasRifle ? "[COMPRADO] 2. Rifle Pesado (2 de Daño)" : "[Presiona 2] Comprar Rifle Pesado - Costo: 3000 pts", canvas.width / 2, canvas.height * 0.65);
        
        ctx.fillStyle = "#aaa"; ctx.font = "18px Arial"; ctx.fillText("Presiona 'T' para volver a la batalla", canvas.width / 2, canvas.height * 0.8);
        ctx.textAlign = "left";
    }
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
loop();
