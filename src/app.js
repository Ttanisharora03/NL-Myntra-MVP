import { addRoute, onRouteChange, navigateTo, getCurrentPath, triggerRoute } from './router.js';
import { store } from './store.js';
import { reminderEngine } from './engine/reminder-engine.js';
import { iconStateEngine } from './engine/icon-state.js';
import { initTimeSimulationPanel } from './components/time-control.js';

// --- Toast System ---
let toastTimeout;
window.showToast = function(message) {
  let toastEl = document.getElementById('global-toast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'global-toast';
    toastEl.className = 'fixed bottom-[80px] left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium z-[100] transition-all duration-300 translate-y-10 opacity-0 pointer-events-none';
    document.body.appendChild(toastEl);
  }
  
  toastEl.textContent = message;
  // trigger reflow
  void toastEl.offsetWidth;
  
  toastEl.classList.remove('translate-y-10', 'opacity-0');
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.add('translate-y-10', 'opacity-0');
  }, 2500);
}

// --- Event Delegation ---
document.addEventListener('click', (e) => {
  // Wishlist toggle
  const wishlistBtn = e.target.closest('[data-action="toggle-wishlist"]');
  if (wishlistBtn) {
    e.preventDefault();
    const pid = wishlistBtn.dataset.id;
    store.toggleWishlist(pid);
    const added = store.isInWishlist(pid);
    window.showToast(added ? 'Added to Wishlist' : 'Removed from Wishlist');
    return;
  }

  // Remove from Wishlist  // Generic Wishlist / Bag Interactions
  const removeWishlistBtn = e.target.closest('[data-action="remove-wishlist"]');
  if (removeWishlistBtn) {
    e.preventDefault();
    store.removeFromWishlist(removeWishlistBtn.dataset.id);
    return;
  }
  
  const setWishlistTabBtn = e.target.closest('[data-action="set-wishlist-tab"]');
  if (setWishlistTabBtn) {
    e.preventDefault();
    const tab = setWishlistTabBtn.dataset.tab;
    if (store.state.wishlistTab === tab) {
      store.setWishlistTab('ALL');
    } else {
      store.setWishlistTab(tab);
    }
    return;
  }

  // Move to bag
  const moveToBagBtn = e.target.closest('[data-action="move-to-bag"]');
  if (moveToBagBtn) {
    e.preventDefault();
    const pid = moveToBagBtn.dataset.id;
    store.addToBag(pid, 'M', 1);
    store.removeFromWishlist(pid);
    window.showToast('Moved to Bag');
    return;
  }

  // Add to bag (from PDP)
  const addToBagBtn = e.target.closest('[data-action="add-to-bag"]');
  if (addToBagBtn) {
    e.preventDefault();
    const productId = addToBagBtn.dataset.id;
    const selectedSize = store.getSelectedSize(productId);
    store.addToBag(productId, selectedSize, 1);
    window.showToast(`Added size ${selectedSize} to Bag`);
    return;
  }
  
  // Select Size (from PDP)
  const selectSizeBtn = e.target.closest('[data-action="select-size"]');
  if (selectSizeBtn) {
    e.preventDefault();
    store.setSelectedSize(selectSizeBtn.dataset.id, selectSizeBtn.dataset.size);
    return;
  }
  
  // Remove from Bag
  const removeBagBtn = e.target.closest('[data-action="remove-bag"]');
  if (removeBagBtn) {
    e.preventDefault();
    store.removeFromBag(removeBagBtn.dataset.id, removeBagBtn.dataset.size);
    window.showToast('Removed from Bag');
    return;
  }
  
  // Place Order (Open Payment Panel)
  const placeOrderBtn = e.target.closest('[data-action="place-order"]');
  if (placeOrderBtn) {
    e.preventDefault();
    const totals = store.getBagTotals();
    if (totals.itemCount === 0) {
      window.showToast('Please select at least one item');
      return;
    }
    openPaymentPanel();
    return;
  }

  // Close Payment Panel
  const closePaymentBtn = e.target.closest('[data-action="close-payment"]');
  if (closePaymentBtn) {
    e.preventDefault();
    closePaymentPanel();
    return;
  }

  // Confirm Order (Finalize)
  const confirmOrderBtn = e.target.closest('[data-action="confirm-order"]');
  if (confirmOrderBtn) {
    e.preventDefault();
    closePaymentPanel();
    store.clearSelectedBagItems();
    window.showToast('Order Placed Successfully!');
    navigateTo('#/');
    return;
  }
  
  // Toggle Bag Item Selection
  const toggleBagSelectionBtn = e.target.closest('[data-action="toggle-bag-selection"]');
  if (toggleBagSelectionBtn) {
    e.preventDefault();
    store.toggleBagItemSelection(toggleBagSelectionBtn.dataset.id, toggleBagSelectionBtn.dataset.size);
    return;
  }
  
  // Share Product
  const shareBtn = e.target.closest('[data-action="share-product"]');
  if (shareBtn) {
    e.preventDefault();
    const productId = shareBtn.dataset.id;
    const url = window.location.origin + window.location.pathname + '#/product/' + productId;
    
    if (navigator.share) {
      navigator.share({
        title: 'Check out this product on Myntra MVP',
        url: url
      }).catch(() => {
        // Fallback if user cancels or it fails
        navigator.clipboard.writeText(url).then(() => {
          window.showToast('Link copied to clipboard!');
        });
      });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        window.showToast('Link copied to clipboard!');
      });
    }
    return;
  }
  
  // Toggle All Bag Items
  const toggleAllBagBtn = e.target.closest('[data-action="toggle-all-bag-selection"]');
  if (toggleAllBagBtn) {
    e.preventDefault();
    // if all are selected, deselect all. Otherwise, select all.
    const allSelected = store.state.bag.every(i => i.selected);
    store.toggleAllBagItems(!allSelected);
    return;
  }

  // Open Notifications
  const notifBtn = e.target.closest('[data-action="open-notifications"]');
  if (notifBtn) {
    e.preventDefault();
    openNotificationsPanel();
    return;
  }

  // Close Notifications
  const closeNotifBtn = e.target.closest('[data-action="close-notifications"]');
  if (closeNotifBtn) {
    e.preventDefault();
    closeNotificationsPanel();
    return;
  }
  
  // Home Tabs
  const homeTabBtn = e.target.closest('[data-action="change-tab"]');
  if (homeTabBtn) {
    e.preventDefault();
    store.setHomeTab(homeTabBtn.dataset.tab);
    return;
  }
  
  // Home Tabs
  const fwdTabBtn = e.target.closest('[data-action="fwd-tab"]');
  if (fwdTabBtn) {
    e.preventDefault();
    store.state.homeTab = fwdTabBtn.dataset.tab;
    store.notify();
    return;
  }
  
  const mnowCatBtn = e.target.closest('[data-action="set-mnow-category"]');
  if (mnowCatBtn) {
    e.preventDefault();
    const cat = mnowCatBtn.dataset.cat;
    if (store.state.mnowCategory === cat) {
      store.setMnowCategory('ALL');
    } else {
      store.setMnowCategory(cat);
    }
    return;
  }
  
  // Nudge interactions
  const dismissMultipleNudge = e.target.closest('[data-action="dismiss-multiple-nudge"]');
  if (dismissMultipleNudge) {
    e.preventDefault();
    const ids = dismissMultipleNudge.dataset.ids.split(',');
    const tier = dismissMultipleNudge.dataset.tier;
    reminderEngine.markMultipleInteracted(ids, tier);
    return;
  }
  
  const nudgeCta = e.target.closest('[data-action="nudge-cta"]');
  if (nudgeCta) {
    e.preventDefault();
    const id = nudgeCta.dataset.id;
    const tier = nudgeCta.dataset.tier;
    
    if (id === 'wishlist' || id === 'all') {
      navigateTo('#/wishlist');
    } else {
      navigateTo('#/product/' + id);
      reminderEngine.markMultipleInteracted([id], tier);
    }
    
    // Also clear the nudge layer
    const layer = document.getElementById('nudge-layer');
    if (layer) {
      layer.innerHTML = '';
      layer.className = 'fixed z-[150] w-full max-w-[430px] left-1/2 -translate-x-1/2 pointer-events-none flex flex-col';
    }
    return;
  }
});

// --- Long Press Tooltip Logic for Wishlist Icon ---
let pressTimer;
let isPressing = false;
let tooltipEl = null;

document.body.addEventListener('pointerdown', (e) => {
  const wishlistIcon = e.target.closest('[data-action="wishlist-icon"]');
  if (wishlistIcon) {
    isPressing = true;
    pressTimer = setTimeout(() => {
      if (isPressing) {
        // Show tooltip
        const { count, maxAge } = iconStateEngine.computeIconState();
        if (count > 0) {
          tooltipEl = document.createElement('div');
          tooltipEl.className = 'absolute top-14 right-4 bg-gray-900 text-white text-xs font-bold px-3 py-2 rounded shadow-lg z-[200] pointer-events-none transition-opacity duration-200';
          tooltipEl.textContent = `${count} item(s) saved, oldest from ${maxAge} days ago.`;
          wishlistIcon.style.position = 'relative';
          wishlistIcon.appendChild(tooltipEl);
        }
      }
    }, 500); // 500ms press-and-hold
  }
});

