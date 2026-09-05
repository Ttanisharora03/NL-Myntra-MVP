import { store } from '../store.js';

export const reminderEngine = {
  sessionNudgeShown: false,

  evaluate() {
    if (this.sessionNudgeShown) return;

    const items = [...store.state.wishlist].sort((a, b) => a.addedAt - b.addedAt);
    const validItems = [];

    for (const item of items) {
      const age = store.getItemAge(item);
      const tier = this.determineTier(age);
      if (!tier) continue;
      
      const history = store.state.nudgeHistory.find(h => h.itemId === item.productId && h.tier === tier);
      if (history && history.interactedAt) continue;
      
      if (item.lastViewedAt) {
          const ageSinceView = (store.simulatedNow() - item.lastViewedAt) / (1000 * 60 * 60 * 24);
          if (ageSinceView < 3) continue;
      }

      validItems.push({ item, tier });
    }

    if (validItems.length === 0) return;

    // Find the highest severity tier present
    const tiers = ['lastChance', 'urgency', 'second', 'first'];
    let selectedTier = null;
    for (const t of tiers) {
      if (validItems.some(v => v.tier === t)) {
        selectedTier = t;
        break;
      }
    }

    if (!selectedTier) return;

    const itemsInTier = validItems.filter(v => v.tier === selectedTier).map(v => v.item);
    
    this.triggerNudge(itemsInTier, selectedTier);
    this.sessionNudgeShown = true;
  },

  determineTier(age) {
    if (age >= 30) return 'lastChance';
    if (age >= 14) return 'urgency';
    if (age >= 7) return 'second';
    if (age >= 3) return 'first';
    return null;
  },

  triggerNudge(items, tier) {
    items.forEach(item => {
      store.state.nudgeHistory.push({
        itemId: item.productId,
        tier,
        triggeredAt: store.simulatedNow(),
        interactedAt: null
      });
    });
    store.notify(); 
    
    let layer = document.getElementById('nudge-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'nudge-layer';
      layer.className = 'fixed z-[150] w-full max-w-[430px] left-1/2 -translate-x-1/2 pointer-events-none flex flex-col';
      document.body.appendChild(layer);
    }
    
    const products = items.map(i => store.getProduct(i.productId)).filter(p => p);
    
    if (tier === 'first') {
      this.renderToast(products, layer, tier);
    } else if (tier === 'second') {
      this.renderBanner(products, false, layer, tier);
    } else if (tier === 'lastChance') {
      this.renderBanner(products, true, layer, tier);
    } else if (tier === 'urgency') {
      this.renderModal(products, layer, tier);
    }
  },

  markInteracted(productId, tier) {
    const history = store.state.nudgeHistory.find(h => h.itemId === productId && h.tier === tier);
    if (history) {
      history.interactedAt = store.simulatedNow();
      store.notify();
    }
    const layer = document.getElementById('nudge-layer');
    if (layer) {
      layer.innerHTML = '';
      layer.className = 'fixed z-[150] w-full max-w-[430px] left-1/2 -translate-x-1/2 pointer-events-none flex flex-col';
    }
  },

  markMultipleInteracted(productIds, tier) {
    productIds.forEach(id => {
      const history = store.state.nudgeHistory.find(h => h.itemId === id && h.tier === tier);
      if (history) history.interactedAt = store.simulatedNow();
    });
    store.notify();
    const layer = document.getElementById('nudge-layer');
    if (layer) {
      layer.innerHTML = '';
      layer.className = 'fixed z-[150] w-full max-w-[430px] left-1/2 -translate-x-1/2 pointer-events-none flex flex-col';
    }
  },

  renderToast(products, layer, tier) {
    const p = products[0];
    const moreCount = products.length - 1;
    const ids = products.map(p => p.id).join(',');
    
    layer.className = 'fixed z-[150] w-full max-w-[430px] left-1/2 -translate-x-1/2 pointer-events-none flex flex-col bottom-20 px-4';
    layer.innerHTML = `
      <div class="bg-gray-900 text-white rounded-lg shadow-xl p-3 flex items-center gap-3 animate-slide-up pointer-events-auto relative overflow-hidden transition-all duration-300">
        <button data-action="dismiss-multiple-nudge" data-ids="${ids}" data-tier="${tier}" class="absolute top-1 right-1 text-gray-400 p-1"><span class="material-symbols-outlined text-[16px]">close</span></button>
        
        <div class="relative w-12 h-12 shrink-0">
          <div class="w-12 h-12 bg-gray-800 rounded bg-cover bg-center" style="background-image: url('${p.image}')"></div>
          ${moreCount > 0 ? `<div class="absolute -bottom-1 -right-1 bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-gray-900">+${moreCount}</div>` : ''}
        </div>
        
        <div class="flex flex-col flex-1">
          <span class="text-xs font-bold text-pink-400">Still thinking about ${moreCount > 0 ? 'these?' : 'this?'}</span>
          <span class="text-sm font-medium truncate w-48">${p.brand}${moreCount > 0 ? ` & ${moreCount} other item(s)` : ''}</span>
        </div>
        <button data-action="nudge-cta" data-id="wishlist" data-tier="${tier}" class="text-xs font-bold bg-white text-black px-3 py-1.5 rounded uppercase shrink-0">View</button>
      </div>
    `;
    
    setTimeout(() => {
      if (layer.innerHTML.includes(p.id)) {
        this.markMultipleInteracted(products.map(pr => pr.id), tier);
      }
    }, 6000);
  },

  renderBanner(products, isLastChance, layer, tier) {
    layer.className = 'fixed z-[150] w-full max-w-[430px] left-1/2 -translate-x-1/2 pointer-events-none flex flex-col top-14';
    const ids = products.map(p => p.id).join(',');
    
    if (isLastChance) {
      layer.innerHTML = `
        <div class="bg-red-50 text-red-900 px-4 py-3 border-b border-red-200 flex items-center justify-between shadow-sm pointer-events-auto animate-fade-in relative">
          <div class="flex items-center gap-3">
             <span class="material-symbols-outlined text-red-500">warning</span>
             <div class="flex flex-col">
               <span class="text-xs font-bold">${products.length} item(s) expiring soon!</span>
               <span class="text-[10px]">Items older than 30 days may go out of stock.</span>
             </div>
          </div>
          <button data-action="nudge-cta" data-id="wishlist" data-tier="${tier}" class="text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded">Review</button>
          <button data-action="dismiss-multiple-nudge" data-ids="${ids}" data-tier="${tier}" class="absolute top-1 right-1 text-red-400 p-1"><span class="material-symbols-outlined text-[14px]">close</span></button>
        </div>
      `;
    } else {
      const p = products[0];
      const moreCount = products.length - 1;
      layer.innerHTML = `
        <div class="bg-yellow-50 text-yellow-900 px-4 py-3 border-b border-yellow-200 flex items-center gap-3 shadow-sm pointer-events-auto animate-fade-in relative">
          <button data-action="dismiss-multiple-nudge" data-ids="${ids}" data-tier="${tier}" class="absolute top-1 right-1 text-yellow-600 p-1"><span class="material-symbols-outlined text-[14px]">close</span></button>
          
          <div class="relative w-10 h-10 shrink-0">
            <div class="w-10 h-10 bg-white rounded border border-yellow-200 bg-cover bg-center" style="background-image: url('${p.image}')"></div>
            ${moreCount > 0 ? `<div class="absolute -top-2 -right-2 bg-yellow-500 text-yellow-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-yellow-100">+${moreCount}</div>` : ''}
          </div>
          
          <div class="flex flex-col flex-1 pr-4">
             <span class="text-[11px] font-bold text-yellow-700">Saved 7+ days ago</span>
             <span class="text-xs truncate w-48">${moreCount > 0 ? `${products.length} items waiting for you!` : p.name}</span>
          </div>
          <button data-action="nudge-cta" data-id="wishlist" data-tier="${tier}" class="text-[10px] font-bold bg-yellow-400 text-yellow-900 px-2 py-1 rounded">View</button>
        </div>
      `;
    }
  },

  renderModal(products, layer, tier) {
    layer.className = 'fixed inset-0 z-[200] pointer-events-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in left-1/2 -translate-x-1/2 w-full max-w-[430px]';
    const viewers = Math.floor(Math.random() * (45 - 12) + 12);
    const ids = products.map(p => p.id).join(',');
    const p = products[0];
    const moreCount = products.length - 1;
    
    layer.innerHTML = `
      <div class="bg-white rounded-2xl overflow-hidden w-full max-w-[340px] shadow-2xl scale-in relative flex flex-col">
        <button data-action="dismiss-multiple-nudge" data-ids="${ids}" data-tier="${tier}" class="absolute top-3 right-3 z-10 w-8 h-8 bg-black/20 rounded-full flex items-center justify-center text-white backdrop-blur"><span class="material-symbols-outlined text-[18px]">close</span></button>
        
        <div class="w-full h-[220px] bg-gray-100 bg-cover bg-center relative" style="background-image: url('${p.image}')">
           ${moreCount > 0 ? `
             <div class="absolute top-3 left-3 bg-red-600 text-white px-3 py-1.5 rounded-full text-[11px] font-bold shadow-md uppercase tracking-wide border-2 border-white">
               +${moreCount} More Items
             </div>
           ` : ''}
           <div class="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 text-red-600 shadow">
             <span class="material-symbols-outlined text-[14px]">local_fire_department</span>
             ${viewers} people viewing these now!
           </div>
        </div>
        
        <div class="p-5 flex flex-col items-center text-center">
           <h3 class="font-bold text-lg text-gray-900 leading-tight mb-1">Don't miss out!</h3>
           <p class="text-sm text-gray-500 mb-5">You saved ${moreCount > 0 ? `these ${products.length} items` : `this item`} 2 weeks ago and they're selling fast. Secure them before they're gone!</p>
           
           <div class="flex flex-col w-full gap-2">
             <button data-action="nudge-cta" data-id="wishlist" data-tier="${tier}" class="w-full bg-myntra text-white font-bold py-3 rounded-lg uppercase text-sm shadow-md active:scale-95 transition-transform">View ${moreCount > 0 ? 'Items' : 'Item'}</button>
             <button data-action="dismiss-multiple-nudge" data-ids="${ids}" data-tier="${tier}" class="w-full bg-transparent text-gray-500 font-bold py-3 rounded-lg uppercase text-sm active:bg-gray-50">Not Interested</button>
           </div>
        </div>
      </div>
    `;
  }
};
