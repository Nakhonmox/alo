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
    shootCooldown: 400 // Milisegundos entre disparos (Pistola es lenta)
};

let bullets = [];
let enemies = [];
let medkits = [];

// 2. NUEVA ESTRUCTURA DE 6 PLATAFORMAS (Más bajas y fáciles de escalar)
const platforms = [
    { x: canvas.width * 0.1, y: floorY - 100, width: 200, height: 15 },
    { x: canvas.width * 0.3, y: floorY - 200, width: 200, height: 15 },
    { x: canvas.width * 0.5, y: floorY - 300, width: 200, height: 15 },
    { x: canvas.width * 0.7, y: floorY - 220, width: 200, height: 15 },
    { x: canvas.width * 0.25, y: floorY - 400, width: 250, height: 15 },
    { x: canvas.width * 0.55, y: floorY - 420, width: 250, height: 15 }
];

// Fondo (Estrellas)
const stars = [];
for (let i = 0; i < 60; i++) {
    stars.push({ x: Math.random() * canvas.width, y: Math.random() * (canvas.height * 0.6), size: Math.random() * 2 });
}

// Escuchar teclado
window.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();
    
    // Abrir/Cerrar Tienda con la T
    if (key === "t") {
        showShop = !showShop;
        isPaused = showShop; // Pausa el juego si la tienda está abierta
        return;
    }

    // Comprar MP5 con la tecla "1" dentro de la tienda
    if (showShop && key === "1") {
        if (score >= 1000 && !player.hasMP5) {
            score -= 1000;
            scoreEl.innerText = score;
            player.hasMP5 = true;
            equipWeapon("mp5");
            showShop = false;
            isPaused = false;
        }
        return;
    }

    keys[e.key === " " ? "space" : key] = true;
});
window.addEventListener("keyup", e => keys[e.key === " " ? "space" : e.key.toLowerCase()] = false);

// Cambiar propiedades al equipar armas
function equipWeapon(weapon) {
    player.currentWeapon = weapon;
    if (weapon === "mp5") {
        player.maxAmmo = 20;
        player.ammo = 20;
        player.shootCooldown = 130; // Mucho más rápido
    }
}

// Lógica de Disparo (Espacio)
window.addEventListener("keydown", e => {
    if (e.key === " " && player.lives > 0 && !isPaused) {
        if (player.isReloading) return;
        
        const now = Date.now();
        if (now - player.lastShotTime < player.shootCooldown) return; // Cooldown activo

        if (player.ammo > 0) {
            player.ammo--;
            player.lastShotTime = now;
            bullets.push({
                x: player.facing === 1 ? player.x + player.width + 5 : player.x - 15,
                y: player.y + 35,
                width: 14,
                height: 5,
                speed: 18 * player.facing,
                color: player.currentWeapon === "mp5" ? "#ffff00" : "#ff0055" // Balas amarillas para MP5
            });

            // Auto-recarga si se queda sin balas
            if (player.ammo <= 0) {
                startReload();
            }
        }
    }
});

function startReload() {
    player.isReloading = true;
    player.reloadTimer = player.currentWeapon === "mp5" ? 60 : 80; // Tiempo de recarga en frames
}

// Generador de Enemigos Normales (Cada 5 segundos)
function spawnEnemy() {
    if (player.lives <= 0 || isPaused) return;
    enemies.push({
        x: Math.random() > 0.5 ? canvas.width + 20 : -50,
        y: floorY - 80,
        width: 40,
        height: 80,
        velocityY: 0,
        isGrounded: true,
        speed: Math.random() * (2.5 - 1.2) + 1.2,
        color: "#ff3333",
        isBoss: false,
        lives: 1
    });
}
setInterval(spawnEnemy, 5000); // 5 segundos

// Generador de Jefes (Cada 30 segundos)
function spawnBoss() {
    if (player.lives <= 0 || isPaused) return;
    enemies.push({
        x: canvas.width + 100,
        y: floorY - 160,
        width: 80,
        height: 160,
        velocityY: 0,
        isGrounded: true,
        speed: 1.0,
        color: "#990000",
        isBoss: true,
        lives: 10,
        maxLives: 10
    });
}
setInterval(spawnBoss, 30000);

setInterval(() => { if (player.lives > 0 && !isPaused) medkits.push({ x: Math.random() * (canvas.width - 100) + 50, y: floorY - 25, width: 25, height: 25 }); }, 60000);

