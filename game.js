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
let coins = parseInt(localStorage.getItem("stickman_coins")) || 0;
let purchasedHats = JSON.parse(localStorage.getItem("stickman_hats")) || { cowboy: false, top: false };
let equippedHat = localStorage.getItem("stickman_equipped_hat") || "none"; 

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
            isChunk: isDeath && Math.random() > 0.4, 
            chunkType: Math.floor(Math.random() * 3) 
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
let comboTimer = 0;       
const COMBO_TIMEOUT = 300; 

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
    dashDuration: 30,      
    dashCooldown: 0,
    dashCooldownMax: 90,   
    dashSpeed: 22
};

// ==========================================
// SISTEMA DE ESTADOS DEL JUEGO
// ==========================================
let gameState = "menu"; 

// Variables de Game Over
let gameOverScore = 0;
let gameOverRound = 0;
const gameOverButton = { x: 0, y: 0, width: 220, height: 60 }; 

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
let bossCounter = 0; // Lleva el conteo total de jefes generados para rotar tipos

// SISTEMA DE RONDAS Y MEJORAS DE INTERMEDIO
let currentRound = 1;
let enemiesLeftInRound = 20; 
let enemiesSpawnedInRound = 0;
let isRoundBreak = false;
let roundBreakTimer = 0; 

