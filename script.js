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

    document.getElementById('result').innerHTML = 
    `<div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-md mt-4">
        <h2>Set delay to: </h2>
        <h3 class="text-2xl">${delayHours} hours and ${delayMins} minutes</h3>
    </div>`;
}
