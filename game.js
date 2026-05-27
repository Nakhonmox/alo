const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");

// Ajustar canvas al tamaño completo del monitor del usuario
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0;
let keys = {};
const gravity = 0.6;
const floorY = canvas.height - 60; // Suelo un poco más grueso para pantallas grandes

// 1. Jugador
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
    invulnerableTimer: 0
};

let bullets = [];
let enemies = [];
let medkits = [];

// Plataformas distribuidas dinámicamente según el ancho del monitor
const platforms = [
    { x: canvas.width * 0.2, y: canvas.height * 0.65, width: 250, height: 15 },
    { x: canvas.width * 0.5, y: canvas.height * 0.5, width: 300, height: 15 },
    { x: canvas.width * 0.75, y: canvas.height * 0.35, width: 220, height: 15 }
];

// Fondo con profundidad (Generación de estrellas fijas)
const stars = [];
for (let i = 0; i < 60; i++) {
    stars.push({ x: Math.random() * canvas.width, y: Math.random() * (canvas.height * 0.6), size: Math.random() * 2 });
}

// Escuchar teclado
window.addEventListener("keydown", e => keys[e.key === " " ? "space" : e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key === " " ? "space" : e.key.toLowerCase()] = false);

// Disparar con ESPACIO
window.addEventListener("keydown", e => {
    if (e.key === " " && player.lives > 0) {
        bullets.push({
            x: player.facing === 1 ? player.x + player.width + 5 : player.x - 15,
            y: player.y + 35,
            width: 15, // Balas un poco más grandes
            height: 6,
            speed: 15 * player.facing,
            color: "#ff0055"
        });
    }
});

// Generador de Enemigos Normales (Cada 10 segundos)
function spawnEnemy() {
    if (player.lives <= 0) return;
    enemies.push({
        x: Math.random() > 0.5 ? canvas.width + 20 : -50, // Pueden salir de ambos lados
        y: floorY - 80,
        width: 40,
        height: 80,
        speed: Math.random() * (3 - 1.5) + 1.5,
        color: "#ff3333",
        isBoss: false,
        lives: 1
    });
}
setInterval(spawnEnemy, 10000); // 10 segundos

// Generador de Enemigos Gigantes (Cada 30 segundos)
function spawnBoss() {
    if (player.lives <= 0) return;
    enemies.push({
        x: canvas.width + 100, // Aparece siempre como amenaza por la derecha
        y: floorY - 160,       // Doble de alto
        width: 80,             // Doble de ancho
        height: 160,
        speed: 1.2,            // Un poco más lento pero implacable
        color: "#990000",      // Rojo oscuro imponente
        isBoss: true,
        lives: 10,             // Requiere 10 disparos
        maxLives: 10
    });
}
setInterval(spawnBoss, 30000); // 30 segundos

setInterval(() => { if (player.lives > 0) medkits.push({ x: Math.random() * (canvas.width - 100) + 50, y: floorY - 25, width: 25, height: 25 }); }, 60000);

// Dibujar Stickman Avanzado (Soporta escala para el Gigante)
function drawStickman(x, y, color, hasGun, facingRight, isInvulnerable, scale = 1) {
    if (isInvulnerable && Math.floor(Date.now() / 100) % 2 === 0) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3 * scale; // Más grueso si es más grande
    ctx.fillStyle = color;

    const w = 40 * scale;
    const h = 80 * scale;
    const cx = x + w / 2;

    // Cabeza
    ctx.beginPath();
    ctx.arc(cx, y + (15 * scale), 10 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Cuerpo
    ctx.beginPath();
    ctx.moveTo(cx, y + (25 * scale));
    ctx.lineTo(cx, y + (55 * scale));
    ctx.stroke();

    // Piernas
    ctx.beginPath();
    ctx.moveTo(cx, y + (55 * scale));
    ctx.lineTo(cx - (10 * scale), y + h);
    ctx.moveTo(cx, y + (55 * scale));
    ctx.lineTo(cx + (10 * scale), y + h);
    ctx.stroke();

    // Brazos
    ctx.beginPath();
    ctx.moveTo(cx, y + (35 * scale));
    if (hasGun) {
        if (facingRight) {
            ctx.lineTo(cx + (18 * scale), y + (35 * scale));
            ctx.stroke();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4 * scale;
            ctx.beginPath();
            ctx.moveTo(cx + (18 * scale), y + (35 * scale));
            ctx.lineTo(cx + (26 * scale), y + (35 * scale));
            ctx.moveTo(cx + (20 * scale), y + (35 * scale));
            ctx.lineTo(cx + (20 * scale), y + (41 * scale));
            ctx.stroke();
        } else {
            ctx.lineTo(cx - (18 * scale), y + (35 * scale));
            ctx.stroke();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4 * scale;
            ctx.beginPath();
            ctx.moveTo(cx - (18 * scale), y + (35 * scale));
            ctx.lineTo(cx - (26 * scale), y + (35 * scale));
            ctx.moveTo(cx - (20 * scale), y + (35 * scale));
            ctx.lineTo(cx - (20 * scale), y + (41 * scale));
            ctx.stroke();
        }
    } else {
        // Brazos de persecución hacia la dirección del jugador
        if (facingRight) {
            ctx.lineTo(cx + (15 * scale), y + (40 * scale));
        } else {
            ctx.lineTo(cx - (15 * scale), y + (40 * scale));
        }
        ctx.stroke();
    }
}

function drawBackground() {
    // Estrellas
    ctx.fillStyle = "#ffffff";
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));

    // Montañas lejanas (Efecto profundidad)
    ctx.fillStyle = "#1a1a24";
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(canvas.width * 0.25, floorY - 120);
    ctx.lineTo(canvas.width * 0.6, floorY);
    ctx.lineTo(canvas.width * 0.85, floorY - 180);
    ctx.lineTo(canvas.width, floorY);
    ctx.fill();
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;
}

