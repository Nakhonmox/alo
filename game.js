const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");

let score = 0;
let keys = {};

// Configuración de la gravedad para el salto
const gravity = 0.6;

// 1. Configuración del Jugador (Stickman)
const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 90,
    width: 40,
    height: 80, // Más alto para la forma de stickman
    speed: 5,
    jumpForce: 12,
    velocityY: 0,
    isGrounded: false,
    color: "#00ffcc",
    facing: 1 // 1 = Derecha, -1 = Izquierda
};

let bullets = [];
let enemies = [];

// Escuchar teclado
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// Disparar con la tecla X
window.addEventListener("keydown", e => {
    if (e.key.toLowerCase() === "x") {
        bullets.push({
            x: player.facing === 1 ? player.x + player.width + 5 : player.x - 15,
            y: player.y + player.height / 2 - 2,
            width: 10,
            height: 6,
            speed: 10 * player.facing, // Dispara hacia donde mira
            color: "#ff0055"
        });
    }
});

// 2. Generador de enemigos (Stickmen Rojos)
function spawnEnemy() {
    enemies.push({
        x: Math.random() * (canvas.width - 40),
        y: -90,
        width: 40,
        height: 80,
        speed: Math.random() * (2.5 - 1) + 1,
        color: "#ff3333"
    });
}
setInterval(spawnEnemy, 1500); // Uno nuevo cada 1.5 segundos

// 3. Función para dibujar un Stickman
function drawStickman(x, y, color, hasGun, facingRight) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.fillStyle = color;

    // Centro horizontal del stickman
    const cx = x + 20;

    // Cabeza
    ctx.beginPath();
    ctx.arc(cx, y + 15, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Cuerpo (Tronco)
    ctx.beginPath();
    ctx.moveTo(cx, y + 25);
    ctx.lineTo(cx, y + 55);
    ctx.stroke();

    // Piernas
    ctx.beginPath();
    ctx.moveTo(cx, y + 55);
    ctx.lineTo(cx - 12, y + 80); // Izquierda
    ctx.moveTo(cx, y + 55);
    ctx.lineTo(cx + 12, y + 80); // Derecha
    ctx.stroke();

    // Brazos
    ctx.beginPath();
    if (hasGun) {
        // Brazo apuntando con la pistola
        ctx.moveTo(cx, y + 35);
        if (facingRight) {
            ctx.lineTo(cx + 18, y + 35);
            ctx.stroke();
            // Dibujar Pistola (Líneas negras/oscuras)
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cx + 18, y + 35);
            ctx.lineTo(cx + 26, y + 35); // Cañón
            ctx.moveTo(cx + 20, y + 35);
            ctx.lineTo(cx + 20, y + 41); // Empuñadura
            ctx.stroke();
        } else {
            ctx.lineTo(cx - 18, y + 35);
            ctx.stroke();
            // Dibujar Pistola hacia la izquierda
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
        // Brazos normales para los enemigos (hacia abajo/lados)
        ctx.moveTo(cx, y + 35);
        ctx.lineTo(cx - 12, y + 50);
        ctx.moveTo(cx, y + 35);
        ctx.lineTo(cx + 12, y + 50);
        ctx.stroke();
    }
}

// 4. Detectar colisiones
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 5. Actualizar físicas y posiciones
function update() {
    // Movimiento Horizontal (A y D)
    if (keys["a"] && player.x > 0) {
        player.x -= player.speed;
        player.facing = -1; // Mira a la izquierda
    }
    if (keys["d"] && player.x < canvas.width - player.width) {
        player.x += player.speed;
        player.facing = 1; // Mira a la derecha
    }

    // Salto con W (Aplica gravedad)
    if (keys["w"] && player.isGrounded) {
        player.velocityY = -player.jumpForce;
        player.isGrounded = false;
    }

    // Aplicar gravedad al jugador
    player.velocityY += gravity;
    player.y += player.velocityY;

    // Colisión con el suelo
    if (player.y >= canvas.height - player.height) {
        player.y = canvas.height - player.height;
        player.velocityY = 0;
        player.isGrounded = true;
    }

    // Actualizar Balas Horizontales
    bullets.forEach((bullet, index) => {
        bullet.x += bullet.speed;
        // Eliminar bala si sale por la izquierda o derecha
        if (bullet.x > canvas.width || bullet.x < 0) {
            bullets.splice(index, 1);
        }
    });

    // Actualizar Enemigos (Caen del cielo)
    enemies.forEach((enemy, eIndex) => {
        enemy.y += enemy.speed;

        // Si te toca un stickman rojo
        if (checkCollision(player, enemy)) {
            alert(`¡Game Over! Puntuación: ${score}`);
            document.location.reload();
        }

        // Si caen al vacío
        if (enemy.y > canvas.height) enemies.splice(eIndex, 1);

        // Choque de bala contra enemigo
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

// 6. Dibujar en pantalla
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar nuestro Stickman Celeste con Pistola
    drawStickman(player.x, player.y, player.color, true, player.facing === 1);

    // Dibujar Enemigos (Stickmen Rojos sin pistola)
    enemies.forEach(enemy => {
        drawStickman(enemy.x, enemy.y, enemy.color, false, false);
    });

    // Dibujar Balas
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
