const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");

let score = 0;
let keys = {};

// Configuración del escenario horizontal
const gravity = 0.6;
const floorY = canvas.height - 40; // El suelo está a 40px del fondo

// 1. Configuración del Jugador
const player = {
    x: 100,
    y: floorY - 80,
    width: 40,
    height: 80,
    speed: 5,
    jumpForce: 13,
    velocityY: 0,
    isGrounded: false,
    color: "#00ffcc",
    facing: 1,
    // NUEVO: Sistema de vidas e invulnerabilidad
    lives: 3,
    maxLives: 3,
    isInvulnerable: false,
    invulnerableTimer: 0
};

let bullets = [];
let enemies = [];
let medkits = []; // Lista para almacenar el botiquín

// NUEVO: Definición de las 3 plataformas flotantes (x, y, ancho, alto)
const platforms = [
    { x: 250, y: 320, width: 180, height: 15 },
    { x: 550, y: 240, width: 200, height: 15 },
    { x: 150, y: 160, width: 150, height: 15 }
];

// Escuchar teclado
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// Disparar con la tecla X
window.addEventListener("keydown", e => {
    if (e.key.toLowerCase() === "x" && player.lives > 0) {
        bullets.push({
            x: player.facing === 1 ? player.x + player.width + 5 : player.x - 15,
            y: player.y + 35,
            width: 12,
            height: 6,
            speed: 12 * player.facing,
            color: "#ff0055"
        });
    }
});

// Generador de enemigos (Stickmen Rojos)
function spawnEnemy() {
    if (player.lives <= 0) return;
    enemies.push({
        x: canvas.width + 20,
        y: floorY - 80, 
        width: 40,
        height: 80,
        speed: Math.random() * (3 - 1.5) + 1.5,
        color: "#ff3333"
    });
}
setInterval(spawnEnemy, 1800); 

// NUEVO: Generador de Botiquines (Aparece uno cada 60 segundos)
function spawnMedkit() {
    if (player.lives <= 0) return;
    // Aparece en una posición X aleatoria en el suelo
    medkits.push({
        x: Math.random() * (canvas.width - 60) + 30,
        y: floorY - 25,
        width: 25,
        height: 25
    });
}
setInterval(spawnMedkit, 60000); // 60000 milisegundos = 60 segundos

// Función para dibujar los Stickmen
function drawStickman(x, y, color, hasGun, facingRight, isInvisibleFlashing) {
    // Si es invulnerable, hacemos que parpadee (no se dibuja en algunos fotogramas)
    if (isInvisibleFlashing && Math.floor(Date.now() / 100) % 2 === 0) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.fillStyle = color;

    const cx = x + 20;

    // Cabeza
    ctx.beginPath();
    ctx.arc(cx, y + 15, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Cuerpo
    ctx.beginPath();
    ctx.moveTo(cx, y + 25);
    ctx.lineTo(cx, y + 55);
    ctx.stroke();

    // Piernas
    ctx.beginPath();
    ctx.moveTo(cx, y + 55);
    ctx.lineTo(cx - 10, y + 80);
    ctx.moveTo(cx, y + 55);
    ctx.lineTo(cx + 10, y + 80);
    ctx.stroke();

    // Brazos y Armas
    ctx.beginPath();
    if (hasGun) {
        ctx.moveTo(cx, y + 35);
        if (facingRight) {
            ctx.lineTo(cx + 18, y + 35);
            ctx.stroke();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cx + 18, y + 35);
            ctx.lineTo(cx + 26, y + 35);
            ctx.moveTo(cx + 20, y + 35);
            ctx.lineTo(cx + 20, y + 41);
            ctx.stroke();
        } else {
            ctx.lineTo(cx - 18, y + 35);
            ctx.stroke();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cx - 18, y + 35);
            ctx.lineTo(cx - 26, y + 35);
            ctx.moveTo(cx - 20, y + 35);
            ctx.lineTo(cx - 20, y + 41);
            ctx.stroke();
        }
    } else {
        ctx.moveTo(cx, y + 35);
        ctx.lineTo(cx - 18, y + 40);
        ctx.moveTo(cx, y + 35);
        ctx.lineTo(cx - 12, y + 45);
        ctx.stroke();
    }
}

// NUEVO: Función para dibujar los Corazones de Vida
function drawHearts() {
    for (let i = 0; i < player.lives; i++) {
        let hx = canvas.width - 140 + (i * 35); // Posición arriba a la derecha
        let hy = 25;
        ctx.fillStyle = "#ff2266";
        ctx.beginPath();
        ctx.arc(hx - 7, hy, 7, Math.PI, 0, false);
        ctx.arc(hx + 7, hy, 7, Math.PI, 0, false);
        ctx.lineTo(hx, hy + 12);
        ctx.closePath();
        ctx.fill();
    }
}

