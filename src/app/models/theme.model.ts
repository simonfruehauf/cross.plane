export interface Theme {
    id: string;
    name: string;
    unlockCount: number;
    buttonColor: string;
    colors: {
        bg: string;
        gridLines: string;
        blackSquare: string;
        text: string;
        confirmedBg: string; // cell background
        confirmedText: string;
        confirmedBorder: string;
        startWordBg: string; // start word cell background
        startWordBorder: string;
        // The color of the cell when zoomed out (text hidden)
        zoomedOutCell: string;
        pendingBg: string;
        pendingText: string;
        pendingBorder: string;
        selectionBg: string;
        selectionBorder: string;
        selectionShadow: string;
    };
}

export const THEMES: Theme[] = [
    {
        id: 'classic',
        name: 'Classic',
        buttonColor: '#ffffff',
        unlockCount: 0,
        colors: {
            bg: '#ffffff',
            gridLines: 'rgba(100, 100, 100, 0.1)',
            blackSquare: '#000000',
            text: '#000000',
            confirmedBg: '#ffffff',
            confirmedText: '#000000',
            confirmedBorder: 'rgba(0, 0, 0, 0.1)',
            startWordBg: '#fef9c3',
            startWordBorder: 'rgba(0, 0, 0, 0.1)',
            zoomedOutCell: 'rgba(0, 0, 0, 0.1)',
            pendingBg: '#ffffff',
            pendingText: '#2563eb',
            pendingBorder: 'rgba(13, 0, 56, 0.1)',
            selectionBg: '#dbeafe',
            selectionBorder: '#2563eb',
            selectionShadow: 'rgba(0, 0, 255, 0.4)'
        }
    },
    {
        id: 'dark',
        name: 'Dark Mode',
        buttonColor: '#1f2937',
        unlockCount: 5,
        colors: {
            bg: '#1f2937',
            gridLines: 'rgba(100, 100, 100, 0.2)',
            blackSquare: '#111827',
            text: '#e5e7eb',
            confirmedBg: '#1f2937',
            confirmedText: '#e5e7eb',
            confirmedBorder: 'rgba(100, 100, 100, 0.3)',
            startWordBg: '#374151',
            startWordBorder: '#4b5563',
            zoomedOutCell: '#374151',
            pendingBg: '#1f2937',
            pendingText: '#9ca3af',
            pendingBorder: '#4b5563',
            selectionBg: '#312e81',
            selectionBorder: '#6366f1',
            selectionShadow: 'rgba(99, 102, 241, 0.4)'
        }
    },
    {
        id: 'paper',
        name: 'Old Paper',
        buttonColor: '#f5ebe0',
        unlockCount: 10,
        colors: {
            bg: '#f5ebe0',
            gridLines: 'rgba(100, 100, 100, 0.1)',
            blackSquare: '#4a3b32',
            text: '#3e2723',
            confirmedBg: '#f5ebe0',
            confirmedText: '#3e2723',
            confirmedBorder: 'rgba(100, 100, 100, 0.1)',
            startWordBg: '#e6ccb2',
            startWordBorder: 'rgba(100, 100, 100, 0.1)',
            zoomedOutCell: '#e6ccb2',
            pendingBg: '#f5ebe0',
            pendingText: '#92400e',
            pendingBorder: 'rgba(100, 100, 100, 0.1)',
            selectionBg: '#e8d9cc',
            selectionBorder: '#7f5539',
            selectionShadow: 'rgba(69, 26, 3, 0.2)'
        }
    },
    {
        id: 'midnight',
        name: 'Midnight',
        buttonColor: '#020617',
        unlockCount: 15,
        colors: {
            bg: '#0f172a',
            gridLines: 'rgba(59, 130, 246, 0.1)',
            blackSquare: '#020617',
            text: '#97a2b1ff',
            confirmedBg: '#0f172a',
            confirmedText: '#cbd5e1',
            confirmedBorder: 'rgba(59, 130, 246, 0.2)',
            startWordBg: '#1e293b',
            startWordBorder: '#334155',
            zoomedOutCell: 'rgba(59, 130, 246, 0.2)',
            pendingBg: '#0f172a',
            pendingText: '#64748b',
            pendingBorder: '#1e293b',
            selectionBg: '#172554',
            selectionBorder: '#3b82f6',
            selectionShadow: 'rgba(59, 130, 246, 0.4)'
        }
    },
    {
        id: 'matrix',
        name: 'Matrix',
        buttonColor: '#00ff41',
        unlockCount: 10,
        colors: {
            bg: '#000000',
            gridLines: '#003300',
            blackSquare: '#00ff41',
            text: '#00ff41',
            confirmedBg: '#000000',
            confirmedText: '#00ff41',
            confirmedBorder: '#003300',
            startWordBg: '#001a00',
            startWordBorder: '#003300',
            zoomedOutCell: 'rgba(0, 255, 65, 0.3)',
            pendingBg: '#000000',
            pendingText: '#008f11',
            pendingBorder: '#003300',
            selectionBg: '#002200',
            selectionBorder: '#00ff41',
            selectionShadow: 'rgba(0, 255, 65, 0.2)'
        }
    },
    {
        id: 'blueprint',
        name: 'Blueprint',
        buttonColor: '#3555a1',
        unlockCount: 20,
        colors: {
            bg: '#3555a1',
            gridLines: 'rgba(255, 255, 255, 0.1)',
            blackSquare: '#25397b',
            text: '#ffffff',
            confirmedBg: '#3555a1',
            confirmedText: '#ffffff',
            confirmedBorder: 'rgba(255, 255, 255, 0.2)',
            startWordBg: '#476bb4',
            startWordBorder: '#476bb4',
            zoomedOutCell: 'rgba(255, 255, 255, 0.2)',
            pendingBg: '#3555a1',
            pendingText: '#ffffff',
            pendingBorder: '#ffffff',
            selectionBg: '#506bae',
            selectionBorder: '#ffffff',
            selectionShadow: 'rgba(255, 255, 255, 0.3)'
        }
    },
    {
        id: 'neon',
        name: 'Cyberpunk',
        buttonColor: '#e879f9',
        unlockCount: 100,
        colors: {
            bg: '#090014',
            gridLines: 'rgba(217, 70, 239, 0.3)',
            blackSquare: '#742f80ff',
            text: '#100f10ff',
            confirmedBg: '#090014',
            confirmedText: '#e879f9',
            confirmedBorder: 'rgba(217, 70, 239, 0.3)',
            startWordBg: '#180024',
            startWordBorder: '#e879f9',
            zoomedOutCell: '#e879f9',
            pendingBg: '#090014',
            pendingText: '#86198f',
            pendingBorder: '#e879f9',
            selectionBg: '#4a044e',
            selectionBorder: '#f0abfc',
            selectionShadow: 'rgba(217, 70, 239, 0.6)'
        }
    }
];
