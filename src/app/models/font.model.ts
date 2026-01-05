export interface Font {
    id: string;
    name: string;
    fontFamily: string;
    unlockCount: number;
}

export const FONTS: Font[] = [
    {
        id: 'classic',
        name: 'Classic',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        unlockCount: 0
    },
    {
        id: 'hand',
        name: 'Hand',
        fontFamily: '"Patrick Hand", cursive',
        unlockCount: 5
    },
    {
        id: 'serif',
        name: 'Serif',
        fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
        unlockCount: 15
    },
    {
        id: 'pixel',
        name: 'Pixel',
        fontFamily: '"Pixelify Sans", monospace',
        unlockCount: 40
    },
    {
        id: 'newspaper',
        name: 'Newspaper',
        fontFamily: '"Playfair Display", serif',
        unlockCount: 30
    },
    {
        id: 'marker',
        name: 'Marker',
        fontFamily: '"Permanent Marker", cursive',
        unlockCount: 75
    },
    {
        id: 'gothic',
        name: 'Gothic',
        fontFamily: '"UnifrakturMaguntia", cursive',
        unlockCount: 100
    }
];
