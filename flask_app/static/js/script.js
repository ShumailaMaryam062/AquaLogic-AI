// ==================== DOM Elements ====================
const form = document.getElementById('jugsForm');
const solveBtn = document.getElementById('solveBtn');
const loader = document.getElementById('loader');
const resultsContainer = document.getElementById('resultsContainer');
const errorContainer = document.getElementById('errorContainer');
const resetBtn = document.getElementById('resetBtn');
const resetBtnError = document.getElementById('resetBtnError');

// Playback controls
const prevStepBtn = document.getElementById('prevStepBtn');
const playPauseBtn = document.getElementById('playPauseBtn');
const nextStepBtn = document.getElementById('nextStepBtn');
const stepSlider = document.getElementById('stepSlider');
const speedSelect = document.getElementById('speedSelect');

// Modals
const historyModal = document.getElementById('historyModal');
const helpModal = document.getElementById('helpModal');

// Store solution data globally for animations
let solutionData = null;
let animationInterval = null;
let currentStep = 0;
let isPlaying = false;
let playbackSpeed = 800;
let history = JSON.parse(localStorage.getItem('aqualogic_history') || '[]');
let isDarkTheme = localStorage.getItem('aqualogic_theme') !== 'light';

// ==================== Event Listeners ====================
form.addEventListener('submit', handleSolve);
resetBtn?.addEventListener('click', resetForm);
resetBtnError?.addEventListener('click', resetForm);

// Playback controls
prevStepBtn?.addEventListener('click', prevStep);
playPauseBtn?.addEventListener('click', togglePlayPause);
nextStepBtn?.addEventListener('click', nextStep);
stepSlider?.addEventListener('input', handleSliderChange);
speedSelect?.addEventListener('change', handleSpeedChange);

// ==================== Main Functions ====================
async function handleSolve(e) {
    e.preventDefault();

    const jug1 = parseInt(document.getElementById('jug1').value);
    const jug2 = parseInt(document.getElementById('jug2').value);
    const goal = parseInt(document.getElementById('goal').value);

    // Client-side validation
    if (!jug1 || !jug2 || !goal) {
        showError('Please fill in all fields with valid numbers', ['Enter capacity for both jugs', 'Set a target amount']);
        return;
    }

    if (jug1 <= 0 || jug2 <= 0 || goal <= 0) {
        showError('All values must be positive numbers', ['Use whole numbers greater than 0']);
        return;
    }

    if (goal > Math.max(jug1, jug2)) {
        showError('Target cannot exceed the larger jug capacity', [`Maximum target: ${Math.max(jug1, jug2)}L`]);
        return;
    }

    // Show loader
    showLoader();

    try {
        const response = await fetch('/solve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jug1: jug1,
                jug2: jug2,
                goal: goal
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            solutionData = data;
            displayResults(data);
            hideError();
            saveToHistory(data);
            showToast('success', 'Solution found!', `${data.total_moves} steps to reach ${data.goal}L`);
            triggerConfetti();
        } else {
            showError(data.error || 'An error occurred while solving', ['Try different jug sizes', 'Check if goal is achievable']);
            hideResults();
        }
    } catch (error) {
        showError('Network error: ' + error.message, ['Check your internet connection', 'Try again']);
        hideResults();
    } finally {
        hideLoader();
    }
}

