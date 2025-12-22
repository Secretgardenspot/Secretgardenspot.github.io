/**
 * Self-Care Garden - Enhanced Logic
 * Architecture: Class-based Modules controlled by a central App instance.
 */

// --- CONFIGURATION & ASSETS ---
const CONFIG = {
    levels: [0, 100, 250, 450, 700, 1000, 1500, 2500], // XP thresholds
    sounds: {
        click: "click.mp3",
        success: "success.opus",
        breathe: "https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3",
        jump: "jump.mp3",
        crash: "die.mp3",
        levelUp: "levelup.opus"
    },
    images: {
        garden: [
            "https://images.unsplash.com/photo-1592419044706-39796d40f98c?w=400&q=80", // Seed
            "https://images.unsplash.com/photo-1530968464165-7a1861cbaf9f?w=400&q=80", // Sprout
            "https://images.unsplash.com/photo-1458966480358-a0ac42de0a7a?w=400&q=80", // Plant
            "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400&q=80", // Flower
            "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&q=80"  // Lush
        ],
        gifs: {
            default: "https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif",
            calm: "https://media.tenor.com/Sk2yHw56848AAAAi/zen-zone.gif",
            happy: "https://media1.giphy.com/media/v1.Y2lkPTZjMDliOTUyaTl4azhrOWcxMzhwYzkzc3oxdXNhcXBkNXU1eTJtOWJkdG1xZDVuZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/PV7VZN4pix1EE2IAqo/giphy.gif",
            anxious: "https://gifdb.com/images/high/panic-scared-sweating-animated-pudgy-penguin-li939gqpyp7dkbah.webp",
            tired: "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUyZm5kYnB1YWdpNGxydGpmMncyM2RiNDJoYTd6Yjl4NDd6eGJ1c2V2NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3p3XgWgPbDbMqGpHpi/giphy.gif",
            sad: "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUybjJxOTJ2dzNzdm4xZ2NycGdwenh4bmFhbnd3NDh5dXNvYW5iem5lYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/4zUmRD2x9vl06ltMXd/giphy.gif"
        }
    }
};

// --- UTILS ---
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const getToday = () => new Date().toISOString().split('T')[0];

// --- 1. AUDIO MANAGER ---
class AudioManager {
    constructor() {
        this.muted = localStorage.getItem("scg-muted") === "true";
        this.sounds = {};
        // Preload sounds
        Object.keys(CONFIG.sounds).forEach(key => {
            this.sounds[key] = new Audio(CONFIG.sounds[key]);
            this.sounds[key].volume = 0.4;
        });
        this.updateUI();
    }

    play(key) {
        if (this.muted || !this.sounds[key]) return;
        // Clone node to allow overlapping sounds (rapid clicks)
        const sound = this.sounds[key].cloneNode();
        sound.volume = 0.3;
        sound.play().catch(e => console.warn("Audio play blocked:", e));
    }

    toggle() {
        this.muted = !this.muted;
        localStorage.setItem("scg-muted", this.muted);
        this.updateUI();
        return this.muted;
    }

    updateUI() {
        const btn = $("#muteToggle");
        if (btn) btn.innerHTML = this.muted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
    }
}

// --- 2. STATE MANAGER ---
class StateManager {
    constructor(app) {
        this.app = app;
        this.data = this.loadData();
        this.checkDailyReset();
    }

    get defaults() {
        return {
            name: "Friend",
            xp: 0,
            level: 1,
            streak: 0,
            lastVisit: null,
            stats: { breath: 0, journal: 0, quests: 0, gameHigh: 0 },
            daily: {
                date: getToday(),
                tasks: [
                    { id: 'breathe', label: "Take 3 deep breaths", done: false, xp: 10 },
                    { id: 'journal', label: "Write one thought", done: false, xp: 15 },
                    { id: 'water', label: "Drink water", done: false, xp: 5 }
                ]
            },
            weekly: {
                id: this.getWeekId(),
                count: 0, // Progress on weekly challenge
                target: 5
            },
            achievements: []
        };
    }

