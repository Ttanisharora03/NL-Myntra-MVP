# Myntra MVP - "Forgetful Wishlister"

This is a Vanilla JavaScript Single Page Application (SPA) built to solve the "Forgetful Wishlister" problem. It tracks user intent dynamically and brings wishlisted items back into view exactly when the user is most likely to buy.

## Features Built
- **Dynamic Wishlist Icon**: Changes state from "Warm" (pink) to "Urgent" (red glow + badge count) based on how old the items in your wishlist are.
- **Progressive Nudge Engine**: Intelligently prompts users using Toasts, Banners, and Modals when their saved items reach specific time milestones (3 days, 7 days, 14 days, 30 days).
- **M-Now Navigation**: A 30-minute delivery flow with live categories and location simulation.
- **Time Simulation Panel**: A developer tool (Ctrl+Shift+T or bottom-left icon) to instantly fast-forward time to test the nudge mechanics without waiting days.
- **Micro-Interactions**: Premium native app feel with smooth transitions, bounce physics on interactions, and more.

## Tech Stack
- HTML5 / CSS3 / Vanilla JS
- Tailwind CSS (via CDN)
- Vite (for local dev and blazing fast builds)

## Local Development
1. Clone the repository
2. Install dependencies: `npm install`
3. Run local dev server: `npm run dev`
4. The app will open at `http://localhost:5173/`

## Deployment
This app is fully optimized for static site hosting platforms.
- **Vercel / Netlify / GitHub Pages**: 
  - Framework Preset: `Vite`
  - Build Command: `npm run build`
  - Output Directory: `dist`

Simply push this repository to GitHub and connect it to your hosting provider of choice!