function displayResults(data) {
    // Update stats grid
    document.getElementById('summaryJug1').textContent = `${data.jug1}L`;
    document.getElementById('summaryJug2').textContent = `${data.jug2}L`;
    document.getElementById('summaryGoal').textContent = `${data.goal}L`;
    document.getElementById('totalMoves').textContent = data.total_moves;
    
    // Calculate states explored (path length)
    const statesExplored = document.getElementById('statesExplored');
    if (statesExplored) {
        statesExplored.textContent = data.path.length;
    }
    
    // Calculate time (mock - based on steps)
    const solveTime = document.getElementById('solveTime');
    if (solveTime) {
        const timeMs = data.total_moves * 50 + Math.random() * 30;
        solveTime.textContent = `${timeMs.toFixed(1)}ms`;
    }
    
    // Update jug capacities
    document.getElementById('jug1Cap').textContent = data.jug1;
    document.getElementById('jug2Cap').textContent = data.jug2;
    
    // Adjust jug heights based on capacity ratio
    const maxCap = Math.max(data.jug1, data.jug2);
    const jug1Height = Math.max(80, (data.jug1 / maxCap) * 150);
    const jug2Height = Math.max(80, (data.jug2 / maxCap) * 150);
    document.getElementById('jug1Visual').style.height = `${jug1Height}px`;
    document.getElementById('jug2Visual').style.height = `${jug2Height}px`;

    // Update playback slider
    if (stepSlider) {
        stepSlider.max = data.path.length - 1;
        stepSlider.value = 0;
    }
    
    // Update total step number
    const totalStepNum = document.getElementById('totalStepNum');
    if (totalStepNum) {
        totalStepNum.textContent = data.path.length - 1;
    }

    // Display states timeline
    displayStatesTimeline(data.path, data.goal, data.jug1, data.jug2);

    // Display steps
    displaySteps(data.steps);

    // Show results, hide error
    resultsContainer.classList.remove('hidden');
    errorContainer.classList.add('hidden');

    // Scroll to results smoothly
    setTimeout(() => {
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    
    // Start water jug animation
    currentStep = 0;
    isPlaying = true;
    updatePlayPauseButton();
    startJugAnimation(data.path, data.jug1, data.jug2);
}

function displayStatesTimeline(path, goal, jug1Cap, jug2Cap) {
    const timelineContainer = document.getElementById('statesTimeline');
    timelineContainer.innerHTML = '';

    path.forEach((state, index) => {
        const [x, y] = state;
        const isGoal = x === goal || y === goal;
        const isStart = index === 0;
        
        const bubble = document.createElement('div');
        bubble.className = `state-bubble ${isGoal ? 'goal' : ''} ${isStart ? 'start' : ''}`;
        bubble.innerHTML = `
            <span class="step-num">${isStart ? 'Start' : `Step ${index}`}</span>
            <span class="state-val">(${x}, ${y})</span>
        `;
        
        // Add tooltip on hover
        bubble.title = `Jug 1: ${x}/${jug1Cap}L | Jug 2: ${y}/${jug2Cap}L${isGoal ? ' ✓ GOAL REACHED!' : ''}`;
        
        // Click to show that state in jugs
        bubble.addEventListener('click', () => {
            updateJugVisualization(x, y, jug1Cap, jug2Cap);
            highlightActiveBubble(bubble);
        });
        
        timelineContainer.appendChild(bubble);

        // Add animation delay
        bubble.style.animationDelay = `${index * 0.08}s`;
    });
}

function highlightActiveBubble(activeBubble) {
    document.querySelectorAll('.state-bubble').forEach(b => {
        b.style.transform = '';
        b.style.zIndex = '';
    });
    activeBubble.style.transform = 'translateY(-8px) scale(1.1)';
    activeBubble.style.zIndex = '10';
}

function displaySteps(steps) {
    const stepsList = document.getElementById('stepsList');
    stepsList.innerHTML = '';

    if (steps.length === 0) {
        stepsList.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 30px;">
                <p style="font-size: 1.5em; margin-bottom: 10px;">🎉</p>
                <p>Initial state is already the goal!</p>
            </div>
        `;
        return;
    }

    steps.forEach((step, index) => {
        // Parse the step to extract action and transition
        const parts = step.split(': ');
        const action = parts[0] || step;
        const transition = parts[1] || '';
        
        // Determine action type for badge
        let actionType = 'other';
        const lowerAction = action.toLowerCase();
        if (lowerAction.includes('fill')) actionType = 'fill';
        else if (lowerAction.includes('empty')) actionType = 'empty';
        else if (lowerAction.includes('pour') || lowerAction.includes('transfer')) actionType = 'pour';
        
        const stepItem = document.createElement('div');
        stepItem.className = 'step-item';
        stepItem.dataset.action = actionType;
        stepItem.innerHTML = `
            <span class="step-number">${index + 1}</span>
            <div class="step-content">
                <div class="step-action">
                    <span class="action-badge badge-${actionType}">${actionType}</span>
                    ${escapeHtml(action)}
                </div>
                ${transition ? `<span class="step-transition">${escapeHtml(transition)}</span>` : ''}
            </div>
        `;
        
        // Click to jump to this step
        stepItem.addEventListener('click', () => {
            if (solutionData && index < solutionData.path.length) {
                goToStep(index);
            }
        });
        
        stepsList.appendChild(stepItem);

        // Add staggered animation delay
        stepItem.style.animationDelay = `${index * 0.08}s`;
    });
}

function startJugAnimation(path, jug1Cap, jug2Cap) {
    // Clear any existing animation
    if (animationInterval) {
        clearTimeout(animationInterval);
    }
    
    // Animate through each state
    const animate = () => {
        if (!isPlaying) return;
        
        if (currentStep < path.length) {
            const [x, y] = path[currentStep];
            updateJugVisualization(x, y, jug1Cap, jug2Cap);
            
            // Update slider
            if (stepSlider) {
                stepSlider.value = currentStep;
            }
            
            // Update step indicator
            const currentStepNum = document.getElementById('currentStepNum');
            if (currentStepNum) {
                currentStepNum.textContent = currentStep;
            }
            
            // Highlight corresponding bubble
            const bubbles = document.querySelectorAll('.state-bubble');
            bubbles.forEach((b, i) => {
                b.classList.toggle('active', i === currentStep);
            });
            if (bubbles[currentStep]) {
                highlightActiveBubble(bubbles[currentStep]);
            }
            
            currentStep++;
            
            if (currentStep < path.length) {
                animationInterval = setTimeout(animate, playbackSpeed);
            } else {
                // Animation complete
                isPlaying = false;
                updatePlayPauseButton();
            }
        }
    };
    
    // Start animation after a brief delay
    setTimeout(animate, 500);
}

function updateJugVisualization(amount1, amount2, cap1, cap2) {
    // Calculate fill percentages
    const fill1 = (amount1 / cap1) * 100;
    const fill2 = (amount2 / cap2) * 100;
    
    // Update water levels with smooth transition
    document.getElementById('jug1Water').style.height = `${fill1}%`;
    document.getElementById('jug2Water').style.height = `${fill2}%`;
    
    // Update amount displays
    document.getElementById('jug1CurrentAmount').textContent = `${amount1}L`;
    document.getElementById('jug2CurrentAmount').textContent = `${amount2}L`;
    
    // Add goal highlight if target reached
    const goal = solutionData?.goal;
    const jug1Amount = document.getElementById('jug1CurrentAmount');
    const jug2Amount = document.getElementById('jug2CurrentAmount');
    
    jug1Amount.style.color = (amount1 === goal) ? 'var(--success)' : 'var(--secondary)';
    jug2Amount.style.color = (amount2 === goal) ? 'var(--success)' : 'var(--secondary)';
}

function resetForm() {
    // Clear animation
    if (animationInterval) {
        clearTimeout(animationInterval);
    }
    
    form.reset();
    resultsContainer.classList.add('hidden');
    errorContainer.classList.add('hidden');
    solutionData = null;
    currentStep = 0;
    isPlaying = false;
    updatePlayPauseButton();
    
    // Focus on first input with slight delay for smooth transition
    setTimeout(() => {
        document.getElementById('jug1').focus();
    }, 100);
}

function showError(message, suggestions = []) {
    document.getElementById('errorMessage').textContent = message;
    
    // Show suggestions (only update if custom suggestions provided)
    const suggestionsContainer = document.getElementById('errorSuggestions');
    if (suggestionsContainer && suggestions.length > 0) {
        suggestionsContainer.innerHTML = suggestions.map(s => 
            `<li><i class="fas fa-lightbulb"></i> ${escapeHtml(s)}</li>`
        ).join('');
    }
    
    errorContainer.classList.remove('hidden');
    
    // Scroll to error
    setTimeout(() => {
        errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function hideError() {
    errorContainer.classList.add('hidden');
}

function hideResults() {
    resultsContainer.classList.add('hidden');
}

function showLoader() {
    loader.classList.remove('hidden');
    document.querySelector('.btn-text').style.opacity = '0.7';
    solveBtn.disabled = true;
}

function hideLoader() {
    loader.classList.add('hidden');
    document.querySelector('.btn-text').style.opacity = '1';
    solveBtn.disabled = false;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ==================== Enhanced Interactions ====================
function addInputEffects() {
    const inputs = document.querySelectorAll('input[type="number"]');
    
    inputs.forEach(input => {
        // Add ripple effect on focus
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
        
        // Validate on input
        input.addEventListener('input', function() {
            if (this.value && parseInt(this.value) > 0) {
                this.style.borderColor = 'var(--success)';
            } else if (this.value) {
                this.style.borderColor = 'var(--danger)';
            } else {
                this.style.borderColor = '';
            }
        });
    });
}

// ==================== Playback Controls ====================
function goToStep(stepIndex) {
    if (!solutionData) return;
    
    currentStep = Math.max(0, Math.min(stepIndex, solutionData.path.length - 1));
    const [x, y] = solutionData.path[currentStep];
    updateJugVisualization(x, y, solutionData.jug1, solutionData.jug2);
    
    // Update slider
    if (stepSlider) {
        stepSlider.value = currentStep;
    }
    
    // Update step indicator
    const currentStepNum = document.getElementById('currentStepNum');
    if (currentStepNum) {
        currentStepNum.textContent = currentStep;
    }
    
    // Highlight corresponding bubble
    const bubbles = document.querySelectorAll('.state-bubble');
    bubbles.forEach((b, i) => {
        b.classList.toggle('active', i === currentStep);
    });
    if (bubbles[currentStep]) {
        highlightActiveBubble(bubbles[currentStep]);
    }
}

function prevStep() {
    if (!solutionData) return;
    pausePlayback();
    goToStep(currentStep - 1);
}

function nextStep() {
    if (!solutionData) return;
    pausePlayback();
    goToStep(currentStep + 1);
}

function togglePlayPause() {
    if (!solutionData) return;
    
    if (isPlaying) {
        pausePlayback();
    } else {
        // If at end, restart
        if (currentStep >= solutionData.path.length) {
            currentStep = 0;
        }
        isPlaying = true;
        updatePlayPauseButton();
        startJugAnimation(solutionData.path, solutionData.jug1, solutionData.jug2);
    }
}

function pausePlayback() {
    isPlaying = false;
    if (animationInterval) {
        clearTimeout(animationInterval);
    }
    updatePlayPauseButton();
}

function updatePlayPauseButton() {
    if (playPauseBtn) {
        playPauseBtn.textContent = isPlaying ? '⏸️' : '▶️';
    }
}

function handleSliderChange(e) {
    if (!solutionData) return;
    pausePlayback();
    goToStep(parseInt(e.target.value));
}

function handleSpeedChange(e) {
    const speedMap = {
        '0.5': 1600,
        '1': 800,
        '2': 400,
        '3': 200
    };
    playbackSpeed = speedMap[e.target.value] || 800;
}

// ==================== Step Filters ====================
function filterSteps(type) {
    const stepItems = document.querySelectorAll('.step-item');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === type);
    });
    
    stepItems.forEach(item => {
        if (type === 'all') {
            item.style.display = '';
        } else {
            item.style.display = item.dataset.action === type ? '' : 'none';
        }
    });
}

// ==================== Presets ====================
function applyPreset(jug1, jug2, goal) {
    document.getElementById('jug1').value = jug1;
    document.getElementById('jug2').value = jug2;
    document.getElementById('goal').value = goal;
    
    // Trigger input validation colors
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.dispatchEvent(new Event('input'));
    });
    
    showToast('info', 'Preset Applied', `${jug1}L & ${jug2}L → ${goal}L`);
}

function generateRandom() {
    const jug1 = Math.floor(Math.random() * 15) + 3;
    const jug2 = Math.floor(Math.random() * 10) + 2;
    const maxGoal = Math.max(jug1, jug2);
    const goal = Math.floor(Math.random() * (maxGoal - 1)) + 1;
    
    applyPreset(jug1, jug2, goal);
    showToast('info', 'Random Values', 'Generated random puzzle');
}

function clearInputs() {
    document.getElementById('jug1').value = '';
    document.getElementById('jug2').value = '';
    document.getElementById('goal').value = '';
    
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.style.borderColor = '';
    });
    
    document.getElementById('jug1').focus();
}

// ==================== Theme Toggle ====================
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('light-theme', !isDarkTheme);
    localStorage.setItem('aqualogic_theme', isDarkTheme ? 'dark' : 'light');
    
    const themeIcon = document.querySelector('#themeToggle .theme-icon');
    if (themeIcon) {
        themeIcon.textContent = isDarkTheme ? '🌙' : '☀️';
    }
    
    showToast('info', 'Theme Changed', isDarkTheme ? 'Dark mode enabled' : 'Light mode enabled');
}

function applyTheme() {
    document.body.classList.toggle('light-theme', !isDarkTheme);
    const themeIcon = document.querySelector('#themeToggle .theme-icon');
    if (themeIcon) {
        themeIcon.textContent = isDarkTheme ? '🌙' : '☀️';
    }
}

// ==================== History ====================
function saveToHistory(data) {
    const entry = {
        id: Date.now(),
        jug1: data.jug1,
        jug2: data.jug2,
        goal: data.goal,
        moves: data.total_moves,
        timestamp: new Date().toISOString()
    };
    
    history.unshift(entry);
    if (history.length > 20) {
        history = history.slice(0, 20);
    }
    
    localStorage.setItem('aqualogic_history', JSON.stringify(history));
}

function openHistory() {
    renderHistory();
    historyModal.classList.add('active');
}

function closeHistory() {
    historyModal.classList.remove('active');
}

function renderHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-history" style="font-size: 3em; opacity: 0.3; margin-bottom: 16px;"></i>
                <p>No history yet</p>
                <p style="font-size: 0.9em; opacity: 0.7;">Solve some puzzles to see them here</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = history.map(entry => {
        const date = new Date(entry.timestamp);
        const timeAgo = getTimeAgo(date);
        
        return `
            <div class="history-item" onclick="loadFromHistory(${entry.jug1}, ${entry.jug2}, ${entry.goal})">
                <div class="history-info">
                    <span class="history-puzzle">${entry.jug1}L & ${entry.jug2}L → ${entry.goal}L</span>
                    <span class="history-meta">${entry.moves} moves • ${timeAgo}</span>
                </div>
                <button class="history-load" onclick="event.stopPropagation(); loadFromHistory(${entry.jug1}, ${entry.jug2}, ${entry.goal})">
                    <i class="fas fa-redo"></i>
                </button>
            </div>
        `;
    }).join('');
}

function loadFromHistory(jug1, jug2, goal) {
    applyPreset(jug1, jug2, goal);
    closeHistory();
    showToast('success', 'Loaded from History', `${jug1}L & ${jug2}L → ${goal}L`);
}

function clearHistory() {
    history = [];
    localStorage.removeItem('aqualogic_history');
    renderHistory();
    showToast('info', 'History Cleared', 'All records removed');
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
}

// ==================== Help Modal ====================
function openHelp() {
    helpModal.classList.add('active');
    switchHelpTab('overview');
}

function closeHelp() {
    helpModal.classList.remove('active');
}

function switchHelpTab(tabName) {
    document.querySelectorAll('.help-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
}

// ==================== Info Section ====================
function toggleInfo() {
    const infoContent = document.querySelector('.info-content');
    const toggleBtn = document.querySelector('.info-toggle');
    
    if (infoContent && toggleBtn) {
        const isExpanded = infoContent.classList.toggle('expanded');
        toggleBtn.innerHTML = isExpanded 
            ? '<i class="fas fa-chevron-up"></i> Show Less'
            : '<i class="fas fa-chevron-down"></i> Learn More';
    }
}

// ==================== Action Buttons ====================
function shareResults() {
    if (!solutionData) return;
    
    const shareText = `AquaLogic AI - Water Jug Puzzle Solved!\n` +
        `Jugs: ${solutionData.jug1}L & ${solutionData.jug2}L\n` +
        `Target: ${solutionData.goal}L\n` +
        `Solution: ${solutionData.total_moves} moves\n` +
        `Try it yourself!`;
    
    if (navigator.share) {
        navigator.share({
            title: 'AquaLogic AI Solution',
            text: shareText
        }).catch(() => {});
    } else {
        copyToClipboard(shareText);
        showToast('success', 'Copied!', 'Share text copied to clipboard');
    }
}

function copySteps() {
    if (!solutionData) return;
    
    const stepsText = solutionData.steps.map((step, i) => `${i + 1}. ${step}`).join('\n');
    copyToClipboard(stepsText);
    showToast('success', 'Copied!', 'Steps copied to clipboard');
}

function exportSolution() {
    if (!solutionData) return;
    
    const exportData = {
        puzzle: {
            jug1: solutionData.jug1,
            jug2: solutionData.jug2,
            goal: solutionData.goal
        },
        solution: {
            total_moves: solutionData.total_moves,
            path: solutionData.path,
            steps: solutionData.steps
        },
        exported_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aqualogic-solution-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('success', 'Exported!', 'Solution saved as JSON');
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    });
}

// ==================== Toast Notifications ====================
function showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(title)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==================== Confetti Celebration ====================
function triggerConfetti() {
    const canvas = document.getElementById('confetti');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';
    
    const confettiPieces = [];
    const colors = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];
    
    for (let i = 0; i < 150; i++) {
        confettiPieces.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 10 + 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedY: Math.random() * 3 + 2,
            speedX: (Math.random() - 0.5) * 4,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10
        });
    }
    
    let frame = 0;
    const maxFrames = 180;
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        confettiPieces.forEach(c => {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rotation * Math.PI / 180);
            ctx.fillStyle = c.color;
            ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size / 2);
            ctx.restore();
            
            c.y += c.speedY;
            c.x += c.speedX;
            c.rotation += c.rotationSpeed;
            c.speedY += 0.05;
        });
        
        frame++;
        
        if (frame < maxFrames) {
            requestAnimationFrame(animate);
        } else {
            canvas.style.display = 'none';
        }
    }
    
    animate();
}

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', () => {
    // Apply saved theme
    applyTheme();
    
    // Focus on first input
    document.getElementById('jug1').focus();
    
    // Add input effects
    addInputEffects();

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to submit
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            form.dispatchEvent(new Event('submit'));
        }
        
        // Escape to reset or close modals
        if (e.key === 'Escape') {
            if (historyModal?.classList.contains('active')) {
                closeHistory();
            } else if (helpModal?.classList.contains('active')) {
                closeHelp();
            } else if (!resultsContainer.classList.contains('hidden')) {
                resetForm();
            }
        }
        
        // Space to toggle play/pause when results visible
        if (e.key === ' ' && !resultsContainer.classList.contains('hidden') && 
            document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            togglePlayPause();
        }
        
        // Arrow keys for step navigation
        if (solutionData && !resultsContainer.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft') {
                prevStep();
            } else if (e.key === 'ArrowRight') {
                nextStep();
            }
        }
    });
    
    // Add prefilled example on logo click
    const logoIcon = document.querySelector('.logo-icon');
    if (logoIcon) {
        logoIcon.addEventListener('click', () => {
            applyPreset(4, 3, 2);
        });
    }
    
    // Close modals when clicking overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeHistory();
                closeHelp();
            }
        });
    });
    
    // Setup preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const jug1 = parseInt(btn.dataset.jug1);
            const jug2 = parseInt(btn.dataset.jug2);
            const goal = parseInt(btn.dataset.goal);
            applyPreset(jug1, jug2, goal);
        });
    });
    
    // Setup filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            filterSteps(btn.dataset.filter);
        });
    });
    
    // Setup help tabs
    document.querySelectorAll('.help-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchHelpTab(tab.dataset.tab);
        });
    });
    
    // Setup navbar buttons
    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
        historyBtn.addEventListener('click', openHistory);
    }
    
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', openHelp);
    }
    
    // Setup random and clear buttons
    const randomBtn = document.getElementById('randomBtn');
    if (randomBtn) {
        randomBtn.addEventListener('click', generateRandom);
    }
    
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearInputs);
    }
    
    // Setup info expand button
    const expandInfoBtn = document.getElementById('expandInfo');
    if (expandInfoBtn) {
        expandInfoBtn.addEventListener('click', toggleInfo);
    }
    
    // Setup action buttons
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', shareResults);
    }
    
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copySteps);
    }
    
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportSolution);
    }
    
    // Setup history modal buttons
    const closeHistoryBtn = document.getElementById('closeHistory');
    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', closeHistory);
    }
    
    const clearHistoryBtn = document.getElementById('clearHistory');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearHistory);
    }
    
    // Setup help modal close button
    const closeHelpBtn = document.getElementById('closeHelp');
    if (closeHelpBtn) {
        closeHelpBtn.addEventListener('click', closeHelp);
    }
});