function update() {
    if (player.lives <= 0) return;

    if (player.isInvulnerable) {
        player.invulnerableTimer--;
        if (player.invulnerableTimer <= 0) player.isInvulnerable = false;
    }

    if (keys["a"] && player.x > 0) { player.x -= player.speed; player.facing = -1; }
    if (keys["d"] && player.x < canvas.width - player.width) { player.x += player.speed; player.facing = 1; }
    if (keys["w"] && player.isGrounded) { player.velocityY = -player.jumpForce; player.isGrounded = false; }

    player.velocityY += gravity;
    player.y += player.velocityY;

    if (player.y >= floorY - player.height) {
        player.y = floorY - player.height;
        player.velocityY = 0;
        player.isGrounded = true;
    }

    platforms.forEach(plat => {
        if (player.velocityY >= 0 && player.x + player.width - 10 > plat.x && player.x + 10 < plat.x + plat.width && player.y + player.height <= plat.y + 8 && player.y + player.height + player.velocityY >= plat.y) {
            player.y = plat.y - player.height; player.velocityY = 0; player.isGrounded = true;
        }
    });

    bullets.forEach((bullet, bIndex) => {
        bullet.x += bullet.speed;
        if (bullet.x > canvas.width || bullet.x < 0) bullets.splice(bIndex, 1);
    });

    medkits.forEach((m, mIndex) => {
        if (checkCollision(player, m)) { if (player.lives < player.maxLives) player.lives++; medkits.splice(mIndex, 1); }
    });

    enemies.forEach((enemy, eIndex) => {
        // IA DE PERSECUCIÓN INTELIGENTE
        // Movimiento Horizontal hacia el Jugador
        if (enemy.x < player.x) {
            enemy.x += enemy.speed;
            enemy.facing = 1;
        } else {
            enemy.x -= enemy.speed;
            enemy.facing = -1;
        }

        // Simulación de salto básico para enemigos si el jugador está arriba en plataformas
        if (player.y < enemy.y && Math.random() < 0.01 && enemy.isGrounded) {
            enemy.velocityY = -10;
            enemy.isGrounded = false;
        }
        
        // Aplicar gravedad a enemigos por si caen de plataformas
        if (enemy.isBoss) {
            if (enemy.y < floorY - enemy.height) enemy.y += 2; // El boss no sube plataformas por peso, se mantiene firme abajo
        }

        if (checkCollision(player, enemy)) {
            if (!player.isInvulnerable) {
                player.lives--; player.isInvulnerable = true; player.invulnerableTimer = 90;
                if (player.lives <= 0) { alert(`¡Game Over! Puntuación: ${score}`); document.location.reload(); }
            }
        }

        // Colisión de Balas contra Enemigo
        bullets.forEach((bullet, bIndex) => {
            if (checkCollision(bullet, enemy)) {
                bullets.splice(bIndex, 1);
                enemy.lives--;

                if (enemy.lives <= 0) {
                    enemies.splice(eIndex, 1);
                    score += enemy.isBoss ? 100 : 10; // Más puntos por el Boss
                    scoreEl.innerText = score;
                }
            }
        });
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();

    // Suelo
    ctx.fillStyle = "#22222b";
    ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
    ctx.fillStyle = "#00ffcc";
    ctx.fillRect(0, floorY, canvas.width, 4);

    // Plataformas
    platforms.forEach(plat => {
        ctx.fillStyle = "#3a3a4a";
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = "#00ffcc";
        ctx.fillRect(plat.x, plat.y, plat.width, 2);
    });

    medkits.forEach(m => {
        ctx.fillStyle = "#ffffff"; ctx.fillRect(m.x, m.y, m.width, m.height);
        ctx.fillStyle = "#ff0000"; ctx.fillRect(m.x + m.width/2 - 2, m.y + 4, 4, m.height - 8); ctx.fillRect(m.x + 4, m.y + m.height/2 - 2, m.width - 8, 4);
    });

    // Dibujar Jugador
    drawStickman(player.x, player.y, player.color, true, player.facing === 1, player.isInvulnerable, 1);

    // Dibujar Enemigos e Interfaz de Barra de Vida del Boss
    enemies.forEach(enemy => {
        const scale = enemy.isBoss ? 2 : 1;
        drawStickman(enemy.x, enemy.y, enemy.color, false, enemy.facing === 1, false, scale);

        // NUEVO: Si es el Boss, dibujar su barra de vida encima
        if (enemy.isBoss) {
            const barWidth = 80;
            const barHeight = 8;
            ctx.fillStyle = "#333";
            ctx.fillRect(enemy.x, enemy.y - 15, barWidth, barHeight); // Fondo gris

            const currentBarWidth = (enemy.lives / enemy.maxLives) * barWidth;
            ctx.fillStyle = "#ff0000";
            ctx.fillRect(enemy.x, enemy.y - 15, currentBarWidth, barHeight); // Vida roja
        }
    });

    bullets.forEach(b => { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.width, b.height); });

    // Corazones de vida en pantalla
    for (let i = 0; i < player.lives; i++) {
        let hx = canvas.width - 150 + (i * 35);
        let hy = 35;
        ctx.fillStyle = "#ff2266"; ctx.beginPath(); ctx.arc(hx - 7, hy, 7, Math.PI, 0, false); ctx.arc(hx + 7, hy, 7, Math.PI, 0, false); ctx.lineTo(hx, hy + 12); ctx.closePath(); ctx.fill();
    }
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
loop();