// Dibujado de Stickman escalable
function drawStickman(x, y, color, hasGun, facingRight, isInvulnerable, scale = 1) {
    if (isInvulnerable && Math.floor(Date.now() / 100) % 2 === 0) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 * scale;
    ctx.fillStyle = color;

    const w = 40 * scale;
    const h = 80 * scale;
    const cx = x + w / 2;

    ctx.beginPath(); ctx.arc(cx, y + (15 * scale), 10 * scale, 0, Math.PI * 2); ctx.stroke(); // Cabeza
    ctx.beginPath(); ctx.moveTo(cx, y + (25 * scale)); ctx.lineTo(cx, y + (55 * scale)); ctx.stroke(); // Cuerpo
    ctx.beginPath(); ctx.moveTo(cx, y + (55 * scale)); ctx.lineTo(cx - (10 * scale), y + h); ctx.moveTo(cx, y + (55 * scale)); ctx.lineTo(cx + (10 * scale), y + h); ctx.stroke(); // Piernas

    if (hasGun) {
        ctx.beginPath(); ctx.moveTo(cx, y + (35 * scale));
        let armEndX = facingRight ? cx + (18 * scale) : cx - (18 * scale);
        ctx.lineTo(armEndX, y + (35 * scale)); ctx.stroke();
        
        // Renderizar arma blanca según tipo
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = player.currentWeapon === "mp5" ? 5 * scale : 3 * scale;
        ctx.beginPath();
        ctx.moveTo(armEndX, y + (35 * scale));
        ctx.lineTo(facingRight ? armEndX + (12 * scale) : armEndX - (12 * scale), y + (35 * scale)); // Cañón
        ctx.stroke();
    }
}