document.body.addEventListener('pointerup', (e) => {
  isPressing = false;
  clearTimeout(pressTimer);
  if (tooltipEl) {
    tooltipEl.remove();
    tooltipEl = null;
  }
});
document.body.addEventListener('pointercancel', (e) => {
  isPressing = false;
  clearTimeout(pressTimer);
  if (tooltipEl) {
    tooltipEl.remove();
    tooltipEl = null;
  }
});
document.body.addEventListener('contextmenu', (e) => {
  if (e.target.closest('[data-action="wishlist-icon"]')) {
    e.preventDefault(); // Prevent context menu on long press
  }
});

// Scroll To Section
document.addEventListener('click', (e) => {
  const scrollBtn = e.target.closest('[data-action="scroll-to"]');
  if (scrollBtn) {
    e.preventDefault();
    const targetId = scrollBtn.dataset.target;
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      // Offset for sticky header (h-14 = 56px + tab bar ~45px = ~100px)
      const y = targetElement.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({top: y, behavior: 'smooth'});
    }
    return;
  }
  
  // Apply Coupon
  const applyCouponBtn = e.target.closest('[data-action="apply-coupon"]');
  if (applyCouponBtn) {
    e.preventDefault();
    const input = document.getElementById('coupon-input');
    if (input && input.value.trim() !== '') {
      window.showToast(`Coupon ${input.value.toUpperCase()} applied! (Mock)`);
      input.value = '';
    } else {
      window.showToast('Please enter a valid coupon code');
    }
    return;
  }
  
  // Change Pincode
  const changePincodeBtn = e.target.closest('[data-action="change-pincode"]');
  if (changePincodeBtn) {
    e.preventDefault();
    openPincodePanel();
    return;
  }
  
  // Close Pincode Panel
  const closePincodeBtn = e.target.closest('[data-action="close-pincode"]');
  if (closePincodeBtn) {
    e.preventDefault();
    closePincodePanel();
    return;
  }
  
  // Save Pincode
  const savePincodeBtn = e.target.closest('[data-action="save-pincode"]');
  if (savePincodeBtn) {
    e.preventDefault();
    const input = document.getElementById('pincode-input');
    if (input && input.value) {
      if (store.setPincode(input.value)) {
        window.showToast('Delivery pincode updated');
        closePincodePanel();
      } else {
        window.showToast('Please enter a valid 6-digit pincode');
      }
    }
    return;
  }

  // Accordion Toggle
  const toggleAccordionBtn = e.target.closest('[data-action="toggle-accordion"]');
  if (toggleAccordionBtn) {
    e.preventDefault();
    const targetId = toggleAccordionBtn.dataset.target;
    const content = document.getElementById(targetId);
    if (content) {
      content.classList.toggle('hidden');
      const icon = toggleAccordionBtn.querySelector('.accordion-icon');
      if (icon) {
        icon.textContent = content.classList.contains('hidden') ? 'chevron_right' : 'expand_more';
      }
    }
    return;
  }
  
  // Open Edit Profile
  const openEditProfileBtn = e.target.closest('[data-action="open-edit-profile"]');
  if (openEditProfileBtn) {
    e.preventDefault();
    openEditProfilePanel();
    return;
  }
  
  // Close Edit Profile
  const closeEditProfileBtn = e.target.closest('[data-action="close-edit-profile"]');
  if (closeEditProfileBtn) {
    e.preventDefault();
    closeEditProfilePanel();
    return;
  }
  
  // Save Profile
  const saveProfileBtn = e.target.closest('[data-action="save-profile"]');
  if (saveProfileBtn) {
    e.preventDefault();
    const name = document.getElementById('edit-name').value;
    const email = document.getElementById('edit-email').value;
    const phone = document.getElementById('edit-phone').value;
    const address = document.getElementById('edit-address').value;
    
    if (name && email) {
      store.updateUser({ name, email, phone, address });
      window.showToast('Profile updated successfully');
      closeEditProfilePanel();
    } else {
      window.showToast('Name and Email are required');
    }
    return;
  }

  // Filter Category
  const filterCatBtn = e.target.closest('[data-action="filter-category"]');
  if (filterCatBtn) {
    e.preventDefault();
    const cat = filterCatBtn.dataset.category;
    if (store.state.categoryFilter === cat) {
      store.setCategoryFilter(null); // toggle off
    } else {
      store.setCategoryFilter(cat);
    }
    return;
  }
  
  // Clear Search
  const clearSearchBtn = e.target.closest('[data-action="clear-search"]');
  if (clearSearchBtn) {
    e.preventDefault();
    store.setSearchQuery('');
    return;
  }
  
  // Logout
  const logoutBtn = e.target.closest('[data-action="logout"]');
  if (logoutBtn) {
    e.preventDefault();
    if (window.confirm("Are you sure you want to log out?")) {
      store.state.bag = [];
      store.state.wishlist = [];
      window.location.hash = '#/';
      window.showToast('Logged out successfully');
      store.notify();
    }
    return;
  }
  
  // Nudge Interactions
  const dismissNudgeBtn = e.target.closest('[data-action="dismiss-nudge"]');
  if (dismissNudgeBtn) {
    e.preventDefault();
    reminderEngine.markInteracted(dismissNudgeBtn.dataset.id, dismissNudgeBtn.dataset.tier);
    return;
  }
  
  const nudgeCtaBtn = e.target.closest('[data-action="nudge-cta"]');
  if (nudgeCtaBtn) {
    e.preventDefault();
    reminderEngine.markInteracted(nudgeCtaBtn.dataset.id, nudgeCtaBtn.dataset.tier);
    const id = nudgeCtaBtn.dataset.id;
    if (id === 'wishlist') {
      navigateTo('/wishlist');
    } else {
      navigateTo('/product/' + id);
    }
    return;
  }

  // Generic Not Implemented Icons
  const dummyBtn = e.target.closest('[data-dummy]');
  if (dummyBtn) {
    e.preventDefault();
    window.showToast('Feature coming soon!');
    return;
  }
});

// Event delegation for change events (dropdowns & inputs)
document.body.addEventListener('change', (e) => {
  // Search Input
  if (e.target.matches('[data-action="search-input"]')) {
    store.setSearchQuery(e.target.value.trim());
    return;
  }
  
  const sizeSelect = e.target.closest('[data-action="change-bag-size"]');
  if (sizeSelect) {
    const newSize = sizeSelect.value;
    const oldSize = sizeSelect.dataset.oldsize;
    const productId = sizeSelect.dataset.id;
    store.updateBagItemSize(productId, oldSize, newSize);
    return;
  }
  
  const qtySelect = e.target.closest('[data-action="change-bag-qty"]');
  if (qtySelect) {
    const newQty = parseInt(qtySelect.value, 10);
    const size = qtySelect.dataset.size;
    const productId = qtySelect.dataset.id;
    store.updateBagItemQty(productId, size, newQty);
    return;
  }
});

