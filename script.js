(function() {
    // === 1. INISIALISASI IDENTITAS ID (UUID) ===
    let playerUUID = localStorage.getItem('projectDaysUUID');
    if (!playerUUID) {
        playerUUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        localStorage.setItem('projectDaysUUID', playerUUID);
    }
    document.getElementById('uuidDisplay').innerText = 'ID: ' + playerUUID.slice(0,8);

    // === 2. GAME STATE GLOBAL ===
    let state = {
        scrap: 0, level: 1, xp: 0, maxHp: 100, currentHp: 100, baseDamage: 10,
        dmgUpgrade: 0, hpUpgrade: 0, genUpgrade: 0, critUpgrade: 0,
        wave: 1, zombieCurrentHp: 0
    };

    // === 3. FORMULA / GAME KALKULASI ===
    function getUpgradeCost(base, lvl) { return base + (lvl * 20); }
    function calcTotalDamage() { return state.baseDamage + (state.dmgUpgrade * 5); }
    function calcCritChance() { return Math.min(0.05 + (state.critUpgrade * 0.02), 0.6); }
    function calcScrapPerSec() { return state.genUpgrade; }
    function calcMaxHp() { return 100 + (state.hpUpgrade * 10); }
    function getZombieMaxHp() { return 40 + (state.wave * 12); }
    function zombieDamage() { return Math.max(6, 4 + Math.floor(state.wave * 1.8)); }

    // === 4. MANIPULASI TAMPILAN (UI) ===
    function updateUI() {
        let maxHp = calcMaxHp();
        let hpPercent = (state.currentHp / maxHp) * 100;
        document.getElementById('hpFillMini').style.width = Math.max(0, Math.min(100, hpPercent)) + '%';
        document.getElementById('hpText').innerHTML = `${Math.floor(state.currentHp)}/${maxHp}`;
        
        let xpPercent = (state.xp / 100) * 100;
        document.getElementById('xpFill').style.width = Math.max(0, Math.min(100, xpPercent)) + '%';
        document.getElementById('xpProgressTxt').innerText = `${Math.floor(state.xp)}/100`;
        
        document.getElementById('survivorLevel').innerText = state.level;
        document.getElementById('playerDamage').innerText = calcTotalDamage();
        document.getElementById('critInfo').innerHTML = Math.floor(calcCritChance()*100) + '%';
        document.getElementById('scrapPerSec').innerText = calcScrapPerSec();
        document.getElementById('scrapAmount').innerText = Math.floor(state.scrap);
        document.getElementById('waveCount').innerText = state.wave;
        
        let maxZombie = getZombieMaxHp();
        let zombiePercent = (state.zombieCurrentHp / maxZombie) * 100;
        document.getElementById('zombieHpFill').style.width = Math.max(0, Math.min(100, zombiePercent)) + '%';
        document.getElementById('zombieHpText').innerText = Math.max(0, Math.floor(state.zombieCurrentHp));
        document.getElementById('zombieMaxHp').innerText = Math.floor(maxZombie);
        document.getElementById('zombieWave').innerText = state.wave;
        
        renderUpgrades();
    }

    function renderUpgrades() {
        const grid = document.getElementById('upgradeGrid');
        if (!grid) return;
        const upgrades = [
            { id: 'dmg', name: '💪 POWER STRIKE', desc: `DMG +${state.dmgUpgrade*5} → +${(state.dmgUpgrade+1)*5}`, cost: getUpgradeCost(50, state.dmgUpgrade) },
            { id: 'hp', name: '🛡️ FORTITUDE', desc: `HP +${state.hpUpgrade*10} → +${(state.hpUpgrade+1)*10}`, cost: getUpgradeCost(60, state.hpUpgrade) },
            { id: 'gen', name: '📡 DRONE', desc: `📀/SEC +${state.genUpgrade} → +${state.genUpgrade+1}`, cost: getUpgradeCost(40, state.genUpgrade) },
            { id: 'crit', name: '🎯 SHARP EYE', desc: `CRIT +${state.critUpgrade*2}% → +${(state.critUpgrade+1)*2}%`, cost: getUpgradeCost(80, state.critUpgrade) }
        ];
        
        grid.innerHTML = '';
        upgrades.forEach(up => {
            let card = document.createElement('div');
            card.className = 'upgrade-card';
            card.innerHTML = `
                <div>${up.name}</div>
                <div>${up.desc}</div>
                <div>COST: ${up.cost} 💎</div>
                <button class="upgrade-btn" data-upgrade="${up.id}">UPGRADE</button>
            `;
            grid.appendChild(card);
        });

        document.querySelectorAll('.upgrade-btn').forEach(btn => {
            btn.onclick = upgradeHandler;
            btn.disabled = (state.currentHp <= 0);
        });
    }

    function upgradeHandler(e) {
        let type = e.currentTarget.getAttribute('data-upgrade');
        if (state.currentHp <= 0) { addLog("❌ Mati tak bisa upgrade!"); return; }
        let cost = 0;
        if (type === 'dmg') cost = getUpgradeCost(50, state.dmgUpgrade);
        else if (type === 'hp') cost = getUpgradeCost(60, state.hpUpgrade);
        else if (type === 'gen') cost = getUpgradeCost(40, state.genUpgrade);
        else if (type === 'crit') cost = getUpgradeCost(80, state.critUpgrade);
        
        if (state.scrap >= cost) {
            state.scrap -= cost;
            if (type === 'dmg') state.dmgUpgrade++;
            else if (type === 'hp') { state.hpUpgrade++; state.currentHp = Math.min(state.currentHp + 15, calcMaxHp()); }
            else if (type === 'gen') state.genUpgrade++;
            else if (type === 'crit') state.critUpgrade++;
            addLog(`✅ Upgrade ${type.toUpperCase()} berhasil!`);
            updateUI();
            saveGame();
        } else { addLog(`💰 Scrap kurang! butuh ${cost}`); }
    }

    let logTimeout;
    function addLog(msg) {
        let logDiv = document.getElementById('combatLog');
        if (logDiv) {
            logDiv.innerHTML = `⚡ ${msg}`;
            clearTimeout(logTimeout);
            logTimeout = setTimeout(() => { 
                if (logDiv) logDiv.innerHTML = `⚔️ Klik serang atau idle DPS`; 
            }, 2000);
        }
    }

    // === 5. LOGIKA PERTEMPURAN & GAMEPLAY ===
    function dealDamage(dmg, isManual = false) {
        if (state.currentHp <= 0) { addLog("💀 Kamu mati! Revive."); return false; }
        if (state.zombieCurrentHp <= 0) { spawnZombie(); return false; }
        
        let finalDmg = dmg;
        let isCrit = Math.random() <= calcCritChance();
        if (isCrit) finalDmg = Math.floor(finalDmg * 1.5);
        
        state.zombieCurrentHp -= finalDmg;
        addLog(`${isManual ? "🔫 MANUAL" : "⚡ IDLE"} ${finalDmg}${isCrit ? " CRIT!" : ""} dmg!`);
        
        if (state.zombieCurrentHp <= 0) {
            let scrapReward = 15 + Math.floor(state.wave * 2.5);
            let xpReward = 20;
            state.scrap += scrapReward;
            state.xp += xpReward;
            addLog(`✅ Zombie mati! +${scrapReward} scrap, +${xpReward} XP.`);
            
            while (state.xp >= 100) {
                state.level++;
                state.xp -= 100;
                state.baseDamage += 3;
                state.currentHp = calcMaxHp();
                addLog(`🎉 LEVEL UP! Level ${state.level} | Damage +3, HP full.`);
            }
            state.wave++;
            spawnZombie();
        }
        updateUI();
        saveGame();
        return true;
    }

    function spawnZombie() {
        state.zombieCurrentHp = getZombieMaxHp();
    }

    function zombieAttackPlayer() {
        if (state.currentHp <= 0 || state.zombieCurrentHp <= 0) return;
        let dmg = zombieDamage();
        state.currentHp = Math.max(0, state.currentHp - dmg);
        addLog(`🧟 Zombie menyerang! -${dmg} HP.`);
        updateUI();
        if (state.currentHp <= 0) {
            addLog(`💀 TEWAS! Tekan REVIVE.`);
            disableButtons(true);
        }
        saveGame();
    }

    function disableButtons(isDead) {
        let btns = ['manualAttackBtn', 'healBtn', 'exportBtn', 'importBtn', 'resetGameBtn'];
        btns.forEach(id => {
            let btn = document.getElementById(id);
            if (btn) btn.disabled = isDead;
        });
        document.querySelectorAll('.upgrade-btn').forEach(btn => btn.disabled = isDead);
        document.getElementById('reviveBtn').style.display = isDead ? 'inline-block' : 'none';
    }

    function revive() {
        if (state.scrap >= 100) {
            state.scrap -= 100;
            state.currentHp = calcMaxHp();
            disableButtons(false);
            spawnZombie();
            updateUI();
            addLog(`💊 Revival sukses! Siap bertempur.`);
            saveGame();
        } else { addLog(`❌ Butuh 100 scrap untuk revive!`); }
    }

    function heal() {
        if (state.currentHp <= 0) { addLog("Mati, revive dulu"); return; }
        if (state.scrap >= 25) {
            state.scrap -= 25;
            state.currentHp = Math.min(state.currentHp + 40, calcMaxHp());
            updateUI();
            addLog(`💊 Heal +40 HP`);
            saveGame();
        } else { addLog("Butuh 25 scrap"); }
    }

    function resetGame() {
        if (confirm("Reset semua progres? Data akan hilang.")) {
            localStorage.removeItem('projectDaysState');
            initNewGame();
            disableButtons(false);
            addLog("🔥 Game direset. Selamat bertahan!");
        }
    }

    function initNewGame() {
        state = {
            scrap: 0, level: 1, xp: 0, maxHp: 100, currentHp: 100, baseDamage: 10,
            dmgUpgrade: 0, hpUpgrade: 0, genUpgrade: 0, critUpgrade: 0,
            wave: 1, zombieCurrentHp: 0
        };
        state.currentHp = calcMaxHp();
        spawnZombie();
        updateUI();
        saveGame();
    }

    // === 6. DATA PERSISTENCE (SAVE / LOAD / OFFLINE) ===
    let lastTimestamp = Date.now();
    function applyOffline() {
        let now = Date.now();
        let diffSec = Math.min(3600 * 8, (now - lastTimestamp) / 1000);
        if (diffSec > 1 && state.currentHp > 0) {
            let gain = Math.floor(calcScrapPerSec() * diffSec);
            if (gain > 0) { state.scrap += gain; addLog(`📦 Offline: +${gain} scrap`); }
        }
        lastTimestamp = now;
    }

    let idleInterval, zombieInterval;
    function startIntervals() {
        if (idleInterval) clearInterval(idleInterval);
        if (zombieInterval) clearInterval(zombieInterval);
        
        idleInterval = setInterval(() => {
            if (state.currentHp > 0) {
                let gen = calcScrapPerSec();
                if (gen > 0) { state.scrap += gen; }
                if (state.zombieCurrentHp > 0) {
                    dealDamage(calcTotalDamage(), false);
                } else {
                    spawnZombie();
                }
                updateUI();
            }
        }, 1000);

        zombieInterval = setInterval(() => {
            if (state.currentHp > 0 && state.zombieCurrentHp > 0) zombieAttackPlayer();
        }, 2000);
    }

    function saveGame() {
        localStorage.setItem('projectDaysState', JSON.stringify(state));
    }

    function loadGame() {
        let saved = localStorage.getItem('projectDaysState');
        if (saved) {
            try {
                let data = JSON.parse(saved);
                Object.assign(state, data);
                if (!state.zombieCurrentHp || state.zombieCurrentHp <= 0) {
                    spawnZombie();
                }
                disableButtons(state.currentHp <= 0);
            } catch(e) { 
                initNewGame(); 
            }
        } else { 
            initNewGame(); 
        }
        lastTimestamp = Date.now();
        updateUI();
    }

    // === 7. EVENT LISTENERS UTAMA ===
    function bindEvents() {
        document.getElementById('manualAttackBtn').onclick = () => {
            if (state.currentHp <= 0) { addLog("Mati, revive dulu"); return; }
            if (state.zombieCurrentHp > 0) dealDamage(calcTotalDamage(), true);
            else { spawnZombie(); updateUI(); }
        };
        document.getElementById('healBtn').onclick = heal;
        document.getElementById('reviveBtn').onclick = revive;
        document.getElementById('resetGameBtn').onclick = resetGame;
        
        document.getElementById('exportBtn').onclick = () => {
            let exportState = { ...state, uuid: playerUUID };
            let blob = new Blob([JSON.stringify(exportState)], { type: 'application/json' });
            let url = URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = `projectdays_${playerUUID.slice(0,6)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        };

        const importFile = document.getElementById('importFile');
        document.getElementById('importBtn').onclick = () => importFile.click();
        importFile.onchange = (e) => {
            let file = e.target.files[0];
            if (!file) return;
            let reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    let imported = JSON.parse(ev.target.result);
                    Object.assign(state, imported);
                    state.currentHp = Math.min(state.currentHp, calcMaxHp());
                    if (state.zombieCurrentHp <= 0) spawnZombie();
                    disableButtons(state.currentHp <= 0);
                    updateUI();
                    saveGame();
                    addLog("✅ Import sukses!");
                } catch (err) { alert("File corrupt"); }
            };
            reader.readAsText(file);
            importFile.value = '';
        };
    }

    // Alur Eksekusi Utama saat Game Dimuat
    loadGame();
    bindEvents();
    applyOffline();
    startIntervals();
    setInterval(() => saveGame(), 5000);
})();