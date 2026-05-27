const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");

// Ajustar canvas al tamaño completo del monitor
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0;
let keys = {};
const gravity = 0.6;
const floorY = canvas.height - 60;

// Estados del Juego
let isPaused = false;
let showShop = false;

// Sistema de Oleadas / Jefes Especiales
let gameTimer = 0;
let dragonSpawned = false;
let dragonWarning = false;
let dragonWarningTimer = 0;

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
    ammo: 9,
    maxAmmo: 9,
    isReloading: false,
    reloadTimer: 0,
    lastShotTime: 0,
    shootCooldown: 400 
};

let bullets = [];
let enemyBullets = []; // Balas de los enemigos (Jefes)
let grenades = [];     // Zonas de granadas activas
let enemies = [];
let medkits = [];
let dragon = null;     // Objeto para el dragón

// 6 plataformas escalonadas de forma accesible
const platforms = [
    { x: canvas.width * 0.1, y: floorY - 120, width: 200, height: 15 },
    { x: canvas.width * 0.3, y: floorY - 240, width: 200, height: 15 },
    { x: canvas.width * 0.5, y: floorY - 360, width: 200, height: 15 },
    { x: canvas.width * 0.7, y: floorY - 260, width: 200, height: 15 },
    { x: canvas.width * 0.25, y: floorY - 480, width: 250, height: 15 },
    { x: canvas.width * 0.55, y: floorY - 500, width: 250, height: 15 }
];

// Fondo (Estrellas)
const stars = [];
for (let i = 0; i < 60; i++) {
    stars.push({ x: Math.random() * canvas.width, y: Math.random() * (canvas.height * 0.6), size: Math.random() * 2 });
}

// Escuchar teclado
window.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();
    if (key === "t") { showShop = !showShop; isPaused = showShop; return; }
    if (showShop && key === "1") {
        if (score >= 1000 && !player.hasMP5) {
            score -= 1000; scoreEl.innerText = score;
            player.hasMP5 = true; equipWeapon("mp5");
            showShop = false; isPaused = false;
        }
        return;
    }
    keys[e.key === " " ? "space" : key] = true;
});
window.addEventListener("keyup", e => keys[e.key === " " ? "space" : e.key.toLowerCase()] = false);

function equipWeapon(weapon) {
    player.currentWeapon = weapon;
    if (weapon === "mp5") { player.maxAmmo = 20; player.ammo = 20; player.shootCooldown = 130; }
}

// Disparar con Espacio
window.addEventListener("keydown", e => {
    if (e.key === " " && player.lives > 0 && !isPaused) {
        if (player.isReloading) return;
        const now = Date.now();
        if (now - player.lastShotTime < player.shootCooldown) return;

        if (player.ammo > 0) {
            player.ammo--;
            player.lastShotTime = now;
            bullets.push({
                x: player.facing === 1 ? player.x + player.width + 5 : player.x - 15,
                y: player.y + 35,
                width: 14, height: 5,
                speed: 18 * player.facing,
                color: player.currentWeapon === "mp5" ? "#ffff00" : "#ff0055"
            });
            if (player.ammo <= 0) startReload();
        }
    }
});

function startReload() {
    player.isReloading = true;
    player.reloadTimer = player.currentWeapon === "mp5" ? 60 : 80;
}

// Reloj interno del juego (Controla apariciones y oleadas del Dragón)
setInterval(() => {
    if (isPaused || player.lives <= 0) return;
    gameTimer++;

    // Alerta del Dragón 5 segundos antes del minuto (segundo 55)
    if (gameTimer % 60 === 55) {
        dragonWarning = true;
        dragonWarningTimer = 300; 
    }

    // Aparece el Dragón en el segundo 0/60
    if (gameTimer % 60 === 0 && gameTimer > 0) {
        dragonWarning = false;
        enemies = []; 
        dragonSpawned = true;
        dragon = {
            x: canvas.width - 320, // Ajustado para que se vea perfectamente su enorme silueta
            y: floorY - 380,
            width: 320,
            height: 380,
            lives: 50,
            maxLives: 50,
            lastShot: 0
        };
    }
}, 1000);

