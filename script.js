const CYCLE_LENGTHS_KEY = 'delayCalcCycleLengths';
const END_TIMES_KEY = 'delayCalcEndTimes';
const OLD_PRESETS_KEY = 'delayCalcPresets';
const MAX_PRESETS_SHOWN = 5;
const LAST_USED_KEY = 'delayCalcLastUsed';

function loadValueCounts(storageKey) {
    try {
        const raw = localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : {};
        return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch (e) {
        return {};
    }
}

function saveValueCounts(storageKey, counts) {
    try {
        localStorage.setItem(storageKey, JSON.stringify(counts));
    } catch (e) {
        // localStorage unavailable; skip persisting presets
    }
}

function incrementValueCount(storageKey, value) {
    const counts = loadValueCounts(storageKey);
    counts[value] = (counts[value] || 0) + 1;
    saveValueCounts(storageKey, counts);
}

function deleteValueCount(storageKey, value) {
    const counts = loadValueCounts(storageKey);
    delete counts[value];
    saveValueCounts(storageKey, counts);
}

function getTopValues(storageKey, max) {
    const counts = loadValueCounts(storageKey);
    return Object.keys(counts)
        .sort((a, b) => counts[b] - counts[a])
        .slice(0, max);
}

// Migrate combined presets from the previous version (cycleLength+desiredEndTime
// pairs) into the two independent frequency stores, without ever deleting the
// user's original data.
function migrateOldPresetsIfNeeded() {
    try {
        const raw = localStorage.getItem(OLD_PRESETS_KEY);
        if (!raw) return;
        if (localStorage.getItem(CYCLE_LENGTHS_KEY) || localStorage.getItem(END_TIMES_KEY)) return;

        const oldPresets = JSON.parse(raw);
        if (!Array.isArray(oldPresets)) return;

        const cycleCounts = loadValueCounts(CYCLE_LENGTHS_KEY);
        const endTimeCounts = loadValueCounts(END_TIMES_KEY);

        oldPresets.forEach(p => {
            if (!p || typeof p !== 'object') return;
            const count = Number(p.count) || 1;
            if (p.cycleLength) {
                cycleCounts[p.cycleLength] = (cycleCounts[p.cycleLength] || 0) + count;
            }
            if (p.desiredEndTime) {
                endTimeCounts[p.desiredEndTime] = (endTimeCounts[p.desiredEndTime] || 0) + count;
            }
        });

        saveValueCounts(CYCLE_LENGTHS_KEY, cycleCounts);
        saveValueCounts(END_TIMES_KEY, endTimeCounts);
    } catch (e) {
        // Old preset data is unreadable; ignore it rather than crash.
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

function applyCycleLengthPreset(value) {
    document.getElementById('cycleLength').value = value;
}

function applyEndTimePreset(value) {
    document.getElementById('desiredEndTime').value = value;
}

function deleteCycleLengthPreset(value, event) {
    event.stopPropagation();
    deleteValueCount(CYCLE_LENGTHS_KEY, value);
    renderPresets();
}

function deleteEndTimePreset(value, event) {
    event.stopPropagation();
    deleteValueCount(END_TIMES_KEY, value);
    renderPresets();
}

function renderPresetRow(containerId, storageKey, formatFn, applyFnName, deleteFnName) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const values = getTopValues(storageKey, MAX_PRESETS_SHOWN);

    if (values.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = values.map(value => {
        return `<button type="button" class="flex items-center gap-1 pl-3 pr-1 py-1 text-sm rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100" onclick="${applyFnName}('${value}')">
            <span>${formatFn(value)}</span>
            <span role="button" aria-label="Remove preset" class="flex items-center justify-center w-6 h-6 rounded-full text-red-500 hover:text-red-700 hover:bg-gray-300 dark:hover:bg-gray-600" onclick="${deleteFnName}('${value}', event)">&times;</span>
        </button>`;
    }).join('');
}

function renderPresets() {
    renderPresetRow('cycleLengthPresets', CYCLE_LENGTHS_KEY, formatCycleLength, 'applyCycleLengthPreset', 'deleteCycleLengthPreset');
    renderPresetRow('desiredEndTimePresets', END_TIMES_KEY, formatClockTime, 'applyEndTimePreset', 'deleteEndTimePreset');
}

document.addEventListener('DOMContentLoaded', () => {
    migrateOldPresetsIfNeeded();
    renderPresets();
});

function saveLastUsedInputs(cycleLength, desiredEndTime) {
    try {
        localStorage.setItem(LAST_USED_KEY, JSON.stringify({ cycleLength, desiredEndTime }));
    } catch (e) {
        // localStorage unavailable; skip persisting last used inputs
    }
}

function loadLastUsedInputs() {
    try {
        const raw = localStorage.getItem(LAST_USED_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function applyLastUsedInputs() {
    const lastUsed = loadLastUsedInputs();
    if (!lastUsed) return;

    const cycleLengthInput = document.getElementById('cycleLength');
    const desiredEndTimeInput = document.getElementById('desiredEndTime');
    if (cycleLengthInput && lastUsed.cycleLength) {
        cycleLengthInput.value = lastUsed.cycleLength;
    }
    if (desiredEndTimeInput && lastUsed.desiredEndTime) {
        desiredEndTimeInput.value = lastUsed.desiredEndTime;
    }
}

document.addEventListener('DOMContentLoaded', applyLastUsedInputs);

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

    incrementValueCount(CYCLE_LENGTHS_KEY, cycleTime);
    incrementValueCount(END_TIMES_KEY, desiredEndTime);
    renderPresets();

    saveLastUsedInputs(cycleTime, desiredEndTime);

    document.getElementById('result').innerHTML =
    `<div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-md mt-4">
        <h2>Set delay to: </h2>
        <h3 class="text-2xl">${delayHours} hours and ${delayMins} minutes</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">≈ Nearest 15-min setting: ${roundedHours} hours ${roundedMins} minutes</p>
    </div>`;
}
