const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");

// ==========================================
// SISTEMA DE AUDIO (Web Audio API — sin archivos externos)
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (!audioCtx) return;
    // Reanudar contexto si el navegador lo suspendió (política autoplay)
    if (audioCtx.state === "suspended") audioCtx.resume();

    const now = audioCtx.currentTime;

    if (type === "shoot") {
        // Click corto y seco de disparo
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = "square";
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.07);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now); osc.stop(now + 0.08);

    } else if (type === "shoot_rifle") {
        // Disparo grave y potente
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const dist = audioCtx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) curve[i] = (i < 128 ? -1 : 1);
        dist.curve = curve;
        osc.connect(dist); dist.connect(gain); gain.connect(audioCtx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now); osc.stop(now + 0.18);

    } else if (type === "shoot_mp5") {
        // Ráfaga ligera
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now); osc.stop(now + 0.06);

    } else if (type === "reload") {
        // Clic mecánico doble
        [0, 0.12].forEach(offset => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = "square";
            osc.frequency.setValueAtTime(600, now + offset);
            osc.frequency.exponentialRampToValueAtTime(200, now + offset + 0.06);
            gain.gain.setValueAtTime(0.1, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);
            osc.start(now + offset); osc.stop(now + offset + 0.07);
        });

    } else if (type === "hit_enemy") {
        // Golpe corto
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.06, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const src = audioCtx.createBufferSource();
        const gain = audioCtx.createGain();
        src.buffer = buf; src.connect(gain); gain.connect(audioCtx.destination);
        gain.gain.setValueAtTime(0.22, now);
        src.start(now);

    } else if (type === "explosion") {
        // Explosión grave con ruido
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.5, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
        const src = audioCtx.createBufferSource();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass"; filter.frequency.value = 400;
        src.buffer = buf; src.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        src.start(now);

    } else if (type === "player_hit") {
        // Impacto doloroso — tono bajo + ruido
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now); osc.stop(now + 0.28);

    } else if (type === "dash") {
        // Whoosh rápido
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.18);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);

    } else if (type === "jump") {
        // Boing
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.12);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now); osc.stop(now + 0.14);

    } else if (type === "kill") {
        // Ding satisfactorio
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1100, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now); osc.stop(now + 0.18);

    } else if (type === "combo") {
        // Acorde ascendente de combo
        [0, 0.07, 0.14].forEach((offset, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = "sine";
            osc.frequency.value = [660, 880, 1100][i];
            gain.gain.setValueAtTime(0.1, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);
            osc.start(now + offset); osc.stop(now + offset + 0.2);
        });

    } else if (type === "round_complete") {
        // Fanfarria corta
        [0, 0.1, 0.2, 0.35].forEach((offset, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = "square";
            osc.frequency.value = [523, 659, 784, 1047][i];
            gain.gain.setValueAtTime(0.1, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.25);
            osc.start(now + offset); osc.stop(now + offset + 0.25);
        });

    } else if (type === "game_over") {
        // Melodía descendente triste
        [0, 0.22, 0.44, 0.7].forEach((offset, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = "sine";
            osc.frequency.value = [440, 349, 294, 220][i];
            gain.gain.setValueAtTime(0.15, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.35);
            osc.start(now + offset); osc.stop(now + offset + 0.35);
        });

    } else if (type === "upgrade") {
        // Chime brillante de mejora
        [0, 0.08, 0.16, 0.24].forEach((offset, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = "sine";
            osc.frequency.value = [523, 659, 784, 1047][i];
            gain.gain.setValueAtTime(0.08, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.3);
            osc.start(now + offset); osc.stop(now + offset + 0.3);
        });

    } else if (type === "buy") {
        // Caja registradora
        [0, 0.1].forEach((offset, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = "sine";
            osc.frequency.value = [880, 1320][i];
            gain.gain.setValueAtTime(0.1, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
            osc.start(now + offset); osc.stop(now + offset + 0.15);
        });
    }
}

// Música de fondo generativa (loop ambiental)
let musicNodes = [];
let musicPlaying = false;

function startMusic() {
    if (musicPlaying) return;
    musicPlaying = true;
    playMusicLoop();
}

function stopMusic() {
    musicPlaying = false;
    musicNodes.forEach(n => { try { n.stop(); } catch(e){} });
    musicNodes = [];
}

function playMusicLoop() {
    if (!musicPlaying) return;
    const now = audioCtx.currentTime;
    const bpm = 140;
    const beat = 60 / bpm;
    const bars = 8;
    const totalTime = beat * 4 * bars;

    // Bajo pulsante
    const bassNotes = [55, 55, 65, 55, 49, 55, 65, 73];
    bassNotes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = "sawtooth";
        osc.frequency.value = freq;
        const t = now + i * beat;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.07, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.8);
        osc.start(t); osc.stop(t + beat);
        musicNodes.push(osc);
    });

    // Arpegio de fondo
    const arpNotes = [220, 277, 330, 415, 220, 277, 370, 440];
    arpNotes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        filter.type = "bandpass"; filter.frequency.value = 800; filter.Q.value = 2;
        osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        osc.type = "square";
        osc.frequency.value = freq;
        const t = now + i * (beat / 2);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.025, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.4);
        osc.start(t); osc.stop(t + beat * 0.4);
        musicNodes.push(osc);
    });

    // Bombo en tiempos 1 y 3
    [0, beat * 2, beat * 4, beat * 6].forEach(offset => {
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.18, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2) * 0.5;
        }
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = "sine"; osc.frequency.setValueAtTime(120, now + offset);
        osc.frequency.exponentialRampToValueAtTime(40, now + offset + 0.1);
        osc.connect(oscGain); oscGain.connect(audioCtx.destination);
        oscGain.gain.setValueAtTime(0.12, now + offset);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
        osc.start(now + offset); osc.stop(now + offset + 0.18);
        musicNodes.push(osc);
    });

    // Caja en tiempos 2 y 4
    [beat, beat * 3, beat * 5, beat * 7].forEach(offset => {
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const src = audioCtx.createBufferSource();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        filter.type = "highpass"; filter.frequency.value = 2000;
        src.buffer = buf; src.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        gain.gain.setValueAtTime(0.08, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);
        src.start(now + offset);
        musicNodes.push(src);
    });

    setTimeout(() => { if (musicPlaying) { musicNodes = []; playMusicLoop(); } }, totalTime * 1000 - 100);
}

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
// NUEVO SISTEMA DE MONEDAS Y TIENDA PERMANENTE (MENÚ)
// ==========================================
// Guardamos datos en localStorage para que no se pierdan al morir (ya que el juego se reinicia)
let coins = parseInt(localStorage.getItem("stickman_coins")) || 0;
let purchasedHats = JSON.parse(localStorage.getItem("stickman_hats")) || { cowboy: false, top: false };
let equippedHat = localStorage.getItem("stickman_equipped_hat") || "none"; // "none", "cowboy", "top"

function savePersistentData() {
    localStorage.setItem("stickman_coins", coins);
    localStorage.setItem("stickman_hats", JSON.stringify(purchasedHats));
    localStorage.setItem("stickman_equipped_hat", equippedHat);
}

// Botones para la tienda del menú principal
const menuShopButton = { x: canvas.width / 2 - 100, y: canvas.height / 2 + 80, width: 200, height: 50 };
const buyCowboyButton = { x: canvas.width / 2 - 260, y: canvas.height / 2, width: 240, height: 60 };
const buyTopButton = { x: canvas.width / 2 + 20, y: canvas.height / 2, width: 240, height: 60 };
const backToMenuButton = { x: canvas.width / 2 - 100, y: canvas.height / 2 + 150, width: 200, height: 50 };

// ==========================================
// PARTÍCULAS Y TEXTOS FLOTANTES
// ==========================================
let particles = [];
let floatingTexts = [];

function spawnParticles(x, y, color, count, isDeath = false) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * (isDeath ? 8 : 4),
            vy: (Math.random() - 0.5) * (isDeath ? 12 : 6) - (isDeath ? 4 : 0),
            size: Math.random() * (isDeath ? 5 : 3) + 2,
            color: color,
            alpha: 1,
            decay: Math.random() * 0.02 + 0.01,
            isChunk: isDeath && Math.random() > 0.4, // Trozos de stickman
            chunkType: Math.floor(Math.random() * 3) // 0: cabeza, 1: brazo, 2: torso
        });
    }
}

function spawnFloatingText(x, y, text, color) {
    floatingTexts.push({
        x: x,
        y: y,
        text: text,
        color: color,
        alpha: 1,
        vy: -1.5,
        life: 45
    });
}

// ==========================================
// SISTEMA DE COMBO
// ==========================================
let comboCount = 0;
let comboTimer = 0;       // frames restantes antes de que el combo expire
const COMBO_TIMEOUT = 300; // 5 segundos a 60fps

function registerKill() {
    comboCount++;
    comboTimer = COMBO_TIMEOUT;
    if (comboCount >= 10 && comboCount % 10 === 0) {
        spawnFloatingText(player.x + 20, player.y - 50, `x${comboCount} COMBO!!`, "#ff4500");
        playSound("combo");
    }
}

// ==========================================
// SISTEMA DE DASH
// ==========================================
const dashSystem = {
    isDashing: false,
    dashTimer: 0,
    dashDuration: 30,      // 0.5s a 60fps
    dashCooldown: 0,
    dashCooldownMax: 90,   // 1.5s de enfriamiento
    dashSpeed: 22
};

// ==========================================
// SISTEMA DE ESTADOS DEL JUEGO
// ==========================================
let gameState = "menu"; // "menu", "menu_shop", "playing", "gameover"

// Variables de Game Over
let gameOverScore = 0;
let gameOverRound = 0;
const gameOverButton = { x: 0, y: 0, width: 220, height: 60 }; // posición calculada en draw

const playButton = {
    x: canvas.width / 2 - 100,
    y: canvas.height / 2,
    width: 200,
    height: 60
};