function update() {
    if (player.lives <= 0 || isPaused) return;

    // Gestión de recarga
    if (player.isReloading) {
        player.reloadTimer--;
        if (player.reloadTimer <= 0) {
            player.ammo = player.maxAmmo;
            player.isReloading = false;
        }
    }

    if (player.isInvulnerable) {
        player.invulnerableTimer--;
        if (player.invulnerableTimer <= 0) player.isInvulnerable = false;
    }

    // Movimiento Jugador
    if (keys["a"] && player.x > 0) { player.x -= player.speed; player.facing = -1; }
    if (keys["d"] && player.x < canvas.width - player.width) { player.x += player.speed; player.facing = 1; }
    if (keys["w"] && player.isGrounded) { player.velocityY = -player.jumpForce; player.isGrounded = false; }

    player.velocityY += gravity;
    player.y += player.velocityY;

    // Suelo Jugador
    if (player.y >= floorY - player.height) { player.y = floorY - player.height; player.velocityY = 0; player.isGrounded = true; }

    // Colisión de jugador con plataformas
    platforms.forEach(plat => {
        if (player.velocityY >= 0 && player.x + player.width - 10 > plat.x && player.x + 10 < plat.x + plat.width && player.y + player.height <= plat.y + 8 && player.y + player.height + player.velocityY >= plat.y) {
            player.y = plat.y - player.height; player.velocityY = 0; player.isGrounded = true;
        }
    });

    // Mover Balas
    bullets.forEach((bullet, bIndex) => {
        bullet.x += bullet.speed;
        if (bullet.x > canvas.width || bullet.x < 0) bullets.splice(bIndex, 1);
    });

    // Enemigos con IA vertical y horizontal total
    enemies.forEach((enemy, eIndex) => {
        // Persecución horizontal
        if (enemy.x < player.x) { enemy.x += enemy.speed; enemy.facing = 1; } 
        else { enemy.x -= enemy.speed; enemy.facing = -1; }

        // IA Vertical Avanzada (Los enemigos normales usan plataformas y caen con gravedad)
        if (!enemy.isBoss) {
            enemy.velocityY += gravity;
            enemy.y += enemy.velocityY;

            if (enemy.y >= floorY - enemy.height) { enemy.y = floorY - enemy.height; enemy.velocityY = 0; enemy.isGrounded = true; }

            platforms.forEach(plat => {
                if (enemy.velocityY >= 0 && enemy.x + enemy.width > plat.x && enemy.x < plat.x + plat.width && enemy.y + enemy.height <= plat.y + 8 && enemy.y + enemy.height + enemy.velocityY >= plat.y) {
                    enemy.y = plat.y - enemy.height; enemy.velocityY = 0; enemy.isGrounded = true;
                }
            });

            // Si el jugador está más arriba que el enemigo en una plataforma, el enemigo intenta saltar
            if (player.y < enemy.y && enemy.isGrounded && Math.random() < 0.02) {
                enemy.velocityY = -12;
                enemy.isGrounded = false;
            }
        } else {
            // El Jefe se queda abajo por diseño pesado
            if (enemy.y < floorY - enemy.height) enemy.y += 2;
        }

        // Daño al jugador
        if (checkCollision(player, enemy)) {
            if (!player.isInvulnerable) {
                player.lives--; player.isInvulnerable = true; player.invulnerableTimer = 90;
                if (player.lives <= 0) { alert(`¡Game Over! Puntuación: ${score}`); document.location.reload(); }
            }
        }

        // Balas vs Enemigo
        bullets.forEach((bullet, bIndex) => {
            if (checkCollision(bullet, enemy)) {
                bullets.splice(bIndex, 1);
                enemy.lives--;
                if (enemy.lives <= 0) {
                    enemies.splice(eIndex, 1);
                    score += enemy.isBoss ? 150 : 15;
                    scoreEl.innerText = score;
                }
            }
        });
    });

    medkits.forEach((m, mIndex) => { if (checkCollision(player, m)) { if (player.lives < player.maxLives) player.lives++; medkits.splice(mIndex, 1); } });
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo Estrellas e Interfaz
    ctx.fillStyle = "#ffffff"; stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));
    ctx.fillStyle = "#1a1a24"; ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(canvas.width*0.25, floorY-120); ctx.lineTo(canvas.width*0.6, floorY); ctx.lineTo(canvas.width*0.85, floorY-180); ctx.lineTo(canvas.width, floorY); ctx.fill();

    // Suelo
    ctx.fillStyle = "#22222b"; ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
    ctx.fillStyle = "#00ffcc"; ctx.fillRect(0, floorY, canvas.width, 4);

    // Plataformas
    platforms.forEach(plat => {
        ctx.fillStyle = "#3a3a4a"; ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = "#00ffcc"; ctx.fillRect(plat.x, plat.y, plat.width, 2);
    });

    medkits.forEach(m => {
        ctx.fillStyle = "#ffffff"; ctx.fillRect(m.x, m.y, m.width, m.height);
        ctx.fillStyle = "#ff0000"; ctx.fillRect(m.x + m.width/2 - 2, m.y + 4, 4, m.height - 8); ctx.fillRect(m.x + 4, m.y + m.height/2 - 2, m.width - 8, 4);
    });

    // Dibujar Entidades
    drawStickman(player.x, player.y, player.color, true, player.facing === 1, player.isInvulnerable, 1);
    enemies.forEach(enemy => {
        const scale = enemy.isBoss ? 2 : 1;
        drawStickman(enemy.x, enemy.y, enemy.color, false, enemy.facing === 1, false, scale);
        if (enemy.isBoss) {
            ctx.fillStyle = "#333"; ctx.fillRect(enemy.x, enemy.y - 15, 80, 8);
            ctx.fillStyle = "#ff0000"; ctx.fillRect(enemy.x, enemy.y - 15, (enemy.lives / enemy.maxLives) * 80, 8);
        }
    });

    bullets.forEach(b => { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.width, b.height); });

    // Interfaz de Vidas e Información de Munición
    for (let i = 0; i < player.lives; i++) {
        let hx = canvas.width - 150 + (i * 35); let hy = 35;
        ctx.fillStyle = "#ff2266"; ctx.beginPath(); ctx.arc(hx-7, hy, 7, Math.PI, 0, false); ctx.arc(hx+7, hy, 7, Math.PI, 0, false); ctx.lineTo(hx, hy+12); ctx.closePath(); ctx.fill();
    }

    // Texto de Munición en pantalla
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px Arial";
    ctx.fillText(`Arma: ${player.currentWeapon.toUpperCase()}`, 25, canvas.height - 110);
    ctx.fillText(`Munición: ${player.isReloading ? "RECARGANDO..." : player.ammo + "/" + player.maxAmmo}`, 25, canvas.height - 80);

    // NUEVO: PANTALLA DE LA TIENDA (UI OVERLAY)
    if (showShop) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#00ffcc";
        ctx.font = "bold 40px Arial";
        ctx.textAlign = "center";
        ctx.fillText("TIENDA DE ARMAS (Juego Pausado)", canvas.width / 2, canvas.height * 0.3);

        ctx.fillStyle = "#ffffff";
        ctx.font = "24px Arial";
        ctx.fillText(`Tu Puntuación actual: ${score} pts`, canvas.width / 2, canvas.height * 0.4);

        // Opción MP5
        ctx.fillStyle = player.hasMP5 ? "#555" : (score >= 1000 ? "#00ffcc" : "#ff3333");
        let infoMP5 = player.hasMP5 ? "[COMPRADO] MP5 Adquirida" : "[Presiona 1] Comprar MP5 Subfusil - Costo: 1000 pts";
        ctx.fillText(infoMP5, canvas.width / 2, canvas.height * 0.55);

        ctx.fillStyle = "#aaa";
        ctx.font = "18px Arial";
        ctx.fillText("Presiona 'T' de nuevo para volver a la batalla", canvas.width / 2, canvas.height * 0.75);
        ctx.textAlign = "left"; // Restaurar alineación
    }
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
loop();
