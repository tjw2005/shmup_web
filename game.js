/**
 * Gradius Clone - Web Implementation
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const SCREEN_WIDTH = canvas.width;
const SCREEN_HEIGHT = canvas.height;

// Game State
const GAME_STATE = {
    MENU: 0,
    PLAYING: 1,
    GAME_OVER: 2,
    DYING: 3,
    STAGE_COMPLETE: 4
};

let currentState = GAME_STATE.MENU;
let frameCount = 0;
let score = 0;
let distance = 0;
let stage = 1;
const BOSS_APPEAR_DISTANCE = 2000;
let bossMode = false;
// No duplicate deathTimer here
let deathTimer = 0;

// Input Handling
const keys = {};
// Gamepad state for debouncing
let lastButtonState = {};
let gamepadConnected = false;

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (currentState === GAME_STATE.PLAYING) {
        if (e.code === 'KeyZ') player.shoot();
        if (e.code === 'KeyX') player.activatePowerup();
    }
});


window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

window.addEventListener("gamepadconnected", (e) => {
    console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
        e.gamepad.index, e.gamepad.id,
        e.gamepad.buttons.length, e.gamepad.axes.length);
    gamepadConnected = true;
    updateGamepadUI();
});

window.addEventListener("gamepaddisconnected", (e) => {
    console.log("Gamepad disconnected from index %d: %s",
        e.gamepad.index, e.gamepad.id);
    gamepadConnected = false;
    updateGamepadUI();
});

function updateGamepadUI() {
    const el = document.getElementById('gamepad-controls');
    if (gamepadConnected) {
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}


// Sound Manager using Web Audio API
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

const SoundManager = {
    playShoot: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    },
    playExplosion: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const bufferSize = audioCtx.sampleRate * 0.5; // 0.5 sec
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        noise.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start();
    },
    playPowerupCollect: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1800, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    },
    playPowerupActivate: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    },
    playPlayerExplode: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const bufferSize = audioCtx.sampleRate * 2.0; // 2 sec
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);

        // Lowpass filter for "deep" explosion
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start();
        noise.start();
    },
    playPlayerDamage: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.2);
        osc.type = 'sawtooth';

        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    },

    // Simple Music Sequencer
    BPM: 140,
    currentTrack: null,
    nextNoteTime: 0,
    noteIndex: 0,
    musicTimer: null,
    isPlaying: false,

    musicTracks: {
        menu: {
            notes: [220, 0, 261, 0, 329, 0, 392, 0], // Am7 arpeggio
            interval: 0.25
        },
        game: {
            notes: [110, 110, 220, 110, 130, 130, 260, 130], // Driving bass
            interval: 0.15
        },
        gameover: {
            notes: [100, 95, 90, 85, 80, 75, 70, 65], // Descending
            interval: 0.3
        },
        victory: {
            notes: [523, 0, 523, 0, 523, 659, 783, 1046], // C Major Fanfare
            interval: 0.15
        }
    },

    playMusic: function (trackName) {
        if (this.currentTrack === trackName && this.isPlaying) return;
        this.stopMusic();

        if (audioCtx.state === 'suspended') audioCtx.resume();

        this.currentTrack = trackName;
        this.isPlaying = true;
        this.noteIndex = 0;
        this.nextNoteTime = audioCtx.currentTime;
        this.scheduler();
    },

    stopMusic: function () {
        this.isPlaying = false;
        if (this.musicTimer) clearTimeout(this.musicTimer);
        this.currentTrack = null;
    },

    scheduler: function () {
        if (!this.isPlaying) return;
        while (this.nextNoteTime < audioCtx.currentTime + 0.1) {
            this.playNote(this.musicTracks[this.currentTrack]);
            this.scheduleNextNote(this.musicTracks[this.currentTrack]);
        }
        this.musicTimer = setTimeout(() => this.scheduler(), 25);
    },

    scheduleNextNote: function (track) {
        this.nextNoteTime += track.interval;
        this.noteIndex = (this.noteIndex + 1) % track.notes.length;
    },

    playNote: function (track) {
        const freq = track.notes[this.noteIndex];
        if (freq === 0) return; // Rest

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = freq;
        osc.type = 'square';

        gain.gain.setValueAtTime(0.05, this.nextNoteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.nextNoteTime + track.interval - 0.05);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(this.nextNoteTime);
        osc.stop(this.nextNoteTime + track.interval);
    }
};

window.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
});

// UI Elements
const splashScreen = document.getElementById('splash-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');

const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const initialStageBtn = document.getElementById('next-stage-btn'); // For stage complete
const stageCompleteScreen = document.getElementById('stage-complete-screen');

initialStageBtn.addEventListener('click', () => {
    startNextStage();
});

startBtn.addEventListener('click', () => {
    startGame();
});

// Start menu music initially? Maybe user interaction first.
// Let's start menu music if we are in menu
if (currentState === GAME_STATE.MENU) {
    // Browser might block auto-play, so we rely on first click
}

restartBtn.addEventListener('click', () => {
    goToMenu();
});

function startGame() {
    splashScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    resetGame();
    currentState = GAME_STATE.PLAYING;
    SoundManager.playMusic('game');
}

function goToMenu() {
    gameOverScreen.classList.add('hidden');
    splashScreen.classList.remove('hidden');
    currentState = GAME_STATE.MENU;
    SoundManager.playMusic('menu');
}

function resetGame() {
    score = 0;
    distance = 0;
    stage = 1;
    bossMode = false;
    frameCount = 0;
    // Reset Player
    player.x = 50;
    player.y = SCREEN_HEIGHT / 2;
    player.powerMeter = -1;
    player.hasSpeedUp = 0;
    player.speed = 4;
    player.hasMissile = false;
    player.hasDouble = false;
    player.hasLaser = false;
    player.hasShield = false;
    player.invincible = false;
    player.active = true; // Ensure player is active
    player.hp = 5;
    player.invincibleTimer = 0;

    // Clear Collections
    bullets.length = 0;
    powerups.length = 0;
    enemies.length = 0;

    // Reset UI
    updatePowerupUI();
}


// Entities
class Player {
    constructor() {
        this.x = 50;
        this.y = SCREEN_HEIGHT / 2;
        this.width = 30;
        this.height = 15;
        this.speed = 4;
        this.color = '#0ff';

        // Powerup State
        this.powerMeter = -1; // -1 = nothing, 0..5 = index
        this.hasSpeedUp = 0;
        this.hasMissile = false;
        this.hasDouble = false;
        this.hasLaser = false;
        this.options = [];
        this.options = [];
        this.hasShield = false;
        this.hasShield = false;
        this.invincible = false;

        // HP System
        this.hp = 5;
        this.maxHp = 5;
        this.invincibleTimer = 0;
    }

    update() {
        if (this.invincibleTimer > 0) this.invincibleTimer--;

        // Keyboard Input
        if (keys['ArrowUp']) this.y -= this.speed;
        if (keys['ArrowDown']) this.y += this.speed;
        if (keys['ArrowLeft']) this.x -= this.speed;
        if (keys['ArrowRight']) this.x += this.speed;

        // Gamepad Input
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of gamepads) {
            if (!gp) continue;

            // Movement (Axes 0/1 or D-Pad)
            if (gp.axes[1] < -0.5) this.y -= this.speed; // Up
            if (gp.axes[1] > 0.5) this.y += this.speed;  // Down
            if (gp.axes[0] < -0.5) this.x -= this.speed; // Left
            if (gp.axes[0] > 0.5) this.x += this.speed;  // Right

            // D-Pad (Standard mapping often on buttons 12,13,14,15 or axes 6/7 depending on OS/Controller)
            if (gp.buttons[12]?.pressed) this.y -= this.speed;
            if (gp.buttons[13]?.pressed) this.y += this.speed;
            if (gp.buttons[14]?.pressed) this.x -= this.speed;
            if (gp.buttons[15]?.pressed) this.x += this.speed;

            // Shoot (Button 0 - A/Cross)
            if (gp.buttons[0]?.pressed) {
                // Simple debounce or just rapid fire? 
                // Let's allow rapid fire 'hold' for gamepads usually, or needs explicit press?
                // Gradius usually allows hold or rapid tapping. Let's make it hold-friendly but rate-limited?
                // Current shoot implementation just spawns a bullet. If called every frame, it's a beam.
                // Let's add a cooldown to shoot() if not present, or rely on keydown event style (one shot per press).

                // For now, let's treat it like "if not pressed last frame".
                if (!lastButtonState['btn0_' + gp.index]) {
                    this.shoot();
                    lastButtonState['btn0_' + gp.index] = true;
                }
            } else {
                lastButtonState['btn0_' + gp.index] = false;
            }

            // Powerup (Button 1, 2, or 3 - B/X/Y or Circle/Square/Triangle)
            const powerBtnPressed = gp.buttons[1]?.pressed || gp.buttons[2]?.pressed || gp.buttons[3]?.pressed;
            if (powerBtnPressed) {
                if (!lastButtonState['btnP_' + gp.index]) {
                    this.activatePowerup();
                    lastButtonState['btnP_' + gp.index] = true;
                }
            } else {
                lastButtonState['btnP_' + gp.index] = false;
            }

            // Start Button (Button 9 usually)
            if (gp.buttons[9]?.pressed) {
                if (!lastButtonState['btnStart_' + gp.index]) {
                    if (currentState === GAME_STATE.MENU) {
                        startGame();
                    } else if (currentState === GAME_STATE.GAME_OVER) {
                        goToMenu();
                    }
                    lastButtonState['btnStart_' + gp.index] = true;
                }
            } else {
                lastButtonState['btnStart_' + gp.index] = false;
            }
        }

        // Bounds
        this.x = Math.max(0, Math.min(SCREEN_WIDTH - this.width, this.x));
        this.y = Math.max(0, Math.min(SCREEN_HEIGHT - this.height, this.y));
    }


    draw() {
        // Blink if temporarily invincible (i-frames), but steady if perm-invincible (boss win)
        if (this.invincibleTimer > 0 && Math.floor(frameCount / 4) % 2 === 0) return;

        ctx.fillStyle = this.color;

        // Main Ship Body
        ctx.beginPath();
        ctx.moveTo(this.x + this.width, this.y + this.height / 2);
        ctx.lineTo(this.x, this.y);
        ctx.lineTo(this.x + 5, this.y + this.height / 2);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();

        // Engine flame
        if (frameCount % 6 < 3) {
            ctx.fillStyle = '#f00';
            ctx.fillRect(this.x - 5, this.y + 4, 5, 6);
        }

        // Draw HP Bar
        const barWidth = 30;
        const hpPercent = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = '#500';
        ctx.fillRect(this.x, this.y - 8, barWidth, 4);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x, this.y - 8, barWidth * hpPercent, 4);
    }


    shoot() {
        SoundManager.playShoot();
        // Normal Shot / Laser
        if (this.hasLaser) {
            const b = new Bullet(this.x + this.width, this.y + this.height / 2);
            b.type = 'laser';
            b.vx = 15;
            b.width = 40;
            b.color = '#0ff';
            bullets.push(b);
        } else {
            bullets.push(new Bullet(this.x + this.width, this.y + this.height / 2));
        }

        // Double
        if (this.hasDouble) {
            const b = new Bullet(this.x + this.width, this.y + this.height / 2);
            b.vy = -5; // Upward angle
            b.type = 'double';
            bullets.push(b);
        }

        // Missile
        if (this.hasMissile) {
            // Limit active missiles
            const existingMissiles = bullets.filter(b => b.type === 'missile').length;
            if (existingMissiles < 2) {
                const m = new Bullet(this.x + this.width / 2, this.y + this.height);
                m.type = 'missile';
                m.vx = 3;
                m.vy = 3;
                m.width = 12;
                m.height = 8;
                m.color = '#fa0';
                bullets.push(m);
            }
        }
    }

    activatePowerup() {
        if (this.powerMeter >= 0) {
            SoundManager.playPowerupActivate();
            this._applyUpgrade(this.powerMeter);
            this.powerMeter = -1;
            updatePowerupUI();
        }
    }

    _applyUpgrade(index) {
        // 0: Speed, 1: Missile, 2: Double, 3: Laser, 4: Option, 5: Shield
        switch (index) {
            case 0: // Speed Up
                if (this.hasSpeedUp < 5) {
                    this.speed += 1;
                    this.hasSpeedUp++;
                }
                break;
            case 1: // Missile
                this.hasMissile = true;
                break;
            case 2: // Double
                this.hasDouble = true;
                break;
            case 3: // Laser
                this.hasLaser = true;
                break;
            case 4: // Option (Clone)
                // TODO: Implement Options
                break;
            case 5: // Shield
                this.hasShield = true;
                this.shieldHP = 3;
                break;
        }
    }
}

class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 10;
        this.vy = 0;
        this.width = 8;
        this.height = 4;
        this.color = '#ff0';
        this.active = true;
        this.type = 'normal';
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Simple functional floor collision for missiles
        if (this.type === 'missile') {
            if (this.y > SCREEN_HEIGHT - 20) { // Floor
                this.y = SCREEN_HEIGHT - 20;
                this.vy = 0;
                this.vx = 5; // Move along ground
            }
        }

        if (this.x > SCREEN_WIDTH || this.y < 0 || this.y > SCREEN_HEIGHT) this.active = false;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

const player = new Player();
const bullets = [];

// UI Update
function updatePowerupUI() {
    const slots = ['p-speed', 'p-missile', 'p-double', 'p-laser', 'p-option', 'p-shield'];
    slots.forEach((id, index) => {
        const el = document.getElementById(id);
        if (index === player.powerMeter) {
            el.classList.add('highlight');
        } else {
            el.classList.remove('highlight');
        }

        // Check active states (visual mostly)
        // TODO: Persist 'active' class for permanent upgrades like missile/laser
    });
}


const powerups = [];

class PowerCapsule {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 12;
        this.color = '#d44'; // Reddish
        this.active = true;
    }

    update() {
        this.x -= 2; // Move left with the "scroll"
        if (this.x < -20) this.active = false;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(this.x + 10, this.y + 6, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#faa'; // Highlight
        ctx.beginPath();
        ctx.ellipse(this.x + 10, this.y + 4, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

const enemies = [];

class Enemy {
    constructor(x, y, type = 'fanship') {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.type = type;
        this.active = true;
        this.vx = -3;
        this.vy = Math.sin(x * 0.01) * 2; // Wavy movement
        this.color = '#f0f';
    }

    update() {
        this.x += this.vx;
        // Simple wave pattern
        this.y += Math.cos(frameCount * 0.05) * 2;

        if (this.x < -50) this.active = false;
    }

    draw() {
        ctx.fillStyle = this.color;
        // Draw a simple ship shape
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + 8, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();
    }
}

class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 80;
        this.active = true;
        this.color = '#f00';
        this.hp = 50;
        this.maxHp = 50;
        this.vy = 2;
        this.phase = 0; // 0=entry, 1=fighting
        this.entryTargetX = SCREEN_WIDTH - 150;
        this.dying = false;
        this.deathTimer = 0;
    }

    update() {
        if (this.dying) {
            this.deathTimer--;
            if (this.deathTimer % 10 === 0) SoundManager.playExplosion();

            // Random explosion particles visual only? 
            // We'll handle visual flash in draw().

            if (this.deathTimer <= 0) {
                this.active = false;
                // Stage Progression: Show Screen
                bossMode = false;
                stageComplete();
            }
            return;
        }

        if (this.phase === 0) {
            // Entry phase: move to position
            if (this.x > this.entryTargetX) {
                this.x -= 2;
            } else {
                this.phase = 1;
            }
        } else {
            // Fight phase
            this.y += this.vy;
            if (this.y < 50 || this.y > SCREEN_HEIGHT - 50 - this.height) {
                this.vy *= -1;
            }
        }
    }

    draw() {
        if (this.dying) {
            // Flash effect
            if (Math.floor(this.deathTimer / 5) % 2 === 0) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                return;
            }
        }

        ctx.fillStyle = this.color;
        // Core
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // "Eye" (Weakpoint)
        ctx.fillStyle = '#0ff';
        ctx.fillRect(this.x + 10, this.y + 30, 20, 20);

        // HP Bar
        const hpPercent = this.hp / this.maxHp;
        ctx.fillStyle = '#500';
        ctx.fillRect(this.x, this.y - 10, this.width, 5);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x, this.y - 10, this.width * hpPercent, 5);
    }
}

// Check AABB Collision
function checkCollision(rect1, rect2) {
    return (rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y);
}

const stars = [];
for (let i = 0; i < 50; i++) {
    stars.push({
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT,
        speed: Math.random() * 2 + 0.5,
        size: Math.random() * 1.5
    });
}

function updateDrawStars() {
    ctx.fillStyle = '#fff';
    stars.forEach(s => {
        s.x -= s.speed;
        if (s.x < 0) {
            s.x = SCREEN_WIDTH;
            s.y = Math.random() * SCREEN_HEIGHT;
        }
        ctx.fillRect(s.x, s.y, s.size, s.size);
    });
}

class Terrain {
    constructor() {
        this.segments = [];
        this.segmentWidth = 40;
        // Fill initial screen
        for (let x = 0; x < SCREEN_WIDTH + this.segmentWidth; x += this.segmentWidth) {
            this.addSegment(x);
        }
    }

    addSegment(x) {
        let biome = 'cave';
        let color = '#654';

        // Determine Biome based on Stage
        // cycling: 1=Cave, 2=Tech, 3=Alien, 4=Cave...
        const cycle = (stage - 1) % 3;

        // Logic Vars
        let floorH, ceilH;

        if (cycle === 0) {
            // CAHVERN
            biome = 'cave';
            color = '#654';
            floorH = 50 + Math.random() * 150;
            ceilH = 50 + Math.random() * 50;
        } else if (cycle === 1) {
            // TECH BASE
            biome = 'tech';
            color = '#567'; // Blue-grey steel
            // More blocky/stepped. 
            // We can look at the previous segment to hold height for a "platform"
            const prev = this.segments.length > 0 ? this.segments[this.segments.length - 1] : null;

            // 20% chance to change height, otherwise keep same flat height
            if (prev && prev.biome === 'tech' && Math.random() > 0.3) {
                floorH = prev.h;
                ceilH = prev.ch;
            } else {
                // Change height to a discrete step
                floorH = 50 + Math.floor(Math.random() * 4) * 40; // Steps of 40
                ceilH = 40 + Math.floor(Math.random() * 3) * 30;
            }

        } else {
            // ALIEN HIVE
            biome = 'alien';
            color = '#4a3'; // Greenish organic
            // Wavy / Erratic
            const time = x * 0.01;
            floorH = 100 + Math.sin(time) * 80 + Math.random() * 40;
            ceilH = 80 + Math.cos(time) * 60 + Math.random() * 20;
        }

        this.segments.push({
            x: x,
            width: this.segmentWidth,
            floorY: SCREEN_HEIGHT - floorH, // Y position of floor top
            ceilY: ceilH,                   // Y position of ceiling bottom
            h: floorH,
            ch: ceilH,
            color: color,
            biome: biome
        });
    }

    update() {
        this.segments.forEach(s => s.x -= 2);

        // Remove offscreen
        if (this.segments[0].x + this.segments[0].width < 0) {
            this.segments.shift();
            // Add new
            const lastX = this.segments[this.segments.length - 1].x;
            this.addSegment(lastX + this.segmentWidth);
        }
    }

    draw() {
        this.segments.forEach(s => {
            ctx.fillStyle = s.color;
            // Ceiling
            ctx.fillRect(s.x, 0, s.width + 1, s.ceilY);
            // Floor
            ctx.fillRect(s.x, s.floorY, s.width + 1, s.h);

            // Detail for Tech (Greebles)
            if (s.biome === 'tech') {
                ctx.fillStyle = '#345';
                ctx.fillRect(s.x + 5, 5, s.width - 10, s.ceilY - 10); // Simple inset
                ctx.fillRect(s.x + 5, s.floorY + 5, s.width - 10, s.h - 10);
            }
        });
    }

    checkCollision(rect) {
        // Iterate segments that overlap rect
        for (let s of this.segments) {
            if (s.x < rect.x + rect.width && s.x + s.width > rect.x) {
                // Check ceiling
                if (rect.y < s.ceilY) return true;
                // Check floor
                if (rect.y + rect.height > s.floorY) return true;
            }
        }
        return false;
    }
}

const terrain = new Terrain();

// Game Loop
function gameLoop() {
    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Always draw background effects for visual polish?
    // Or just pause everything. Let's pause everything to match request "game should not run".
    if (currentState === GAME_STATE.PLAYING) {
        // Background
        updateDrawStars();

        // Logic: Stage Progression
        if (!bossMode) {
            distance += 2; // Mimic scroll speed
            terrain.update();

            if (distance >= BOSS_APPEAR_DISTANCE) {
                bossMode = true;
                // Spawn Boss
                enemies.push(new Boss(SCREEN_WIDTH + 50, SCREEN_HEIGHT / 2 - 40));
                // Optional: Play Boss Music
            }
        } else {
            // Boss Mode: Terrain stops or loops? For now stops.
        }

        terrain.draw();

        // Spawners
        if (!bossMode) {
            if (frameCount % 600 === 0) {
                powerups.push(new PowerCapsule(SCREEN_WIDTH, Math.random() * (SCREEN_HEIGHT - 200) + 100));
            }
            if (frameCount % 60 === 0) {
                enemies.push(new Enemy(SCREEN_WIDTH, Math.random() * (SCREEN_HEIGHT - 200) + 100));
            }
        }

        // Updates
        player.update();
        bullets.forEach(b => b.update());
        powerups.forEach(p => p.update());
        enemies.forEach(e => e.update());

        // Collisions
        checkAllCollisions();

        // Draw Game Entities
        player.draw();
        bullets.forEach(b => b.draw());
        powerups.forEach(p => p.draw());
        enemies.forEach(e => e.draw());

        // UI Updates
        // UI Updates
        document.getElementById('score').innerText =
            'SCORE: ' + score.toString().padStart(6, '0') +
            ' | STAGE: ' + stage +
            ' | DIST: ' + Math.floor(distance);

        frameCount++;
    } else if (currentState === GAME_STATE.DYING) {
        // Keep drawing background/enemies but no updates
        terrain.draw();
        bullets.forEach(b => b.draw());
        powerups.forEach(p => p.draw());
        enemies.forEach(e => e.draw());

        // Draw Explosion (Procedural)
        // deathTimer starts at 60 and goes down to 0.
        // We can use (60 - deathTimer) as the progress time.
        const progress = 60 - deathTimer;

        ctx.fillStyle = `rgba(255, ${Math.floor(255 - progress * 4)}, 0, ${1 - progress / 60})`;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, progress * 2, 0, Math.PI * 2);
        ctx.fill();

        // Inner white core
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - progress / 40})`;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, progress, 0, Math.PI * 2);
        ctx.fill();

        deathTimer--;
        if (deathTimer <= 0) {
            triggerGameOver();
        }
    } else {
        // In MENU or GAME_OVER
        if (currentState === GAME_STATE.GAME_OVER) {
            terrain.draw();
            bullets.forEach(b => b.draw());
            powerups.forEach(p => p.draw());
            enemies.forEach(e => e.draw());
        }
    }

    // Cleanup (only when playing to avoid splicing while frozen)
    if (currentState === GAME_STATE.PLAYING) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (!bullets[i].active) bullets.splice(i, 1);
        }
        for (let i = powerups.length - 1; i >= 0; i--) {
            if (!powerups[i].active) powerups.splice(i, 1);
        }
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (!enemies[i].active) enemies.splice(i, 1);
        }
    }

    requestAnimationFrame(gameLoop);
}

function startPlayerDeath() {
    currentState = GAME_STATE.DYING;
    deathTimer = 60; // 1 second
    SoundManager.playPlayerExplode();
}

function takePlayerDamage() {
    if (player.invincible || player.invincibleTimer > 0) return;

    if (player.hasShield && player.shieldHP > 0) {
        player.shieldHP--;
        if (player.shieldHP <= 0) player.hasShield = false;
        SoundManager.playPlayerDamage(); // Shield hit sound
        player.invincibleTimer = 60; // I-frames for shield hit too?
        return;
    }

    player.hp--;
    SoundManager.playPlayerDamage();
    player.invincibleTimer = 90; // 1.5s Invulnerability

    if (player.hp <= 0) {
        startPlayerDeath();
    }
}

// Check All Collisions
function checkAllCollisions() {
    // Terrain vs Player
    if (terrain.checkCollision(player)) {
        takePlayerDamage();
    }

    // Bullets vs Enemies & Terrain
    bullets.forEach(b => {
        if (!b.active) return;

        // Bullet vs Terrain
        if (terrain.checkCollision(b)) {
            b.active = false;
            return;
        }

        // Bullet vs Enemies
        enemies.forEach(e => {
            if (!e.active || !b.active) return; // check b.active again just in case
            if (checkCollision(b, e)) {

                if (e instanceof Boss) {
                    b.active = false;
                    e.hp--;
                    SoundManager.playExplosion(); // Small hit sound
                    if (e.hp <= 0 && !e.dying) {
                        e.dying = true;
                        e.deathTimer = 120; // 2 seconds
                        score += 5000;
                        SoundManager.playExplosion();
                        player.invincible = true;
                    }
                } else {
                    // Normal enemy
                    if (b.type !== 'laser') b.active = false; // Laser cuts through?
                    e.active = false;
                    score += 100;
                    SoundManager.playExplosion();

                    if (Math.random() < 0.15) {
                        powerups.push(new PowerCapsule(e.x, e.y));
                    }
                }
            }
        });
    });

    // Player vs Powerups
    powerups.forEach(p => {
        if (p.active && checkCollision(player, p)) {
            p.active = false;
            SoundManager.playPowerupCollect();
            // Advance Power Meter
            player.powerMeter = (player.powerMeter + 1) % 6;
            updatePowerupUI();
            score += 100;
        }
    });

    // Player vs Enemies
    enemies.forEach(e => {
        if (e.active && checkCollision(player, e)) {
            // Boss collision shouldn't kill boss, but kills player
            if (!(e instanceof Boss)) e.active = false;

            takePlayerDamage();
        }
    });
}


// Update game over transitions
function triggerGameOver() {
    console.log('GAME OVER');
    currentState = GAME_STATE.GAME_OVER;
    finalScoreEl.innerText = 'SCORE: ' + score;
    gameOverScreen.classList.remove('hidden');
    SoundManager.playMusic('gameover');
}

// Stage Complete
function stageComplete() {
    currentState = GAME_STATE.STAGE_COMPLETE;
    stageCompleteScreen.classList.remove('hidden');
    SoundManager.playMusic('victory');
}

function startNextStage() {
    stage++;
    distance = 0;
    enemies.length = 0; // Clear old boss/enemies
    bullets.length = 0; // Clear bullets too for safety
    player.invincible = false;
    player.hp = player.maxHp;
    stageCompleteScreen.classList.add('hidden');
    currentState = GAME_STATE.PLAYING;
    SoundManager.playMusic('game');
    // Increase difficulty?
    // enemySpawnRate -= 5;
}

// Start
gameLoop();

// Create global hook for debug/verification
window.GameValues = {
    player: player,
    bullets: bullets,
    powerups: powerups,
    enemies: enemies,
    terrain: terrain
};