    loadData() {
        const stored = localStorage.getItem("scg-state-v2");
        return stored ? { ...this.defaults, ...JSON.parse(stored) } : this.defaults;
    }

    save() {
        localStorage.setItem("scg-state-v2", JSON.stringify(this.data));
        this.app.ui.render();
    }

    checkDailyReset() {
        const today = getToday();
        if (this.data.lastVisit !== today) {
            // It's a new day
            if (this.data.daily.date !== today) {
                // Reset tasks
                this.data.daily.date = today;
                this.data.daily.tasks.forEach(t => t.done = false);
            }
            
            // Streak Logic
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            if (this.data.lastVisit === yesterdayStr) {
                this.data.streak++;
            } else {
                this.data.streak = 1; // Reset streak if missed a day
            }
            
            this.data.lastVisit = today;
            this.save();
        }
    }

    getWeekId() {
        const d = new Date();
        const onejan = new Date(d.getFullYear(), 0, 1);
        const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
        return `${d.getFullYear()}-W${week}`;
    }

    addXP(amount) {
        this.data.xp += amount;
        
        // Level Up Logic
        const nextLevelXP = CONFIG.levels[this.data.level] || 9999;
        if (this.data.xp >= nextLevelXP) {
            this.data.level++;
            this.app.audio.play("levelUp");
            this.app.ui.toast(`Level Up! Welcome to Level ${this.data.level} 🌟`);
        }
        
        this.save();
        this.app.achievements.check();
    }
}

// --- 3. UI MANAGER ---
class UIManager {
    constructor(app) {
        this.app = app;
        this.elements = {
            streak: $("#streakDays"),
            level: $("#level"),
            xpBar: $("#xpBar"),
            xpLabel: $("#xpLabel"),
            gardenImg: $("#gardenImage"),
            taskList: $("#dailyTaskList"),
            weeklyBar: $("#weeklyBar"),
            weeklyCount: $("#weeklyCount"),
            greeting: $("#greetingTitle"),
            date: $("#dateDisplay"),
            avatar: $("#headerProfile"),
            mascot: $("#mascotGif")
        };
        
        this.initTheme();
        this.renderDate();
    }

    render() {
        const s = this.app.state.data;
        
        // Stats
        this.elements.streak.textContent = s.streak;
        this.elements.level.textContent = s.level;
        this.elements.greeting.textContent = `Welcome back, ${s.name}`;
        
        // XP & Garden
        const currentLevelBase = CONFIG.levels[s.level - 1] || 0;
        const nextLevelTarget = CONFIG.levels[s.level] || (s.xp + 100);
        const progress = Math.min(100, ((s.xp - currentLevelBase) / (nextLevelTarget - currentLevelBase)) * 100);
        
        this.elements.xpBar.style.width = `${progress}%`;
        this.elements.xpLabel.textContent = `${s.xp} / ${nextLevelTarget} XP`;
        
        // Garden Image (Level 1-5 capped)
        const imgIndex = Math.min(s.level - 1, CONFIG.images.garden.length - 1);
        this.elements.gardenImg.src = CONFIG.images.garden[imgIndex];

        // Tasks
        this.renderTasks(s.daily.tasks);

        // Weekly
        const weeklyPct = (s.weekly.count / s.weekly.target) * 100;
        this.elements.weeklyBar.style.width = `${Math.min(100, weeklyPct)}%`;
        this.elements.weeklyCount.textContent = `${s.weekly.count}/${s.weekly.target}`;
        
        // Avatar
        this.elements.avatar.innerHTML = `<img src="https://ui-avatars.com/api/?name=${s.name}&background=10b981&color=fff" alt="User">`;
    }

