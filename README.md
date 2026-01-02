# Cross.plane

Cross.plane is a high-performance, collaborative, infinite-grid word game. Players work together to build an ever-expanding crossword on an infinite plane.

## Features

- Infinite Grid: Seamlessly pan and zoom across an endless canvas.
- Real-time Collaboration: Powered by Firebase Firestore for instant synchronization.
- Performance: Custom Canvas 2D rendering engine for smooth interaction.
- Word Validation: Integrated dictionary checking for all placements.
- Mobile Support: Optimized for touch gestures and mobile browsers.

## Technical Stack

- Angular (Signals, Standalone Components)
- HTML5 Canvas
- Firebase Firestore
- Tailwind CSS

## Development

1. Install dependencies:
   `npm install`

2. Run development server:
   `npm run dev`

## Deployment

To build and deploy to GitHub Pages:

```bash
npm run build -- --base-href /cross.plane/
npx angular-cli-ghpages --dir=dist/
```

License: MIT
