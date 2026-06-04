(function() {
    // === NO WHATSAPP DEVELOPER ===
    const DEVELOPER_WA = "6281991495276"; 

    // === 1. UUID SETUP ===
    let playerUUID = localStorage.getItem('projectDaysUUID');
    if (!playerUUID) {
        playerUUID = 'PD-' + Math.floor(100000 + Math.random() * 900000);
        localStorage.setItem('projectDaysUUID', playerUUID);
    }
    document.getElementById('uuidDisplay').innerText = 'ID: ' + playerUUID;

    // === 2. INTI STATE GAME ===
    let state = {
        scrap: 50,          
        goldScrap: 0,       
        level: 1, xp: 0, maxHp: 100, currentHp: 100, baseDamage: 12,
        dmgUpgrade: 0, hpUpgrade: 0, genUpgrade: 0, critUpgrade: 0,
        wave: 1, zombieCurrentHp: 0
    };

    let activeTransaction = { amount: 0, price: 0 };

    // === 3. DAFTAR MANAGEMENT GAMBAR ZOMBIE DINAMIS (ASSETS BOMBIES SYSTEM) ===
    // Kamu tinggal menambah daftar file gambar baru di folder assets/ lalu daftarkan di sini:
    const zombieAssets = {
        normal: "assets/zombie_normal.png",
        boss: "assets/zombie_boss.png" // Contoh jika nanti wave kelipatan 10 ada boss
    };

    // === 4. KALKULASI BALANCING ===
    function getUpgradeCost(base, lvl) { return base + (lvl * 15); }
    function calcTotalDamage() { return state.baseDamage + (state.dmgUpgrade * 6); }
    function calcCritChance() { return Math.min(0.05 + (state.critUpgrade * 0.03), 0.75); }
    function calcScrapPerSec() { return state.genUpgrade * 2; } 
    function calcMaxHp() { return 100 + (state.hpUpgrade * 15); }
    
    function getZombieMaxHp() { return 30 + (state.wave * 8); }
    function zombieDamage() { return Math.max(3, 2 + Math.floor(state.wave * 0.6)); }
    function getScrapReward() { return 50 + (state.wave * 12); } 

    // === 5. SINKRONISASI UPDATE UI ===
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
        document.getElementById('goldAmount').innerText = Math.floor(state.goldScrap);
        document.getElementById('waveCount').innerText = state.wave;
        
        let maxZombie = getZombieMaxHp();
        let zombiePercent = (state.zombieCurrentHp / maxZombie) * 100;
        document.getElementById('zombieHpFill').style.width = Math.max(0, Math.min(100, zombiePercent)) + '%';
        document.getElementById('zombieHpText').innerText = Math.max(0, Math.floor(state.zombieCurrentHp));
        document.getElementById('zombieMaxHp').innerText = Math.floor(maxZombie);
        document.getElementById('zombieWave').innerText = state.wave;

        // KONTROL GAMBAR ZOMBIE DINAMIS BERDASARKAN ASSETS/
        let imgElement = document.getElementById('zombieIcon');
        if (imgElement) {
            // Setiap wave kelipatan 10 akan otomatis berubah gambar menjadi zombie boss di folder assets
            if (state.wave % 10 === 0) {
                imgElement.src = zombieAssets.boss;
            } else {
                imgElement.src = zombieAssets.normal;
            }
        }
        
        renderUpgrades();
    }

    function renderUpgrades() {
        const grid = document.getElementById('upgradeGrid');
        if (!grid) return;
        const upgrades = [
            { id: 'dmg', name: '💪 POWER STRIKE', cost: getUpgradeCost(30, state.dmgUpgrade) },
            { id: 'hp', name: '🛡️ FORTITUDE', cost: getUpgradeCost(35, state.hpUpgrade) },
            { id: 'gen', name: '📡 DRONE', cost: getUpgradeCost(25, state.genUpgrade) },
            { id: 'crit', name: '🎯 SHARP EYE', cost: getUpgradeCost(40, state.critUpgrade) }
        ];
        
        grid.innerHTML = '';
        upgrades.forEach(up => {
            let card = document.createElement('div');
            card.className = 'upgrade-card';
            card.innerHTML = `
                <div>${up.name}</div>
                <div>COST: ${up.cost} ⚪</div>
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
        if (state.currentHp <= 0) return;
        let cost = 0;
        if (type === 'dmg') cost = getUpgradeCost(30, state.dmgUpgrade);
        else if (type === 'hp') cost = getUpgradeCost(35, state.hpUpgrade);
        else if (type === 'gen') cost = getUpgradeCost(25, state.genUpgrade);
        else if (type === 'crit') cost = getUpgradeCost(40, state.critUpgrade);
        
        if (state.scrap >= cost) {
            state.scrap -= cost;
            if (type === 'dmg') state.dmgUpgrade++;
            else if (type === 'hp') { state.hpUpgrade++; state.currentHp = calcMaxHp(); }
            else if (type === 'gen') state.genUpgrade++;
            else if (type === 'crit') state.critUpgrade++;
            addLog(`✅ Upgrade ${type.toUpperCase()} sukses!`);
            updateUI();
            saveGame();
        } else { addLog(`💰 Scrap putih tidak cukup!`); }
    }

    let logTimeout;
    function addLog(msg) {
        let logDiv = document.getElementById('combatLog');
        if (logDiv) {
            logDiv.innerHTML = `⚡ ${msg}`;
            clearTimeout(logTimeout);
            logTimeout = setTimeout(() => { if (logDiv) logDiv.innerHTML = `⚔️ Tap secepatnya seperti Bombies!`; }, 1800);
        }
    }

    // === 6. COMBAT GAMEPLAY LOOP ===
    function dealDamage(dmg, isManual = false) {
        if (state.currentHp <= 0) { addLog("💀 Kamu tumbang! Tekan Revive."); return false; }
        if (state.zombieCurrentHp <= 0) { spawnZombie(); return false; }
        
        let finalDmg = dmg;
        let isCrit = Math.random() <= calcCritChance();
        if (isCrit) finalDmg = Math.floor(finalDmg * 1.6);
        
        state.zombieCurrentHp -= finalDmg;
        
        if (isManual) {
            state.scrap += Math.random() > 0.5 ? 2 : 1; 
        }

        addLog(`${isManual ? "💥 TAP" : "⚡ AUTO"} ${finalDmg}${isCrit ? " CRIT!" : ""} dmg!`);
        
        if (state.zombieCurrentHp <= 0) {
            let scrapReward = getScrapReward();
            state.scrap += scrapReward;
            state.xp += 25;
            addLog(`✅ Zombie Hancur! +${scrapReward} Scrap ⚪`);
            
            while (state.xp >= 100) {
                state.level++;
                state.xp -= 100;
                state.baseDamage += 4;
                state.currentHp = calcMaxHp();
                addLog(`🎉 LEVEL UP! Level ${state.level}`);
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
        updateUI();
        
        if (state.currentHp <= 0) {
            addLog(`💀 KALAH! Bayar pinalti 5 Scrap ⚪ untuk mengulang.`);
            disableButtons(true);
        }
    }

    function revive() {
        if (state.scrap >= 5) {
            state.scrap -= 5;
            state.currentHp = calcMaxHp();
            disableButtons(false);
            spawnZombie();
            updateUI();
            addLog(`💊 Revive berhasil! HP kembali penuh.`);
            saveGame();
        } else { 
            addLog(`❌ Scrap tidak cukup!`); 
        }
    }

    function disableButtons(isDead) {
        let btns = ['manualAttackBtn', 'healBtn'];
        btns.forEach(id => {
            let btn = document.getElementById(id);
            if (btn) btn.disabled = isDead;
        });
        document.querySelectorAll('.upgrade-btn').forEach(btn => btn.disabled = isDead);
        document.getElementById('reviveBtn').style.display = isDead ? 'inline-block' : 'none';
    }

    function heal() {
        if (state.currentHp <= 0) return;
        if (state.scrap >= 25) {
            state.scrap -= 25;
            state.currentHp = Math.min(state.currentHp + 45, calcMaxHp());
            updateUI();
            addLog(`💊 Berhasil memulihkan HP`);
            saveGame();
        } else { addLog("Butuh 25 scrap ⚪"); }
    }

    function resetGame() {
        if (confirm("Mulai dari awal kembali?")) {
            localStorage.removeItem('projectDaysState');
            initNewGame();
            disableButtons(false);
            addLog("🔥 Sesi baru dimulai!");
        }
    }

    function initNewGame() {
        state = {
            scrap: 100, goldScrap: state.goldScrap, 
            level: 1, xp: 0, maxHp: 100, currentHp: 100, baseDamage: 12,
            dmgUpgrade: 0, hpUpgrade: 0, genUpgrade: 0, critUpgrade: 0,
            wave: 1, zombieCurrentHp: 0
        };
        state.currentHp = calcMaxHp();
        spawnZombie();
        updateUI();
        saveGame();
    }

    // === 7. INTERVAL ENGINE ===
    let idleInterval, zombieInterval;
    function startIntervals() {
        if (idleInterval) clearInterval(idleInterval);
        if (zombieInterval) clearInterval(zombieInterval);
        
        idleInterval = setInterval(() => {
            if (state.currentHp > 0) {
                let gen = calcScrapPerSec();
                if (gen > 0) state.scrap += gen;
                if (state.zombieCurrentHp > 0) dealDamage(calcTotalDamage(), false);
                else spawnZombie();
                updateUI();
            }
        }, 1000);

        zombieInterval = setInterval(() => {
            if (state.currentHp > 0 && state.zombieCurrentHp > 0) zombieAttackPlayer();
        }, 2200);
    }

    function saveGame() { localStorage.setItem('projectDaysState', JSON.stringify(state)); }

    function loadGame() {
        let saved = localStorage.getItem('projectDaysState');
        if (saved) {
            try {
                let data = JSON.parse(saved);
                Object.assign(state, data);
                if (!state.zombieCurrentHp || state.zombieCurrentHp <= 0) spawnZombie();
                disableButtons(state.currentHp <= 0);
            } catch(e) { initNewGame(); }
        } else { initNewGame(); }
        updateUI();
    }

    // === 8. WA BUSINESS STORE GATEWAY FLOW ===
    function initTopupSystem() {
        const modal = document.getElementById('topupModal');
        const openBtn = document.getElementById('topupModalBtn');
        const closeBtn = document.getElementById('closeModalBtn');
        const qrSection = document.getElementById('qrSection');
        const payDetail = document.getElementById('paymentDetail');
        const sendWaBtn = document.getElementById('sendWaBtn');

        openBtn.onclick = () => modal.classList.add('active');
        closeBtn.onclick = () => {
            modal.classList.remove('active');
            qrSection.style.display = 'none';
        };

        document.querySelectorAll('.pay-option-btn').forEach(btn => {
            btn.onclick = (e) => {
                let amount = e.currentTarget.getAttribute('data-amount');
                let price = e.currentTarget.getAttribute('data-price');
                
                activeTransaction.amount = amount;
                activeTransaction.price = price;

                payDetail.innerText = `TOTAL TAGIHAN: Rp ${parseInt(price).toLocaleString('id-ID')}`;
                qrSection.style.display = 'block'; 
            };
        });

        sendWaBtn.onclick = () => {
            let message = `Halo Developer Project Days,\n\nSaya ingin mengonfirmasi Pembayaran Top Up:\n\n` +
                          `▪️ ID Player: ${playerUUID}\n` +
                          `▪️ Item: ${activeTransaction.amount} GOLD SCRAP\n` +
                          `▪️ Nominal: Rp ${parseInt(activeTransaction.price).toLocaleString('id-ID')}\n` +
                          `▪️ Metode: QRIS Afistore\n\nSaya sudah melakukan transfer. Silakan lakukan konfirmasi manual via dashboard WhatsApp Business Anda.`;
            
            let url = `https://api.whatsapp.com/send?phone=${DEVELOPER_WA}&text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');

            alert("Sistem dialihkan ke WhatsApp! Untuk keperluan pengujian lokal, Gold Scrap ditambahkan secara otomatis.");
            state.goldScrap += parseInt(activeTransaction.amount);
            modal.classList.remove('active');
            qrSection.style.display = 'none';
            updateUI();
            saveGame();
        };
    }

    // === 9. ACTION EVENT BINDINGS ===
    function bindEvents() {
        document.getElementById('manualAttackBtn').onclick = () => dealDamage(calcTotalDamage(), true);
        document.getElementById('zombieIcon').onclick = () => dealDamage(calcTotalDamage(), true);

        document.getElementById('healBtn').onclick = heal;
        document.getElementById('reviveBtn').onclick = revive;
        document.getElementById('resetGameBtn').onclick = resetGame;
        
        document.getElementById('exportBtn').onclick = () => {
            let blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
            let url = URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = `projectdays_save_${playerUUID}.json`;
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
                    disableButtons(state.currentHp <= 0);
                    updateUI();
                    saveGame();
                    addLog("✅ Data berhasil dimuat!");
                } catch (err) { alert("File rusak!"); }
            };
            reader.readAsText(file);
            importFile.value = '';
        };
    }

    loadGame();
    bindEvents();
    initTopupSystem();
    startIntervals();
    setInterval(() => saveGame(), 5000);
})();