    renderTasks(tasks) {
        this.elements.taskList.innerHTML = "";
        tasks.forEach((task, index) => {
            const li = document.createElement("li");
            li.className = `task-item ${task.done ? "completed" : ""}`;
            li.innerHTML = `
                <div class="task-checkbox">${task.done ? '<i class="fa-solid fa-check"></i>' : ''}</div>
                <span>${task.label}</span>
                <span style="margin-left:auto; font-size:0.8em; color:var(--text-light);">+${task.xp}XP</span>
            `;
            li.onclick = () => {
                if (!task.done) {
                    this.app.state.data.daily.tasks[index].done = true;
                    this.app.state.addXP(task.xp);
                    this.app.audio.play("click");
                    this.app.ui.toast("Ritual complete!");
                    this.render(); // Re-render to show checkmark
                }
            };
            this.elements.taskList.appendChild(li);
        });
    }

    renderDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        this.elements.date.textContent = new Date().toLocaleDateString(undefined, options);
    }

    initTheme() {
        const savedTheme = localStorage.getItem("scg-theme") || "light";
        document.documentElement.setAttribute("data-theme", savedTheme);
        
        $("#modeToggle").onclick = () => {
            const current = document.documentElement.getAttribute("data-theme");
            const next = current === "light" ? "dark" : "light";
            document.documentElement.setAttribute("data-theme", next);
            localStorage.setItem("scg-theme", next);
            this.app.audio.play("click");
        };
    }

    toast(msg) {
        const t = $("#toast");
        t.textContent = msg;
        t.classList.add("show");
        setTimeout(() => t.classList.remove("show"), 3000);
    }

    updateMascot(mood) {
        const url = CONFIG.images.gifs[mood] || CONFIG.images.gifs.default;
        this.elements.mascot.src = url;
    }
}

// --- 4. MODULES ---

class BreathingModule {
    constructor(app) {
        this.app = app;
        this.active = false;
        this.circle = $("#breathingCircle");
        this.text = $("#breathingText");
        this.btn = $("#toggleBreathing");
        
        this.btn.onclick = () => this.toggle();
    }

    toggle() {
        if (this.active) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        this.active = true;
        this.btn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop';
        this.app.audio.play("breathe");
        
        const mode = $("#breathingMode").value; // e.g., "4-7-8"
        this.runCycle(mode);
    }

    stop() {
        this.active = false;
        this.btn.innerHTML = '<i class="fa-solid fa-play"></i> Start';
        this.text.textContent = "Ready";
        this.circle.className = "breathing-circle-inner";
        clearTimeout(this.timer);
        
        // Reward if stopped after at least one cycle (simplified check)
        this.app.state.data.stats.breath++;
        this.app.state.addXP(5);
        this.app.achievements.check();
    }

    runCycle(mode) {
        if (!this.active) return;

        // Base timings
        let inhale = 4000, hold = 0, exhale = 4000, hold2 = 0;

        if (mode === "4-7-8") {
            inhale = 4000; hold = 7000; exhale = 8000;
        } else if (mode === "4-4-4-4") {
            inhale = 4000; hold = 4000; exhale = 4000; hold2 = 4000;
        }

        // Inhale
        this.text.textContent = "Inhale";
        this.circle.className = "breathing-circle-inner inhale";
        
        this.timer = setTimeout(() => {
            if (!this.active) return;
            
            // Hold?
            if (hold > 0) {
                this.text.textContent = "Hold";
                this.circle.className = "breathing-circle-inner hold";
                this.timer = setTimeout(() => this.doExhale(exhale, hold2, mode), hold);
            } else {
                this.doExhale(exhale, hold2, mode);
            }
        }, inhale);
    }

    doExhale(duration, postHold, mode) {
        if (!this.active) return;
        this.text.textContent = "Exhale";
        this.circle.className = "breathing-circle-inner exhale";
        
        this.timer = setTimeout(() => {
            if (!this.active) return;
            if (postHold > 0) {
                this.text.textContent = "Wait";
                this.timer = setTimeout(() => this.runCycle(mode), postHold);
            } else {
                this.runCycle(mode);
            }
        }, duration);
    }
}