// NUEVAS VARIABLES PARA RONDAS ESPECIALES (MÚLTIPLOS DE 7)
let specialRoundType = "none"; 

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
        if (mouseX >= menuShopButton.x && mouseX <= menuShopButton.x + menuShopButton.width &&
            mouseY >= menuShopButton.y && mouseY <= menuShopButton.y + menuShopButton.height) {
            gameState = "menu_shop";
        }
        return;
    }

    if (gameState === "menu_shop") {
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
        if (key === "2") {
            spawnFloatingText(canvas.width / 2, canvas.height / 2, "¡RONDA DE JEFES FORZADA!", "#00ffff");
            gameTimer = Math.floor(gameTimer / 180) * 180 + 179; // Adelanta el timer al borde de activación del jefe
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

// ==========================================
// NUEVO SISTEMA DINÁMICO DE GENERACIÓN DE JEFES (3 TIPOS CÍCLICOS)
// ==========================================
function spawnDragon() {
    playSound("explosion");
    bossCounter++;
    
    // Calcula el tipo cíclicamente (Jefe 1, Jefe 2, Jefe 3)
    let bossType = ((bossCounter - 1) % 3) + 1;
    let baseHealth = 1500 + currentRound * 400;

    if (bossType === 1) {
        // JEFE 1: Dragón Terrestre Infernal (Persigue y salta plataformas)
        dragon = {
            type: 1,
            name: "DRAGÓN INFERNAL (Terrestre)",
            x: canvas.width - 150,
            y: floorY - 100,
            width: 100,
            height: 100,
            vx: 0,
            vy: 0,
            speed: 2.3,
            health: baseHealth,
            maxHealth: baseHealth,
            shootCooldown: 1200,
            lastShootTime: 0,
            color: "#2e1a47", 
            secondaryColor: "#ff3300",
            grounded: false
        };
    } else if (bossType === 2) {
        // JEFE 2: Dragón Celestial (Vuela de lado a lado en el cielo)
        dragon = {
            type: 2,
            name: "DRAGÓN CELESTIAL (Volador)",
            x: 100,
            y: 80, 
            width: 120,
            height: 70,
            vx: 4.5, 
            vy: 0,
            speed: 4.5,
            health: Math.floor(baseHealth * 0.85),
            maxHealth: Math.floor(baseHealth * 0.85),
            shootCooldown: 900, 
            lastShootTime: 0,
            color: "#1a473a", 
            secondaryColor: "#00ffcc",
            sinAnim: 0 
        };
    } else if (bossType === 3) {
        // JEFE 3: Cabeza Ancestral de Titán (Estática a la izquierda, ráfagas pesadas)
        dragon = {
            type: 3,
            name: "CABEZA ANCESTRAL DE TITÁN",
            x: 5, 
            y: 160,
            width: 150,
            height: 260, 
            health: Math.floor(baseHealth * 1.35), 
            maxHealth: Math.floor(baseHealth * 1.35),
            shootCooldown: 1600,
            lastShootTime: 0,
            color: "#4a5568", 
            secondaryColor: "#ff0055",
            pulseAnim: 0
        };
    }
}

// Reloj interno del juego para disparar alertas y jefes
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
        spawnDragon(); 
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
    enemies.push({ x: Math.random() > 0.5 ? canvas.width + 20 : -50, y: floorY - 80, width: 40, height: 80, velocityY: 0, isGrounded: true, speed: Math.random() * (2.5 - 1.2) + 1.2, color: "#ff3333", isBoss: false, isFlying: false, isShielded: false, lives: 2 + extraHealth, maxLives: 2 + extraHealth, lastGrenade: Date.now() + Math.random() * 2000 });
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
    enemies.push({ x: Math.random() > 0.5 ? canvas.width + 20 : -50, y: Math.random() * (floorY - 250) + 50, width: 40, height: 60, speed: isSpeedRound ? 4.8 : 2.2, color: isSpeedRound ? "#ff1493" : "#ff8c00", isBoss: false, isFlying: true, isShielded: false, lives: 2 + extraHealth, maxLives: 2 + extraHealth, lastGrenade: 0 });
}

let spawnFlyingInterval = setInterval(spawnFlyingEnemy, 4000);

function spawnShieldedEnemy() {
    if (gameState !== "playing" || player.lives <= 0 || isPaused || dragonSpawned || dragonWarning || isRoundBreak) return;
    if (!sampleShieldedSpawn()) return;
    let extraHealth = Math.floor(currentRound / 4);
    enemiesSpawnedInRound++;
    enemies.push({ x: Math.random() > 0.5 ? canvas.width + 20 : -50, y: floorY - 80, width: 45, height: 80, velocityY: 0, isGrounded: true, speed: 1.1, color: "#94a3b8", isBoss: false, isFlying: false, isShielded: true, lives: 5 + extraHealth, maxLives: 5 + extraHealth, lastGrenade: 0 });
}

let spawnShieldedInterval = setInterval(spawnShieldedEnemy, 10000);

function spawnKamikazeEnemy() {
    if (gameState !== "playing" || player.lives <= 0 || isPaused || dragonSpawned || dragonWarning || isRoundBreak) return;
    let maxForThisRound = getTotalEnemiesForRound(currentRound);
    if (currentRound < 4 || enemiesSpawnedInRound >= maxForThisRound || specialRoundType === "speed") return;
    enemiesSpawnedInRound++;
    enemies.push({ x: Math.random() > 0.5 ? canvas.width + 20 : -50, y: floorY - 70, width: 35, height: 70, velocityY: 0, isGrounded: true, speed: 3.5, color: "#f59e0b", isBoss: false, isFlying: false, isShielded: false, isKamikaze: true, lives: 1, maxLives: 1, lastGrenade: 0 });
}

let spawnKamikazeInterval = setInterval(spawnKamikazeEnemy, 12000);

function update(dt) {
    if (gameState !== "playing" || isPaused) return;

    if (player.lives <= 0) {
        gameState = "gameover";
        gameOverScore = score;
        gameOverRound = currentRound;
        stopMusic();
        playSound("game_over");
        return;
    }

    // Temporizador e inmunidad por dash
    if (dashSystem.isDashing) {
        dashSystem.dashTimer--;
        player.x += player.facing * dashSystem.dashSpeed;
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
        if (dashSystem.dashTimer <= 0) dashSystem.isDashing = false;
    } else {
        if (keys["a"] || keys["arrowleft"]) { player.x -= player.speed; player.facing = -1; }
        if (keys["d"] || keys["arrowright"]) { player.x += player.speed; player.facing = 1; }
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    }

    if (dashSystem.dashCooldown > 0) dashSystem.dashCooldown--;

    if (player.invulnerableTimer > 0) {
        player.invulnerableTimer--;
        if (player.invulnerableTimer <= 0) player.isInvulnerable = false;
    }

    // Manejo de Gravedad de Jugador
    player.velocityY += gravity;
    player.y += player.velocityY;
    player.isGrounded = false;

    if (player.y + player.height >= floorY) {
        player.y = floorY - player.height;
        player.velocityY = 0;
        player.isGrounded = true;
    }

    // Colisión con plataformas mecánicas
    platforms.forEach(p => {
        if (p.destroyed) {
            p.repairTimer--;
            if (p.repairTimer <= 0) p.destroyed = false;
            return;
        }
        if (player.x + player.width > p.x && player.x < p.x + p.width) {
            if (player.y + player.height >= p.y && player.y + player.height - player.velocityY <= p.y + 12) {
                if (player.velocityY >= 0) {
                    player.y = p.y - player.height;
                    player.velocityY = 0;
                    player.isGrounded = true;
                }
            }
        }
    });

    if ((keys["w"] || keys["space"] || keys["arrowup"]) && player.isGrounded && !dashSystem.isDashing) {
        player.velocityY = -player.jumpForce;
        player.isGrounded = false;
        playSound("jump");
    }

    if (player.isReloading) {
        player.reloadTimer--;
        if (player.reloadTimer <= 0) {
            player.isReloading = false;
            player.ammo = player.maxAmmo;
        }
    }

    // Recarga pasiva del escudo azul
    if (!shieldSystem.isCharging && shieldSystem.current < shieldSystem.max) {
        shieldSystem.isCharging = true;
        shieldSystem.chargeProgress = 0;
    }
    if (shieldSystem.isCharging) {
        shieldSystem.chargeProgress++;
        if (shieldSystem.chargeProgress >= shieldSystem.requiredFrames) {
            shieldSystem.current++;
            shieldSystem.isCharging = false;
        }
    }

    // Carga interactiva de la máquina Pack-A-Punch
    if (player.x + player.width > packAPunch.x && player.x < packAPunch.x + packAPunch.width &&
        player.y + player.height >= packAPunch.y && player.y <= packAPunch.y + packAPunch.height) {
        if (score >= packAPunch.cost && !packAPunch.isUpgrading) {
            if (keys["e"]) {
                packAPunch.isUpgrading = true;
                packAPunch.chargeProgress = 0;
                playSound("reload");
            }
        }
    }
    if (packAPunch.isUpgrading) {
        packAPunch.chargeProgress++;
        if (packAPunch.chargeProgress >= packAPunch.requiredFrames) {
            score -= packAPunch.cost;
            scoreEl.innerText = score;
            packAPunch.isUpgrading = false;
            weaponsCatalog[player.currentWeapon].upgradeLevel++;
            weaponsCatalog[player.currentWeapon].damage += 2;
            weaponsCatalog[player.currentWeapon].baseAmmo += 5;
            updatePlayerStats();
            player.ammo = player.maxAmmo;
            spawnFloatingText(player.x, player.y - 40, "¡ARMA MEJORADA!", "#00ffff");
            playSound("buy");
        }
    }

    // Reducción del combo timer
    if (comboCount > 0) {
        comboTimer--;
        if (comboTimer <= 0) {
            comboCount = 0;
        }
    }

    // Balas del jugador
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.speedX;
        b.y += b.speedY;

        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            bullets.splice(i, 1);
            continue;
        }

        // Colisión con el jefe dinámico activo
        if (dragonSpawned && dragon) {
            if (b.x > dragon.x && b.x < dragon.x + dragon.width && b.y > dragon.y && b.y < dragon.y + dragon.height) {
                dragon.health -= b.damage;
                spawnParticles(b.x, b.y, dragon.secondaryColor, 3);
                playSound("hit_enemy");
                bullets.splice(i, 1);

                if (dragon.health <= 0) {
                    score += 5000;
                    coins += 150;
                    scoreEl.innerText = score;
                    savePersistentData();
                    spawnParticles(dragon.x + dragon.width / 2, dragon.y + dragon.height / 2, dragon.color, 45, true);
                    spawnFloatingText(dragon.x + dragon.width / 2, dragon.y, "+5000 PTS / +150 Monedas", "#ffff00");
                    dragon = null;
                    dragonSpawned = false;
                    gameTimer = 0;
                    
                    if (enemiesLeftInRound <= 0) {
                        isRoundBreak = true;
                        roundBreakTimer = 400;
                        playSound("round_complete");
                    }
                }
                continue;
            }
        }

        // Colisión con enemigos comunes
        for (let j = enemies.length - 1; j >= 0; j--) {
            let e = enemies[j];
            if (b.x + b.width > e.x && b.x < e.x + e.width && b.y + b.height > e.y && b.y < e.y + e.height) {
                if (e.isShielded && b.speedX * (e.x + e.width/2 - player.x) > 0) {
                    e.lives -= Math.max(1, Math.floor(b.damage * 0.4));
                } else {
                    e.lives -= b.damage;
                }
                spawnParticles(b.x, b.y, e.color, 4);
                playSound("hit_enemy");
                bullets.splice(i, 1);

                if (e.lives <= 0) {
                    let reward = e.isShielded ? 250 : (e.isFlying ? 180 : 100);
                    score += reward;
                    coins += e.isShielded ? 5 : 2;
                    scoreEl.innerText = score;
                    savePersistentData();
                    registerKill();
                    spawnParticles(e.x + e.width / 2, e.y + e.height / 2, e.color, 16, true);
                    enemies.splice(j, 1);
                    enemiesLeftInRound--;

                    if (Math.random() < 0.08) {
                        medkits.push({ x: e.x, y: floorY - 25, width: 25, height: 25 });
                    }

                    if (enemiesLeftInRound <= 0 && !dragonSpawned) {
                        isRoundBreak = true;
                        roundBreakTimer = 400;
                        playSound("round_complete");
                    }
                }
                break;
            }
        }
    }

    // Comportamiento del enemigo común e Inteligencia Artificial
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];

        if (e.isFlying) {
            let dx = player.x - e.x;
            let dy = player.y - e.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 5) {
                e.x += (dx / dist) * e.speed;
                e.y += (dy / dist) * e.speed;
            }
        } else {
            let dir = player.x - e.x > 0 ? 1 : -1;
            e.x += dir * e.speed;

            e.velocityY += gravity;
            e.y += e.velocityY;
            e.isGrounded = false;

            if (e.y + e.height >= floorY) {
                e.y = floorY - e.height;
                e.velocityY = 0;
                e.isGrounded = true;
            }

            platforms.forEach(p => {
                if (p.destroyed) return;
                if (e.x + e.width > p.x && e.x < p.x + p.width) {
                    if (e.y + e.height >= p.y && e.y + e.height - e.velocityY <= p.y + 12) {
                        if (e.velocityY >= 0) {
                            e.y = p.y - e.height;
                            e.velocityY = 0;
                            e.isGrounded = true;
                        }
                    }
                }
            });

            if (e.isGrounded && Math.random() < 0.015 && player.y < e.y - 40) {
                e.velocityY = -11;
                e.isGrounded = false;
            }

            if (e.isKamikaze) {
                let pDistX = Math.abs((player.x + player.width/2) - (e.x + e.width/2));
                let pDistY = Math.abs((player.y + player.height/2) - (e.y + e.height/2));
                if (pDistX < 50 && pDistY < 60) {
                    if (!player.isInvulnerable) {
                        if (shieldSystem.current > 0) shieldSystem.current--;
                        else player.lives--;
                        playSound("player_hit");
                    }
                    playSound("explosion");
                    spawnParticles(e.x + e.width/2, e.y + e.height/2, "#f59e0b", 22, true);
                    enemies.splice(i, 1);
                    enemiesLeftInRound--;
                    if (enemiesLeftInRound <= 0 && !dragonSpawned) {
                        isRoundBreak = true;
                        roundBreakTimer = 400;
                        playSound("round_complete");
                    }
                    continue;
                }
            }

            if (!e.isShielded && !e.isKamikaze && Date.now() - e.lastGrenade > 4500 && Math.abs(player.x - e.x) < 400) {
                let launchAngle = dir === 1 ? -Math.PI / 4 : -3 * Math.PI / 4;
                grenades.push({
                    x: e.x + e.width / 2,
                    y: e.y + 10,
                    vx: Math.cos(launchAngle) * 7,
                    vy: Math.sin(launchAngle) * 9,
                    timer: 130,
                    radius: 7
                });
                e.lastGrenade = Date.now() + Math.random() * 2000;
            }
        }

        // Ataque físico o colisión con el jugador
        if (!player.isInvulnerable && player.x < e.x + e.width && player.x + player.width > e.x &&
            player.y < e.y + e.height && player.y + player.height > e.y) {
            player.isInvulnerable = true;
            player.invulnerableTimer = 60; 
            if (shieldSystem.current > 0) shieldSystem.current--;
            else player.lives--;
            playSound("player_hit");
            spawnParticles(player.x + player.width / 2, player.y + player.height / 2, "#ff0000", 8);
        }
    }

    // ==========================================
    // CONTROL DE COMPORTAMIENTO DE LOS 3 JEFES
    // ==========================================
    if (dragonSpawned && dragon) {
        let now = Date.now();

        if (dragon.type === 1) {
            // JEFE 1: Terrestre Seguidor
            let dirX = player.x - (dragon.x + dragon.width / 2);
            dragon.vx = dirX > 0 ? dragon.speed : -dragon.speed;
            
            dragon.vy += 0.5; // Gravedad del jefe
            dragon.x += dragon.vx;
            dragon.y += dragon.vy;

            dragon.grounded = false;
            if (dragon.y + dragon.height >= floorY) {
                dragon.y = floorY - dragon.height;
                dragon.vy = 0;
                dragon.grounded = true;
            }

            for (let p of platforms) {
                if (dragon.x + dragon.width > p.x && dragon.x < p.x + p.width) {
                    if (dragon.y + dragon.height >= p.y && dragon.y + dragon.height - dragon.vy <= p.y + 15) {
                        if (dragon.vy >= 0) {
                            dragon.y = p.y - dragon.height;
                            dragon.vy = 0;
                            dragon.grounded = true;
                        }
                    }
                }
            }
            if (dragon.grounded && (player.y < dragon.y - 40 || dragon.x <= 10 || dragon.x >= canvas.width - dragon.width - 10) && Math.random() < 0.02) {
                dragon.vy = -12;
            }
            if (dragon.x < 0) dragon.x = 0;
            if (dragon.x + dragon.width > canvas.width) dragon.x = canvas.width - dragon.width;

            // Fuego directo
            if (now - dragon.lastShootTime > dragon.shootCooldown) {
                let targetAngle = Math.atan2((player.y + 16) - (dragon.y + dragon.height/2), player.x - (dragon.x + dragon.width/2));
                enemyBullets.push({
                    x: dragon.x + dragon.width / 2,
                    y: dragon.y + dragon.height / 2,
                    vx: Math.cos(targetAngle) * 6.5,
                    vy: Math.sin(targetAngle) * 6.5,
                    size: 14,
                    color: "#ff4500"
                });
                dragon.lastShootTime = now;
                playSound("shoot");
            }

        } else if (dragon.type === 2) {
            // JEFE 2: Volador de Lado a Lado
            dragon.sinAnim += 0.05;
            dragon.x += dragon.vx;
            dragon.y = 80 + Math.sin(dragon.sinAnim) * 25;

            if (dragon.x <= 0) { dragon.vx = dragon.speed; }
            if (dragon.x + dragon.width >= canvas.width) { dragon.vx = -dragon.speed; }

            // Bombardeo dual vertical
            if (now - dragon.lastShootTime > dragon.shootCooldown) {
                enemyBullets.push({ x: dragon.x + dragon.width * 0.2, y: dragon.y + dragon.height, vx: -0.5, vy: 5.5, size: 12, color: "#00ffcc" });
                enemyBullets.push({ x: dragon.x + dragon.width * 0.8, y: dragon.y + dragon.height, vx: 0.5, vy: 5.5, size: 12, color: "#00ffcc" });
                dragon.lastShootTime = now;
                playSound("shoot_mp5");
            }

        } else if (dragon.type === 3) {
            // JEFE 3: Cabeza Gigante Izquierda Estática
            dragon.pulseAnim += 0.03;
            dragon.y = 150 + Math.sin(dragon.pulseAnim) * 7;

            // Ráfaga pesada de 3 esferas horizontales
            if (now - dragon.lastShootTime > dragon.shootCooldown) {
                enemyBullets.push({ x: dragon.x + dragon.width, y: dragon.y + dragon.height * 0.2, vx: 6, vy: -1, size: 16, color: "#ff0055" });
                enemyBullets.push({ x: dragon.x + dragon.width, y: dragon.y + dragon.height * 0.5, vx: 6.5, vy: 0, size: 18, color: "#ff0055" });
                enemyBullets.push({ x: dragon.x + dragon.width, y: dragon.y + dragon.height * 0.8, vx: 6, vy: 1, size: 16, color: "#ff0055" });
                dragon.lastShootTime = now;
                playSound("shoot_rifle");
            }
        }

        // Colisión por contacto físico directo con cualquier jefe activo
        if (!player.isInvulnerable && player.x < dragon.x + dragon.width && player.x + player.width > dragon.x &&
            player.y < dragon.y + dragon.height && player.y + player.height > dragon.y) {
            if (shieldSystem.current > 0) shieldSystem.current--;
            else player.lives--;
            player.isInvulnerable = true;
            player.invulnerableTimer = 45;
            playSound("player_hit");
        }
    }

    // Balas de los enemigos comunes y jefes
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let eb = enemyBullets[i];
        eb.x += eb.vx || eb.speedX || 0; 
        eb.y += eb.vy || eb.speedY || 0; 

        // Si no venían con el nuevo formato, usar los valores por compatibilidad
        if (eb.speedX !== undefined && eb.vx === undefined) { eb.vx = eb.speedX; eb.vy = eb.speedY; }

        if (eb.x < 0 || eb.x > canvas.width || eb.y < 0 || eb.y > canvas.height) {
            enemyBullets.splice(i, 1);
            continue;
        }

        let radius = eb.size || 6;
        if (!player.isInvulnerable && eb.x > player.x && eb.x < player.x + player.width &&
            eb.y > player.y && eb.y < player.y + player.height) {
            player.isInvulnerable = true;
            player.invulnerableTimer = 60;
            if (shieldSystem.current > 0) shieldSystem.current--;
            else player.lives--;
            playSound("player_hit");
            spawnParticles(player.x + player.width / 2, player.y + player.height / 2, "#ff3333", 8);
            enemyBullets.splice(i, 1);
        }
    }

    // Granadas arrojadas por los enemigos
    for (let i = grenades.length - 1; i >= 0; i--) {
        let g = grenades[i];
        g.vy += gravity * 0.6;
        g.x += g.vx;
        g.y += g.vy;

        if (g.y + g.radius >= floorY) {
            g.y = floorY - g.radius;
            g.vy = -g.vy * 0.4;
            g.vx *= 0.7;
        }

        // Destrucción temporal de plataformas mecánicas si la granada cae sobre ellas
        platforms.forEach(p => {
            if (!p.destroyed && g.x > p.x && g.x < p.x + p.width &&
                g.y + g.radius >= p.y && g.y - g.radius <= p.y + 10) {
                p.destroyed = true;
                p.repairTimer = 360; 
                g.timer = 0; 
            }
        });

        g.timer--;
        if (g.timer <= 0) {
            playSound("explosion");
            spawnParticles(g.x, g.y, "#f59e0b", 14);
            let d = Math.sqrt(Math.pow((player.x + player.width / 2) - g.x, 2) + Math.pow((player.y + player.height / 2) - g.y, 2));
            if (d < 110 && !player.isInvulnerable) {
                player.isInvulnerable = true;
                player.invulnerableTimer = 60;
                if (shieldSystem.current > 0) shieldSystem.current--;
                else player.lives--;
                playSound("player_hit");
            }
            grenades.splice(i, 1);
        }
    }

    // Botiquines de vida médicos dropped
    for (let i = medkits.length - 1; i >= 0; i--) {
        let m = medkits[i];
        if (player.x < m.x + m.width && player.x + player.width > m.x &&
            player.y < m.y + m.height && player.y + player.height > m.y) {
            if (player.lives < player.maxLives) {
                player.lives++;
                playSound("upgrade");
                spawnFloatingText(m.x, m.y, "+1 VIDA", "#ff2266");
                medkits.splice(i, 1);
            }
        }
    }

    // Partículas visuales
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.isChunk) p.vy += gravity * 0.4; 
        p.alpha -= p.decay;
        if (p.alpha <= 0) particles.splice(i, 1);
    }

    // Textos flotantes interactivos
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.life--;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render del menú principal persistente
    if (gameState === "menu") {
        ctx.fillStyle = "#111827";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        stars.forEach(s => {
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.fillRect(s.x, s.y, s.size, s.size);
        });

        ctx.fillStyle = "#00ffcc"; ctx.font = "bold 52px Arial"; ctx.textAlign = "center";
        ctx.fillText("STICKMAN APOCALYPSE: CYBERPUNK", canvas.width / 2, canvas.height * 0.28);

        ctx.fillStyle = "#9ca3af"; ctx.font = "20px Arial";
        ctx.fillText("¡Consigue la puntuación más alta eliminando hordas y cibendragones!", canvas.width / 2, canvas.height * 0.36);
        ctx.fillText(`Monedas Guardadas: ${coins} 🪙`, canvas.width / 2, canvas.height * 0.43);

        ctx.fillStyle = "#10b981";
        ctx.fillRect(playButton.x, playButton.y, playButton.width, playButton.height);
        ctx.fillStyle = "#fff"; ctx.font = "bold 24px Arial";
        ctx.fillText("JUGAR", playButton.x + playButton.width / 2, playButton.y + 38);

        ctx.fillStyle = "#6366f1";
        ctx.fillRect(menuShopButton.x, menuShopButton.y, menuShopButton.width, menuShopButton.height);
        ctx.fillStyle = "#fff"; ctx.font = "bold 18px Arial";
        ctx.fillText("TIENDA DE SOMBREROS", menuShopButton.x + menuShopButton.width / 2, menuShopButton.y + 32);

        ctx.fillStyle = "#6b7280"; ctx.font = "15px Arial";
        ctx.fillText("Controles: A/D para moverte — Espacio para saltar — Click para disparar — Shift para Dash", canvas.width / 2, canvas.height * 0.85);
        ctx.fillText("Presiona 'T' en partida para abrir el catálogo de armas / Presiona 'M' para Trucos", canvas.width / 2, canvas.height * 0.9);
        ctx.textAlign = "left";
        return;
    }

    // Render del menú secundario de la Tienda de Sombreros
    if (gameState === "menu_shop") {
        ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#6366f1"; ctx.font = "bold 42px Arial"; ctx.textAlign = "center";
        ctx.fillText("TIENDA DE ACCESORIOS PERMANENTES", canvas.width / 2, canvas.height * 0.18);
        ctx.fillStyle = "#fff"; ctx.font = "24px Arial";
        ctx.fillText(`Tus Monedas: ${coins} 🪙`, canvas.width / 2, canvas.height * 0.26);

        // Render del Botón Sombrero Vaquero
        ctx.fillStyle = purchasedHats.cowboy ? (equippedHat === "cowboy" ? "#10b981" : "#4b5563") : "#b45309";
        ctx.fillRect(buyCowboyButton.x, buyCowboyButton.y, buyCowboyButton.width, buyCowboyButton.height);
        ctx.fillStyle = "#fff"; ctx.font = "18px Arial";
        let txtCowboy = purchasedHats.cowboy ? (equippedHat === "cowboy" ? "EQUIPADO" : "EQUIPAR") : "COMPRAR VAQUERO (5,000 🪙)";
        ctx.fillText(txtCowboy, buyCowboyButton.x + buyCowboyButton.width / 2, buyCowboyButton.y + 36);

        // Render del Botón Sombrero de Copa
        ctx.fillStyle = purchasedHats.top ? (equippedHat === "top" ? "#10b981" : "#4b5563") : "#1e40af";
        ctx.fillRect(buyTopButton.x, buyTopButton.y, buyTopButton.width, buyTopButton.height);
        let txtTop = purchasedHats.top ? (equippedHat === "top" ? "EQUIPADO" : "EQUIPAR") : "COMPRAR COPA (10,000 🪙)";
        ctx.fillText(txtTop, buyTopButton.x + buyTopButton.width / 2, buyTopButton.y + 36);

        // Volver al menú
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(backToMenuButton.x, backToMenuButton.y, backToMenuButton.width, backToMenuButton.height);
        ctx.fillStyle = "#fff";
        ctx.fillText("VOLVER AL MENÚ", backToMenuButton.x + backToMenuButton.width / 2, backToMenuButton.y + 32);
        ctx.textAlign = "left";
        return;
    }

    // Render de Game Over
    if (gameState === "gameover") {
        ctx.fillStyle = "rgba(15, 23, 42, 0.98)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ef4444"; ctx.font = "bold 56px Arial"; ctx.textAlign = "center";
        ctx.fillText("¡HAS SIDO ELIMINADO!", canvas.width / 2, canvas.height * 0.32);
        ctx.fillStyle = "#ffffff"; ctx.font = "26px Arial";
        ctx.fillText(`Puntuación final: ${gameOverScore} pts`, canvas.width / 2, canvas.height * 0.44);
        ctx.fillText(`Sobreviviste hasta la Ronda: ${gameOverRound}`, canvas.width / 2, canvas.height * 0.51);

        gameOverButton.x = canvas.width / 2 - 110;
        gameOverButton.y = canvas.height * 0.62;
        ctx.fillStyle = "#10b981";
        ctx.fillRect(gameOverButton.x, gameOverButton.y, gameOverButton.width, gameOverButton.height);
        ctx.fillStyle = "#fff"; ctx.font = "bold 20px Arial";
        ctx.fillText("REINTENTAR", gameOverButton.x + gameOverButton.width / 2, gameOverButton.y + 38);
        ctx.textAlign = "left";
        return;
    }

    // Efecto visual de Ronda Especial de Oscuridad
    if (specialRoundType === "darkness") {
        ctx.fillStyle = "#020005";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        let gradientSky = ctx.createLinearGradient(0, 0, 0, floorY);
        gradientSky.addColorStop(0, "#080711");
        gradientSky.addColorStop(1, "#18132b");
        ctx.fillStyle = gradientSky;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    stars.forEach(s => {
        ctx.fillStyle = specialRoundType === "darkness" ? "rgba(147, 51, 234, 0.25)" : "rgba(255, 255, 255, 0.55)";
        ctx.fillRect(s.x, s.y, s.size, s.size);
    });

    // Edificios del fondo tecnológico de la escena
    buildings.forEach(bld => {
        ctx.fillStyle = specialRoundType === "darkness" ? "#110b1a" : bld.color;
        ctx.fillRect(bld.x, floorY - bld.height, bld.width, bld.height);

        bld.windows.forEach(w => {
            ctx.fillStyle = w.lit ? (specialRoundType === "darkness" ? "#a855f7" : "#ffd700") : "#1a1210";
            ctx.fillRect(bld.x + w.relX, (floorY - bld.height) + w.relY, 16, 22);
        });
    });

    backgroundDecorations.forEach(dec => {
        ctx.fillStyle = dec.color;
        ctx.fillRect(dec.x, dec.y, dec.width, dec.height);
    });

    // Estructuras de plataformas
    platforms.forEach(p => {
        if (p.destroyed) return;
        ctx.fillStyle = "#475569";
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = "#334155";
        ctx.fillRect(p.x, p.y + p.height - 4, p.width, 4);
    });

    // Renderizado de la máquina Pack-A-Punch
    ctx.fillStyle = "#1e3a8a";
    ctx.fillRect(packAPunch.x, packAPunch.y, packAPunch.width, packAPunch.height);
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(packAPunch.x + 5, packAPunch.y + 5, packAPunch.width - 10, 10);
    ctx.fillStyle = "#ffffff"; ctx.font = "11px Arial";
    ctx.fillText("P-A-P", packAPunch.x + 9, packAPunch.y + 35);

    if (packAPunch.isUpgrading) {
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(packAPunch.x - 25, packAPunch.y - 25, 100, 15);
        ctx.fillStyle = "#00ffff"; ctx.fillRect(packAPunch.x - 23, packAPunch.y - 23, (packAPunch.chargeProgress / packAPunch.requiredFrames) * 96, 11);
    }

    // Botiquines médicos caídos
    medkits.forEach(m => {
        ctx.fillStyle = "#ffffff"; ctx.fillRect(m.x, m.y, m.width, m.height);
        ctx.fillStyle = "#ff2266";
        ctx.fillRect(m.x + m.width / 2 - 3, m.y + 4, 6, m.height - 8);
        ctx.fillRect(m.x + 4, m.y + m.height / 2 - 3, m.width - 8, 6);
    });

    // Dibujado del Stickman Jugador
    if (player.lives > 0) {
        if (!player.isInvulnerable || Math.floor(Date.now() / 100) % 2 === 0) {
            let px = player.x + player.width / 2;
            let py = player.y + 25;

            ctx.strokeStyle = player.color;
            ctx.lineWidth = 4;
            ctx.beginPath();

            // Cabeza del stickman
            ctx.arc(px, py, 12, 0, Math.PI * 2);
            // Cuerpo central
            ctx.moveTo(px, py + 12); ctx.lineTo(px, py + 42);
            // Extremidades — Brazos dinámicos que apuntan al mouse
            let weaponAngle = Math.atan2(mouseY - (py + 20), mouseX - px);
            ctx.moveTo(px, py + 20); ctx.lineTo(px + Math.cos(weaponAngle) * 22, py + 20 + Math.sin(weaponAngle) * 22);
            // Extremidades — Piernas estables
            ctx.moveTo(px, py + 42); ctx.lineTo(player.x + 5, player.y + player.height);
            ctx.moveTo(px, py + 42); ctx.lineTo(player.x + player.width - 5, player.y + player.height);
            ctx.stroke();

            // Renderizado de sombreros persistentes equipados
            if (equippedHat === "cowboy") {
                ctx.fillStyle = "#b45309";
                ctx.fillRect(px - 22, py - 15, 44, 5); 
                ctx.fillRect(px - 11, py - 26, 22, 12); 
            } else if (equippedHat === "top") {
                ctx.fillStyle = "#000000"; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1;
                ctx.fillRect(px - 18, py - 14, 36, 4); 
                ctx.fillRect(px - 11, py - 36, 22, 22); 
                ctx.strokeRect(px - 11, py - 36, 22, 22);
            }

            // Visualización del arma equipada actual
            ctx.save();
            ctx.translate(px, py + 20);
            ctx.rotate(weaponAngle);
            ctx.fillStyle = weaponsCatalog[player.currentWeapon].color;
            ctx.fillRect(10, -3, player.currentWeapon === "rifle" ? 24 : 14, 6);
            if (weaponsCatalog[player.currentWeapon].upgradeLevel > 0) {
                ctx.fillStyle = "#00ffff"; ctx.fillRect(14, -5, 4, 2);
            }
            ctx.restore();
        }
    }

    // Proyectiles del jugador
    bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });

    // Dibujado de enemigos comunes de la oleada
    enemies.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x, e.y, e.width, e.height);

        // Barra de vida pequeña sobre los enemigos
        ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(e.x - 5, e.y - 12, e.width + 10, 5);
        ctx.fillStyle = "#ff2255"; ctx.fillRect(e.x - 5, e.y - 12, ((e.lives / e.maxLives) * (e.width + 10)), 5);

        if (e.isShielded) {
            ctx.fillStyle = "#38bdf8";
            if (player.x < e.x) ctx.fillRect(e.x - 6, e.y - 4, 8, e.height + 8);
            else ctx.fillRect(e.x + e.width - 2, e.y - 4, 8, e.height + 8);
        }

        // Diseño visual interno básico del stickman enemigo
        ctx.strokeStyle = "#000"; ctx.lineWidth = 2;
        let ex = e.x + e.width / 2;
        let ey = e.y + 20;
        ctx.beginPath();
        ctx.arc(ex, ey, 8, 0, Math.PI * 2);
        ctx.moveTo(ex, ey + 8); ctx.lineTo(ex, ey + 32);
        ctx.stroke();
    });

    // ==========================================
    // RENDERIZADO VISUAL DE LOS 3 TIPOS DE JEFES
    // ==========================================
    if (dragonSpawned && dragon) {
        ctx.fillStyle = dragon.color;
        ctx.fillRect(dragon.x, dragon.y, dragon.width, dragon.height);

        ctx.fillStyle = dragon.secondaryColor;
        
        if (dragon.type === 1) {
            // Diseño Dragón Terrestre
            ctx.fillRect(dragon.x + (dragon.vx > 0 ? dragon.width - 20 : 5), dragon.y + 15, 15, 10); 
            ctx.fillStyle = "#150a25"; 
            ctx.fillRect(dragon.x - 15, dragon.y + 20, 25, 45); 
            ctx.fillRect(dragon.x + dragon.width - 10, dragon.y + 20, 25, 45); 
            
        } else if (dragon.type === 2) {
            // Diseño Dragón Volador
            ctx.fillRect(dragon.x + (dragon.vx > 0 ? dragon.width - 15 : 0), dragon.y + 10, 15, 12); 
            let wingOffset = Math.sin(dragon.sinAnim * 2) * 20;
            ctx.fillStyle = "#2e7d63";
            ctx.fillRect(dragon.x + 25, dragon.y - 15 + wingOffset, 20, 30);
            ctx.fillRect(dragon.x + 65, dragon.y - 15 + wingOffset, 20, 30);
            
        } else if (dragon.type === 3) {
            // Diseño Cabeza Gigante Ancestral
            ctx.fillRect(dragon.x + dragon.width - 35, dragon.y + 40, 25, 25); 
            ctx.fillRect(dragon.x + dragon.width - 35, dragon.y + 120, 30, 15); 
            ctx.fillStyle = "#2d3748";
            ctx.fillRect(dragon.x, dragon.y + 80, dragon.width - 20, 10);
        }

        // Interfaz de salud del Jefe superior fija en pantalla
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(canvas.width / 2 - 250, 25, 500, 26);
        ctx.fillStyle = "#ff2255";
        let hpBarWidth = (dragon.health / dragon.maxHealth) * 496;
        ctx.fillRect(canvas.width / 2 - 248, 27, hpBarWidth, 22);

        ctx.fillStyle = "#fff"; ctx.font = "bold 14px Arial"; ctx.textAlign = "center";
        ctx.fillText(dragon.name, canvas.width / 2, 42);
        ctx.textAlign = "left"; 
    }

    // Proyectiles enemigos y granadas
    enemyBullets.forEach(eb => {
        ctx.fillStyle = eb.color || "#ff3333";
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.size || 6, 0, Math.PI * 2);
        ctx.fill();
    });

    grenades.forEach(g => {
        ctx.fillStyle = "#34d399"; ctx.beginPath();
        ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f59e0b"; ctx.fillRect(g.x - 2, g.y - 11, 4, 5); 
    });

    // Partículas y trozos de stickman
    particles.forEach(p => {
        ctx.fillStyle = `rgba(${p.color === "#ff0000" || p.color === "#ff3333" ? "255,50,50" : "0,255,200"}, ${p.alpha})`;
        if (p.isChunk) {
            ctx.fillStyle = p.color;
            if (p.chunkType === 0) {
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.fillRect(p.x, p.y, p.size * 3, p.size);
            }
        } else {
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
    });

    // Textos flotantes efímeros
    floatingTexts.forEach(ft => {
        ctx.fillStyle = ft.color; ctx.font = "bold 16px Arial";
        ctx.fillText(ft.text, ft.x, ft.y);
    });

    // Suelo cyberpunk estable
    ctx.fillStyle = specialRoundType === "darkness" ? "#090512" : "#111827";
    ctx.fillRect(0, floorY, canvas.width, 60);
    ctx.fillStyle = specialRoundType === "darkness" ? "#581c87" : "#00ffcc";
    ctx.fillRect(0, floorY, canvas.width, 4);

    // ==========================================
    // INTERFAZ DE USUARIO (HUD SUPERIOR EN PANTALLA)
    // ==========================================
    ctx.fillStyle = "rgba(10, 10, 15, 0.85)";
    ctx.fillRect(20, 20, 310, 120);
    ctx.strokeStyle = "#00ffcc"; ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, 310, 120);

    // Vidas (Corazones rojos)
    ctx.fillStyle = "#ff2266"; ctx.font = "18px Arial";
    let heartUI = "❤️ ".repeat(Math.max(0, player.lives));
    ctx.fillText(`VIDAS: ${heartUI}`, 35, 48);

    // Escudos (Celdas azules)
    ctx.fillStyle = "#38bdf8";
    let shieldUI = "🛡️ ".repeat(Math.max(0, shieldSystem.current));
    ctx.fillText(`ESCUDO: ${shieldUI}`, 35, 74);

    // Munición del cargador actual
    ctx.fillStyle = player.isReloading ? "#ff9900" : "#ffff00";
    let weaponNameTag = weaponsCatalog[player.currentWeapon].name;
    let upgLvl = weaponsCatalog[player.currentWeapon].upgradeLevel;
    if (upgLvl > 0) weaponNameTag += ` +${upgLvl}`;
    ctx.fillText(`${weaponNameTag}: ${player.isReloading ? "RECARGANDO..." : player.ammo + " / " + player.maxAmmo}`, 35, 100);

    // Enfriamiento del Dash (Barra pequeña)
    ctx.fillStyle = "#aaa"; ctx.font = "12px Arial";
    ctx.fillText("DASH (Shift):", 35, 124);
    ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fillRect(125, 115, 80, 10);
    ctx.fillStyle = dashSystem.dashCooldown <= 0 ? "#00ffcc" : "#ff5500";
    let dashBarW = dashSystem.dashCooldown <= 0 ? 80 : ((dashSystem.dashCooldownMax - dashSystem.dashCooldown) / dashSystem.dashCooldownMax) * 80;
    ctx.fillRect(125, 115, dashBarW, 10);

    // Marcador de Ronda y Enemigos restantes arriba a la derecha
    ctx.fillStyle = "rgba(10, 10, 15, 0.85)"; ctx.fillRect(canvas.width - 240, 20, 220, 90);
    ctx.strokeRect(canvas.width - 240, 20, 220, 90);
    ctx.fillStyle = specialRoundType !== "none" ? "#ff00ff" : "#ffffff"; ctx.font = "bold 20px Arial";
    ctx.fillText(`RONDA: ${currentRound}`, canvas.width - 225, 48);
    ctx.fillStyle = "#ff3333"; ctx.font = "16px Arial";
    ctx.fillText(`Enemigos: ${enemiesLeftInRound}`, canvas.width - 225, 74);
    ctx.fillStyle = "#f59e0b";
    ctx.fillText(`Monedas: ${coins} 🪙`, canvas.width - 225, 96);

    // Alerta visual de aproximación de Jefe
    if (dragonWarning) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.15)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff2222"; ctx.font = "bold 28px Arial"; ctx.textAlign = "center";
        ctx.fillText("⚠️ ¡ALERTA DE CIBERJEFE ACERCÁNDOSE! ⚠️", canvas.width / 2, canvas.height * 0.15);
        ctx.textAlign = "left";
    }

    // Despliegue del Multiplicador de Combo activo
    if (comboCount >= 2) {
        ctx.fillStyle = "#ff4500"; ctx.font = "bold 24px Arial";
        ctx.fillText(`COMBO x${comboCount}`, 35, 175);
        ctx.fillStyle = "rgba(255,69,0,0.2)"; ctx.fillRect(35, 185, 120, 6);
        ctx.fillStyle = "#ff4500"; ctx.fillRect(35, 185, (comboTimer / COMBO_TIMEOUT) * 120, 6);
    }

    // Intermedio entre Rondas: Menú de selección de mejoras permanentes
    if (isRoundBreak) {
        ctx.fillStyle = "rgba(10, 7, 20, 0.88)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#00ffcc"; ctx.font = "bold 38px Arial"; ctx.textAlign = "center";
        ctx.fillText(`¡RONDA ${currentRound} COMPLETADA!`, canvas.width / 2, canvas.height * 0.25);
        ctx.fillStyle = "#ffffff"; ctx.font = "22px Arial";
        ctx.fillText("Selecciona una Mejora Mutágena para la siguiente ronda:", canvas.width / 2, canvas.height * 0.33);

        // Renderizado interactivo de las 3 tarjetas de mejoras
        let cardStartX = canvas.width / 2 - 460;
        upgradeOptions.forEach((opt, idx) => {
            opt.x = cardStartX + idx * 320;
            opt.y = canvas.height * 0.45;

            ctx.fillStyle = "rgba(30, 41, 59, 0.9)"; ctx.fillRect(opt.x, opt.y, opt.w, opt.h);
            ctx.strokeStyle = opt.color; ctx.lineWidth = 2; ctx.strokeRect(opt.x, opt.y, opt.w, opt.h);

            ctx.fillStyle = "#fff"; ctx.font = "bold 16px Arial";
            ctx.fillText(opt.text, opt.x + opt.w / 2, opt.y + 42);
        });

        // Barra de tiempo restante automático para elegir mejora
        ctx.fillStyle = "#aaa"; ctx.font = "14px Arial";
        ctx.fillText(`Siguiente ronda en: ${Math.ceil(roundBreakTimer / 60)}s`, canvas.width / 2, canvas.height * 0.68);
        ctx.textAlign = "left";
    }

    // Menú de Tienda de Armas en partida (Pausado con 'T')
    if (showShop) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.96)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffff00"; ctx.font = "bold 36px Arial"; ctx.textAlign = "center";
        ctx.fillText("ARMERÍA CYBERPUNK (Juego Pausado)", canvas.width / 2, canvas.height * 0.18);
        ctx.fillStyle = "#ffffff"; ctx.font = "22px Arial";
        ctx.fillText(`Tu Puntuación: ${score} pts (Se usa como crédito de compra)`, canvas.width / 2, canvas.height * 0.25);

        ctx.font = "20px Arial"; ctx.fillStyle = "#fff";
        ctx.fillText(`[Presiona 1] ${weaponsCatalog.pistola.name} - EQUIPADO`, canvas.width / 2, canvas.height * 0.38);

        ctx.fillStyle = weaponsCatalog.mp5.purchased ? "#00ff66" : (score >= weaponsCatalog.mp5.cost ? "#fff" : "#ff3333");
        ctx.fillText(`[Presiona 2] ${weaponsCatalog.mp5.purchased ? "Equipar" : "Comprar"} Subfusil MP5 - Costo: ${weaponsCatalog.mp5.cost} pts`, canvas.width / 2, canvas.height * 0.46);

        ctx.fillStyle = weaponsCatalog.duales.purchased ? "#00ff66" : (score >= weaponsCatalog.duales.cost ? "#fff" : "#ff3333");
        ctx.fillText(`[Presiona 3] ${weaponsCatalog.duales.purchased ? "Equipar" : "Comprar"} Pistolas Duales - Costo: ${weaponsCatalog.duales.cost} pts`, canvas.width / 2, canvas.height * 0.54);

        ctx.fillStyle = weaponsCatalog.rifle.purchased ? "#00ff66" : (score >= weaponsCatalog.rifle.cost ? "#fff" : "#ff3333");
        ctx.fillText(`[Presiona 4] ${weaponsCatalog.rifle.purchased ? "Equipar" : "Comprar"} Rifle Pesado - Costo: ${weaponsCatalog.rifle.cost} pts`, canvas.width / 2, canvas.height * 0.62);

        ctx.fillStyle = weaponsCatalog.galil.purchased ? "#00ff66" : (score >= weaponsCatalog.galil.cost ? "#fff" : "#ff3333");
        ctx.fillText(`[Presiona 5] ${weaponsCatalog.galil.purchased ? "Equipar" : "Comprar"} Rifle Galil AR - Costo: ${weaponsCatalog.galil.cost} pts`, canvas.width / 2, canvas.height * 0.70);
        
        ctx.fillStyle = "#aaa"; ctx.font = "18px Arial"; ctx.fillText("Presiona 'T' para cerrar el menú y volver al juego", canvas.width / 2, canvas.height * 0.82);
        ctx.textAlign = "left";
    }

    // Menú de desarrollador y trucos (Pausado con 'M')
    if (showCheats) {
        ctx.fillStyle = "rgba(25, 10, 10, 0.96)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff3333"; ctx.font = "bold 40px Arial"; ctx.textAlign = "center";
        ctx.fillText("MENÚ DE TRUCOS / CHEATS (Juego Pausado)", canvas.width / 2, canvas.height * 0.2);
        ctx.fillStyle = "#ffffff"; ctx.font = "24px Arial"; ctx.fillText(`Puntuación Actual: ${score} pts`, canvas.width / 2, canvas.height * 0.28);
        ctx.font = "22px Arial"; ctx.fillStyle = "#ffaa00";
        ctx.fillText("[Presiona 1] Añadir +10,000 Puntos Instantáneos", canvas.width / 2, canvas.height * 0.42);
        ctx.fillStyle = "#00ffff";
        ctx.fillText("[Presiona 2] Invocar Ciberjefe Ciclo Instantáneo", canvas.width / 2, canvas.height * 0.52);
        ctx.fillStyle = "#aaaaaa"; ctx.font = "18px Arial"; ctx.fillText("Presiona 'M' para cerrar el menú de trucos y continuar", canvas.width / 2, canvas.height * 0.75);
        ctx.textAlign = "left";
    }
}

let lastTime = 0;
function gameLoop(timestamp) {
    let dt = timestamp - lastTime;
    if (!dt || dt > 100) dt = 16.66;
    lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

// Inicialización automática del loop de renderizado
requestAnimationFrame(gameLoop);