// --- Notifications Panel ---
function openNotificationsPanel() {
  let panel = document.getElementById('notifications-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'notifications-panel';
    panel.className = 'fixed inset-0 z-[200] flex flex-col pointer-events-none';
    document.body.appendChild(panel);
  }
  
  const notifications = store.state.notifications || [];
  
  panel.innerHTML = `
    <div data-action="close-notifications" class="absolute inset-0 bg-black/50 transition-opacity duration-300 opacity-0 pointer-events-auto" id="notif-backdrop"></div>
    <div id="notif-content" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-2xl shadow-xl transform translate-y-full transition-transform duration-300 flex flex-col h-[70vh] pointer-events-auto">
      <div class="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 class="font-bold text-lg text-gray-900">Notifications</h2>
        <button data-action="close-notifications" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-4">
        ${notifications.length === 0 ? `
          <div class="flex flex-col items-center justify-center h-full text-gray-500">
            <span class="material-symbols-outlined text-[64px] mb-4 text-gray-300">notifications_off</span>
            <p class="font-medium text-gray-900">No new notifications</p>
            <p class="text-xs mt-1">We'll let you know when something comes up!</p>
          </div>
        ` : `
          <div class="flex flex-col gap-3">
            ${notifications.map(n => `
              <div class="bg-blue-50 border border-blue-100 p-3 rounded-xl flex gap-3">
                <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                  <span class="material-symbols-outlined">notifications_active</span>
                </div>
                <div class="flex flex-col">
                  <span class="font-bold text-sm text-gray-900">${n.title}</span>
                  <span class="text-xs text-gray-600 mt-0.5">${n.message}</span>
                  <span class="text-[10px] text-gray-400 mt-2">${new Date(n.time).toLocaleString()}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;
  
  // Animate in
  requestAnimationFrame(() => {
    document.getElementById('notif-backdrop').classList.remove('opacity-0');
    document.getElementById('notif-content').classList.remove('translate-y-full');
  });
}

function closeNotificationsPanel() {
  const backdrop = document.getElementById('notif-backdrop');
  const content = document.getElementById('notif-content');
  if (backdrop && content) {
    backdrop.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    setTimeout(() => {
      const panel = document.getElementById('notifications-panel');
      if (panel) panel.innerHTML = '';
    }, 300);
  }
}

// --- Payment Panel ---
function openPaymentPanel() {
  let panel = document.getElementById('payment-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'payment-panel';
    panel.className = 'fixed inset-0 z-[200] flex flex-col pointer-events-none';
    document.body.appendChild(panel);
  }
  
  const totals = store.getBagTotals();
  
  panel.innerHTML = `
    <div data-action="close-payment" class="absolute inset-0 bg-black/50 transition-opacity duration-300 opacity-0 pointer-events-auto" id="pay-backdrop"></div>
    <div id="pay-content" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-2xl shadow-xl transform translate-y-full transition-transform duration-300 flex flex-col pb-safe pointer-events-auto">
      <div class="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 class="font-bold text-lg text-gray-900">Select Payment Mode</h2>
        <button data-action="close-payment" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      
      <div class="p-4 flex flex-col gap-4">
        <div class="bg-blue-50 border border-blue-100 rounded-lg p-3 flex justify-between items-center">
          <span class="text-sm font-medium text-gray-700">Amount Payable</span>
          <span class="font-black text-lg text-blue-700">₹${totals.finalAmount}</span>
        </div>
        
        <div class="flex flex-col border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          <label class="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer">
            <input type="radio" name="payment" class="w-5 h-5 text-myntra focus:ring-myntra" checked>
            <div class="flex flex-col">
              <span class="font-bold text-sm text-gray-900">Cash on Delivery (COD)</span>
              <span class="text-xs text-gray-500">Pay cash upon delivery</span>
            </div>
            <span class="material-symbols-outlined ml-auto text-gray-400">payments</span>
          </label>
          
          <label class="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer">
            <input type="radio" name="payment" class="w-5 h-5 text-myntra focus:ring-myntra">
            <div class="flex flex-col">
              <span class="font-bold text-sm text-gray-900">UPI</span>
              <span class="text-xs text-gray-500">Google Pay, PhonePe, Paytm</span>
            </div>
            <span class="material-symbols-outlined ml-auto text-gray-400">qr_code_scanner</span>
          </label>
          
          <label class="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer">
            <input type="radio" name="payment" class="w-5 h-5 text-myntra focus:ring-myntra">
            <div class="flex flex-col">
              <span class="font-bold text-sm text-gray-900">Credit Card</span>
              <span class="text-xs text-gray-500">Visa, Mastercard, Amex</span>
            </div>
            <span class="material-symbols-outlined ml-auto text-gray-400">credit_card</span>
          </label>
          
          <label class="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer">
            <input type="radio" name="payment" class="w-5 h-5 text-myntra focus:ring-myntra">
            <div class="flex flex-col">
              <span class="font-bold text-sm text-gray-900">Debit Card</span>
              <span class="text-xs text-gray-500">All major banks supported</span>
            </div>
            <span class="material-symbols-outlined ml-auto text-gray-400">credit_card</span>
          </label>
        </div>
        
        <button data-action="confirm-order" class="w-full py-4 bg-myntra text-white font-bold rounded-lg uppercase tracking-wide shadow-md active:scale-[0.98] transition-transform mt-2">
          Confirm Order
        </button>
      </div>
    </div>
  `;
  
  // Animate in
  requestAnimationFrame(() => {
    document.getElementById('pay-backdrop').classList.remove('opacity-0');
    document.getElementById('pay-content').classList.remove('translate-y-full');
  });
}

function closePaymentPanel() {
  const backdrop = document.getElementById('pay-backdrop');
  const content = document.getElementById('pay-content');
  if (backdrop && content) {
    backdrop.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    setTimeout(() => {
      const panel = document.getElementById('payment-panel');
      if (panel) panel.innerHTML = '';
    }, 300);
  }
}

// --- Edit Profile Panel ---
function openEditProfilePanel() {
  let panel = document.getElementById('edit-profile-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'edit-profile-panel';
    panel.className = 'fixed inset-0 z-[200] flex flex-col pointer-events-none';
    document.body.appendChild(panel);
  }
  
  const user = store.state.user;
  
  panel.innerHTML = `
    <div data-action="close-edit-profile" class="absolute inset-0 bg-black/50 transition-opacity duration-300 opacity-0 pointer-events-auto" id="edit-backdrop"></div>
    <div id="edit-content" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-2xl shadow-xl transform translate-y-full transition-transform duration-300 flex flex-col pb-safe pointer-events-auto h-[85vh]">
      <div class="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
        <h2 class="font-bold text-lg text-gray-900">Edit Profile</h2>
        <button data-action="close-edit-profile" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      
      <div class="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">Full Name</label>
          <input type="text" id="edit-name" value="${user.name}" class="border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none focus:border-myntra focus:ring-1 focus:ring-myntra transition-all">
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">Email Address</label>
          <input type="email" id="edit-email" value="${user.email}" class="border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none focus:border-myntra focus:ring-1 focus:ring-myntra transition-all">
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">Phone Number</label>
          <input type="tel" id="edit-phone" value="${user.phone}" class="border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none focus:border-myntra focus:ring-1 focus:ring-myntra transition-all">
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">Address</label>
          <textarea id="edit-address" rows="3" class="border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none focus:border-myntra focus:ring-1 focus:ring-myntra transition-all resize-none">${user.address}</textarea>
        </div>
      </div>
      
      <div class="p-4 border-t border-gray-100 shrink-0">
        <button data-action="save-profile" class="w-full py-3.5 bg-myntra text-white font-bold rounded-lg uppercase tracking-wide shadow-md active:scale-[0.98] transition-transform">
          Save Changes
        </button>
      </div>
    </div>
  `;
  
  // Animate in
  requestAnimationFrame(() => {
    document.getElementById('edit-backdrop').classList.remove('opacity-0');
    document.getElementById('edit-content').classList.remove('translate-y-full');
  });
}

function closeEditProfilePanel() {
  const backdrop = document.getElementById('edit-backdrop');
  const content = document.getElementById('edit-content');
  if (backdrop && content) {
    backdrop.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    setTimeout(() => {
      const panel = document.getElementById('edit-profile-panel');
      if (panel) panel.innerHTML = '';
    }, 300);
  }
}

// --- Pincode Panel ---
function openPincodePanel() {
  let panel = document.getElementById('pincode-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'pincode-panel';
    panel.className = 'fixed inset-0 z-[200] flex flex-col pointer-events-none';
    document.body.appendChild(panel);
  }
  
  panel.innerHTML = `
    <div data-action="close-pincode" class="absolute inset-0 bg-black/50 transition-opacity duration-300 opacity-0 pointer-events-auto" id="pin-backdrop"></div>
    <div id="pin-content" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-2xl shadow-xl transform translate-y-full transition-transform duration-300 flex flex-col pb-safe pointer-events-auto">
      <div class="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 class="font-bold text-lg text-gray-900">Change Delivery Pincode</h2>
        <button data-action="close-pincode" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      
      <div class="p-4 flex flex-col gap-4">
        <p class="text-sm text-gray-500">Enter a pincode to check delivery options and exact delivery time.</p>
        <div class="flex gap-2">
          <input type="tel" id="pincode-input" maxlength="6" placeholder="Enter 6-digit Pincode" value="${store.state.pincode}" class="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none focus:border-myntra focus:ring-1 focus:ring-myntra font-bold tracking-widest text-center">
        </div>
        <button data-action="save-pincode" class="w-full py-3.5 bg-myntra text-white font-bold rounded-lg uppercase tracking-wide shadow-md active:scale-[0.98] transition-transform mt-2">
          Update Pincode
        </button>
      </div>
    </div>
  `;
  
  requestAnimationFrame(() => {
    document.getElementById('pin-backdrop').classList.remove('opacity-0');
    document.getElementById('pin-content').classList.remove('translate-y-full');
  });
}

function closePincodePanel() {
  const backdrop = document.getElementById('pin-backdrop');
  const content = document.getElementById('pin-content');
  if (backdrop && content) {
    backdrop.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    setTimeout(() => {
      const panel = document.getElementById('pincode-panel');
      if (panel) panel.innerHTML = '';
    }, 300);
  }
}

// --- Shared UI ---

function renderTopNav() {
  const { state: iconState, count: iconCount } = iconStateEngine.computeIconState();
  
  let heartClass = 'text-gray-800';
  let badgeHtml = '';
  
  if (iconState === 'warm') {
    heartClass = 'icon-warm material-icons-filled text-pink-500';
  } else if (iconState === 'hot') {
    heartClass = 'material-icons-filled text-pink-600';
    badgeHtml = `<span class="absolute -top-1 -right-2 bg-pink-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">${iconCount}</span>`;
  } else if (iconState === 'urgent') {
    heartClass = 'icon-urgent material-icons-filled text-red-600';
    badgeHtml = `<span class="absolute -top-1 -right-2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">${iconCount}</span>`;
  }

  return `
    <div class="flex items-center justify-between px-4 py-2 bg-white sticky top-0 z-50 pt-safe h-[60px]">
      <div class="flex items-center gap-3">
        <a href="#/profile">
          <div class="w-8 h-8 rounded-full bg-myntra/10 flex items-center justify-center text-myntra border border-myntra/20">
            <span class="material-symbols-outlined text-[20px]">person</span>
          </div>
        </a>
        <div class="flex flex-col">
          <div class="text-[10px] text-gray-500 flex items-center gap-1 font-medium">Deliver to <span class="material-symbols-outlined text-[10px]">expand_more</span></div>
          <div class="text-xs font-bold text-gray-900 leading-tight">${store.state.pincode}</div>
        </div>
      </div>
      
      <!-- Added relative class to parent container to anchor tooltip -->
      <div class="flex items-center gap-4 relative">
        <button data-dummy><span class="material-symbols-outlined text-[24px]">notifications</span></button>
        <a href="#/wishlist" class="relative flex items-center justify-center w-8 h-8 select-none" data-action="wishlist-icon" style="-webkit-touch-callout: none;">
          <span class="material-symbols-outlined text-[24px] transition-colors duration-300 ${heartClass}">favorite</span>
          ${badgeHtml}
        </a>
        <a href="#/bag"><span class="material-symbols-outlined text-[24px]">shopping_bag</span></a>
      </div>
    </div>
  `;
}

function renderBottomNav(activePath) {
  const bagCount = store.state.bag.length;
  
  const navItems = [
    { id: 'home', icon: 'home', label: 'Home', route: '#/' },
    { id: 'fwd', icon: 'play_circle', label: 'FWD', route: '#/fwd' },
    { id: 'mnow', icon: 'bolt', label: 'M-Now', route: '#/mnow' },
    { id: 'luxe', icon: 'diamond', label: 'Luxe', route: '#/luxe' },
    { id: 'bag', icon: 'shopping_bag', label: 'Bag', route: '#/bag', count: bagCount }
  ];

  let activeId = 'home';
  if (activePath.startsWith('/bag')) activeId = 'bag';
  else if (activePath.startsWith('/wishlist')) activeId = 'wishlist'; // Wishlist isn't in bottom nav, but handled
  else if (activePath.startsWith('/fwd')) activeId = 'fwd';
  else if (activePath.startsWith('/mnow')) activeId = 'mnow';
  else if (activePath.startsWith('/luxe')) activeId = 'luxe';

  return `
    <nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-white border-t border-gray-200 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div class="flex justify-between items-center px-4 h-[60px]">
        ${navItems.map(item => `
          <a href="${item.route}" ${item.dummy ? 'data-dummy="true"' : ''} class="relative flex flex-col items-center justify-center gap-1 ${item.id === activeId ? (item.id === 'luxe' ? 'text-yellow-600 font-semibold' : item.id === 'fwd' ? 'text-pink-600 font-semibold' : item.id === 'mnow' ? 'text-blue-600 font-semibold' : 'text-myntra font-semibold') : 'text-gray-500'}">
            <span class="material-symbols-outlined text-[24px] ${item.id === activeId ? 'material-icons-filled' : ''}">${item.icon}</span>
            <span class="text-[10px] tracking-wide">${item.label}</span>
            ${item.count ? `<span class="absolute -top-1 -right-2 bg-myntra text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">${item.count}</span>` : ''}
          </a>
        `).join('')}
      </div>
    </nav>
  `;
}

// --- Screens ---

function splashScreen() {
  return `
    <div class="flex flex-col items-center justify-center h-screen bg-white">
      <div class="flex flex-col items-center gap-4">
        <div class="relative w-20 h-20">
            <div class="w-full h-full bg-gradient-to-tr from-pink-500 via-orange-400 to-yellow-400 rounded-xl flex items-center justify-center animate-pulse">
                <span class="text-white text-3xl font-bold font-serif">M</span>
            </div>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-gray-900">Myntra</h1>
      </div>
    </div>
  `;
}

function homeScreen() {
  const activeTab = store.state.homeTab;
  let products = store.state.products.filter(p => p.category !== 'FWD' && p.category !== 'MNOW' && p.category !== 'LUXE');
  
  if (activeTab !== 'ALL') {
    products = products.filter(p => p.gender === activeTab || p.gender === 'UNISEX');
  }
  
  if (store.state.categoryFilter) {
    if (store.state.categoryFilter === 'Fashion') {
      products = products.filter(p => !p.superCategory);
    } else {
      products = products.filter(p => p.superCategory === store.state.categoryFilter);
    }
  }
  
  if (store.state.searchQuery) {
    const q = store.state.searchQuery.toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.brand.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q)
    );
  }
  
  // Trigger reminder evaluation after render
  requestAnimationFrame(() => {
    reminderEngine.evaluate();
  });

  return `
    <div class="flex flex-col w-full bg-gradient-to-b from-blue-50 to-white min-h-screen pt-4 pb-24">
      <div class="flex justify-between items-center px-4 mb-3">
        <button data-action="change-pincode" class="flex items-center gap-1 text-sm font-semibold text-gray-800">
          <span class="material-symbols-outlined text-[18px]">location_on</span>
          <span>Deliver to ${store.state.pincode}</span>
          <span class="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
        </button>
        <div class="bg-white rounded-full px-3 py-1 text-xs font-bold shadow-sm flex items-center gap-1 border border-gray-100">
           upto ₹100 <span class="text-green-500">₹</span>
        </div>
      </div>

      <div class="flex justify-between items-center px-4 mb-4 gap-3">
        <div class="flex-1 bg-white rounded-full flex items-center h-12 px-4 shadow-sm border border-gray-100 text-left overflow-hidden">
           <span class="text-myntra font-bold text-xl mr-2">M</span>
           <input type="text" data-action="search-input" placeholder="Search for brands, products..." value="${store.state.searchQuery}" class="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400 w-full min-w-0">
           ${store.state.searchQuery 
              ? `<button data-action="clear-search" class="flex items-center"><span class="material-symbols-outlined text-gray-600 mr-2">close</span></button>` 
              : `<span class="material-symbols-outlined text-gray-400 mr-3">mic</span>`}
           <span class="material-symbols-outlined text-gray-400">photo_camera</span>
        </div>
        <div class="flex items-center gap-3 text-gray-700">
            <button data-action="open-notifications" class="relative">
              <span class="material-symbols-outlined text-[24px]">notifications</span>
              ${store.state.notifications && store.state.notifications.length > 0 ? `<span class="absolute top-0 right-0 w-2.5 h-2.5 bg-myntra border-2 border-white rounded-full"></span>` : ''}
            </button>
            <a href="#/wishlist"><span class="material-symbols-outlined text-[24px] ${store.state.wishlist.length > 0 ? 'icon-warm material-icons-filled' : ''}">favorite</span></a>
            <a href="#/profile"><span class="material-symbols-outlined text-[24px]">person</span></a>
        </div>
      </div>

      <div class="flex justify-between items-center px-6 mb-4 text-xs font-bold text-gray-600 border-b border-gray-200 pb-2">
        <button data-action="change-tab" data-tab="ALL" class="${activeTab === 'ALL' ? 'text-myntra border-b-2 border-myntra pb-2' : 'pb-2 border-b-2 border-transparent'} transition-colors">ALL</button>
        <button data-action="change-tab" data-tab="MEN" class="${activeTab === 'MEN' ? 'text-myntra border-b-2 border-myntra pb-2' : 'pb-2 border-b-2 border-transparent'} transition-colors">MEN</button>
        <button data-action="change-tab" data-tab="WOMEN" class="${activeTab === 'WOMEN' ? 'text-myntra border-b-2 border-myntra pb-2' : 'pb-2 border-b-2 border-transparent'} transition-colors">WOMEN</button>
        <button data-action="change-tab" data-tab="KIDS" class="${activeTab === 'KIDS' ? 'text-myntra border-b-2 border-myntra pb-2' : 'pb-2 border-b-2 border-transparent'} transition-colors">KIDS</button>
        <button data-dummy class="pb-2 border-b-2 border-transparent"><span class="material-symbols-outlined text-[16px]">grid_view</span></button>
      </div>

      <div class="flex gap-4 overflow-x-auto px-4 no-scrollbar mb-6">
        ${['Fashion', 'Beauty', 'Homeliving', 'Footwear', 'Accessories'].map(cat => `
          <button data-action="filter-category" data-category="${cat}" class="flex flex-col items-center gap-2 min-w-[70px] ${store.state.categoryFilter === cat ? 'scale-105 transition-transform' : ''}">
             <div class="w-16 h-16 rounded-full bg-gray-200 overflow-hidden shrink-0 border-2 flex items-center justify-center ${store.state.categoryFilter === cat ? 'border-myntra bg-pink-50' : 'border-gray-100'}">
                <span class="text-xs font-bold ${store.state.categoryFilter === cat ? 'text-myntra' : 'text-gray-400'}">${cat.substring(0,3).toUpperCase()}</span>
             </div>
             <span class="text-[10px] font-bold ${store.state.categoryFilter === cat ? 'text-myntra' : 'text-gray-700'}">${cat}</span>
          </button>
        `).join('')}
      </div>

      <div class="px-4 mb-6">
        <div class="w-full bg-[#d69f88] rounded-xl h-[280px] p-4 flex flex-col justify-center relative overflow-hidden">
           <div class="z-10 w-2/3">
             <div class="bg-myntra text-white text-xs font-bold px-2 py-1 rounded inline-block mb-2">LIVE NOW</div>
             <h2 class="text-3xl font-extrabold text-white leading-tight mb-2 uppercase drop-shadow-md">Big Brands Bash</h2>
             <div class="bg-yellow-400 text-black text-sm font-bold px-3 py-1 inline-block mb-4">EPIC SAVINGS</div>
             <div class="text-white text-xl font-bold uppercase drop-shadow">Under ₹499</div>
           </div>
        </div>
      </div>

      <!-- Products Grid -->
      ${products.length === 0 ? `
        <div class="flex flex-col items-center justify-center py-20 text-gray-500">
          <span class="material-symbols-outlined text-[48px] text-gray-300 mb-2">search_off</span>
          <p>No products found for "${store.state.searchQuery}"</p>
          <button data-action="clear-search" class="mt-4 px-4 py-2 border border-myntra text-myntra rounded text-sm font-bold">Clear Search</button>
        </div>
      ` : `
      <div class="grid grid-cols-2 gap-3 px-4">
        ${products.map(p => `
          <a href="#/product/${p.id}" class="flex flex-col bg-white rounded-md overflow-hidden shadow-sm relative block">
            <button data-action="toggle-wishlist" data-id="${p.id}" class="absolute top-2 right-2 z-10 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-gray-400">
              <span class="material-symbols-outlined text-[20px] ${store.isInWishlist(p.id) ? 'text-myntra material-icons-filled' : ''}">favorite</span>
            </button>
            <div class="w-full aspect-[3/4] bg-gray-100 bg-cover bg-center" style="background-image: url('${p.image}')"></div>
            <div class="p-2">
              <div class="font-bold text-xs text-gray-900">${p.brand}</div>
              <div class="text-[10px] text-gray-500 truncate">${p.name}</div>
              <div class="font-bold text-sm text-gray-900 mt-1">₹${p.price}</div>
            </div>
          </a>
        `).join('')}
      </div>
      `}
    </div>
  `;
}

function productScreen({ params }) {
  const p = store.getProduct(params.id);
  if (!p) return `<div class="p-10 text-center">Product not found</div>`;
  const isWishlisted = store.isInWishlist(p.id);

  return `
    <div class="flex flex-col w-full bg-white min-h-screen pb-[80px]">
      <div class="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 flex justify-between items-center px-4 h-14 bg-gradient-to-b from-black/50 to-transparent pt-safe">
        <a href="javascript:history.back()" class="w-10 h-10 bg-white/30 backdrop-blur rounded-full flex items-center justify-center text-white"><span class="material-symbols-outlined">arrow_back</span></a>
        <div class="flex gap-2">
          <button data-action="share-product" data-id="${p.id}" class="w-10 h-10 bg-white/30 backdrop-blur rounded-full flex items-center justify-center text-white"><span class="material-symbols-outlined">share</span></button>
          <a href="#/bag" class="w-10 h-10 bg-white/30 backdrop-blur rounded-full flex items-center justify-center text-white relative">
            <span class="material-symbols-outlined">shopping_bag</span>
            ${store.state.bag.length > 0 ? `<span class="absolute top-1 right-1 bg-myntra w-2 h-2 rounded-full"></span>` : ''}
          </a>
        </div>
      </div>

      <div class="w-full aspect-[3/4] bg-gray-100 bg-cover bg-center" style="background-image: url('${p.image}')"></div>
      
      <div class="p-4 flex flex-col gap-2">
        <h1 class="text-xl font-bold text-gray-900">${p.brand}</h1>
        <p class="text-sm text-gray-500">${p.name}</p>
        <div class="flex items-center gap-2 mt-2 border border-gray-200 inline-flex w-fit px-2 py-1 rounded text-xs font-bold shadow-sm">
           ${p.rating} <span class="material-symbols-outlined text-[14px] text-green-600 material-icons-filled">star</span> | ${p.reviewCount} Ratings
        </div>
        
        <div class="flex items-baseline gap-2 mt-4">
          <span class="font-bold text-2xl text-gray-900">₹${p.price}</span>
          <span class="text-sm text-gray-500 line-through">MRP ₹${p.originalPrice}</span>
          <span class="text-sm font-bold text-myntra">(${Math.round(100 - (p.price/p.originalPrice)*100)}% OFF)</span>
        </div>
        <p class="text-green-600 text-xs font-bold">inclusive of all taxes</p>

        <div class="mt-6">
          <h3 class="font-bold text-sm mb-3">SELECT SIZE</h3>
          <div class="flex gap-3">
             ${p.sizes.map(s => {
               const isSelected = store.getSelectedSize(p.id) === s;
               return `<button data-action="select-size" data-id="${p.id}" data-size="${s}" class="w-12 h-12 rounded-full border ${isSelected ? 'border-myntra text-myntra font-black bg-myntra/5' : 'border-gray-300 text-gray-700 font-bold'} flex items-center justify-center transition-colors">${s}</button>`;
             }).join('')}
          </div>
        </div>
      </div>

      <div class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-200 p-3 pb-safe flex gap-3 z-50">
         <button data-action="toggle-wishlist" data-id="${p.id}" class="flex-1 py-3.5 rounded border border-gray-300 flex items-center justify-center font-bold text-gray-700 gap-2 uppercase tracking-wide active:scale-95 transition-transform">
            <span class="material-symbols-outlined ${isWishlisted ? 'text-myntra material-icons-filled' : ''}">favorite</span>
            ${isWishlisted ? 'Wishlisted' : 'Wishlist'}
         </button>
         <button data-action="add-to-bag" data-id="${p.id}" class="flex-1 py-3.5 rounded bg-myntra text-white flex items-center justify-center font-bold gap-2 uppercase tracking-wide shadow-md">
            <span class="material-symbols-outlined">shopping_bag</span>
            Add to Bag
         </button>
      </div>
    </div>
  `;
}

function wishlistScreen() {
  const items = store.getWishlistItems();
  
  // Organic suppression: Mark all active items as viewed when visiting wishlist
  requestAnimationFrame(() => {
    store.state.wishlist.forEach(w => {
       w.lastViewedAt = store.simulatedNow();
    });
  });
  
  return `
    <div class="flex flex-col w-full bg-gray-50 min-h-screen pt-safe pb-24">
      <div class="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100">
        <div class="flex items-center gap-3">
          <a href="#/" class="material-symbols-outlined text-[24px] text-gray-800">arrow_back</a>
          <div class="flex flex-col">
            <span class="font-bold text-gray-900 leading-tight">Wishlist</span>
            <span class="text-[11px] text-gray-500">${items.length} items</span>
          </div>
        </div>
        <div class="flex items-center gap-4 text-gray-700">
          <button data-dummy><span class="material-symbols-outlined text-[24px]">playlist_add_check</span></button>
          <a href="#/bag" class="relative">
            <span class="material-symbols-outlined text-[24px]">shopping_bag</span>
            ${store.state.bag.length > 0 ? `<span class="absolute -top-1 -right-2 bg-myntra text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">${store.state.bag.length}</span>` : ''}
          </a>
        </div>
      </div>

      <button data-action="change-pincode" class="flex items-center justify-between px-4 py-3 bg-white mb-2">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-myntra text-[18px] material-icons-filled">location_on</span>
          <span class="text-sm font-medium text-gray-800">${store.state.pincode}</span>
        </div>
        <span class="material-symbols-outlined text-gray-400 text-[20px]">keyboard_arrow_down</span>
      </button>

      <div class="flex gap-3 px-4 mb-4">
        <button data-action="set-wishlist-tab" data-tab="COLLECTIONS" class="flex-1 py-2 px-4 border rounded-full text-xs font-semibold flex items-center justify-center gap-1 shadow-sm transition-colors ${store.state.wishlistTab === 'COLLECTIONS' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-700'}">
          <span class="material-symbols-outlined text-[16px]">library_add</span> Collections
        </button>
        <button data-action="set-wishlist-tab" data-tab="OUT_OF_STOCK" class="flex-1 py-2 px-4 border rounded-full text-xs font-semibold flex items-center justify-center gap-1 shadow-sm transition-colors ${store.state.wishlistTab === 'OUT_OF_STOCK' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-700'}">
          <span class="material-symbols-outlined text-[16px]">block</span> Out of Stock
        </button>
      </div>

      <!-- Product Grid -->
      <div id="wishlist-grid-container">
        ${renderWishlistContent(items)}
      </div>
    </div>
  `;
}

function renderWishlistContent(items) {
  let renderItems = [...items];
  
  if (store.state.wishlistTab === 'OUT_OF_STOCK') {
    renderItems = renderItems.filter(item => item.product.outOfStock);
  }
  
  const renderProductCard = (p) => `
    <div class="flex flex-col bg-white rounded-md overflow-hidden border border-gray-200">
       <a href="#/product/${p.id}" class="relative aspect-[3/4] bg-gray-100 bg-cover bg-center block" style="background-image: url('${p.image}')">
         <div class="absolute bottom-2 left-2 bg-white/90 rounded px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-0.5 shadow-sm z-10">
           ${p.rating} <span class="material-symbols-outlined text-[10px] text-green-600 material-icons-filled">star</span>
         </div>
         ${p.outOfStock ? '<div class="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-0"><span class="bg-gray-900 text-white text-[10px] px-2 py-1 uppercase font-bold rounded shadow-lg">Out of Stock</span></div>' : ''}
       </a>
       <a href="#/product/${p.id}" class="p-2 flex flex-col gap-1 block">
         <span class="font-bold text-sm text-gray-900 leading-none">${p.brand}</span>
         <span class="text-[10px] text-gray-500 truncate">${p.name}</span>
         <div class="flex items-baseline gap-1 mt-1">
           <span class="font-bold text-sm text-gray-900">₹${p.price}</span>
           <span class="text-[10px] text-teal-600 font-bold">${Math.round(100 - (p.price/p.originalPrice)*100)}% OFF</span>
           <span class="text-[10px] text-gray-400 line-through">₹${p.originalPrice}</span>
         </div>
       </a>
       <div class="border-t border-gray-100 flex items-center divide-x divide-gray-100">
         <button data-action="remove-wishlist" data-id="${p.id}" class="flex-1 py-2 flex items-center justify-center text-gray-400 hover:text-myntra transition-colors"><span class="material-symbols-outlined text-[18px]">delete</span></button>
         <button data-action="move-to-bag" data-id="${p.id}" class="flex-[2] py-2 flex items-center justify-center text-myntra font-bold text-xs uppercase tracking-wider gap-1 ${p.outOfStock ? 'opacity-30 pointer-events-none' : ''}">
           <span class="material-symbols-outlined text-[16px]">shopping_bag</span> Move
         </button>
       </div>
    </div>
  `;

  if (store.state.wishlistTab === 'COLLECTIONS') {
    const categories = [...new Set(renderItems.map(i => i.product.category))];
    if (categories.length === 0) {
      return `<div class="p-4 text-center text-gray-500 mt-10">No collections found.</div>`;
    }
    
    return categories.map(cat => {
      const catItems = renderItems.filter(i => i.product.category === cat);
      return `
        <div class="px-4 mb-8">
          <h3 class="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
            ${cat} 
            <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">${catItems.length}</span>
          </h3>
          <div class="grid grid-cols-2 gap-3">
            ${catItems.map(({product: p}) => renderProductCard(p)).join('')}
          </div>
        </div>
      `;
    }).join('');
  } else {
    // Standard Grid (ALL or OUT_OF_STOCK)
    if (renderItems.length === 0) {
      return `
        <div class="flex flex-col items-center justify-center mt-20 text-gray-500">
          <span class="material-symbols-outlined text-[64px] mb-4 text-gray-300">search_off</span>
          <p>No items found in this view</p>
        </div>
      `;
    }
    
    return `
      <div class="grid grid-cols-2 gap-3 px-4">
        ${renderItems.map(({product: p}) => renderProductCard(p)).join('')}
      </div>
    `;
  }
}

function bagScreen() {
  const items = store.getBagItems();
  const totals = store.getBagTotals();
  const allSelected = items.length > 0 && items.every(i => i.selected);
  const selectedCount = items.filter(i => i.selected).length;

  return `
    <div class="flex flex-col w-full bg-gray-50 min-h-screen pt-safe pb-[140px]">
      <div class="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100">
        <div class="flex items-center gap-3">
          <a href="#/" class="material-symbols-outlined text-[24px] text-gray-800">arrow_back</a>
          <button data-action="change-pincode" class="flex items-center gap-1">
            <span class="font-bold text-gray-900 text-sm">${store.state.pincode}</span>
            <span class="material-symbols-outlined text-[18px] text-gray-500">keyboard_arrow_down</span>
          </button>
        </div>
        <a href="#/wishlist"><span class="material-symbols-outlined text-[24px] text-gray-700">favorite_border</span></a>
      </div>

      ${items.length === 0 ? `
        <div class="flex flex-col items-center justify-center mt-20 text-gray-500">
          <span class="material-symbols-outlined text-[64px] mb-4 text-gray-300">shopping_bag</span>
          <p>Your bag is empty</p>
          <a href="#/" class="mt-4 px-6 py-2 border border-myntra text-myntra rounded font-bold">Continue Shopping</a>
        </div>
      ` : `
      
      <div class="sticky top-14 z-40 flex justify-between items-center px-4 bg-white text-xs font-semibold text-gray-500 border-b border-gray-200 shadow-sm">
        <button data-action="scroll-to" data-target="section-items" class="py-3 text-myntra border-b-2 border-myntra flex-1 text-center transition-colors">Items</button>
        <button data-action="scroll-to" data-target="section-coupons" class="py-3 border-b-2 border-transparent flex-1 text-center hover:text-myntra transition-colors">Coupons & Bank Offers</button>
        <button data-action="scroll-to" data-target="section-price" class="py-3 border-b-2 border-transparent flex-1 text-center hover:text-myntra transition-colors">Price Details</button>
      </div>

      <div class="p-4 flex flex-col gap-4">
          <!-- Items Section -->
          <div id="section-items" class="scroll-mt-[110px]">
            <div class="flex items-center justify-between mt-2">
              <div class="flex items-center gap-2">
                  <span class="font-bold text-sm text-gray-900">Your Bag</span>
              </div>
            </div>

          <div class="flex items-center justify-between py-2">
             <div class="flex items-center gap-2">
               <button data-action="toggle-all-bag-selection" class="material-symbols-outlined text-[20px] ${allSelected ? 'text-myntra material-icons-filled' : 'text-gray-400'}">
                 ${allSelected ? 'check_box' : 'check_box_outline_blank'}
               </button>
               <span class="text-xs font-medium text-gray-700">${selectedCount}/${items.length} Items Selected</span>
             </div>
             <div class="flex items-center gap-3 text-gray-500">
               <button data-dummy><span class="material-symbols-outlined text-[18px]">share</span></button>
               <button data-dummy><span class="material-symbols-outlined text-[18px]">favorite_border</span></button>
             </div>
          </div>

          <!-- Bag Items -->
          <div class="bg-white rounded-lg border border-gray-200 flex flex-col divide-y divide-gray-100">
             ${items.map(({product: p, size, qty, selected}) => `
               <div class="flex gap-3 relative p-3 ${selected ? 'bg-white' : 'bg-gray-50 opacity-70'}">
                 <button data-action="toggle-bag-selection" data-id="${p.id}" data-size="${size}" class="material-symbols-outlined text-[20px] absolute top-2 left-2 ${selected ? 'text-myntra material-icons-filled' : 'text-gray-400 bg-transparent'}">
                   ${selected ? 'check_box' : 'check_box_outline_blank'}
                 </button>
                 <a href="#/product/${p.id}" class="w-20 h-24 bg-gray-100 rounded ml-6 shrink-0 border border-gray-200 bg-cover bg-center block" style="background-image: url('${p.image}')"></a>
                 <div class="flex flex-col flex-1 gap-1">
                   <div class="flex justify-between items-start">
                     <span class="font-bold text-sm text-gray-900">${p.brand}</span>
                     <button data-action="remove-bag" data-id="${p.id}" data-size="${size}" class="material-symbols-outlined text-[18px] text-gray-400">close</button>
                   </div>
                   <span class="text-xs text-gray-500 truncate">${p.name}</span>
                   <div class="flex items-center gap-2 mt-1">
                     <div class="relative flex items-center bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-xs font-medium text-gray-700">
                       Size:
                       <select data-action="change-bag-size" data-id="${p.id}" data-oldsize="${size}" class="ml-1 bg-transparent outline-none appearance-none pr-3 relative z-10 cursor-pointer font-bold text-gray-900">
                         ${p.sizes.map(s => `<option value="${s}" ${s === size ? 'selected' : ''}>${s}</option>`).join('')}
                       </select>
                       <span class="material-symbols-outlined text-[14px] absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">arrow_drop_down</span>
                     </div>
                     <div class="relative flex items-center bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-xs font-medium text-gray-700">
                       Qty:
                       <select data-action="change-bag-qty" data-id="${p.id}" data-size="${size}" class="ml-1 bg-transparent outline-none appearance-none pr-3 relative z-10 cursor-pointer font-bold text-gray-900">
                         ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${n === qty ? 'selected' : ''}>${n}</option>`).join('')}
                       </select>
                       <span class="material-symbols-outlined text-[14px] absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">arrow_drop_down</span>
                     </div>
                   </div>
                   <div class="flex items-baseline gap-1 mt-1">
                     <span class="font-bold text-sm text-gray-900">₹${p.price}</span>
                     <span class="text-xs text-gray-400 line-through">₹${p.originalPrice}</span>
                     <span class="text-xs text-amber-500 font-semibold">₹${p.originalPrice - p.price} Off</span>
                   </div>
                 </div>
               </div>
             `).join('')}
          </div>
          </div>
          
          <!-- Coupons Section -->
          <div id="section-coupons" class="bg-white rounded-lg border border-gray-200 p-4 scroll-mt-[110px]">
             <div class="flex items-center gap-2 mb-3">
               <span class="material-symbols-outlined text-gray-700">local_offer</span>
               <h3 class="font-bold text-sm">Coupons & Bank Offers</h3>
             </div>
             <div class="flex gap-2">
               <input type="text" id="coupon-input" placeholder="Enter Coupon Code" class="flex-1 border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-myntra uppercase">
               <button data-action="apply-coupon" class="bg-gray-100 text-myntra font-bold px-4 py-2 rounded text-sm hover:bg-gray-200 transition-colors">APPLY</button>
             </div>
             <div class="mt-3 text-xs text-gray-500 flex items-start gap-1">
               <span class="material-symbols-outlined text-[14px] text-green-600">check_circle</span>
               <span>10% Instant Discount on HDFC Bank Credit Cards on a min spend of ₹3,000.</span>
             </div>
          </div>
          
          <!-- Price Details Section -->
          <div id="section-price" class="bg-white rounded-lg border border-gray-200 p-4 scroll-mt-[110px]">
             <h3 class="font-bold mb-2">Price Details</h3>
             <div class="flex justify-between text-sm mb-1">
               <span class="text-gray-500">Total MRP</span>
               <span>₹${totals.totalMRP}</span>
             </div>
             <div class="flex justify-between text-sm mb-1">
               <span class="text-gray-500">Discount on MRP</span>
               <span class="text-green-600">-₹${totals.totalDiscount}</span>
             </div>
             <div class="flex justify-between font-bold text-gray-900 mt-2 border-t pt-2 border-gray-100">
               <span>Total Amount</span>
               <span>₹${totals.finalAmount}</span>
             </div>
          </div>
      </div>

      <!-- Bottom Sticky Action -->
      <div class="fixed bottom-[60px] left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-white/95 backdrop-blur-md pb-safe border-t border-gray-100">
        <div class="p-3 flex justify-between items-center gap-4">
          <div class="flex flex-col">
            <span class="font-bold text-lg">₹${totals.finalAmount}</span>
            <span class="text-xs font-bold text-myntra underline">View Details</span>
          </div>
          <button data-action="place-order" class="flex-1 py-3.5 bg-myntra text-white font-bold rounded shadow-md uppercase tracking-wide text-sm active:scale-[0.98] transition-transform">Place Order</button>
        </div>
      </div>
      `}
    </div>
  `;
}

function profileScreen() {
  const user = store.state.user;
  
  return `
    <div class="flex flex-col w-full bg-gray-50 min-h-screen pb-[80px]">
      <div class="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 pt-safe">
        <div class="flex items-center gap-3">
          <a href="#/" class="material-symbols-outlined text-[24px] text-gray-800">arrow_back</a>
          <span class="font-bold text-gray-900 leading-tight">Profile</span>
        </div>
      </div>

      <!-- User Header -->
      <div class="bg-white p-6 flex flex-col items-center gap-3 border-b border-gray-100">
         <div class="w-20 h-20 rounded-full bg-myntra/10 flex items-center justify-center text-myntra border-2 border-myntra/20">
           <span class="material-symbols-outlined text-[40px]">person</span>
         </div>
         <div class="text-center">
           <h2 class="text-xl font-bold text-gray-900">${user.name}</h2>
           <p class="text-sm text-gray-500">${user.email}</p>
         </div>
         <button data-action="open-edit-profile" class="mt-2 text-xs font-bold text-gray-700 bg-gray-100 px-4 py-1.5 rounded-full border border-gray-200 active:bg-gray-200 transition-colors">Edit Profile</button>
      </div>

      <!-- Details Sections -->
      <div class="p-4 flex flex-col gap-4">
        <!-- Contact Info -->
        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
           <h3 class="font-bold text-sm text-gray-900 border-b border-gray-50 pb-2">Contact Details</h3>
           <div class="flex items-center gap-3">
             <span class="material-symbols-outlined text-gray-400 text-[20px]">phone</span>
             <span class="text-sm text-gray-700">${user.phone}</span>
           </div>
           <div class="flex gap-3">
             <span class="material-symbols-outlined text-gray-400 text-[20px]">location_on</span>
             <span class="text-sm text-gray-700 leading-tight">${user.address}</span>
           </div>
        </div>

        <!-- Order History -->
        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
           <h3 class="font-bold text-sm text-gray-900 border-b border-gray-50 pb-2">Order History</h3>
           ${user.orders.map(order => `
             <div class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 last:pb-0">
                <div class="flex flex-col gap-0.5">
                  <span class="font-bold text-xs text-gray-900">${order.id}</span>
                  <span class="text-[10px] text-gray-500">${order.date} • ${order.items} Item(s)</span>
                </div>
                <div class="flex flex-col items-end gap-0.5">
                  <span class="font-bold text-sm text-gray-900">₹${order.total}</span>
                  <span class="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">${order.status}</span>
                </div>
             </div>
           `).join('')}
           <button class="w-full text-center text-xs font-bold text-myntra pt-2 border-t border-gray-50 mt-1">View All Orders</button>
        </div>
        
        <!-- Settings -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden mt-2">
           <!-- Credits -->
           <button data-action="toggle-accordion" data-target="credits-content" class="flex items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50">
             <div class="flex items-center gap-3 text-gray-700">
               <span class="material-symbols-outlined text-[20px]">account_balance_wallet</span>
               <span class="text-sm font-medium">Myntra Credit & Points</span>
             </div>
             <span class="material-symbols-outlined text-gray-400 text-[20px] accordion-icon">chevron_right</span>
           </button>
           <div id="credits-content" class="hidden px-4 py-3 bg-gray-50 border-b border-gray-100 flex flex-col gap-3">
             <div class="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
               <div class="flex flex-col">
                 <span class="text-xs text-gray-500 font-medium">MynCash Balance</span>
                 <span class="text-lg font-bold text-gray-900">₹500.00</span>
               </div>
               <span class="material-symbols-outlined text-myntra text-[24px]">wallet</span>
             </div>
             <div class="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 border-l-4 border-l-yellow-400">
               <div class="flex flex-col">
                 <span class="text-xs text-gray-500 font-medium">Myntra Insider (Gold Tier)</span>
                 <span class="text-lg font-bold text-gray-900">1,250 pts</span>
               </div>
               <span class="material-symbols-outlined text-yellow-500 text-[24px]">stars</span>
             </div>
           </div>

           <!-- Settings -->
           <button data-action="toggle-accordion" data-target="settings-content" class="flex items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50">
             <div class="flex items-center gap-3 text-gray-700">
               <span class="material-symbols-outlined text-[20px]">settings</span>
               <span class="text-sm font-medium">Settings & Privacy</span>
             </div>
             <span class="material-symbols-outlined text-gray-400 text-[20px] accordion-icon">chevron_right</span>
           </button>
           <div id="settings-content" class="hidden px-4 py-3 bg-gray-50 border-b border-gray-100 flex flex-col gap-2">
             <label class="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 cursor-pointer">
               <span class="text-sm text-gray-700 font-medium">Push Notifications</span>
               <input type="checkbox" class="w-4 h-4 text-myntra focus:ring-myntra" checked>
             </label>
             <label class="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 cursor-pointer">
               <span class="text-sm text-gray-700 font-medium">Email Alerts</span>
               <input type="checkbox" class="w-4 h-4 text-myntra focus:ring-myntra" checked>
             </label>
             <button data-dummy class="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 text-left text-sm text-blue-600 font-medium active:bg-gray-50">
               Change Password
             </button>
             <button data-dummy class="flex justify-between items-center bg-white p-3 rounded-lg border border-red-200 text-left text-sm text-red-600 font-medium mt-2 active:bg-gray-50">
               Delete Account
             </button>
           </div>

           <button data-action="logout" class="flex items-center justify-between p-4 active:bg-gray-50">
             <div class="flex items-center gap-3 text-red-600">
               <span class="material-symbols-outlined text-[20px]">logout</span>
               <span class="text-sm font-bold">Logout</span>
             </div>
           </button>
        </div>
      </div>
    </div>
  `;
}

function fwdScreen() {
  const fwdProducts = store.state.products.filter(p => p.category === 'FWD');
  return `
    <div class="flex flex-col w-full bg-black text-white min-h-screen pb-[80px]">
      <div class="flex items-center justify-between px-4 h-14 bg-black border-b border-gray-800 pt-safe">
        <div class="flex items-center gap-3">
          <a href="#/" class="material-symbols-outlined text-[24px] text-white">arrow_back</a>
          <span class="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 text-xl italic tracking-wider">FWD</span>
        </div>
        <div class="flex items-center gap-4 text-white">
          <button data-dummy><span class="material-symbols-outlined text-[24px]">search</span></button>
        </div>
      </div>
      
      <!-- FWD Hero -->
      <div class="w-full h-[200px] bg-gradient-to-r from-purple-900 to-pink-900 flex flex-col justify-end p-4 relative overflow-hidden">
        <div class="absolute inset-0 bg-[url('https://placehold.co/430x200/000000/333333?text=Gen-Z+Trends')] bg-cover bg-center opacity-50 mix-blend-overlay"></div>
        <div class="relative z-10">
          <span class="bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest mb-1 inline-block">Daily Drop #42</span>
          <h2 class="text-3xl font-black italic uppercase">Y2K Revival</h2>
          <p class="text-xs text-gray-300">Curated fits for the aesthetic.</p>
        </div>
      </div>

      <!-- FWD Products -->
      <div class="p-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg">Trending RN</h3>
          <span class="text-xs text-pink-400 font-bold flex items-center gap-1">Swipe <span class="material-symbols-outlined text-[14px]">arrow_forward</span></span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          ${fwdProducts.map(p => `
            <a href="#/product/${p.id}" class="flex flex-col bg-gray-900 rounded-lg overflow-hidden shadow-sm relative block border border-gray-800">
              <button data-action="toggle-wishlist" data-id="${p.id}" class="absolute top-2 right-2 z-10 w-8 h-8 bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-gray-400 active:scale-75 transition-transform">
                <span class="material-symbols-outlined text-[20px] ${store.isInWishlist(p.id) ? 'text-pink-500 material-icons-filled' : ''}">favorite</span>
              </button>
              <div class="w-full aspect-[3/4] bg-gray-800 bg-cover bg-center" style="background-image: url('${p.image}')"></div>
              <div class="p-3">
                <div class="font-black text-xs text-white tracking-wide">${p.brand}</div>
                <div class="text-[10px] text-gray-400 truncate mt-0.5">${p.name}</div>
                <div class="font-bold text-sm text-pink-400 mt-1">₹${p.price}</div>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function mnowScreen() {
  let mnowProducts = store.state.products.filter(p => p.category === 'MNOW');
  if (store.state.mnowCategory && store.state.mnowCategory !== 'ALL') {
    mnowProducts = mnowProducts.filter(p => p.mnowCategory === store.state.mnowCategory);
  }
  
  return `
    <div class="flex flex-col w-full bg-blue-50 min-h-screen pb-[80px]">
      <div class="flex items-center justify-between px-4 h-14 bg-blue-600 text-white pt-safe">
        <div class="flex items-center gap-3">
          <a href="#/" class="material-symbols-outlined text-[24px]">arrow_back</a>
          <div class="flex flex-col">
            <div class="flex items-center gap-1">
              <span class="font-black italic text-lg tracking-wider">M-NOW</span>
              <span class="material-symbols-outlined text-[16px]">bolt</span>
            </div>
            <span class="text-[10px] opacity-80">Delivering in <strong class="text-white">30 MINS</strong></span>
          </div>
        </div>
      </div>
      
      <!-- Address Bar -->
      <button data-action="change-pincode" class="flex items-center justify-between px-4 py-3 bg-white shadow-sm mb-2 w-full active:bg-gray-50 transition-colors">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-blue-600 text-[18px] material-icons-filled">location_on</span>
          <span class="text-sm font-medium text-gray-800">Deliver to: ${store.state.pincode}, Sunshine Apts...</span>
        </div>
        <span class="material-symbols-outlined text-gray-400 text-[20px]">edit</span>
      </button>

      <!-- MNow Categories -->
      <div class="flex gap-4 overflow-x-auto px-4 no-scrollbar py-3">
        ${['Essentials', 'Beauty', 'Grooming', 'Accessories', 'Last Minute'].map(cat => {
          const isActive = store.state.mnowCategory === cat;
          return `
            <button data-action="set-mnow-category" data-cat="${cat}" class="flex flex-col items-center gap-2 min-w-[70px]">
               <div class="w-14 h-14 rounded-xl shadow-sm border flex items-center justify-center transition-colors ${isActive ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-blue-100 text-blue-500'}">
                  <span class="material-symbols-outlined text-[24px]">category</span>
               </div>
               <span class="text-[10px] font-bold ${isActive ? 'text-blue-700' : 'text-gray-700'}">${cat}</span>
            </button>
          `;
        }).join('')}
      </div>

      <!-- MNow Products -->
      <div class="p-4 pt-0 mt-2">
        <h3 class="font-bold text-lg mb-3 text-gray-900">${store.state.mnowCategory === 'ALL' ? 'Need it now?' : store.state.mnowCategory}</h3>
        ${mnowProducts.length === 0 ? `
          <div class="py-10 text-center text-gray-500">
            No items found in this category.
          </div>
        ` : `
        <div class="grid grid-cols-2 gap-3">
          ${mnowProducts.map(p => `
            <a href="#/product/${p.id}" class="flex flex-col bg-white rounded-xl overflow-hidden shadow-sm relative block border border-blue-100">
              <div class="absolute top-2 left-2 z-10 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm">
                <span class="material-symbols-outlined text-[10px]">timer</span> 30 MIN
              </div>
              <button data-action="toggle-wishlist" data-id="${p.id}" class="absolute top-2 right-2 z-10 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-gray-400 active:scale-75 transition-transform">
                <span class="material-symbols-outlined text-[20px] ${store.isInWishlist(p.id) ? 'text-myntra material-icons-filled' : ''}">favorite</span>
              </button>
              <div class="w-full aspect-[4/5] bg-gray-100 bg-cover bg-center" style="background-image: url('${p.image}')"></div>
              <div class="p-3">
                <div class="font-bold text-xs text-gray-900 truncate">${p.brand}</div>
                <div class="text-[10px] text-gray-500 truncate mt-0.5">${p.name}</div>
                <div class="flex items-center justify-between mt-2">
                  <div class="font-black text-sm text-blue-700">₹${p.price}</div>
                  <button data-action="add-to-bag" data-id="${p.id}" class="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center font-black">+</button>
                </div>
              </div>
            </a>
          `).join('')}
        </div>
        `}
      </div>
    </div>
  `;
}

function luxeScreen() {
  const luxeProducts = store.state.products.filter(p => p.category === 'LUXE');
  return `
    <div class="flex flex-col w-full bg-zinc-900 min-h-screen pb-[80px]">
      <div class="flex items-center justify-between px-4 h-14 bg-zinc-950 border-b border-zinc-800 pt-safe">
        <div class="flex items-center gap-3">
          <a href="#/" class="material-symbols-outlined text-[24px] text-yellow-500">arrow_back</a>
          <span class="font-serif text-yellow-500 text-xl tracking-[0.2em] uppercase">Luxe</span>
        </div>
        <div class="flex items-center gap-4 text-yellow-500">
          <a href="#/bag"><span class="material-symbols-outlined text-[24px]">shopping_bag</span></a>
        </div>
      </div>
      
      <!-- Luxe Hero -->
      <div class="w-full h-[250px] bg-zinc-800 flex flex-col items-center justify-center relative overflow-hidden">
        <div class="absolute inset-0 bg-[url('https://placehold.co/430x250/18181b/eab308?text=Premium+Boutique')] bg-cover bg-center opacity-40"></div>
        <div class="relative z-10 text-center px-6">
          <h2 class="text-2xl font-serif text-yellow-500 uppercase tracking-[0.2em] mb-2 border-b border-yellow-500/30 pb-2">The Boutique</h2>
          <p class="text-xs text-zinc-300 font-light tracking-wide">Uncover exclusive collections from world-class designers.</p>
        </div>
      </div>

      <!-- Luxe Brands -->
      <div class="flex gap-6 overflow-x-auto px-6 no-scrollbar py-6 bg-zinc-950 border-y border-zinc-800">
        ${['TOM FORD', 'TISSOT', 'MICHAEL KORS', 'VERSACE', 'ARMANI'].map(brand => `
          <button data-dummy class="flex flex-col items-center min-w-max">
             <span class="text-xs font-serif text-zinc-400 tracking-[0.1em] uppercase hover:text-yellow-500 transition-colors">${brand}</span>
          </button>
        `).join('')}
      </div>

      <!-- Luxe Products -->
      <div class="p-4 pt-6">
        <h3 class="font-serif text-lg mb-4 text-yellow-500 tracking-[0.1em] uppercase text-center">Curated For You</h3>
        <div class="flex flex-col gap-6">
          ${luxeProducts.map(p => `
            <a href="#/product/${p.id}" class="flex flex-col bg-zinc-950 overflow-hidden shadow-2xl relative block border border-zinc-800">
              <button data-action="toggle-wishlist" data-id="${p.id}" class="absolute top-4 right-4 z-10 w-10 h-10 bg-zinc-900/80 backdrop-blur rounded-full flex items-center justify-center text-zinc-500 border border-zinc-700 active:scale-75 transition-transform">
                <span class="material-symbols-outlined text-[22px] ${store.isInWishlist(p.id) ? 'text-yellow-500 material-icons-filled' : ''}">favorite</span>
              </button>
              <div class="w-full aspect-square bg-zinc-800 bg-cover bg-center" style="background-image: url('${p.image}')"></div>
              <div class="p-6 text-center">
                <div class="font-serif text-sm text-yellow-500 tracking-[0.15em] uppercase mb-1">${p.brand}</div>
                <div class="text-xs text-zinc-400 font-light tracking-wide mb-3">${p.name}</div>
                <div class="font-serif text-lg text-zinc-100">₹${p.price.toLocaleString('en-IN')}</div>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// --- Router Setup ---

addRoute('/splash', splashScreen);
addRoute('/', homeScreen);
addRoute('/wishlist', wishlistScreen);
addRoute('/bag', bagScreen);
addRoute('/profile', profileScreen);
addRoute('/fwd', fwdScreen);
addRoute('/mnow', mnowScreen);
addRoute('/luxe', luxeScreen);
addRoute('/product/:id', productScreen);

let unsubscribeStore = null;

function renderCurrentScreen() {
  const container = document.getElementById('screen-container');
  const bottomNavContainer = document.getElementById('bottom-nav');
  
  const path = getCurrentPath();
  
  // Find route handler
  let handler = null;
  let params = {};
  
  // Manual route matching (since we bypassed history listener slightly for forced re-renders)
  const routes = [
    { regex: /^\/splash$/, handler: splashScreen, keys: [] },
    { regex: /^\/wishlist$/, handler: wishlistScreen, keys: [] },
    { regex: /^\/profile$/, handler: profileScreen, keys: [] },
    { regex: /^\/bag$/, handler: bagScreen, keys: [] },
    { regex: /^\/fwd$/, handler: fwdScreen, keys: [] },
    { regex: /^\/mnow$/, handler: mnowScreen, keys: [] },
    { regex: /^\/luxe$/, handler: luxeScreen, keys: [] },
    { regex: /^\/product\/([^\/]+)$/, handler: productScreen, keys: ['id'] },
    { regex: /^\/$/, handler: homeScreen, keys: [] }
  ];
  
  for(let r of routes) {
    const match = path.match(r.regex);
    if(match) {
      handler = r.handler;
      r.keys.forEach((k, i) => params[k] = match[i+1]);
      break;
    }
  }
  
  if(!handler) handler = homeScreen; // fallback
  
  container.innerHTML = handler({ params });
  
  if (path !== '/splash' && !path.startsWith('/product/')) {
    bottomNavContainer.innerHTML = renderBottomNav(path);
  } else {
    bottomNavContainer.innerHTML = '';
  }
}

function init() {
  onRouteChange(({ path }) => {
    renderCurrentScreen();
    window.scrollTo(0, 0);
  });
  if (!window.location.hash || window.location.hash === '#/') {
    navigateTo('#/splash');
    setTimeout(() => {
      if (getCurrentPath() === '/splash') navigateTo('#/');
    }, 2500);
  } else {
    triggerRoute();
  }
  
  initTimeSimulationPanel();
  
  store.subscribe(() => {
    // Re-render current screen when state changes
    renderCurrentScreen();
  });
}

// Run app
init();
