const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");

let score = 0;
let keys = {};

// 1. Configuración del Jugador
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 60,
    width: 50,
    height: 50,
    speed: 5,
    color: "#00ffcc"
};

// 2. Listas de objetos
let bullets = [];
let enemies = [];

// Escuchar teclado
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

// Función para disparar (evita ráfagas infinitas manteniendo presionado)
window.addEventListener("keydown", e => {
    if (e.key === " " || e.key === "Spacebar") {
        bullets.push({
            x: player.x + player.width / 2 - 4,
            y: player.y,
            width: 8,
            height: 15,
            speed: 7,
            color: "#ff0055"
        });
    }
});

// 3. Generador de enemigos
function spawnEnemy() {
    const size = Math.random() * (40 - 20) + 20; // Tamaños variados
    enemies.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        speed: Math.random() * (3 - 1) + 1,
        color: "#ffcc00"
    });
}
setInterval(spawnEnemy, 1000); // Aparece un enemigo cada 1 segundo

// 4. Detectar colisiones (Caja contra Caja)
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 5. Bucle principal del juego (Game Loop)
function update() {
    // Movimiento del jugador
    if ((keys["ArrowLeft"] || keys["a"]) && player.x > 0) player.x -= player.speed;
    if ((keys["ArrowRight"] || keys["d"]) && player.x < canvas.width - player.width) player.x += player.speed;
    if ((keys["ArrowUp"] || keys["w"]) && player.y > 0) player.y -= player.speed;
    if ((keys["ArrowDown"] || keys["s"]) && player.y < canvas.height - player.height) player.y += player.speed;

    // Actualizar Balas
    bullets.forEach((bullet, index) => {
        bullet.y -= bullet.speed;
        if (bullet.y + bullet.height < 0) bullets.splice(index, 1); // Eliminar si sale de pantalla
    });

    // Actualizar Enemigos
    enemies.forEach((enemy, eIndex) => {
        enemy.y += enemy.speed;

        // Si el enemigo toca al jugador (Perder)
        if (checkCollision(player, enemy)) {
            alert(`¡Game Over! Tu puntuación: ${score}`);
            document.location.reload();
        }

        // Si el enemigo sale de la pantalla
        if (enemy.y > canvas.height) enemies.splice(eIndex, 1);

        // Colisión Bala vs Enemigo
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

// 6. Renderizado (Dibujar todo)
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpiar pantalla

    // Dibujar Jugador
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Dibujar Balas
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });

    // Dibujar Enemigos
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Arrancar el juego
loop();