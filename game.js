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