// Generador de Enemigos Normales (Cada 3 segundos)
function spawnEnemy() {
    if (player.lives <= 0 || isPaused || dragonSpawned || dragonWarning) return;
    enemies.push({
        x: Math.random() > 0.5 ? canvas.width + 20 : -50,
        y: floorY - 80,
        width: 40, height: 80,
        velocityY: 0, isGrounded: true,
        speed: Math.random() * (2.5 - 1.2) + 1.2,
        color: "#ff3333",
        isBoss: false,
        lives: 2, 
        lastGrenade: Date.now() + Math.random() * 2000
    });
}
setInterval(spawnEnemy, 3000); 

// Generador de Jefes Tanque (Cada 30 segundos)
function spawnBoss() {
    if (player.lives <= 0 || isPaused || dragonSpawned || dragonWarning) return;
    enemies.push({
        x: canvas.width + 100,
        y: floorY - 160,
        width: 80, height: 160,
        velocityY: 0, isGrounded: true,
        speed: 1.0,
        color: "#990000",
        isBoss: true,
        lives: 10, maxLives: 10,
        lastShot: Date.now()
    });
}
setInterval(spawnBoss, 30000);

setInterval(() => { if (player.lives > 0 && !isPaused) medkits.push({ x: Math.random() * (canvas.width - 100) + 50, y: floorY - 25, width: 25, height: 25 }); }, 60000);

function damagePlayer(amount) {
    if (player.isInvulnerable || player.lives <= 0) return;
    player.lives -= amount;
    player.isInvulnerable = true;
    player.invulnerableTimer = 90; 
    if (player.lives <= 0) {
        alert(`¡Game Over! Puntuación: ${score}`);
        document.location.reload();
    }
}