// NUEVO: Función para dibujar un Botiquín Médico
function drawMedkit(m) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(m.x, m.y, m.width, m.height);
    // Cruz roja del botiquín
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(m.x + m.width/2 - 2, m.y + 4, 4, m.height - 8);
    ctx.fillRect(m.x + 4, m.y + m.height/2 - 2, m.width - 8, 4);
}

// Detector de Choques
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Lógica del Juego
function update() {
    if (player.lives <= 0) return;

    // Manejo de invulnerabilidad por tiempo
    if (player.isInvulnerable) {
        player.invulnerableTimer--;
        if (player.invulnerableTimer <= 0) {
            player.isInvulnerable = false;
        }
    }

    // Controles de movimiento
    if (keys["a"] && player.x > 0) {
        player.x -= player.speed;
        player.facing = -1;
    }
    if (keys["d"] && player.x < canvas.width - player.width) {
        player.x += player.speed;
        player.facing = 1;
    }

    // Mecánica de Salto
    if (keys["w"] && player.isGrounded) {
        player.velocityY = -player.jumpForce;
        player.isGrounded = false;
    }

    // Aplicar gravedad
    player.velocityY += gravity;
    player.y += player.velocityY;

    // NUEVO: Colisión con plataformas flotantes (Soporte superior)
    let oldIsGrounded = player.isGrounded;
    player.isGrounded = false;

    // Colisión con el suelo principal
    if (player.y >= floorY - player.height) {
        player.y = floorY - player.height;
        player.velocityY = 0;
        player.isGrounded = true;
    }

    // Verificar si cae encima de alguna plataforma flotante
    platforms.forEach(plat => {
        // El jugador debe ir cayendo (velocityY >= 0) y sus pies deben estar cerca del tope de la plataforma
        if (player.velocityY >= 0 &&
            player.x + player.width - 10 > plat.x &&
            player.x + 10 < plat.x + plat.width &&
            player.y + player.height <= plat.y + 8 && 
            player.y + player.height + player.velocityY >= plat.y) {
            
            player.y = plat.y - player.height;
            player.velocityY = 0;
            player.isGrounded = true;
        }
    });

    // Mover Balas
    bullets.forEach((bullet, bIndex) => {
        bullet.x += bullet.speed;
        if (bullet.x > canvas.width || bullet.x < 0) {
            bullets.splice(bIndex, 1);
        }
    });

    // Recolectar Botiquines
    medkits.forEach((medkit, mIndex) => {
        if (checkCollision(player, medkit)) {
            if (player.lives < player.maxLives) {
                player.lives++; // Cura un corazón
            }
            medkits.splice(mIndex, 1); // Desaparece el botiquín
        }
    });

    // Mover Enemigos
    enemies.forEach((enemy, eIndex) => {
        enemy.x -= enemy.speed;

        // NUEVO: Si un enemigo toca al jugador, pierde vida
        if (checkCollision(player, enemy)) {
            if (!player.isInvulnerable) {
                player.lives--;
                player.isInvulnerable = true;
                player.invulnerableTimer = 90; // Invulnerable por 1.5 segundos (90 frames)
                
                // Si se queda sin vidas (Game Over)
                if (player.lives <= 0) {
                    alert(`¡Game Over! Puntuación final: ${score}`);
                    document.location.reload();
                }
            }
        }

        if (enemy.x + enemy.width < 0) {
            enemies.splice(eIndex, 1);
        }

        // Impacto de Bala vs Enemigo
        bullets.forEach((bullet, bIndex) => {
            if (checkCollision(bullet, enemy)) {
                enemies.splice(eIndex, 1);
                bullets.splice(bIndex, 1);
                score += 10;
                scoreEl.innerText = score;
            }
        });
    });
}

// Dibujar en pantalla
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar el Suelo
    ctx.fillStyle = "#333333";
    ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
    ctx.fillStyle = "#00ffcc";
    ctx.fillRect(0, floorY, canvas.width, 4);

    // NUEVO: Dibujar las Plataformas Flotantes
    platforms.forEach(plat => {
        ctx.fillStyle = "#444444";
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        // Borde superior de la plataforma para que resalte
        ctx.fillStyle = "#888888";
        ctx.fillRect(plat.x, plat.y, plat.width, 3);
    });

    // NUEVO: Dibujar Botiquines si existen en mapa
    medkits.forEach(medkit => {
        drawMedkit(medkit);
    });

    // Dibujar Jugador (con efecto parpadeo de daño si es invulnerable)
    drawStickman(player.x, player.y, player.color, true, player.facing === 1, player.isInvulnerable);

    // Dibujar Enemigos
    enemies.forEach(enemy => {
        drawStickman(enemy.x, enemy.y, enemy.color, false, false, false);
    });

    // Dibujar Balas
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });

    // NUEVO: Dibujar Interfaz de Corazones
    drawHearts();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