let isPaused = false;
let showShop = false;
let showCheats = false; 

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

// NUEVAS VARIABLES PARA RONDAS ESPECIALES (MÚLTIPLOS DE 7)
let specialRoundType = "none"; // "none", "speed", "darkness"

const upgradeOptions = [
    { id: "red_heart", text: "+1 Corazón Rojo Max", color: "#ff2266", x: 0, y: 0, w: 280, h: 70 },
    { id: "blue_heart", text: "+1 Escudo Azul Max", color: "#00bfff", x: 0, y: 0, w: 280, h: 70 },
    { id: "max_ammo", text: "+10 Balas en Cargador", color: "#ffff00", x: 0, y: 0, w: 280, h: 70 }
];

const permanentUpgrades = {
    bonusMaxLives: 0,
    bonusMaxShield: 0,
    bonusMaxAmmo: 0
};

const weaponsCatalog = {
    pistola: { name: "Pistola Base", baseAmmo: 9, cooldown: 400, damage: 1, cost: 0, purchased: true, color: "#ffffff", upgradeLevel: 0 },
    mp5:     { name: "Subfusil MP5", baseAmmo: 20, cooldown: 130, damage: 1, cost: 1000, purchased: false, color: "#ffff00", upgradeLevel: 0 },
    duales:  { name: "Pistolas Duales", baseAmmo: 18, cooldown: 220, damage: 1, cost: 2000, purchased: false, color: "#ff00ff", upgradeLevel: 0 },
    rifle:   { name: "Rifle Pesado", baseAmmo: 5, cooldown: 800, damage: 2, cost: 3000, purchased: false, color: "#00bfff", upgradeLevel: 0 },
    galil:   { name: "Rifle Galil AR", baseAmmo: 25, cooldown: 180, damage: 2, cost: 4000, purchased: false, color: "#00ff66", upgradeLevel: 0 }
};

const packAPunch = {
    x: (canvas.width / 2) - 25, 
    y: (canvas.height - 60) - 420 - 60, 
    width: 50,
    height: 60,
    cost: 10000,
    chargeProgress: 0,
    requiredFrames: 300, 
    isUpgrading: false
};

function getTotalEnemiesForRound(round) {
    if (round === 1) return 20;
    return 20 + (round - 1) * 10; 
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
    particles = [];
    floatingTexts = [];

    // Lotería de Ronda Especial en múltiplos de 7
    if (currentRound % 7 === 0) {
        specialRoundType = Math.random() > 0.5 ? "speed" : "darkness";
        if (specialRoundType === "speed") {
            spawnFloatingText(canvas.width / 2, canvas.height / 2 - 50, "¡RONDA DE VELOCIDAD!", "#ff4500");
        } else {
            spawnFloatingText(canvas.width / 2, canvas.height / 2 - 50, "¡RONDA DE OSCURIDAD!", "#7b00b8");
        }
    } else {
        specialRoundType = "none";
    }
    
    resetIntervals();
}

// Función auxiliar para reiniciar spawn de enemigos de forma limpia
function resetIntervals() {
    clearInterval(spawnEnemyInterval);
    clearInterval(spawnFlyingInterval);
    clearInterval(spawnShieldedInterval); 
    clearInterval(spawnKamikazeInterval);
    
    let baseEnemyTime = 2500;
    let baseFlyingTime = 4000;
    
    let speedIncrements = Math.floor(currentRound / 5);
    if (speedIncrements > 0) {
        baseEnemyTime = Math.max(1000, 2500 - (speedIncrements * 500));
        baseFlyingTime = Math.max(1000, 4000 - (speedIncrements * 500));
    }

    if (specialRoundType === "speed") {
        spawnFlyingInterval = setInterval(spawnFlyingEnemy, 1200);
    } else {
        spawnEnemyInterval = setInterval(spawnEnemy, baseEnemyTime);
        spawnFlyingInterval = setInterval(spawnFlyingEnemy, baseFlyingTime);
        spawnShieldedInterval = setInterval(spawnShieldedEnemy, 10000);
        spawnKamikazeInterval = setInterval(spawnKamikazeEnemy, 12000);
    }
}

const shieldSystem = {
    current: 3,
    max: 3,
    isCharging: false,
    chargeProgress: 0, 
    requiredFrames: 300
};

const player = {
    x: canvas.width / 2,
    y: floorY - 80,
    width: 40,
    height: 80,
    speed: 6,
    jumpForce: 15,
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

function updatePlayerStats() {
    player.maxLives = 3 + permanentUpgrades.bonusMaxLives;
    shieldSystem.max = 3 + permanentUpgrades.bonusMaxShield;
    
    const currentWeaponData = weaponsCatalog[player.currentWeapon];
    player.maxAmmo = currentWeaponData.baseAmmo + permanentUpgrades.bonusMaxAmmo;
    player.shootCooldown = currentWeaponData.cooldown;
}

let bullets = [];
let enemyBullets = []; 
let grenades = [];     
let enemies = [];
let medkits = [];
let dragon = null;     

const buildingWidth = 280;

const buildings = [
    { x: canvas.width * 0.12, width: buildingWidth, height: floorY - 140, color: "#3a221d" },  
    { x: (canvas.width / 2) - (buildingWidth / 2), width: buildingWidth, height: floorY - 60, color: "#2d2522" }, 
    { x: canvas.width * 0.88 - buildingWidth, width: buildingWidth, height: floorY - 180, color: "#332624" }   
];

buildings.forEach(bld => {
    bld.windows = [];
    let rows = Math.floor(bld.height / 55);
    let cols = Math.floor(bld.width / 45);
    for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
            bld.windows.push({
                relX: c * 45,
                relY: r * 55,
                lit: Math.random() > 0.65 
            });
        }
    }
});

const platforms = [
    { x: buildings[0].x - 20, y: floorY - 150, width: 140, height: 15, destroyed: false, repairTimer: 0 },
    { x: buildings[0].x + 140, y: floorY - 270, width: 140, height: 15, destroyed: false, repairTimer: 0 },
    { x: buildings[0].x + 260, y: floorY - 380, width: 120, height: 15, destroyed: false, repairTimer: 0 },
    { x: buildings[1].x + 10, y: floorY - 180, width: 120, height: 15, destroyed: false, repairTimer: 0 },
    { x: buildings[1].x + 150, y: floorY - 300, width: 120, height: 15, destroyed: false, repairTimer: 0 },
    { x: buildings[1].x + 40, y: floorY - 420, width: 200, height: 15, destroyed: false, repairTimer: 0 }, 
    { x: buildings[2].x - 100, y: floorY - 350, width: 120, height: 15, destroyed: false, repairTimer: 0 },
    { x: buildings[2].x + 20, y: floorY - 160, width: 130, height: 15, destroyed: false, repairTimer: 0 },
    { x: buildings[2].x + 130, y: floorY - 290, width: 140, height: 15, destroyed: false, repairTimer: 0 }
];

const stars = [];
for (let i = 0; i < 60; i++) {
    stars.push({ x: Math.random() * canvas.width, y: Math.random() * (canvas.height * 0.6), size: Math.random() * 2 });
}

const backgroundDecorations = [];
for (let i = 0; i < 8; i++) {
    backgroundDecorations.push({
        x: Math.random() * (canvas.width - 60) + 30,
        y: floorY - 35,
        width: 25,
        height: 35,
        color: Math.random() > 0.4 ? "#4a4a5a" : "#2e5c1e", 
        type: Math.random() > 0.4 ? "normal" : "toxic"
    });
}

window.addEventListener("mousemove", e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (gameState === "playing" && !isRoundBreak && !isPaused && !packAPunch.isUpgrading) {
        player.facing = (mouseX >= player.x + player.width / 2) ? 1 : -1;
    }
});

window.addEventListener("click", e => {
    // GAME OVER — botón reiniciar
    if (gameState === "gameover") {
        if (mouseX >= gameOverButton.x && mouseX <= gameOverButton.x + gameOverButton.width &&
            mouseY >= gameOverButton.y && mouseY <= gameOverButton.y + gameOverButton.height) {
            document.location.reload();
        }
        return;
    }

    if (gameState === "menu") {
        if (mouseX >= playButton.x && mouseX <= playButton.x + playButton.width &&
            mouseY >= playButton.y && mouseY <= playButton.y + playButton.height) {
            gameState = "playing";
            startMusic();
        }
        // Clic en TIENDA DEL MENÚ
        if (mouseX >= menuShopButton.x && mouseX <= menuShopButton.x + menuShopButton.width &&
            mouseY >= menuShopButton.y && mouseY <= menuShopButton.y + menuShopButton.height) {
            gameState = "menu_shop";
        }
        return;
    }

    if (gameState === "menu_shop") {
        // Botón Sombrero Vaquero (5,000 monedas)
        if (mouseX >= buyCowboyButton.x && mouseX <= buyCowboyButton.x + buyCowboyButton.width &&
            mouseY >= buyCowboyButton.y && mouseY <= buyCowboyButton.y + buyCowboyButton.height) {
            if (!purchasedHats.cowboy && coins >= 5000) {
                coins -= 5000;
                purchasedHats.cowboy = true;
                equippedHat = "cowboy";
            } else if (purchasedHats.cowboy) {
                equippedHat = equippedHat === "cowboy" ? "none" : "cowboy";
            }
            savePersistentData();
        }
        // Botón Sombrero de Copa (10,000 monedas)
        if (mouseX >= buyTopButton.x && mouseX <= buyTopButton.x + buyTopButton.width &&
            mouseY >= buyTopButton.y && mouseY <= buyTopButton.y + buyTopButton.height) {
            if (!purchasedHats.top && coins >= 10000) {
                coins -= 10000;
                purchasedHats.top = true;
                equippedHat = "top";
            } else if (purchasedHats.top) {
                equippedHat = equippedHat === "top" ? "none" : "top";
            }
            savePersistentData();
        }
        // Botón Volver al Menú
        if (mouseX >= backToMenuButton.x && mouseX <= backToMenuButton.x + backToMenuButton.width &&
            mouseY >= backToMenuButton.y && mouseY <= backToMenuButton.y + backToMenuButton.height) {
            gameState = "menu";
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
                playSound("upgrade");
            }
        });
    }
});