class JournalModule {
    constructor(app) {
        this.app = app;
        this.input = $("#journalInput");
        this.list = $("#journalHistoryList");
        this.aiCard = $("#aiResponseCard");
        this.aiText = $("#aiResponseText");
        
        this.prompts = [
            "What is one small win from today?",
            "What is weighing on your mind?",
            "Describe your ideal relaxing place.",
            "Who are you grateful for today?"
        ];

        this.loadHistory();

        $("#saveJournal").onclick = () => this.saveEntry();
        $("#clearJournal").onclick = () => this.input.value = "";
        $("#refreshPrompt").onclick = () => {
            $("#journalPromptText").textContent = this.prompts[Math.floor(Math.random() * this.prompts.length)];
        };
    }

    loadHistory() {
        const history = JSON.parse(localStorage.getItem("scg-journal-entries") || "[]");
        this.list.innerHTML = "";
        history.slice(0, 5).forEach(entry => {
            const li = document.createElement("li");
            li.className = "journal-entry-item";
            li.innerHTML = `<span class="journal-entry-date">${entry.date}</span> ${entry.text.substring(0, 50)}...`;
            this.list.appendChild(li);
        });
    }

    saveEntry() {
        const text = this.input.value.trim();
        if (!text) return;

        const history = JSON.parse(localStorage.getItem("scg-journal-entries") || "[]");
        history.unshift({ date: new Date().toLocaleDateString(), text: text });
        localStorage.setItem("scg-journal-entries", JSON.stringify(history));

        this.app.state.data.stats.journal++;
        this.app.state.addXP(20);
        this.app.ui.toast("Saved to your mind space.");
        this.loadHistory();
        this.input.value = "";
        
        // Simulate AI Response
        this.generateResponse(text);
    }

    generateResponse(text) {
        this.aiCard.classList.remove("hidden");
        this.aiText.textContent = "Thinking...";
        
        setTimeout(() => {
            let response = "Thank you for sharing that.";
            const lower = text.toLowerCase();
            
            if (lower.includes("sad") || lower.includes("tired")) {
                response = "It's okay to feel this way. Be gentle with yourself today.";
            } else if (lower.includes("happy") || lower.includes("excited")) {
                response = "That is wonderful! Hold onto that feeling.";
            } else if (lower.includes("worry") || lower.includes("anxious")) {
                response = "Take a deep breath. Focus on what you can control right now.";
            }
            
            this.aiText.textContent = response;
        }, 1000);
    }
}

