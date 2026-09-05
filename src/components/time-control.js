import { store } from '../store.js';
import { reminderEngine } from '../engine/reminder-engine.js';

export function initTimeSimulationPanel() {
  const container = document.createElement('div');
  container.id = 'time-simulation-panel';
  container.className = 'fixed bottom-24 left-4 z-[9999] flex flex-col gap-2 pointer-events-auto items-start';
  
  // The toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'w-12 h-12 rounded-full bg-gray-900 text-white shadow-xl flex items-center justify-center font-bold text-lg active:scale-95 transition-transform border-2 border-white opacity-80 hover:opacity-100';
  toggleBtn.innerHTML = '⏩';
  toggleBtn.title = 'Time Simulation (Ctrl+Shift+T)';
  
  // The panel
  const panel = document.createElement('div');
  panel.className = 'bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 p-4 flex-col gap-3 w-[250px] transition-all duration-300 origin-bottom-left hidden opacity-0 scale-90';
  
  function renderPanel() {
    const now = new Date(store.simulatedNow());
    const dateStr = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    panel.innerHTML = `
      <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
        <h3 class="font-bold text-sm text-gray-900">Time Simulation</h3>
        <span class="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">${dateStr}</span>
      </div>
      
      <div class="grid grid-cols-2 gap-2 mb-2">
        <button data-days="1" class="time-btn bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 text-xs font-bold py-2 rounded transition-colors active:scale-95">+1 Day</button>
        <button data-days="3" class="time-btn bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-100 text-xs font-bold py-2 rounded transition-colors active:scale-95">+3 Days</button>
        <button data-days="7" class="time-btn bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 text-xs font-bold py-2 rounded transition-colors active:scale-95">+7 Days</button>
        <button data-days="14" class="time-btn bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 text-xs font-bold py-2 rounded transition-colors active:scale-95">+14 Days</button>
      </div>
      
      <button data-days="30" class="time-btn w-full bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-100 text-xs font-bold py-2 rounded transition-colors mb-2 active:scale-95">+30 Days</button>
      
      <button id="reset-time-btn" class="w-full border border-gray-300 text-gray-600 text-xs font-bold py-2 rounded hover:bg-gray-50 transition-colors active:scale-95">Reset to Real Time</button>
    `;
    
    panel.querySelectorAll('.time-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const days = parseInt(btn.dataset.days);
        reminderEngine.sessionNudgeShown = false; // Allow new nudges on time skip
        store.advanceTime(days);
      });
    });
    
    panel.querySelector('#reset-time-btn').addEventListener('click', () => {
      reminderEngine.sessionNudgeShown = false;
      store.resetTime();
    });
  }

  let isOpen = false;
  toggleBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    if (isOpen) {
      panel.classList.remove('hidden');
      renderPanel(); // Ensure it's up to date
      requestAnimationFrame(() => {
        panel.classList.remove('opacity-0', 'scale-90');
        panel.classList.add('opacity-100', 'scale-100');
      });
    } else {
      panel.classList.remove('opacity-100', 'scale-100');
      panel.classList.add('opacity-0', 'scale-90');
      setTimeout(() => panel.classList.add('hidden'), 300);
    }
  });

  // Re-render panel if time changes while open
  store.subscribe(() => {
    if (isOpen) {
      renderPanel();
    }
  });

  const label = document.createElement('div');
  label.className = 'text-[10px] font-bold text-gray-500 bg-white/90 backdrop-blur px-2 py-0.5 rounded-full shadow-sm border border-gray-200 pointer-events-none text-center leading-tight';
  label.innerHTML = 'Time<br>Travel';

  const wrapper = document.createElement('div');
  wrapper.className = 'flex flex-col items-center gap-1';
  wrapper.appendChild(label);
  wrapper.appendChild(toggleBtn);

  renderPanel();
  container.appendChild(panel);
  container.appendChild(wrapper);
  document.body.appendChild(container);
  
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 't') {
      toggleBtn.click();
    }
  });
}