window.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();

    if (key === "m") {
        if (gameState === "playing") {
            showCheats = !showCheats;
            showShop = false; 
            isPaused = showCheats;
        }
        return;
    }

    if (showCheats) {
        if (key === "1") {
            score += 10000; 
            scoreEl.innerText = score;
            spawnFloatingText(player.x + 20, player.y - 20, "+10000 PTS", "#ffff00");
        }
        // NUEVA TRAMPA: Saltear Ronda (Presionar '2')
        if (key === "2") {
            spawnFloatingText(canvas.width / 2, canvas.height / 2, "¡RONDA SALTEADA!", "#00ffff");
            
            // Forzar las variables para detonar el fin de ronda instantáneamente
            enemiesLeftInRound = 0;
            enemiesSpawnedInRound = getTotalEnemiesForRound(currentRound);
            enemies = [];
            
            // Quitar pausa de trucos para procesar el cambio de ronda
            showCheats = false;
            isPaused = false;
        }
        return;
    }

    if (key === "t") { 
        if (gameState === "playing") {
            showShop = !showShop; 
            showCheats = false;
            isPaused = showShop; 
        }
        return; 
    }
    
    if (showShop) {
        if (key === "1") { equipWeapon("pistola"); showShop = false; isPaused = false; }
        if (key === "2") {
            if (weaponsCatalog.mp5.purchased) { equipWeapon("mp5"); showShop = false; isPaused = false; } 
            else if (score >= weaponsCatalog.mp5.cost) {
                score -= weaponsCatalog.mp5.cost; scoreEl.innerText = score;
                weaponsCatalog.mp5.purchased = true; equipWeapon("mp5"); showShop = false; isPaused = false;
            }
        }
        if (key === "3") {
            if (weaponsCatalog.duales.purchased) { equipWeapon("duales"); showShop = false; isPaused = false; } 
            else if (score >= weaponsCatalog.duales.cost) {
                score -= weaponsCatalog.duales.cost; scoreEl.innerText = score;
                weaponsCatalog.duales.purchased = true; equipWeapon("duales"); showShop = false; isPaused = false;
            }
        }
        if (key === "4") {
            if (weaponsCatalog.rifle.purchased) { equipWeapon("rifle"); showShop = false; isPaused = false; } 
            else if (score >= weaponsCatalog.rifle.cost) {
                score -= weaponsCatalog.rifle.cost; scoreEl.innerText = score;
                weaponsCatalog.rifle.purchased = true; equipWeapon("rifle"); showShop = false; isPaused = false;
            }
        }
        if (key === "5") {
            if (weaponsCatalog.galil.purchased) { equipWeapon("galil"); showShop = false; isPaused = false; } 
            else if (score >= weaponsCatalog.galil.cost) {
                score -= weaponsCatalog.galil.cost; scoreEl.innerText = score;
                weaponsCatalog.galil.purchased = true; equipWeapon("galil"); showShop = false; isPaused = false;
            }
        }
        return;
    }

    if (gameState === "playing" && !isRoundBreak) {
        keys[e.key === " " ? "space" : key] = true;
    }
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

window.addEventListener("keydown", e => {
    if (gameState !== "playing" || isRoundBreak || isPaused || packAPunch.isUpgrading) return; 
    
    if (e.key === "Shift" && !dashSystem.isDashing && dashSystem.dashCooldown <= 0 && player.lives > 0) {
        dashSystem.isDashing = true;
        dashSystem.dashTimer = dashSystem.dashDuration;
        dashSystem.dashCooldown = dashSystem.dashCooldownMax;
        player.isInvulnerable = true;
        player.invulnerableTimer = dashSystem.dashDuration;
        spawnParticles(player.x + player.width / 2, player.y + player.height / 2, "#00ffcc", 12);
        playSound("dash");
        return;
    }

    if (e.key === " " && player.lives > 0) {
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
                width: (player.currentWeapon === "rifle" || player.currentWeapon === "galil") ? 18 : 10, 
                height: (player.currentWeapon === "rifle" || player.currentWeapon === "galil") ? 6 : 4,
                speedX: Math.cos(angle) * 18,
                speedY: Math.sin(angle) * 18,
                color: weaponData.color,
                damage: weaponData.damage
            });

            // Sonido según arma
            if (player.currentWeapon === "rifle" || player.currentWeapon === "galil") {
                playSound("shoot_rifle");
            } else if (player.currentWeapon === "mp5") {
                playSound("shoot_mp5");
            } else {
                playSound("shoot");
            }

            if (player.ammo <= 0) startReload();
        }
    }
});

function startReload() {
    player.isReloading = true;
    playSound("reload");
    if (player.currentWeapon === "mp5") player.reloadTimer = 60;
    else if (player.currentWeapon === "duales") player.reloadTimer = 70;
    else if (player.currentWeapon === "rifle") player.reloadTimer = 100;
    else if (player.currentWeapon === "galil") player.reloadTimer = 90;
    else player.reloadTimer = 80;
}

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
    if (specialRoundType === "speed") return; 
    if (!sampleEnemySpawn()) return;

    let extraHealth = Math.floor(currentRound / 5);

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
        isShielded: false,
        lives: 2 + extraHealth, 
        maxLives: 2 + extraHealth,
        lastGrenade: Date.now() + Math.random() * 2000
    });
}
let spawnEnemyInterval = setInterval(spawnEnemy, 2500); 

function sampleFlyingSpawn() {
    let maxForThisRound = getTotalEnemiesForRound(currentRound);
    return ((currentRound >= 2 || specialRoundType === "speed") && enemiesSpawnedInRound < maxForThisRound && !isRoundBreak);
}

function sampleShieldedSpawn() {
    let maxForThisRound = getTotalEnemiesForRound(currentRound);
    return (currentRound >= 5 && enemiesSpawnedInRound < maxForThisRound && !isRoundBreak && specialRoundType !== "speed");
}

function spawnFlyingEnemy() {
    if (gameState !== "playing" || player.lives <= 0 || isPaused || dragonSpawned || dragonWarning || isRoundBreak) return; 
    if (!sampleFlyingSpawn()) return;

    let extraHealth = Math.floor(currentRound / 5);
    let isSpeedRound = specialRoundType === "speed";

    enemiesSpawnedInRound++;
    enemies.push({
        x: Math.random() > 0.5 ? canvas.width + 20 : -50,
        y: Math.random() * (floorY - 250) + 50, 
        width: 40, height: 60,
        speed: isSpeedRound ? 4.8 : 2.2, 
        color: isSpeedRound ? "#ff1493" : "#ff8c00",
        isBoss: false,
        isFlying: true,
        isShielded: false,
        lives: isSpeedRound ? 1 : (1 + extraHealth), 
        maxLives: isSpeedRound ? 1 : (1 + extraHealth)
    });
}
let spawnFlyingInterval = setInterval(spawnFlyingEnemy, 4000);

function spawnShieldedEnemy() {
    if (gameState !== "playing" || player.lives <= 0 || isPaused || dragonSpawned || dragonWarning || isRoundBreak) return;
    if (!sampleShieldedSpawn()) return;

    let extraHealth = Math.floor(currentRound / 5);

    enemiesSpawnedInRound++;
    enemies.push({
        x: Math.random() > 0.5 ? canvas.width + 20 : -50,
        y: floorY - 80,
        width: 45, height: 80,
        velocityY: 0, isGrounded: true,
        speed: 1.5, 
        color: "#4f5d75", 
        isBoss: false,
        isFlying: false,
        isShielded: true,
        lives: 5 + extraHealth, 
        maxLives: 5 + extraHealth,
        lastGrenade: Date.now() + Math.random() * 3000
    });
}
let spawnShieldedInterval = setInterval(spawnShieldedEnemy, 10000);

function spawnKamikazeEnemy() {
    if (gameState !== "playing" || player.lives <= 0 || isPaused || dragonSpawned || dragonWarning || isRoundBreak) return;
    if (currentRound < 3) return; // Aparece desde la ronda 3
    let maxForThisRound = getTotalEnemiesForRound(currentRound);
    if (enemiesSpawnedInRound >= maxForThisRound) return;

    enemiesSpawnedInRound++;
    enemies.push({
        x: Math.random() > 0.5 ? canvas.width + 20 : -50,
        y: floorY - 80,
        width: 40, height: 80,
        velocityY: 0, isGrounded: true,
        speed: 4.5,
        color: "#ff3333",
        isBoss: false,
        isFlying: false,
        isShielded: false,
        isKamikaze: true,
        blinkTimer: 0,
        lives: 1, maxLives: 1,
        lastGrenade: Date.now() + 99999 // no tira granadas
    });
}
let spawnKamikazeInterval = setInterval(spawnKamikazeEnemy, 12000);

