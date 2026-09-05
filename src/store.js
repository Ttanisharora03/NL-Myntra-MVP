import productsData from '../data/products.json';

const STATE_KEY = 'myntra_mvp_state';

class Store {
  constructor() {
    this.state = {
      products: productsData,
      homeTab: 'ALL',
      wishlistTab: 'ALL', // 'ALL' | 'COLLECTIONS' | 'OUT_OF_STOCK'
      mnowCategory: 'ALL',
      searchQuery: '',
      categoryFilter: null,
      selectedSizes: {}, // { productId: 'M' }
      wishlist: [], // { productId, addedAt, lastViewedAt }
      bag: [], // { productId, size, qty, addedAt }
      nudgeHistory: [], // { itemId, tier, triggeredAt, interactedAt }
      timeOffsetMs: 0, // for time travel simulation
      pincode: '110001',
      notifications: [],
      user: {
        name: "Jane Doe",
        phone: "+91 9876543210",
        email: "jane.doe@example.com",
        address: "Flat 4B, Sunshine Apartments, 110001, New Delhi",
        orders: [
          { id: "ORD-9823", date: "Aug 15, 2026", status: "Delivered", total: 1499, items: 2 },
          { id: "ORD-9741", date: "Jul 02, 2026", status: "Delivered", total: 899, items: 1 }
        ]
      }
    };
    this.listeners = [];
    this.hydrate();
  }

  // --- Core State Management ---

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.persist();
    this.listeners.forEach(listener => listener(this.state));
  }

  persist() {
    const dataToSave = {
      wishlist: this.state.wishlist,
      bag: this.state.bag
    };
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn('localStorage not accessible for persist', e);
    }
  }

  hydrate() {
    try {
      const saved = localStorage.getItem(STATE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          this.state.wishlist = parsed.wishlist || [];
          this.state.bag = parsed.bag || [];
        } catch (e) {
          console.error("Failed to parse store data", e);
        }
      }
    } catch (e) {
      console.warn('localStorage not accessible for hydrate', e);
    }
  }

  // --- Getters ---

  getProduct(id) {
    return this.state.products.find(p => p.id === id);
  }

  isInWishlist(productId) {
    return this.state.wishlist.some(item => item.productId === productId);
  }

  getWishlistItems() {
    return this.state.wishlist.map(item => ({
      ...item,
      product: this.getProduct(item.productId)
    })).filter(item => item.product); // Ensure product still exists
  }

  getBagItems() {
    return this.state.bag.map(item => ({
      ...item,
      product: this.getProduct(item.productId)
    })).filter(item => item.product);
  }

  getBagTotals() {
    const items = this.getBagItems().filter(i => i.selected);
    let totalMRP = 0;
    let totalDiscount = 0;
    
    items.forEach(item => {
      const p = item.product;
      const itemMRP = (p.originalPrice || p.price) * item.qty;
      const itemPrice = p.price * item.qty;
      totalMRP += itemMRP;
      totalDiscount += (itemMRP - itemPrice);
    });

    return {
      totalMRP,
      totalDiscount,
      finalAmount: totalMRP - totalDiscount,
      itemCount: items.reduce((acc, i) => acc + i.qty, 0)
    };
  }

  // --- Mutations ---

  toggleWishlist(productId) {
    const idx = this.state.wishlist.findIndex(i => i.productId === productId);
    if (idx >= 0) {
      this.state.wishlist.splice(idx, 1);
    } else {
      this.state.wishlist.push({ 
        productId, 
        addedAt: this.simulatedNow(),
        lastViewedAt: this.simulatedNow()
      });
    }
    this.notify();
  }

  markItemViewed(productId) {
    const item = this.state.wishlist.find(i => i.productId === productId);
    if (item) {
      item.lastViewedAt = this.simulatedNow();
      this.notify();
    }
  }

  removeFromWishlist(productId) {
    this.state.wishlist = this.state.wishlist.filter(i => i.productId !== productId);
    this.notify();
  }

  addToBag(productId, size = 'M', qty = 1) {
    const existing = this.state.bag.find(i => i.productId === productId && i.size === size);
    if (existing) {
      existing.qty += qty;
    } else {
      this.state.bag.push({
        productId,
        size,
        qty,
        addedAt: this.simulatedNow(),
        selected: true
      });
    }
    this.notify();
  }

  removeFromBag(productId, size) {
    this.state.bag = this.state.bag.filter(i => !(i.productId === productId && i.size === size));
    this.notify();
  }
  
  updateBagItemQty(productId, size, newQty) {
    const item = this.state.bag.find(i => i.productId === productId && i.size === size);
    if (item && newQty > 0) {
      item.qty = newQty;
      this.notify();
    } else if (item && newQty === 0) {
      this.removeFromBag(productId, size);
    }
  }
  
  updateBagItemSize(productId, oldSize, newSize) {
    const item = this.state.bag.find(i => i.productId === productId && i.size === oldSize);
    if (!item || oldSize === newSize) return;
    
    // Check if the new size already exists in the bag
    const existingNewSizeItem = this.state.bag.find(i => i.productId === productId && i.size === newSize);
    if (existingNewSizeItem) {
      // Merge quantities
      existingNewSizeItem.qty += item.qty;
      this.removeFromBag(productId, oldSize); // this also notifies, so we don't need to notify again
    } else {
      item.size = newSize;
      this.notify();
    }
  }
  
  toggleBagItemSelection(productId, size) {
    const item = this.state.bag.find(i => i.productId === productId && i.size === size);
    if (item) {
      item.selected = !item.selected;
      this.notify();
    }
  }

  toggleAllBagItems(selected) {
    this.state.bag.forEach(item => item.selected = selected);
    this.notify();
  }
  
  clearSelectedBagItems() {
    this.state.bag = this.state.bag.filter(i => !i.selected);
    this.notify();
  }

  clearBag() {
    this.state.bag = [];
    this.notify();
  }

  setHomeTab(tab) {
    this.state.homeTab = tab;
    this.notify();
  }
  
  setSearchQuery(query) {
    this.state.searchQuery = query;
    this.notify();
  }
  
  setWishlistTab(tab) {
    this.state.wishlistTab = tab;
    this.notify();
  }
  
  setMnowCategory(cat) {
    this.state.mnowCategory = cat;
    this.notify();
  }

  setCategoryFilter(category) {
    this.state.categoryFilter = category;
    this.notify();
  }

  setSelectedSize(productId, size) {
    this.state.selectedSizes[productId] = size;
    this.notify();
  }

  setPincode(code) {
    if (/^\d{6}$/.test(code)) {
      this.state.pincode = code;
      this.notify();
      return true;
    }
    return false;
  }

  updateUser(userData) {
    this.state.user = { ...this.state.user, ...userData };
    this.notify();
  }

  getSelectedSize(productId) {
    if (this.state.selectedSizes[productId]) {
      return this.state.selectedSizes[productId];
    }
    const product = this.getProduct(productId);
    return product && product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'ONESIZE';
  }

  // --- Time Simulation ---

  simulatedNow() {
    return Date.now() + this.state.timeOffsetMs;
  }

  advanceTime(days) {
    this.state.timeOffsetMs += days * 24 * 60 * 60 * 1000;
    this.notify();
  }

  resetTime() {
    this.state.timeOffsetMs = 0;
    this.notify();
  }

  getItemAge(item) {
    const diffMs = this.simulatedNow() - item.addedAt;
    return diffMs / (1000 * 60 * 60 * 24);
  }
}

export const store = new Store();
