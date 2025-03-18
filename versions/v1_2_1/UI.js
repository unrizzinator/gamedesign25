const gameContainer = document.querySelector('.game-container');
const ui = document.querySelector('.ui');
const windowContainer = document.querySelector('.window-container');
const coinStat = ui.querySelector('#coinStat');
const coinStatDisplay = coinStat.querySelector('#coinStatDisplay');
const healthStat = ui.querySelector('#healthStat');
const healthStatDisplay = healthStat.querySelector('#healthStatDisplay');
const staminaStat = ui.querySelector('#staminaStat');
const staminaStatDisplay = staminaStat.querySelector('#staminaStatDisplay');
const upgradesList = document.querySelector('#upgrades');

const UIWindows = document.querySelectorAll('.window');

const COIN_128 = new Image();
COIN_128.src = "../../src/img/Coin128x128.png";

function fillUI() {
    for (let i = 0; i < Object.keys(stats).length; i++) {
        let k = Object.keys(stats)[i];
        let v = stats[k];
        upgradesList.innerHTML += `
        <div class="upgrade">
            <div class="name">${v.name}</div>
            <div class="upgradeLevelContainer">
                <div class="upgradeLevel" style="width: ${(v.level.current/v.level.max) * 100}%;"></div>
            </div>
            <button class="coolBtn" onclick="requestStatUpgrade(this, '${k}')">Upgrade</button>
        </div>`;
    }
} setTimeout(fillUI, 10);

function exitWindow() {
    for (let w of UIWindows) {
        w.classList.remove("active");
        windowContainer.style.backdropFilter = "none";
    }
    gameFocused = true;
    coinStat.style.opacity = 1;
    healthStat.style.opacity = 1;
    staminaStat.style.opacity = 1;
}

function openWindow(windowId) {
    exitWindow();
    gameFocused = false;
    for (let i = 0; i < UIWindows.length; i++) {
        let window = UIWindows[i];
        if (window.getAttribute("windowId") == windowId) {
            window.classList.add('active');
            windowContainer.style.backdropFilter = "blur(8px)";
        }
    }
    coinStat.style.opacity = 1;
    healthStat.style.opacity = 0;
    staminaStat.style.opacity = 0;
}

function toggleMenu() {
    if (gameFocused) openWindow("pauseMenu");
    else exitWindow();
}