function spawnBoss() {
    if (gameState !== "playing" || player.lives <= 0 || isPaused || dragonSpawned || dragonWarning || isRoundBreak || specialRoundType === "speed") return; 
    
    let extraHealth = Math.floor(currentRound / 5);

    enemies.push({
        x: canvas.width + 100,
        y: floorY - 160,
        width: 80, height: 160,
        velocityY: 0, isGrounded: true,
        speed: 1.0,
        color: "#990000",
        isBoss: true,
        isFlying: false,
        isShielded: false,
        lives: 10 + extraHealth, maxLives: 10 + extraHealth,
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
    playSound("player_hit");
    if (player.lives <= 0) {
        gameOverScore = score;
        gameOverRound = currentRound;
        gameState = "gameover";
        stopMusic();
        playSound("game_over");
    }
}

function kamikazeExplode(kamikaze, killedByBullet = false) {
    const EXPLODE_RADIUS = 120;
    spawnParticles(kamikaze.x + kamikaze.width / 2, kamikaze.y + kamikaze.height / 2, "#ff4500", 50, true);
    spawnParticles(kamikaze.x + kamikaze.width / 2, kamikaze.y + kamikaze.height / 2, "#ffaa00", 30);
    spawnFloatingText(kamikaze.x + kamikaze.width / 2, kamikaze.y - 20, "💥 BOOM!", "#ff4500");
    playSound("explosion");

    // Daño al jugador si está cerca
    let playerDist = Math.sqrt(
        Math.pow((player.x + player.width / 2) - (kamikaze.x + kamikaze.width / 2), 2) +
        Math.pow((player.y + player.height / 2) - (kamikaze.y + kamikaze.height / 2), 2)
    );
    if (playerDist < EXPLODE_RADIUS && !dashSystem.isDashing) {
        damagePlayer(1);
    }

    // Reacción en cadena: daña a otros enemigos cercanos
    let chainKills = 0;
    for (let i = enemies.length - 1; i >= 0; i--) {
        let other = enemies[i];
        if (other === kamikaze) continue;
        let dx = (other.x + other.width / 2) - (kamikaze.x + kamikaze.width / 2);
        let dy = (other.y + other.height / 2) - (kamikaze.y + kamikaze.height / 2);
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < EXPLODE_RADIUS) {
            other.lives -= 3;
            spawnParticles(other.x + other.width / 2, other.y + other.height / 2, "#ff6600", 12);
            if (other.lives <= 0) {
                let pts = other.isBoss ? 150 : (other.isShielded ? 100 : 50);
                score += pts;
                scoreEl.innerText = score;
                spawnFloatingText(other.x + other.width / 2, other.y - 20, `+${pts} CADENA!`, "#ff9900");
                spawnParticles(other.x + other.width / 2, other.y + other.height / 2, "#ff3300", 20, true);
                enemies.splice(i, 1);
                enemiesLeftInRound--;
                chainKills++;
                registerKill();
            }
        }
    }
    if (chainKills > 1) {
        spawnFloatingText(kamikaze.x + kamikaze.width / 2, kamikaze.y - 50, `¡x${chainKills} CADENA!`, "#ff4500");
    }
}

function update() {
    if (gameState !== "playing" || player.lives <= 0 || isPaused) return; 

    // ACTUALIZAR COMBO
    if (comboCount > 0) {
        comboTimer--;
        if (comboTimer <= 0) {
            comboCount = 0;
        }
    }

    // ACTUALIZAR DASH
    if (dashSystem.isDashing) {
        dashSystem.dashTimer--;
        let dashDir = player.facing;
        let newX = player.x + dashDir * dashSystem.dashSpeed;
        newX = Math.max(0, Math.min(canvas.width - player.width, newX));
        player.x = newX;
        spawnParticles(player.x + player.width / 2, player.y + player.height / 2, "#00ffcc", 3);
        if (dashSystem.dashTimer <= 0) {
            dashSystem.isDashing = false;
        }
    }
    if (dashSystem.dashCooldown > 0) dashSystem.dashCooldown--;
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.isChunk) { p.vy += 0.3; } 
        p.alpha -= p.decay;
        if (p.alpha <= 0) particles.splice(i, 1);
    }

    // Actualización de Textos Flotantes
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.life--;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    // Temporizadores de regeneración de plataformas
    platforms.forEach(plat => {
        if (plat.destroyed) {
            plat.repairTimer--;
            if (plat.repairTimer <= 0) {
                plat.destroyed = false;
                spawnParticles(plat.x + plat.width / 2, plat.y, "#ffaa44", 15);
            }
        }
    });

    // RECOMPENSA DE MONEDAS AL PASAR LA RONDA
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
        specialRoundType = "none";
        playSound("round_complete");
        
        // Agregar +100 monedas por sobrevivir
        coins += 100;
        savePersistentData();
        spawnFloatingText(player.x + 20, player.y - 40, "+100 MONEDAS", "#00ff66");
    }

    if (isRoundBreak) return;

    if (keys["o"] && !player.isInvulnerable && shieldSystem.current < shieldSystem.max && !packAPunch.isUpgrading) {
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

    // PACK-A-PUNCH
    let playerCenterX = player.x + player.width / 2;
    let playerCenterY = player.y + player.height / 2;
    let nearPackAPunch = (playerCenterX > packAPunch.x - 30 && playerCenterX < packAPunch.x + packAPunch.width + 30 &&
                          playerCenterY > packAPunch.y - 30 && playerCenterY < packAPunch.y + packAPunch.height + 30);

    if (keys["u"] && nearPackAPunch && score >= packAPunch.cost) {
        packAPunch.isUpgrading = true;
        packAPunch.chargeProgress++;

        if (packAPunch.chargeProgress >= packAPunch.requiredFrames) {
            let currentWeaponData = weaponsCatalog[player.currentWeapon];
            currentWeaponData.upgradeLevel++;
            currentWeaponData.damage += 1;
            currentWeaponData.name = currentWeaponData.name.split(" +")[0] + " +" + currentWeaponData.upgradeLevel;
            
            score -= packAPunch.cost;
            scoreEl.innerText = score;

            spawnFloatingText(packAPunch.x + 25, packAPunch.y - 40, "¡ARMA MEJORADA!", "#00ffcc");
            playSound("upgrade");

            packAPunch.isUpgrading = false;
            packAPunch.chargeProgress = 0;
        }
    } else {
        packAPunch.isUpgrading = false;
        packAPunch.chargeProgress = 0;
    }

    if (!shieldSystem.isCharging && !packAPunch.isUpgrading) {
        if (keys["a"] && player.x > 0) { player.x -= player.speed; }
        if (keys["d"] && player.x < canvas.width - player.width) { player.x += player.speed; }
        if (keys["w"] && player.isGrounded) { player.velocityY = -player.jumpForce; player.isGrounded = false; playSound("jump"); }
    }

    player.velocityY += gravity; player.y += player.velocityY;

    if (player.y >= floorY - player.height) { player.y = floorY - player.height; player.velocityY = 0; player.isGrounded = true; }

    platforms.forEach(plat => {
        if (!plat.destroyed && player.velocityY >= 0 && player.x + player.width - 10 > plat.x && player.x + 10 < plat.x + plat.width && player.y + player.height <= plat.y + 8 && player.y + player.height + player.velocityY >= plat.y) {
            player.y = plat.y - player.height; player.velocityY = 0; player.isGrounded = true;
        }
    });

    bullets.forEach((bullet, bIndex) => {
        bullet.x += bullet.speedX;
        bullet.y += bullet.speedY;
        
        if (dragonSpawned && dragon) {
            if (bullet.x > dragon.x && bullet.x < dragon.x + dragon.width &&
                bullet.y > dragon.y && bullet.y < dragon.y + dragon.height) {
                
                dragon.lives -= bullet.damage;
                spawnParticles(bullet.x, bullet.y, "#ff4500", 4);
                spawnFloatingText(bullet.x, bullet.y - 15, `-${bullet.damage}`, "#ff6600");
                bullets.splice(bIndex, 1);
                
                if (dragon.lives <= 0) {
                    score += 1000; 
                    scoreEl.innerText = score;
                    spawnFloatingText(dragon.x + 100, dragon.y + 100, "+1000 PUNTOS", "#ffff00");
                    spawnParticles(dragon.x + 160, dragon.y + 190, "#7b00b8", 80, true);
                    dragon = null;
                    dragonSpawned = false;
                }
                return; 
            }
        }

        if (bullet.x > canvas.width || bullet.x < 0 || bullet.y > canvas.height || bullet.y < 0) {
            bullets.splice(bIndex, 1);
        }
    });

    enemyBullets.forEach((eb, ebIndex) => {
        eb.x += eb.speedX;
        eb.y += eb.speedY;

        if (eb.isDragonFire) { 
            platforms.forEach(plat => {
                if (!plat.destroyed && eb.x > plat.x && eb.x < plat.x + plat.width && eb.y > plat.y - 15 && eb.y < plat.y + plat.height + 15) {
                    plat.destroyed = true;
                    plat.repairTimer = 3600; 
                    spawnParticles(plat.x + plat.width / 2, plat.y, "#ff4500", 30, true);
                    spawnFloatingText(plat.x + plat.width / 2, plat.y - 20, "¡PLATAFORMA ROTA!", "#ff3333");
                }
            });
        }

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
            spawnParticles(g.x, g.y, "#ff4500", 25, true);
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
        } else if (enemy.isKamikaze) {
            // Kamikaze: corre directo hacia el jugador sin saltar
            if (enemy.x < player.x) { enemy.x += enemy.speed; enemy.facing = 1; } 
            else { enemy.x -= enemy.speed; enemy.facing = -1; }
            enemy.velocityY += gravity; enemy.y += enemy.velocityY;
            if (enemy.y >= floorY - enemy.height) { enemy.y = floorY - enemy.height; enemy.velocityY = 0; enemy.isGrounded = true; }
            platforms.forEach(plat => {
                if (!plat.destroyed && enemy.velocityY >= 0 && enemy.x + enemy.width > plat.x && enemy.x < plat.x + plat.width && enemy.y + enemy.height <= plat.y + 8 && enemy.y + enemy.height + enemy.velocityY >= plat.y) {
                    enemy.y = plat.y - enemy.height; enemy.velocityY = 0; enemy.isGrounded = true;
                }
            });
            enemy.blinkTimer = (enemy.blinkTimer || 0) + 1;
            // Explota al contacto con el jugador
            if (checkCollision(player, enemy)) {
                let eIdx = enemies.indexOf(enemy);
                if (eIdx !== -1) enemies.splice(eIdx, 1);
                enemiesLeftInRound--;
                kamikazeExplode(enemy, false);
                registerKill();
            }
        } else {
            if (enemy.x < player.x) { enemy.x += enemy.speed; enemy.facing = 1; } 
            else { enemy.x -= enemy.speed; enemy.facing = -1; }

            if (!enemy.isBoss) {
                enemy.velocityY += gravity; enemy.y += enemy.velocityY;
                if (enemy.y >= floorY - enemy.height) { enemy.y = floorY - enemy.height; enemy.velocityY = 0; enemy.isGrounded = true; }
                platforms.forEach(plat => {
                    if (!plat.destroyed && enemy.velocityY >= 0 && enemy.x + enemy.width > plat.x && enemy.x < plat.x + plat.width && enemy.y + enemy.height <= plat.y + 8 && enemy.y + enemy.height + enemy.velocityY >= plat.y) {
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
                            width: 14, height: 14, color: "#ffaa00", damage: 2, isDragonFire: false 
                        });
                    }
                }
            }
        }

        if (!enemy.isKamikaze && checkCollision(player, enemy)) { damagePlayer(enemy.isBoss ? 2 : 1); }

        bullets.forEach((bullet, bIndex) => {
            if (checkCollision(bullet, enemy)) {
                enemy.lives -= bullet.damage; 
                
                let particleColor = enemy.isShielded ? "#00bfff" : "#ff0033";
                spawnParticles(bullet.x, bullet.y, particleColor, 6);
                spawnFloatingText(enemy.x + enemy.width / 2, enemy.y, `-${bullet.damage}`, "#ff3333");
                playSound("hit_enemy");

                bullets.splice(bIndex, 1);

                if (enemy.lives <= 0) {
                    let ptsGained = enemy.isBoss ? 150 : (enemy.isShielded ? 100 : 50);
                    score += ptsGained; 
                    scoreEl.innerText = score;

                    spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, particleColor, 25, true);
                    spawnFloatingText(enemy.x + enemy.width / 2, enemy.y - 20, `+${ptsGained}`, "#00ff66");
                    playSound("kill");

                    if (enemy.isKamikaze) {
                        kamikazeExplode(enemy, true);
                    }

                    enemies.splice(eIndex, 1);
                    enemiesLeftInRound--;
                    registerKill();
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
                width: 35, height: 35, color: "#ff4500", damage: 1, isDragonFire: true 
            });
        }
    }

    medkits.forEach((m, mIndex) => { if (checkCollision(player, m)) { if (player.lives < player.maxLives) player.lives++; medkits.splice(mIndex, 1); } });
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;
}

