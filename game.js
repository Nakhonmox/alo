const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");

let score = 0;
let keys = {};

// Configuración del escenario horizontal
const gravity = 0.6;
const floorY = canvas.height - 40; // El suelo está a 40px del fondo

// 1. Configuración del Jugador (Stickman Celeste)
const player = {
    x: 100, // Empieza en la izquierda de la pantalla
    y: floorY - 80,
    width: 40,
    height: 80,
    speed: 5,
    jumpForce: 13,
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
            y: player.y + 35, // Altura de la pistola
            width: 12,
            height: 6,
            speed: 12 * player.facing, // Dispara hacia donde esté mirando
            color: "#ff0055"
        });
    }
});

// 2. Generador de enemigos (Stickmen Rojos que avanzan desde la derecha)
function spawnEnemy() {
    enemies.push({
        x: canvas.width + 20, // Aparecen justo fuera de la pantalla por la derecha
        y: floorY - 80,       // Apoyados en el mismo suelo que el jugador
        width: 40,
        height: 80,
        speed: Math.random() * (3 - 1.5) + 1.5, // Velocidades variadas
        color: "#ff3333"
    });
}
// Aparece un enemigo cada 1.8 segundos para dar tiempo a reaccionar
setInterval(spawnEnemy, 1800); 

// 3. Función para dibujar los Stickmen
function drawStickman(x, y, color, hasGun, facingRight) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.fillStyle = color;

    const cx = x + 20; // Centro del monito

    // Cabeza
    ctx.beginPath();
    ctx.arc(cx, y + 15, 10, 0, Math.PI * 2);
    ctx.stroke();

    // Cuerpo
    ctx.beginPath();
    ctx.moveTo(cx, y + 25);
    ctx.lineTo(cx, y + 55);
    ctx.stroke();

    // Piernas (En posición de caminata/guardia)
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
            // Pistola blanca
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
            // Pistola apuntando a la izquierda
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
        // Enemigos avanzan con los brazos hacia adelante (estilo zombie/agresivo)
        ctx.moveTo(cx, y + 35);
        ctx.lineTo(cx - 18, y + 40);
        ctx.moveTo(cx, y + 35);
        ctx.lineTo(cx - 12, y + 45);
        ctx.stroke();
    }
}

// 4. Detector de Choques
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 5. Lógica del Juego (Actualización de posiciones)
function update() {
    // Controles de movimiento horizontal
    if (keys["a"] && player.x > 0) {
        player.x -= player.speed;
        player.facing = -1;
    }
    if (keys["d"] && player.x < canvas.width - player.width) {
        player.x += player.speed;
        player.facing = 1;
    }

    // Mecánica de Salto (W)
    if (keys["w"] && player.isGrounded) {
        player.velocityY = -player.jumpForce;
        player.isGrounded = false;
    }

    // Físicas del Jugador
    player.velocityY += gravity;
    player.y += player.velocityY;

    // Detectar suelo para el jugador
    if (player.y >= floorY - player.height) {
        player.y = floorY - player.height;
        player.velocityY = 0;
        player.isGrounded = true;
    }

    // Mover Balas
    bullets.forEach((bullet, bIndex) => {
        bullet.x += bullet.speed;
        if (bullet.x > canvas.width || bullet.x < 0) {
            bullets.splice(bIndex, 1);
        }
    });

    // Mover Enemigos (Avanzan de derecha a izquierda)
    enemies.forEach((enemy, eIndex) => {
        enemy.x -= enemy.speed; // Restamos X para que caminen a la izquierda

        // Si un stickman rojo toca al jugador
        if (checkCollision(player, enemy)) {
            alert(`¡Game Over! Te alcanzaron. Puntuación final: ${score}`);
            document.location.reload();
        }

        // Si logran pasar de largo la pantalla por la izquierda
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

// 6. Renderizar todo en el lienzo
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar el Suelo
    ctx.fillStyle = "#333333";
    ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
    
    // Línea verde brillante para decorar el suelo (estilo arcade)
    ctx.fillStyle = "#00ffcc";
    ctx.fillRect(0, floorY, canvas.width, 4);

    // Dibujar Jugador (Celeste, con arma, mira a donde camina)
    drawStickman(player.x, player.y, player.color, true, player.facing === 1);

    // Dibujar Enemigos (Rojos, sin arma)
    enemies.forEach(enemy => {
        drawStickman(enemy.x, enemy.y, enemy.color, false, false);
    });

    // Dibujar Balas de la pistola
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