class GameModule {
    constructor(app) {
        this.app = app;
        this.canvas = $("#runnerCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.overlay = $("#gameOverlay");
        this.btn = $("#startGameBtn");
        
        this.running = false;
        this.score = 0;
        
        // Physics
        this.player = { x: 50, y: 150, size: 20, dy: 0, jumpPower: -10, gravity: 0.6, grounded: true };
        this.obstacles = [];
        this.speed = 4;
        
        this.btn.onclick = () => this.start();
        
        const jumpAction = (e) => {
            if (this.running && this.player.grounded) {
                if (e.type === 'keydown' && e.code !== 'Space') return;
                if (e.type === 'keydown') e.preventDefault();
                this.player.dy = this.player.jumpPower;
                this.player.grounded = false;
                this.app.audio.play("jump");
            }
        };

        window.addEventListener("keydown", jumpAction);
        this.canvas.addEventListener("mousedown", jumpAction);
    }

    start() {
        this.running = true;
        this.overlay.classList.add("hidden");
        this.score = 0;
        this.obstacles = [];
        this.player.y = 150;
        this.player.dy = 0;
        $("#gameScore").textContent = "0";
        
        requestAnimationFrame(() => this.loop());
    }

    loop() {
        if (!this.running) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw Ground
        this.ctx.fillStyle = "#e2e8f0";
        this.ctx.fillRect(0, 170, this.canvas.width, 30);
        
        // Update Player
        this.player.dy += this.player.gravity;
        this.player.y += this.player.dy;
        
        if (this.player.y > 150) {
            this.player.y = 150;
            this.player.dy = 0;
            this.player.grounded = true;
        }
        
        this.ctx.fillStyle = "#8b5cf6"; // Purple Player
        this.ctx.beginPath();
        this.ctx.roundRect(this.player.x, this.player.y, this.player.size, this.player.size, 5);
        this.ctx.fill();
        
        // Obstacles Management
        if (Math.random() < 0.015) {
            this.obstacles.push({ x: this.canvas.width, w: 20, h: 30 });
        }
        
        this.ctx.fillStyle = "#64748b";
        this.obstacles.forEach((ob, index) => {
            ob.x -= this.speed;
            this.ctx.fillRect(ob.x, 170 - ob.h, ob.w, ob.h);
            
            // Collision
            if (
                this.player.x < ob.x + ob.w &&
                this.player.x + this.player.size > ob.x &&
                this.player.y < 170 &&
                this.player.y + this.player.size > 170 - ob.h
            ) {
                this.gameOver();
            }
            
            // Score
            if (ob.x + ob.w < 0) {
                this.obstacles.splice(index, 1);
                this.score++;
                $("#gameScore").textContent = this.score;
            }
        });
        
        requestAnimationFrame(() => this.loop());
    }

    gameOver() {
        this.running = false;
        this.app.audio.play("crash");
        this.overlay.classList.remove("hidden");
        this.btn.textContent = "Try Again";
        
        if (this.score > this.app.state.data.stats.gameHigh) {
            this.app.state.data.stats.gameHigh = this.score;
            $("#gameHighScore").textContent = this.score;
            this.app.ui.toast("New High Score!");
        }
        
        // XP for playing
        const xpEarned = Math.floor(this.score / 2);
        if (xpEarned > 0) this.app.state.addXP(xpEarned);
    }
}

class ZenModule {
    constructor(app) {
        this.app = app;
        this.overlay = $("#zenOverlay");
        
        $("#enterZenMode").onclick = () => {
            this.overlay.classList.remove("hidden");
            this.app.audio.play("click");
        };
        
        $("#exitZenBtn").onclick = () => {
            this.overlay.classList.add("hidden");
        };
    }
}

class AchievementModule {
    constructor(app) {
        this.app = app;
        this.list = [
            { id: "level5", icon: "🌳", title: "Dedicated Gardener", desc: "Reach Level 5", check: s => s.level >= 5 },
            { id: "streak3", icon: "🔥", title: "On Fire", desc: "3 Day Streak", check: s => s.streak >= 3 },
            { id: "writer", icon: "✍️", title: "Storyteller", desc: "5 Journal Entries", check: s => s.stats.journal >= 5 },
            { id: "gamer", icon: "🎮", title: "Pro Jumper", desc: "Score 20 in Game", check: s => s.stats.gameHigh >= 20 }
        ];
        this.container = $("#achievementsGrid");
    }

    check() {
        const s = this.app.state.data;
        let newUnlock = false;

        this.list.forEach(ach => {
            const alreadyUnlocked = s.achievements.includes(ach.id);
            if (!alreadyUnlocked && ach.check(s)) {
                s.achievements.push(ach.id);
                this.app.ui.toast(`Achievement Unlocked: ${ach.title}`);
                this.app.audio.play("success");
                newUnlock = true;
            }
        });

        if (newUnlock) {
            this.app.state.save();
            this.render();
        }
    }

    render() {
        const s = this.app.state.data;
        this.container.innerHTML = "";
        
        this.list.forEach(ach => {
            const unlocked = s.achievements.includes(ach.id);
            const div = document.createElement("div");
            div.className = `achievement-badge ${unlocked ? "unlocked" : ""}`;
            div.innerHTML = `
                <span class="achievement-icon">${ach.icon}</span>
                <span class="achievement-title">${ach.title}</span>
                <div style="font-size:0.7em">${ach.desc}</div>
            `;
            this.container.appendChild(div);
        });
    }
}

class CertificateModule {
    constructor(app) {
        this.app = app;
        $("#downloadCertBtn").onclick = () => this.generate();
    }

