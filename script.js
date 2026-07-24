const PRESETS_KEY = 'delayCalcPresets';
const MAX_PRESETS_SHOWN = 5;

function loadPresets() {
    try {
        const raw = localStorage.getItem(PRESETS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function savePreset(cycleLength, desiredEndTime) {
    try {
        const presets = loadPresets();
        const existing = presets.find(p => p.cycleLength === cycleLength && p.desiredEndTime === desiredEndTime);
        if (existing) {
            existing.count += 1;
        } else {
            presets.push({ cycleLength, desiredEndTime, count: 1 });
        }
        localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    } catch (e) {
        // localStorage unavailable; skip persisting presets
    }
}

function formatCycleLength(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    parts.push(`${m}min`);
    return parts.join(' ');
}

function formatClockTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function applyPreset(cycleLength, desiredEndTime) {
    document.getElementById('cycleLength').value = cycleLength;
    document.getElementById('desiredEndTime').value = desiredEndTime;
}

function renderPresets() {
    const container = document.getElementById('presets');
    if (!container) return;

    const presets = loadPresets()
        .slice()
        .sort((a, b) => b.count - a.count)
        .slice(0, MAX_PRESETS_SHOWN);

    if (presets.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = presets.map(p => {
        const label = `${formatCycleLength(p.cycleLength)} → ${formatClockTime(p.desiredEndTime)}`;
        return `<button type="button" class="px-3 py-1 text-sm rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100" onclick="applyPreset('${p.cycleLength}', '${p.desiredEndTime}')">${label}</button>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', renderPresets);

function calculateDelay() {
    const cycleTime = document.getElementById('cycleLength').value;
    const desiredEndTime = document.getElementById('desiredEndTime').value;
    
    if (!cycleTime || !desiredEndTime) {
        alert( "Please enter valid inputs.");
        return;
    }

    // Get current time
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Parse inputs
    const [cycleHours, cycleMinutes] = cycleTime.split(':').map(Number);
    const [desiredHours, desiredMinutes] = desiredEndTime.split(':').map(Number);

    const cycleTotalMinutes = cycleHours * 60 + cycleMinutes;
    let desiredTotalMinutes = desiredHours * 60 + desiredMinutes;

    // Calculate delay start time
    let delayMinutes = desiredTotalMinutes - cycleTotalMinutes - currentMinutes;

    if (delayMinutes < 0) {
        delayMinutes += 24 * 60; // Adjust for next day if needed
    }

    const delayHours = Math.floor(delayMinutes / 60);
    const delayMins = delayMinutes % 60;

    const roundedTotal = Math.round(delayMinutes / 15) * 15;
    const roundedHours = Math.floor(roundedTotal / 60);
    const roundedMins = roundedTotal % 60;

    savePreset(cycleTime, desiredEndTime);
    renderPresets();

    document.getElementById('result').innerHTML =
    `<div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-md mt-4">
        <h2>Set delay to: </h2>
        <h3 class="text-2xl">${delayHours} hours and ${delayMins} minutes</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">≈ Nearest 15-min setting: ${roundedHours} hours ${roundedMins} minutes</p>
    </div>`;
}