function update() {
    if (player.lives <= 0 || isPaused) return;

    if (player.isReloading) {
        player.reloadTimer--;
        if (player.reloadTimer <= 0) { player.ammo = player.maxAmmo; player.isReloading = false; }
    }

    if (player.isInvulnerable) {
        player.invulnerableTimer--;
        if (player.invulnerableTimer <= 0) player.isInvulnerable = false;
    }

    if (keys["a"] && player.x > 0) { player.x -= player.speed; player.facing = -1; }
    if (keys["d"] && player.x < canvas.width - player.width) { player.x += player.speed; player.facing = 1; }
    if (keys["w"] && player.isGrounded) { player.velocityY = -player.jumpForce; player.isGrounded = false; }

    player.velocityY += gravity; player.y += player.velocityY;

    if (player.y >= floorY - player.height) { player.y = floorY - player.height; player.velocityY = 0; player.isGrounded = true; }

    platforms.forEach(plat => {
        if (player.velocityY >= 0 && player.x + player.width - 10 > plat.x && player.x + 10 < plat.x + plat.width && player.y + player.height <= plat.y + 8 && player.y + player.height + player.velocityY >= plat.y) {
            player.y = plat.y - player.height; player.velocityY = 0; player.isGrounded = true;
        }
    });

    bullets.forEach((bullet, bIndex) => {
        bullet.x += bullet.speed;
        if (bullet.x > canvas.width || bullet.x < 0) bullets.splice(bIndex, 1);
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

        if (checkCollision(player, enemy)) { damagePlayer(enemy.isBoss ? 2 : 1); }

        bullets.forEach((bullet, bIndex) => {
            if (checkCollision(bullet, enemy)) {
                bullets.splice(bIndex, 1);
                enemy.lives--;
                if (enemy.lives <= 0) {
                    enemies.splice(eIndex, 1);
                    // NUEVO: Ajuste de puntuación solicitado
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
                bullets.splice(bIndex, 1);
                dragon.lives--;
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

function drawStickman(x, y, color, hasGun, facingRight, isInvulnerable, scale = 1) {
    if (isInvulnerable && Math.floor(Date.now() / 100) % 2 === 0) return;
    ctx.strokeStyle = color; ctx.lineWidth = 3 * scale; ctx.fillStyle = color;
    const w = 40 * scale; const h = 80 * scale; const cx = x + w / 2;
    ctx.beginPath(); ctx.arc(cx, y + (15 * scale), 10 * scale, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, y + (25 * scale)); ctx.lineTo(cx, y + (55 * scale)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, y + (55 * scale)); ctx.lineTo(cx - (10 * scale), y + h); ctx.moveTo(cx, y + (55 * scale)); ctx.lineTo(cx + (10 * scale), y + h); ctx.stroke();
    if (hasGun) {
        ctx.beginPath(); ctx.moveTo(cx, y + (35 * scale)); let armEndX = facingRight ? cx + (18 * scale) : cx - (18 * scale); ctx.lineTo(armEndX, y + (35 * scale)); ctx.stroke();
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = player.currentWeapon === "mp5" ? 5 * scale : 3 * scale;
        ctx.beginPath(); ctx.moveTo(armEndX, y + (35 * scale)); ctx.lineTo(facingRight ? armEndX + (12 * scale) : armEndX - (12 * scale), y + (35 * scale)); ctx.stroke();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo
    ctx.fillStyle = "#ffffff"; stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));
    ctx.fillStyle = "#111116"; ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(canvas.width*0.25, floorY-120); ctx.lineTo(canvas.width*0.6, floorY); ctx.lineTo(canvas.width*0.85, floorY-180); ctx.lineTo(canvas.width, floorY); ctx.fill();

    // Escenario
    ctx.fillStyle = "#1e1e24"; ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
    ctx.fillStyle = "#00ffcc"; ctx.fillRect(0, floorY, canvas.width, 4);
    platforms.forEach(plat => { ctx.fillStyle = "#3a3a4a"; ctx.fillRect(plat.x, plat.y, plat.width, plat.height); ctx.fillStyle = "#00ffcc"; ctx.fillRect(plat.x, plat.y, plat.width, 2); });
    medkits.forEach(m => { ctx.fillStyle = "#ffffff"; ctx.fillRect(m.x, m.y, m.width, m.height); ctx.fillStyle = "#ff0000"; ctx.fillRect(m.x + m.width/2 - 2, m.y + 4, 4, m.height - 8); ctx.fillRect(m.x + 4, m.y + m.height/2 - 2, m.width - 8, 4); });

    // Dibujar Zonas Rojas de las Granadas
    grenades.forEach(g => {
        ctx.fillStyle = "rgba(255, 0, 0, 0.35)";
        ctx.beginPath(); ctx.arc(g.x, g.y, g.radius, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "#ff0000"; ctx.lineWidth = 2; ctx.stroke();
    });

    // Dibujar Entidades Comunes
    drawStickman(player.x, player.y, player.color, true, player.facing === 1, player.isInvulnerable, 1);
    enemies.forEach(enemy => {
        const scale = enemy.isBoss ? 2 : 1;
        drawStickman(enemy.x, enemy.y, enemy.color, false, enemy.facing === 1, false, scale);
        if (enemy.isBoss) {
            ctx.fillStyle = "#333"; ctx.fillRect(enemy.x, enemy.y - 15, 80, 8);
            ctx.fillStyle = "#ff0000"; ctx.fillRect(enemy.x, enemy.y - 15, (enemy.lives / enemy.maxLives) * 80, 8);
        }
    });

    // DISEÑO MEJORADO DEL DRAGÓN FINAL
    if (dragonSpawned && dragon) {
        ctx.save();
        
        // Efecto de brillo de fuego interno en la boca/cuerpo
        let firePulse = Math.sin(Date.now() / 150) * 20;

        // 1. Ala Trasera Gigante
        ctx.fillStyle = "#4a0072"; 
        ctx.beginPath();
        ctx.moveTo(canvas.width, dragon.y + 150);
        ctx.lineTo(dragon.x + 180, dragon.y + 20);
        ctx.lineTo(dragon.x + 220, dragon.y + 180);
        ctx.closePath(); ctx.fill();

        // 2. Cuerpo Central Escamado
        ctx.fillStyle = "#5c008a"; 
        ctx.beginPath();
        ctx.moveTo(canvas.width, dragon.y + 100);
        ctx.quadraticCurveTo(dragon.x + 120, dragon.y + 150, dragon.x + 100, dragon.y + 250); // Lomo curvilíneo
        ctx.lineTo(canvas.width, dragon.y + 380);
        ctx.closePath(); ctx.fill();

        // Escamas de detalle
        ctx.strokeStyle = "#7b00b8"; ctx.lineWidth = 3;
        for(let i = 0; i < 4; i++) {
            ctx.beginPath(); ctx.arc(dragon.x + 160 + (i*30), dragon.y + 200 + (i*20), 25, 0, Math.PI); ctx.stroke();
        }

        // 3. Cuello Largo y Cabeza Estilizada
        ctx.fillStyle = "#6a009c";
        ctx.beginPath();
        ctx.moveTo(dragon.x + 140, dragon.y + 230); // Base cuello
        ctx.quadraticCurveTo(dragon.x + 60, dragon.y + 150, dragon.x + 40, dragon.y + 100); // Curva cuello arriba
        ctx.lineTo(dragon.x - 20, dragon.y + 80);   // Punta del hocico superior
        ctx.lineTo(dragon.x + 30, dragon.y + 130);  // Mandíbula abierta interna
        ctx.lineTo(dragon.x + 100, dragon.y + 160); // Mandíbula inferior
        ctx.quadraticCurveTo(dragon.x + 110, dragon.y + 200, dragon.x + 140, dragon.y + 250);
        ctx.closePath(); ctx.fill();

        // 4. Mandíbula Inferior (Efecto de boca abierta rugiendo)
        ctx.fillStyle = "#4a0072";
        ctx.beginPath();
        ctx.moveTo(dragon.x + 30, dragon.y + 130);
        ctx.lineTo(dragon.x - 5, dragon.y + 115);
        ctx.lineTo(dragon.x + 40, dragon.y + 150);
        ctx.closePath(); ctx.fill();

        // 5. Cuernos y Crestas
        ctx.fillStyle = "#9900ff";
        ctx.beginPath();
        ctx.moveTo(dragon.x + 40, dragon.y + 90);
        ctx.lineTo(dragon.x + 10, dragon.y + 40); // Cuerno principal hacia atrás
        ctx.lineTo(dragon.x + 60, dragon.y + 95);
        ctx.closePath(); ctx.fill();

        // 6. Ojo Brillante de Reptil
        ctx.fillStyle = "#ffff00"; ctx.shadowColor = "#ffea00"; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(dragon.x + 25, dragon.y + 95, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(dragon.x + 23, dragon.y + 95, 3, 0, Math.PI * 2); ctx.fill(); // Pupila rasgada
        ctx.restore(); // Limpiar sombras para el resto del juego

        // 7. Brillo de Fuego en la garganta antes de disparar
        let timeToShot = Date.now() - dragon.lastShot;
        if (timeToShot > 2000) {
            ctx.fillStyle = "rgba(255, 69, 0, " + (0.3 + Math.abs(firePulse/40)) + ")";
            ctx.beginPath(); ctx.arc(dragon.x + 25, dragon.y + 125, 25 + firePulse/2, 0, Math.PI*2); ctx.fill();
        }

        // 8. Garra Delantera Amenazante
        ctx.fillStyle = "#5c008a";
        ctx.beginPath();
        ctx.moveTo(dragon.x + 120, dragon.y + 270);
        ctx.lineTo(dragon.x + 50, dragon.y + 310); // Brazo extendido
        ctx.lineTo(dragon.x + 30, dragon.y + 305); // Garra 1
        ctx.moveTo(dragon.x + 50, dragon.y + 310);
        ctx.lineTo(dragon.x + 35, dragon.y + 320); // Garra 2
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4; ctx.stroke();

        // Barra de Vida del Dragón UI
        ctx.fillStyle = "#222"; ctx.fillRect(canvas.width / 2 - 200, 30, 400, 20);
        ctx.fillStyle = "#9900ff"; ctx.fillRect(canvas.width / 2 - 200, 30, (dragon.lives / dragon.maxLives) * 400, 20);
        ctx.fillStyle = "#fff"; ctx.font = "bold 14px Arial"; ctx.fillText("DRAGÓN SUPREMO", canvas.width / 2 - 60, 45);
    }

    // Dibujar Proyectiles
    bullets.forEach(b => { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.width, b.height); });
    enemyBullets.forEach(eb => {
        ctx.fillStyle = eb.color;
        if(eb.width > 15) { 
            ctx.save();
            ctx.shadowColor = "#ff4500"; ctx.shadowBlur = 20;
            ctx.beginPath(); ctx.arc(eb.x, eb.y, eb.width/2, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        } else { ctx.fillRect(eb.x, eb.y, eb.width, eb.height); }
    });

    // Interfaz de Vidas
    for (let i = 0; i < player.lives; i++) {
        let hx = canvas.width - 150 + (i * 35); let hy = 35;
        ctx.fillStyle = "#ff2266"; ctx.beginPath(); ctx.arc(hx-7, hy, 7, Math.PI, 0, false); ctx.arc(hx+7, hy, 7, Math.PI, 0, false); ctx.lineTo(hx, hy+12); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "#ffffff"; ctx.font = "20px Arial";
    ctx.fillText(`Arma: ${player.currentWeapon.toUpperCase()}`, 25, canvas.height - 110);
    ctx.fillText(`Munición: ${player.isReloading ? "RECARGANDO..." : player.ammo + "/" + player.maxAmmo}`, 25, canvas.height - 80);

    // ADVERTENCIA DEL DRAGÓN
    if (dragonWarning) {
        ctx.fillStyle = "rgba(255, 0, 0, " + (Math.sin(Date.now() / 100) * 0.3 + 0.4) + ")";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 50px Arial"; ctx.textAlign = "center";
        ctx.fillText("⚠️ ¡ALERTA DE JEFE EMPIEZA EN 5 SEGUNDOS! ⚠️", canvas.width / 2, canvas.height * 0.4);
        ctx.textAlign = "left";
    }

    // Menú Tienda
    if (showShop) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#00ffcc"; ctx.font = "bold 40px Arial"; ctx.textAlign = "center";
        ctx.fillText("TIENDA DE ARMAS (Juego Pausado)", canvas.width / 2, canvas.height * 0.3);
        ctx.fillStyle = "#ffffff"; ctx.font = "24px Arial"; ctx.fillText(`Tu Puntuación actual: ${score} pts`, canvas.width / 2, canvas.height * 0.4);
        ctx.fillStyle = player.hasMP5 ? "#555" : (score >= 1000 ? "#00ffcc" : "#ff3333");
        ctx.fillText(player.hasMP5 ? "[COMPRADO] MP5 Adquirida" : "[Presiona 1] Comprar MP5 Subfusil - Costo: 1000 pts", canvas.width / 2, canvas.height * 0.55);
        ctx.fillStyle = "#aaa"; ctx.font = "18px Arial"; ctx.fillText("Presiona 'T' de nuevo para volver a la batalla", canvas.width / 2, canvas.height * 0.75);
        ctx.textAlign = "left";
    }
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
loop();