    generate() {
        const canvas = $("#certCanvas");
        const ctx = canvas.getContext("2d");
        const s = this.app.state.data;

        // Background
        ctx.fillStyle = "#f0fdf4";
        ctx.fillRect(0, 0, 1000, 700);
        
        // Border
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 20;
        ctx.strokeRect(20, 20, 960, 660);

        // Header
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 60px Poppins";
        ctx.textAlign = "center";
        ctx.fillText("Certificate of Self-Care", 500, 150);

        // Subheader
        ctx.font = "italic 40px Nunito";
        ctx.fillStyle = "#64748b";
        ctx.fillText(`Presented to ${s.name}`, 500, 230);

        // Stats Box
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "rgba(0,0,0,0.1)";
        ctx.shadowBlur = 20;
        ctx.fillRect(200, 300, 600, 250);
        ctx.shadowBlur = 0;

        // Stats Text
        ctx.fillStyle = "#334155";
        ctx.font = "30px Poppins";
        ctx.textAlign = "left";
        ctx.fillText(`🌱 Current Level: ${s.level}`, 250, 360);
        ctx.fillText(`🔥 Day Streak: ${s.streak}`, 250, 420);
        ctx.fillText(`✍️ Thoughts Journaled: ${s.stats.journal}`, 250, 480);
        
        // Date
        ctx.font = "20px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`Generated on ${new Date().toDateString()}`, 500, 650);

        // Download
        const link = document.createElement('a');
        link.download = 'bloom-certificate.png';
        link.href = canvas.toDataURL();
        link.click();
        this.app.ui.toast("Certificate downloaded!");
    }
}

// --- 5. MAIN APP ---
class App {
    constructor() {
        this.audio = new AudioManager();
        this.state = new StateManager(this);
        this.achievements = new AchievementModule(this); // Init logic
        this.ui = new UIManager(this); // Init logic + renders
        
        // Initialize Modules
        this.breathing = new BreathingModule(this);
        this.journal = new JournalModule(this);
        this.game = new GameModule(this);
        this.zen = new ZenModule(this);
        this.cert = new CertificateModule(this);
        
        this.initGlobalEvents();
        this.achievements.render();
        this.ui.render(); // Final initial render
    }

    initGlobalEvents() {
        // Navigation
        $$(".nav-item").forEach(btn => {
            btn.onclick = () => {
                const target = btn.dataset.section;
                $$(".nav-item").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                $$(".panel").forEach(p => p.classList.remove("active"));
                $(`#${target}`).classList.add("active");
                this.audio.play("click");
            };
        });

        // Mood Tracker
        $$(".mood-btn").forEach(btn => {
            btn.onclick = () => {
                const mood = btn.dataset.mood;
                $("#moodFeedback").textContent = "Your garden acknowledges your feelings.";
                $("#moodFeedback").classList.remove("hidden");
                this.audio.play("click");
                this.ui.updateMascot(mood);
                this.state.addXP(5);
            };
        });
        
        // Mute
        $("#muteToggle").onclick = () => this.audio.toggle();
        
        // Settings: Save Name
        $("#saveSettingsName").onclick = () => {
            const val = $("#settingsNameInput").value.trim();
            if(val) {
                this.state.data.name = val;
                this.state.save();
                this.ui.toast("Name updated!");
            }
        };

        // Settings: Reset
        $("#resetAllData").onclick = () => {
            if(confirm("Are you sure? This will delete all progress.")) {
                localStorage.removeItem("scg-state-v2");
                localStorage.removeItem("scg-journal-entries");
                location.reload();
            }
        };

        // Quests
        $("#rollQuestBtn").onclick = () => {
            const quests = ["Stretch for 5m", "Drink Water", "Look out window", "Relax Jaw", "3 Deep Breaths"];
            $("#activeQuestText").textContent = quests[Math.floor(Math.random()*quests.length)];
            this.audio.play("click");
        };
        $("#completeQuestBtn").onclick = () => {
            this.state.data.stats.quests++;
            this.state.data.weekly.count++; // Weekly challenge logic
            this.state.addXP(10);
            this.ui.toast("Quest Complete!");
            this.audio.play("success");
        };
    }
}

// --- BOOTSTRAP ---
window.addEventListener("DOMContentLoaded", () => {
    window.app = new App();
});