// RENDERIZADO DEL SOMBRERO COSMÉTICO
function drawHat(cx, y, scale, facingRight) {
    if (equippedHat === "none") return;

    ctx.save();
    // Ajustar ligeramente el sombrero según la escala del stickman
    let hatY = y + (5 * scale);
    let hatX = cx;

    if (equippedHat === "cowboy") {
        ctx.fillStyle = "#8b4513"; // Marrón
        ctx.strokeStyle = "#5c2e0b";
        ctx.lineWidth = 2;
        // Ala del sombrero
        ctx.beginPath();
        ctx.ellipse(hatX, hatY + 2, 16 * scale, 4 * scale, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        // Copa del sombrero
        ctx.beginPath();
        ctx.moveTo(hatX - 9 * scale, hatY + 2);
        ctx.quadraticCurveTo(hatX - 9 * scale, hatY - 12 * scale, hatX - 6 * scale, hatY - 14 * scale);
        ctx.lineTo(hatX + 6 * scale, hatY - 14 * scale);
        ctx.quadraticCurveTo(hatX + 9 * scale, hatY - 12 * scale, hatX + 9 * scale, hatY + 2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // Detalle cinta negra
        ctx.fillStyle = "#111111";
        ctx.fillRect(hatX - 9 * scale, hatY - 2, 18 * scale, 3 * scale);
    } 
    else if (equippedHat === "top") {
        ctx.fillStyle = "#1a1a1a"; // Negro elegante
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        // Ala del sombrero
        ctx.fillRect(hatX - 15 * scale, hatY, 30 * scale, 3 * scale);
        // Copa cilindrica
        ctx.fillRect(hatX - 9 * scale, hatY - 18 * scale, 18 * scale, 18 * scale);
        // Detalle cinta roja
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(hatX - 9 * scale, hatY - 3, 18 * scale, 3 * scale);
    }

    ctx.restore();
}

function drawStickman(x, y, color, hasGun, facingRight, isInvulnerable, scale = 1, isFlying = false, isShielded = false) {
    if (isInvulnerable && Math.floor(Date.now() / 100) % 2 === 0) return;
    ctx.strokeStyle = color; ctx.lineWidth = 3 * scale; ctx.fillStyle = color;
    const w = 40 * scale; const h = 80 * scale; const cx = x + w / 2;
    
    ctx.beginPath(); ctx.arc(cx, y + (15 * scale), 10 * scale, 0, Math.PI * 2); ctx.stroke();
    
    // DIBUJAR ACCESORIO (Sólo para el jugador principal 'hasGun')
    if (hasGun) {
        drawHat(cx, y, scale, facingRight);
    }

    ctx.beginPath(); ctx.moveTo(cx, y + (25 * scale)); ctx.lineTo(cx, y + (55 * scale)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, y + (55 * scale)); ctx.lineTo(cx - (10 * scale), y + h); ctx.moveTo(cx, y + (55 * scale)); ctx.lineTo(cx + (10 * scale), y + h); ctx.stroke();
    
    if (isFlying) {
        let wingWave = Math.sin(Date.now() / 80) * 15;
        ctx.fillStyle = "rgba(255, 69, 0, 0.6)";
        ctx.beginPath(); ctx.moveTo(cx, y + 35); ctx.lineTo(cx - 35, y + 10 + wingWave); ctx.lineTo(cx - 15, y + 45); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx, y + 35); ctx.lineTo(cx + 35, y + 10 + wingWave); ctx.lineTo(cx + 15, y + 45); ctx.closePath(); ctx.fill();
    }

    if (isShielded) {
        ctx.fillStyle = "rgba(0, 191, 255, 0.4)";
        ctx.strokeStyle = "#00bfff";
        ctx.lineWidth = 3;
        ctx.save();
        let shieldOffset = facingRight ? 20 : -15;
        ctx.beginPath();
        ctx.roundRect(cx + shieldOffset, y + 15, 12 * scale, 55 * scale, 5);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    if (hasGun) {
        let angle = Math.atan2(mouseY - (y + 35), mouseX - cx);

        if (player.currentWeapon === "duales") {
            ctx.save(); ctx.translate(cx, y + 30); ctx.rotate(angle);
            ctx.strokeStyle = color; ctx.lineWidth = 3 * scale;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, -4); ctx.stroke(); 
            ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(18, -4); ctx.lineTo(28, -4); ctx.stroke(); ctx.restore();

            ctx.save(); ctx.translate(cx, y + 42); ctx.rotate(angle);
            ctx.strokeStyle = color; ctx.lineWidth = 3 * scale;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, 4); ctx.stroke();  
            ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(18, 4); ctx.lineTo(28, 4); ctx.stroke(); ctx.restore();
        } else {
            ctx.save(); ctx.translate(cx, y + 35); ctx.rotate(angle);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, 0); ctx.stroke();
            ctx.strokeStyle = "#ffffff"; 
            ctx.lineWidth = player.currentWeapon === "mp5" ? 5 : (player.currentWeapon === "rifle" ? 6 : 3);
            ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo((player.currentWeapon === "rifle" || player.currentWeapon === "galil") ? 38 : 30, 0); ctx.stroke(); ctx.restore();
        }
    } else {
        if (color === "#ff3333" && scale === 1 && !isFlying) {
            ctx.save(); ctx.translate(cx, y + 35);
            let dir = facingRight ? 1 : -1;
            let angleBase = dir === 1 ? -Math.PI / 5 : -Math.PI * 4 / 5;
            let wobble = Math.sin(Date.now() / 100) * 0.1;
            ctx.rotate(angleBase + wobble);
            ctx.strokeStyle = color; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, 0); ctx.stroke();
            ctx.strokeStyle = "#5a3825"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(23, 0); ctx.stroke();
            ctx.strokeStyle = "#e5b800"; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(23, -4); ctx.lineTo(23, 4); ctx.stroke();
            ctx.strokeStyle = "#cccccc"; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(23, 0); ctx.lineTo(50, 0); ctx.stroke();
            ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(25, -1); ctx.lineTo(49, -1); ctx.stroke(); ctx.restore();
        } else {
            let dir = facingRight ? 1 : -1;
            ctx.beginPath(); ctx.moveTo(cx, y + 35); ctx.lineTo(cx + (15 * scale * dir), y + 45); ctx.stroke();
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff"; stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));

    // PANTALLA: GAME OVER
    if (gameState === "gameover") {
        // Fondo oscuro con viñeta roja
        ctx.fillStyle = "rgba(8, 0, 0, 0.92)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Pulso rojo ambiental
        let pulse = Math.sin(Date.now() / 600) * 0.06 + 0.08;
        ctx.fillStyle = `rgba(180, 0, 0, ${pulse})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = "center";

        // Título GAME OVER con glow
        ctx.save();
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 40;
        ctx.fillStyle = "#ff2222";
        ctx.font = "bold 90px Arial";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height * 0.25);
        ctx.restore();

        // Línea separadora
        ctx.strokeStyle = "#ff333388";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 280, canvas.height * 0.32);
        ctx.lineTo(canvas.width / 2 + 280, canvas.height * 0.32);
        ctx.stroke();

        // Estadísticas
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 30px Arial";
        ctx.fillText("Puntuación Final", canvas.width / 2, canvas.height * 0.40);

        ctx.fillStyle = "#00ffcc";
        ctx.font = "bold 56px Arial";
        ctx.fillText(gameOverScore.toLocaleString() + " pts", canvas.width / 2, canvas.height * 0.50);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 26px Arial";
        ctx.fillText(`Ronda alcanzada:  ${gameOverRound}`, canvas.width / 2, canvas.height * 0.59);

        // Mejor puntuación
        let best = parseInt(localStorage.getItem("stickman_highscore")) || 0;
        if (gameOverScore > best) {
            best = gameOverScore;
            localStorage.setItem("stickman_highscore", best);
            ctx.fillStyle = "#ffd700";
            ctx.font = "bold 22px Arial";
            ctx.fillText("🏆 ¡NUEVO RÉCORD!", canvas.width / 2, canvas.height * 0.66);
        } else {
            ctx.fillStyle = "#888888";
            ctx.font = "20px Arial";
            ctx.fillText(`Récord: ${best.toLocaleString()} pts`, canvas.width / 2, canvas.height * 0.66);
        }

        // Botón REINICIAR
        gameOverButton.x = canvas.width / 2 - gameOverButton.width / 2;
        gameOverButton.y = canvas.height * 0.74;
        let isHoverGO = mouseX >= gameOverButton.x && mouseX <= gameOverButton.x + gameOverButton.width &&
                        mouseY >= gameOverButton.y && mouseY <= gameOverButton.y + gameOverButton.height;
        ctx.fillStyle = isHoverGO ? "#ff4444" : "#2a0a0a";
        ctx.fillRect(gameOverButton.x, gameOverButton.y, gameOverButton.width, gameOverButton.height);
        ctx.strokeStyle = "#ff4444";
        ctx.lineWidth = 3;
        ctx.strokeRect(gameOverButton.x, gameOverButton.y, gameOverButton.width, gameOverButton.height);
        ctx.fillStyle = isHoverGO ? "#000000" : "#ff4444";
        ctx.font = "bold 24px Arial";
        ctx.fillText("🔄 REINTENTAR", canvas.width / 2, gameOverButton.y + 40);

        ctx.textAlign = "left";
        return;
    }

    // PANTALLA: MENÚ PRINCIPAL
    if (gameState === "menu") {
        ctx.fillStyle = "rgba(10, 10, 20, 0.8)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#00ffcc"; ctx.font = "bold 60px Arial";
        ctx.shadowColor = "#00ffcc"; ctx.shadowBlur = 10; ctx.textAlign = "center";
        ctx.fillText("STICKMAN SURVIVOR", canvas.width / 2, canvas.height * 0.28);
        ctx.shadowBlur = 0; 

        // Monedas permanentes arriba a la derecha
        ctx.fillStyle = "#ffd700"; ctx.font = "bold 22px Arial";
        ctx.fillText(`🪙 Monedas Totales: ${coins}`, canvas.width - 200, 45);

        // Récord
        let hs = parseInt(localStorage.getItem("stickman_highscore")) || 0;
        if (hs > 0) {
            ctx.fillStyle = "#aaaaaa"; ctx.font = "18px Arial";
            ctx.fillText(`🏆 Récord: ${hs.toLocaleString()} pts`, canvas.width / 2, canvas.height * 0.38);
        }

        // Botón JUGAR
        let isHoverPlay = mouseX >= playButton.x && mouseX <= playButton.x + playButton.width &&
                          mouseY >= playButton.y && mouseY <= playButton.y + playButton.height;
        ctx.fillStyle = isHoverPlay ? "#00ffcc" : "#3a3a4a";
        ctx.fillRect(playButton.x, playButton.y, playButton.width, playButton.height);
        ctx.strokeStyle = "#00ffcc"; ctx.strokeRect(playButton.x, playButton.y, playButton.width, playButton.height);
        ctx.fillStyle = isHoverPlay ? "#000000" : "#ffffff"; ctx.font = "bold 24px Arial";
        ctx.fillText("PLAY", canvas.width / 2, playButton.y + 38);

        // Botón TIENDA DE SOMBREROS
        let isHoverShop = mouseX >= menuShopButton.x && mouseX <= menuShopButton.x + menuShopButton.width &&
                          mouseY >= menuShopButton.y && mouseY <= menuShopButton.y + menuShopButton.height;
        ctx.fillStyle = isHoverShop ? "#ffaa00" : "#2a2a3a";
        ctx.fillRect(menuShopButton.x, menuShopButton.y, menuShopButton.width, menuShopButton.height);
        ctx.strokeStyle = "#ffaa00"; ctx.strokeRect(menuShopButton.x, menuShopButton.y, menuShopButton.width, menuShopButton.height);
        ctx.fillStyle = isHoverShop ? "#000000" : "#ffffff"; ctx.font = "bold 18px Arial";
        ctx.fillText("🤠 TIENDA DE SOMBREROS", canvas.width / 2, menuShopButton.y + 32);

        ctx.fillStyle = "#888888"; ctx.font = "16px Arial";
        ctx.fillText("Controles: A/D (Moverse) - W (Saltar) - Shift (Dash) - Espacio (Disparar) - T (Tienda) - M (Cheats) - U (Pack-A-Punch)", canvas.width / 2, canvas.height * 0.85);
        ctx.textAlign = "left"; 
        return; 
    }

    // PANTALLA: TIENDA DEL MENÚ PRINCIPAL
    if (gameState === "menu_shop") {
        ctx.fillStyle = "rgba(12, 10, 25, 0.95)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "#ffaa00"; ctx.font = "bold 45px Arial"; ctx.textAlign = "center";
        ctx.fillText("TIENDA DE ACCESORIOS PERMANENTES", canvas.width / 2, canvas.height * 0.15);
        
        ctx.fillStyle = "#ffd700"; ctx.font = "bold 26px Arial";
        ctx.fillText(`Tus Monedas: 🪙 ${coins}`, canvas.width / 2, canvas.height * 0.23);

        // CARD SOMBRERO VAQUERO
        let isHoverCowboy = mouseX >= buyCowboyButton.x && mouseX <= buyCowboyButton.x + buyCowboyButton.width &&
                             mouseY >= buyCowboyButton.y && mouseY <= buyCowboyButton.y + buyCowboyButton.height;
        ctx.fillStyle = isHoverCowboy ? "#3e2f25" : "#1e1a15";
        ctx.fillRect(buyCowboyButton.x, buyCowboyButton.y, buyCowboyButton.width, buyCowboyButton.height);
        ctx.strokeStyle = equippedHat === "cowboy" ? "#00ffcc" : "#8b4513";
        ctx.lineWidth = equippedHat === "cowboy" ? 4 : 2;
        ctx.strokeRect(buyCowboyButton.x, buyCowboyButton.y, buyCowboyButton.width, buyCowboyButton.height);
        
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 16px Arial";
        let textCowboy = "Comprar Vaquero (5,000 🪙)";
        if (purchasedHats.cowboy) textCowboy = equippedHat === "cowboy" ? "DESEQUIPAR" : "EQUIPAR";
        ctx.fillText(textCowboy, buyCowboyButton.x + buyCowboyButton.width / 2, buyCowboyButton.y + 35);
        ctx.font = "14px Arial"; ctx.fillStyle = "#8b4513";
        ctx.fillText("Sombrero de Vaquero", buyCowboyButton.x + buyCowboyButton.width / 2, buyCowboyButton.y - 15);

        // CARD SOMBRERO DE COPA
        let isHoverTop = mouseX >= buyTopButton.x && mouseX <= buyTopButton.x + buyTopButton.width &&
                          mouseY >= buyTopButton.y && mouseY <= buyTopButton.y + buyTopButton.height;
        ctx.fillStyle = isHoverTop ? "#2a2a2a" : "#151515";
        ctx.fillRect(buyTopButton.x, buyTopButton.y, buyTopButton.width, buyTopButton.height);
        ctx.strokeStyle = equippedHat === "top" ? "#00ffcc" : "#ffffff";
        ctx.lineWidth = equippedHat === "top" ? 4 : 2;
        ctx.strokeRect(buyTopButton.x, buyTopButton.y, buyTopButton.width, buyTopButton.height);
        
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 16px Arial";
        let textTop = "Comprar De Copa (10,000 🪙)";
        if (purchasedHats.top) textTop = equippedHat === "top" ? "DESEQUIPAR" : "EQUIPAR";
        ctx.fillText(textTop, buyTopButton.x + buyTopButton.width / 2, buyTopButton.y + 35);
        ctx.font = "14px Arial"; ctx.fillStyle = "#aaaaaa";
        ctx.fillText("Sombrero de Copa Fino", buyTopButton.x + buyTopButton.width / 2, buyTopButton.y - 15);

        // BOTÓN VOLVER
        let isHoverBack = mouseX >= backToMenuButton.x && mouseX <= backToMenuButton.x + backToMenuButton.width &&
                           mouseY >= backToMenuButton.y && mouseY <= backToMenuButton.y + backToMenuButton.height;
        ctx.fillStyle = isHoverBack ? "#ffffff" : "#3a3a4a";
        ctx.fillRect(backToMenuButton.x, backToMenuButton.y, backToMenuButton.width, backToMenuButton.height);
        ctx.fillStyle = isHoverBack ? "#000000" : "#ffffff"; ctx.font = "bold 16px Arial";
        ctx.fillText("VOLVER AL MENÚ", canvas.width / 2, backToMenuButton.y + 32);

        ctx.textAlign = "left";
        return;
    }

    // ==========================================
    // DIBUJADO DE ESCENARIO IN-GAME
    // ==========================================
    buildings.forEach(bld => {
        ctx.fillStyle = bld.color; ctx.fillRect(bld.x, floorY - bld.height, bld.width, bld.height);
        ctx.fillStyle = "#1e1513"; ctx.fillRect(bld.x, floorY - bld.height, bld.width, 6);
        bld.windows.forEach(w => {
            ctx.fillStyle = w.lit ? "#ffdd66" : "#1a1211"; 
            ctx.fillRect(bld.x + w.relX, (floorY - bld.height) + w.relY, 16, 16);
        });
    });

    ctx.fillStyle = "#111116"; ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(canvas.width*0.25, floorY-120); ctx.lineTo(canvas.width*0.6, floorY); ctx.lineTo(canvas.width*0.85, floorY-180); ctx.lineTo(canvas.width, floorY); ctx.fill();

    backgroundDecorations.forEach(barrel => {
        ctx.fillStyle = barrel.color; ctx.fillRect(barrel.x, barrel.y, barrel.width, barrel.height);
        ctx.strokeStyle = "#111"; ctx.lineWidth = 2; ctx.strokeRect(barrel.x, barrel.y, barrel.width, barrel.height);
        ctx.beginPath();
        ctx.moveTo(barrel.x, barrel.y + barrel.height / 3); ctx.lineTo(barrel.x + barrel.width, barrel.y + barrel.height / 3);
        ctx.moveTo(barrel.x, barrel.y + (barrel.height / 3) * 2); ctx.lineTo(barrel.x + barrel.width, barrel.y + (barrel.height / 3) * 2); ctx.stroke();
        if (barrel.type === "toxic") { ctx.fillStyle = "#7fff00"; ctx.fillRect(barrel.x + 5, barrel.y + 12, barrel.width - 10, 8); }
    });

    ctx.fillStyle = "#1e1e24"; ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
    ctx.fillStyle = "#00ffcc"; ctx.fillRect(0, floorY, canvas.width, 4);

    platforms.forEach(plat => { 
        if (!plat.destroyed) {
            ctx.fillStyle = "#4e413d"; ctx.fillRect(plat.x, plat.y, plat.width, plat.height); 
            ctx.fillStyle = "#ffaa44"; ctx.fillRect(plat.x, plat.y, plat.width, 2); 
        } else {
            ctx.fillStyle = "rgba(255, 69, 0, 0.15)";
            ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        }
    });

    // PACK-A-PUNCH
    ctx.fillStyle = "#4b0082"; ctx.fillRect(packAPunch.x, packAPunch.y, packAPunch.width, packAPunch.height);
    ctx.strokeStyle = "#da70d6"; ctx.lineWidth = 3; ctx.strokeRect(packAPunch.x, packAPunch.y, packAPunch.width, packAPunch.height);
    ctx.fillStyle = Math.floor(Date.now() / 250) % 2 === 0 ? "#00ffff" : "#ff00ff";
    ctx.fillRect(packAPunch.x + 8, packAPunch.y + 10, 8, 8); ctx.fillRect(packAPunch.x + packAPunch.width - 16, packAPunch.y + 10, 8, 8);

    let playerCenterX = player.x + player.width / 2;
    let playerCenterY = player.y + player.height / 2;
    let nearPackAPunch = (playerCenterX > packAPunch.x - 30 && playerCenterX < packAPunch.x + packAPunch.width + 30 &&
                          playerCenterY > packAPunch.y - 30 && playerCenterY < packAPunch.y + packAPunch.height + 30);
    if (nearPackAPunch && !packAPunch.isUpgrading) {
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 13px Arial"; ctx.textAlign = "center";
        ctx.fillText(score >= packAPunch.cost ? "[Mantén U] Mejorar Arma (10k pts)" : "Pack-A-Punch (10,000 pts)", packAPunch.x + packAPunch.width/2, packAPunch.y - 12);
        ctx.textAlign = "left";
    }

    if (packAPunch.isUpgrading) {
        ctx.fillStyle = "#ffff00"; ctx.font = "bold 16px Arial"; ctx.textAlign = "center";
        ctx.fillText("MEJORANDO...", packAPunch.x + packAPunch.width / 2, packAPunch.y - 25);
        let progressPct = packAPunch.chargeProgress / packAPunch.requiredFrames;
        ctx.fillStyle = "#222"; ctx.fillRect(packAPunch.x - 25, packAPunch.y - 15, 100, 8);
        ctx.fillStyle = "#00ffcc"; ctx.fillRect(packAPunch.x - 25, packAPunch.y - 15, 100 * progressPct, 8);
        ctx.textAlign = "left";
    }

    medkits.forEach(m => { ctx.fillStyle = "#ffffff"; ctx.fillRect(m.x, m.y, m.width, m.height); ctx.fillStyle = "#ff0000"; ctx.fillRect(m.x + m.width/2 - 2, m.y + 4, 4, m.height - 8); ctx.fillRect(m.x + 4, m.y + m.height/2 - 2, m.width - 8, 4); });

    grenades.forEach(g => {
        ctx.fillStyle = "rgba(255, 0, 0, 0.35)"; ctx.beginPath(); ctx.arc(g.x, g.y, g.radius, 0, Math.PI*2); ctx.fill();
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
        // Kamikaze: parpadea entre rojo brillante y blanco
        let drawColor = enemy.color;
        if (enemy.isKamikaze) {
            let blink = Math.floor(Date.now() / 120) % 2 === 0;
            drawColor = blink ? "#ff3333" : "#ffffff";
            // Aura de explosión
            ctx.save();
            ctx.globalAlpha = 0.25 + Math.sin(Date.now() / 80) * 0.15;
            ctx.fillStyle = "#ff4400";
            ctx.beginPath();
            ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 38, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        drawStickman(enemy.x, enemy.y, drawColor, false, enemy.facing === 1, false, scale, enemy.isFlying, enemy.isShielded);
        
        if (enemy.isBoss) {
            ctx.fillStyle = "#333"; ctx.fillRect(enemy.x, enemy.y - 15, 80, 8);
            ctx.fillStyle = "#ff0000"; ctx.fillRect(enemy.x, enemy.y - 15, (enemy.lives / enemy.maxLives) * 80, 8);
        } else if (enemy.isShielded) {
            ctx.fillStyle = "#222"; ctx.fillRect(enemy.x, enemy.y - 15, 45, 6);
            ctx.fillStyle = "#00bfff"; ctx.fillRect(enemy.x, enemy.y - 15, (enemy.lives / enemy.maxLives) * 45, 6);
        }
    });

    if (dragonSpawned && dragon) {
        ctx.save();
        let firePulse = Math.sin(Date.now() / 150) * 20;
        ctx.fillStyle = "#4a0072"; ctx.beginPath(); ctx.moveTo(canvas.width, dragon.y + 150); ctx.lineTo(dragon.x + 180, dragon.y + 20); ctx.lineTo(dragon.x + 220, dragon.y + 180); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#5c008a"; ctx.beginPath(); ctx.moveTo(canvas.width, dragon.y + 100); ctx.quadraticCurveTo(dragon.x + 120, dragon.y + 150, dragon.x + 100, dragon.y + 250); ctx.lineTo(canvas.width, dragon.y + 380); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#7b00b8"; ctx.lineWidth = 3;
        for(let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(dragon.x + 160 + (i*30), dragon.y + 200 + (i*20), 25, 0, Math.PI); ctx.stroke(); }
        ctx.fillStyle = "#6a009c"; ctx.beginPath(); ctx.moveTo(dragon.x + 140, dragon.y + 230); ctx.quadraticCurveTo(dragon.x + 60, dragon.y + 150, dragon.x + 40, dragon.y + 100); ctx.lineTo(dragon.x - 20, dragon.y + 80); ctx.lineTo(dragon.x + 30, dragon.y + 130); ctx.lineTo(dragon.x + 100, dragon.y + 160); ctx.quadraticCurveTo(dragon.x + 110, dragon.y + 200, dragon.x + 140, dragon.y + 250); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#4a0072"; ctx.beginPath(); ctx.moveTo(dragon.x + 30, dragon.y + 130); ctx.lineTo(dragon.x - 5, dragon.y + 115); ctx.lineTo(dragon.x + 40, dragon.y + 150); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#9900ff"; ctx.beginPath(); ctx.moveTo(dragon.x + 40, dragon.y + 90); ctx.lineTo(dragon.x + 10, dragon.y + 40); ctx.lineTo(dragon.x + 60, dragon.y + 95); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ffff00"; ctx.shadowColor = "#ffea00"; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(dragon.x + 25, dragon.y + 95, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(dragon.x + 23, dragon.y + 95, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore(); 

        let timeToShot = Date.now() - dragon.lastShot;
        if (timeToShot > 2000) {
            ctx.fillStyle = "rgba(255, 69, 0, " + (0.3 + Math.abs(firePulse/40)) + ")"; ctx.beginPath(); ctx.arc(dragon.x + 25, dragon.y + 125, 25 + firePulse/2, 0, Math.PI*2); ctx.fill();
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

    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        if (p.isChunk) {
            ctx.strokeStyle = p.color; ctx.lineWidth = 2;
            if (p.chunkType === 0) { 
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.stroke();
            } else if (p.chunkType === 1) { 
                ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.size*2, p.y + p.size); ctx.stroke();
            } else { 
                ctx.fillRect(p.x, p.y, p.size, p.size * 2);
            }
        } else {
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.restore();
    });

    floatingTexts.forEach(ft => {
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.font = "bold 16px Courier New";
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    });

    if (specialRoundType === "darkness") {
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.96)";
        ctx.globalCompositeOperation = "multiply";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = "destination-out";
        let radGrad = ctx.createRadialGradient(mouseX, mouseY, 10, mouseX, mouseY, 150);
        radGrad.addColorStop(0, "rgba(0,0,0,1)");
        radGrad.addColorStop(0.7, "rgba(0,0,0,0.5)");
        radGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = radGrad;
        ctx.beginPath(); ctx.arc(mouseX, mouseY, 150, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

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

    ctx.fillStyle = "#ffffff"; ctx.font = "bold 24px Arial";
    ctx.fillText(`RONDA: ${currentRound} ${specialRoundType === 'speed' ? '[VELOCIDAD]' : (specialRoundType === 'darkness' ? '[OSCURIDAD]' : '')}`, 25, 100);
    ctx.font = "18px Arial"; ctx.fillStyle = "#ff3333";
    ctx.fillText(`Enemigos restantes: ${enemiesLeftInRound > 0 ? enemiesLeftInRound : 0}`, 25, 135);
    
    // UI De monedas del jugador en partida
    ctx.fillStyle = "#ffd700"; ctx.fillText(`🪙 Monedas: ${coins}`, 25, 165);

    // ======= COMBO COUNTER =======
    if (comboCount >= 10) {
        let comboTier = Math.floor(comboCount / 10) * 10;
        let comboAlpha = 0.6 + Math.sin(Date.now() / 80) * 0.4;
        ctx.save();
        ctx.globalAlpha = comboAlpha;
        ctx.font = "bold 52px Arial";
        ctx.fillStyle = comboCount >= 30 ? "#ff00ff" : (comboCount >= 20 ? "#ff8800" : "#ff4500");
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 20;
        ctx.textAlign = "right";
        ctx.fillText(`x${comboCount} COMBO`, canvas.width - 20, 110);
        // Barra de tiempo de combo
        let comboBarWidth = 200;
        let comboBarX = canvas.width - 220;
        ctx.globalAlpha = 0.8;
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#333";
        ctx.fillRect(comboBarX, 115, comboBarWidth, 8);
        ctx.fillStyle = comboCount >= 30 ? "#ff00ff" : (comboCount >= 20 ? "#ff8800" : "#ff4500");
        ctx.fillRect(comboBarX, 115, comboBarWidth * (comboTimer / COMBO_TIMEOUT), 8);
        ctx.textAlign = "left";
        ctx.restore();
    }

    // ======= DASH COOLDOWN UI =======
    if (dashSystem.dashCooldown > 0 || dashSystem.isDashing) {
        ctx.save();
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "left";
        ctx.fillStyle = dashSystem.isDashing ? "#00ffcc" : "#aaaaaa";
        ctx.fillText(dashSystem.isDashing ? "⚡ DASH ACTIVO" : "DASH (Shift)", 25, canvas.height - 40);
        let dashBarW = 120;
        ctx.fillStyle = "#333";
        ctx.fillRect(25, canvas.height - 35, dashBarW, 6);
        let pct = dashSystem.isDashing ? 1 : 1 - (dashSystem.dashCooldown / dashSystem.dashCooldownMax);
        ctx.fillStyle = pct >= 1 ? "#00ffcc" : "#4488ff";
        ctx.fillRect(25, canvas.height - 35, dashBarW * pct, 6);
        ctx.restore();
    }

    if (isRoundBreak) {
        ctx.fillStyle = "rgba(12, 12, 28, 0.92)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
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

    const currentWeaponData = weaponsCatalog[player.currentWeapon];
    ctx.fillStyle = "#ffffff"; ctx.font = "20px Arial";
    ctx.fillText(`Arma: ${currentWeaponData.name.toUpperCase()} (Daño: ${currentWeaponData.damage})`, 25, canvas.height - 110);
    ctx.fillText(`Munición: ${player.isReloading ? "RECARGANDO..." : player.ammo + "/" + player.maxAmmo}`, 25, canvas.height - 80);
    ctx.font = "14px Arial"; ctx.fillStyle = "#aaa";
    ctx.fillText("Mantén 'O' quieto por 5s para recargar Overshield", 25, canvas.height - 60);

    if (dragonWarning && !isRoundBreak) {
        ctx.fillStyle = "rgba(255, 0, 0, " + (Math.sin(Date.now() / 100) * 0.3 + 0.4) + ")"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 50px Arial"; ctx.textAlign = "center";
        ctx.fillText("⚠️ ¡EL DRAGÓN XD SE VIENE EN 5 SEGUNDOS! ⚠️", canvas.width / 2, canvas.height * 0.4);
        ctx.textAlign = "left";
    }

    if (showShop) {
        ctx.fillStyle = "rgba(10, 10, 20, 0.95)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#00ffcc"; ctx.font = "bold 40px Arial"; ctx.textAlign = "center";
        ctx.fillText("TIENDA & ARMERÍA (Juego Pausado)", canvas.width / 2, canvas.height * 0.12);
        ctx.fillStyle = "#ffffff"; ctx.font = "24px Arial"; ctx.fillText(`Tu Puntuación: ${score} pts`, canvas.width / 2, canvas.height * 0.18);
        ctx.font = "22px Arial";
        
        if (player.currentWeapon === "pistola") { ctx.fillStyle = "#00ffcc"; ctx.fillText(`[EQUIPADA ACTUALMENTE] - 1. ${weaponsCatalog.pistola.name}`, canvas.width / 2, canvas.height * 0.32); } 
        else { ctx.fillStyle = "#ffffff"; ctx.fillText(`[Presiona 1] Equipar ${weaponsCatalog.pistola.name} (Ya Adquirida)`, canvas.width / 2, canvas.height * 0.32); }

        if (player.currentWeapon === "mp5") { ctx.fillStyle = "#00ffcc"; ctx.fillText(`[EQUIPADA ACTUALMENTE] - 2. ${weaponsCatalog.mp5.name}`, canvas.width / 2, canvas.height * 0.41); } 
        else if (weaponsCatalog.mp5.purchased) { ctx.fillStyle = "#ffff00"; ctx.fillText(`[Presiona 2] Equipar ${weaponsCatalog.mp5.name} (Ya Adquirido)`, canvas.width / 2, canvas.height * 0.41); } 
        else { ctx.fillStyle = score >= weaponsCatalog.mp5.cost ? "#ffffff" : "#ff3333"; ctx.fillText(`[Presiona 2] Comprar Subfusil MP5 - Costo: ${weaponsCatalog.mp5.cost} pts`, canvas.width / 2, canvas.height * 0.41); }

        if (player.currentWeapon === "duales") { ctx.fillStyle = "#00ffcc"; ctx.fillText(`[EQUIPADA ACTUALMENTE] - 3. ${weaponsCatalog.duales.name}`, canvas.width / 2, canvas.height * 0.50); } 
        else if (weaponsCatalog.duales.purchased) { ctx.fillStyle = "#ff00ff"; ctx.fillText(`[Presiona 3] Equipar ${weaponsCatalog.duales.name} (Ya Adquiridas)`, canvas.width / 2, canvas.height * 0.50); } 
        else { ctx.fillStyle = score >= weaponsCatalog.duales.cost ? "#ffffff" : "#ff3333"; ctx.fillText(`[Presiona 3] Comprar Pistolas Duales - Costo: ${weaponsCatalog.duales.cost} pts`, canvas.width / 2, canvas.height * 0.50); }

        if (player.currentWeapon === "rifle") { ctx.fillStyle = "#00ffcc"; ctx.fillText(`[EQUIPADA ACTUALMENTE] - 4. ${weaponsCatalog.rifle.name}`, canvas.width / 2, canvas.height * 0.59); } 
        else if (weaponsCatalog.rifle.purchased) { ctx.fillStyle = "#00bfff"; ctx.fillText(`[Presiona 4] Equipar ${weaponsCatalog.rifle.name} (Ya Adquirido)`, canvas.width / 2, canvas.height * 0.59); } 
        else { ctx.fillStyle = score >= weaponsCatalog.rifle.cost ? "#ffffff" : "#ff3333"; ctx.fillText(`[Presiona 4] Comprar Rifle Pesado - Costo: ${weaponsCatalog.rifle.cost} pts`, canvas.width / 2, canvas.height * 0.59); }

        if (player.currentWeapon === "galil") { ctx.fillStyle = "#00ffcc"; ctx.fillText(`[EQUIPADA ACTUALMENTE] - 5. ${weaponsCatalog.galil.name}`, canvas.width / 2, canvas.height * 0.68); } 
        else if (weaponsCatalog.galil.purchased) { ctx.fillStyle = "#00ff66"; ctx.fillText(`[Presiona 5] Equipar ${weaponsCatalog.galil.name} (Ya Adquirido)`, canvas.width / 2, canvas.height * 0.68); } 
        else { ctx.fillStyle = score >= weaponsCatalog.galil.cost ? "#ffffff" : "#ff3333"; ctx.fillText(`[Presiona 5] Comprar Rifle Galil AR - Costo: ${weaponsCatalog.galil.cost} pts`, canvas.width / 2, canvas.height * 0.68); }
        
        ctx.fillStyle = "#aaa"; ctx.font = "18px Arial"; ctx.fillText("Presiona 'T' para cerrar el menú y volver al juego", canvas.width / 2, canvas.height * 0.82);
        ctx.textAlign = "left";
    }

    if (showCheats) {
        ctx.fillStyle = "rgba(25, 10, 10, 0.96)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff3333"; ctx.font = "bold 40px Arial"; ctx.textAlign = "center";
        ctx.fillText("MENÚ DE TRUCOS / CHEATS (Juego Pausado)", canvas.width / 2, canvas.height * 0.2);
        ctx.fillStyle = "#ffffff"; ctx.font = "24px Arial"; ctx.fillText(`Puntuación Actual: ${score} pts`, canvas.width / 2, canvas.height * 0.28);
        ctx.font = "22px Arial"; ctx.fillStyle = "#ffaa00";
        ctx.fillText("[Presiona 1] Añadir +10,000 Puntos Instantáneos", canvas.width / 2, canvas.height * 0.42);
        // UI DE LA NUEVA TRAMPA
        ctx.fillStyle = "#00ffff";
        ctx.fillText("[Presiona 2] Avanzar / Saltear Siguiente Ronda (+100 Monedas)", canvas.width / 2, canvas.height * 0.50);
        
        ctx.fillStyle = "#aaa"; ctx.font = "18px Arial"; ctx.fillText("Presiona 'M' de nuevo para cerrar el menú de trucos", canvas.width / 2, canvas.height * 0.75);
        ctx.textAlign = "left";
    }
}

function loop() { 
    update(); 
    draw(); 
    requestAnimationFrame(loop); 
}
loop();
