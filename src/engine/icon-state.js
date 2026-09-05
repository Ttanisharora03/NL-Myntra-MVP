import { store } from '../store.js';

export const iconStateEngine = {
  computeIconState() {
    const items = store.state.wishlist;
    if (items.length === 0) return { state: 'default', count: 0, maxAge: 0 };
    
    let maxAge = 0;
    let agingCount = 0;
    
    for (const item of items) {
      const age = store.getItemAge(item);
      if (age > maxAge) maxAge = age;
      if (age >= 3) agingCount++;
    }
    
    if (maxAge >= 14) return { state: 'urgent', count: agingCount, maxAge: Math.floor(maxAge) };
    if (maxAge >= 7)  return { state: 'hot', count: agingCount, maxAge: Math.floor(maxAge) };
    if (maxAge >= 3)  return { state: 'warm', count: agingCount, maxAge: Math.floor(maxAge) };
    
    return { state: 'default', count: 0, maxAge: Math.floor(maxAge) };
  }
};
