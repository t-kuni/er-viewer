import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock DOM elements
const createMockDOM = () => {
    // Mock DOM elements for layer sidebar
    const mockResizeHandle = {
        classList: { add: jest.fn(), remove: jest.fn() },
        addEventListener: jest.fn()
    };
    
    const mockSidebar = {
        classList: {
            toggle: jest.fn(),
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn(() => false)
        },
        querySelector: jest.fn(() => mockResizeHandle),
        style: {},
        offsetWidth: 250,
        addEventListener: jest.fn()
    };
    
    const mockLayerList = {
        innerHTML: '',
        appendChild: jest.fn(),
        querySelectorAll: jest.fn(() => [])
    };
    
    const mockCollapseBtn = {
        textContent: '◀',
        addEventListener: jest.fn()
    };
    
    // Mock document.getElementById
    const originalGetElementById = global.document?.getElementById;
    global.document = {
        ...global.document,
        getElementById: jest.fn((id) => {
            switch (id) {
                case 'layer-sidebar': return mockSidebar;
                case 'layer-list': return mockLayerList;
                case 'collapse-layer-sidebar': return mockCollapseBtn;
                default: return null;
            }
        }),
        createElement: jest.fn((tag) => ({
            className: '',
            dataset: {},
            innerHTML: '',
            setAttribute: jest.fn(),
            addEventListener: jest.fn()
        })),
        addEventListener: jest.fn()
    };
    
    // Mock localStorage
    const mockLocalStorage = {
        getItem: jest.fn(),
        setItem: jest.fn()
    };
    global.localStorage = mockLocalStorage;
    
    return {
        mockSidebar,
        mockLayerList,
        mockCollapseBtn,
        mockLocalStorage,
        originalGetElementById
    };
};

// Import LayerManager after setting up mocks
let LayerManager;

describe('LayerManager', () => {
    let layerManager;
    let mocks;
    
    beforeEach(async () => {
        // Setup DOM mocks
        mocks = createMockDOM();
        
        // Clear all mocks
        jest.clearAllMocks();
        
        // Import LayerManager class
        const module = await import('../public/js/layer-manager.js');
        LayerManager = module.default;
        
        // Create new instance
        layerManager = new LayerManager();
    });
    
    afterEach(() => {
        // Restore original functions if they existed
        if (mocks.originalGetElementById) {
            global.document.getElementById = mocks.originalGetElementById;
        }
    });
    
    describe('initialization', () => {
        it('should initialize with empty layers array', () => {
            expect(layerManager.layers).toEqual([]);
        });
        
        it('should start with layerCounter at 0', () => {
            expect(layerManager.layerCounter).toBe(0);
        });
        
        it('should not be collapsed initially', () => {
            expect(layerManager.isCollapsed).toBe(false);
        });
        
        it('should add default ER diagram layer on initialization', () => {
            // The constructor calls addLayer for ER diagram
            expect(layerManager.layers).toHaveLength(1);
            expect(layerManager.layers[0].type).toBe('er-diagram');
            expect(layerManager.layers[0].name).toBe('ER図');
            expect(layerManager.layers[0].icon).toBe('🗂️');
        });
    });
    
    describe('layer management', () => {
        it('should add rectangle layer correctly', () => {
            const layer = layerManager.addRectangleLayer(1);
            
            expect(layer.type).toBe('rectangle');
            expect(layer.name).toBe('矩形No1');
            expect(layer.icon).toBe('▭');
            expect(layerManager.layers).toHaveLength(2); // Including default ER diagram
        });
        
        it('should add text layer correctly', () => {
            const testText = 'Test text content';
            const layer = layerManager.addTextLayer(testText);
            
            expect(layer.type).toBe('text');
            expect(layer.name).toBe('テキスト "Test text content"');
            expect(layer.icon).toBe('📝');
            expect(layerManager.layers).toHaveLength(2); // Including default ER diagram
        });
        
        it('should truncate long text in layer name', () => {
            const longText = 'This is a very long text content that should be truncated';
            const layer = layerManager.addTextLayer(longText);
            
            expect(layer.name).toBe('テキスト "This is a very long..."');
        });
        
        it('should remove layer by ID', () => {
            const layer1 = layerManager.addRectangleLayer(1);
            const layer2 = layerManager.addTextLayer('test');
            
            expect(layerManager.layers).toHaveLength(3); // Including default ER diagram
            
            layerManager.removeLayer(layer1.id);
            
            expect(layerManager.layers).toHaveLength(2);
            expect(layerManager.layers.find(l => l.id === layer1.id)).toBeUndefined();
        });
        
        it('should remove layer by reference', () => {
            layerManager.addRectangleLayer(1);
            layerManager.addTextLayer('test content');
            
            expect(layerManager.layers).toHaveLength(3); // Including default ER diagram
            
            layerManager.removeLayerByReference('rectangle', '1');
            
            expect(layerManager.layers).toHaveLength(2);
            expect(layerManager.layers.find(l => l.type === 'rectangle')).toBeUndefined();
        });
        
        it('should update layer orders correctly', () => {
            const layer1 = layerManager.addRectangleLayer(1);
            const layer2 = layerManager.addTextLayer('test');
            
            // Initial orders should be 0, 1, 2
            expect(layerManager.layers[0].order).toBe(0); // ER diagram
            expect(layerManager.layers[1].order).toBe(1); // Rectangle
            expect(layerManager.layers[2].order).toBe(2); // Text
            
            // Remove middle layer
            layerManager.removeLayer(layer1.id);
            
            // Orders should be updated to 0, 1
            expect(layerManager.layers[0].order).toBe(0); // ER diagram
            expect(layerManager.layers[1].order).toBe(1); // Text
        });
    });
    
    describe('layer ordering', () => {
        it('should generate unique layer IDs', () => {
            const layer1 = layerManager.addRectangleLayer(1);
            const layer2 = layerManager.addRectangleLayer(2);
            
            expect(layer1.id).not.toBe(layer2.id);
            expect(layer1.id).toMatch(/^layer-\d+-\d+$/);
            expect(layer2.id).toMatch(/^layer-\d+-\d+$/);
        });
        
        it('should return layer order information', () => {
            layerManager.addRectangleLayer(1);
            layerManager.addTextLayer('test');
            
            const layerOrder = layerManager.getLayerOrder();
            
            expect(layerOrder).toHaveLength(3);
            expect(layerOrder[0]).toEqual({
                id: expect.any(String),
                type: 'er-diagram',
                order: 0
            });
            expect(layerOrder[1]).toEqual({
                id: expect.any(String),
                type: 'rectangle',
                order: 1
            });
            expect(layerOrder[2]).toEqual({
                id: expect.any(String),
                type: 'text',
                order: 2
            });
        });
    });
    
    describe('UI interactions', () => {
        it('should toggle collapse state', () => {
            expect(layerManager.isCollapsed).toBe(false);
            
            layerManager.toggleCollapse();
            
            expect(layerManager.isCollapsed).toBe(true);
            expect(mocks.mockSidebar.classList.toggle).toHaveBeenCalledWith('collapsed', true);
            expect(mocks.mockLocalStorage.setItem).toHaveBeenCalledWith('layerSidebarCollapsed', true);
        });
        
        it('should load collapsed state from localStorage', () => {
            mocks.mockLocalStorage.getItem.mockReturnValue('true');
            
            // Create new instance to test loading
            const newLayerManager = new LayerManager();
            
            expect(newLayerManager.isCollapsed).toBe(true);
        });
    });
    
    describe('integration requirements', () => {
        it('should meet requirement: display ER diagram layer', () => {
            expect(layerManager.layers).toHaveLength(1);
            expect(layerManager.layers[0].type).toBe('er-diagram');
            expect(layerManager.layers[0].name).toBe('ER図');
        });
        
        it('should meet requirement: display rectangle layers with numbering', () => {
            layerManager.addRectangleLayer(1);
            layerManager.addRectangleLayer(5);
            
            const rectangleLayers = layerManager.layers.filter(l => l.type === 'rectangle');
            expect(rectangleLayers).toHaveLength(2);
            expect(rectangleLayers[0].name).toBe('矩形No1');
            expect(rectangleLayers[1].name).toBe('矩形No5');
        });
        
        it('should meet requirement: display text layers with content preview', () => {
            layerManager.addTextLayer('Hello World');
            layerManager.addTextLayer('Short');
            
            const textLayers = layerManager.layers.filter(l => l.type === 'text');
            expect(textLayers).toHaveLength(2);
            expect(textLayers[0].name).toBe('テキスト "Hello World"');
            expect(textLayers[1].name).toBe('テキスト "Short"');
        });
        
        it('should support layer reordering through drag and drop', () => {
            const layer1 = layerManager.addRectangleLayer(1);
            const layer2 = layerManager.addTextLayer('test');
            
            // Initial order: ER diagram (0), Rectangle (1), Text (2)
            expect(layerManager.layers.map(l => l.type)).toEqual(['er-diagram', 'rectangle', 'text']);
            
            // Simulate reordering - move rectangle after text
            const draggedIndex = layerManager.layers.findIndex(l => l.id === layer1.id);
            const targetIndex = layerManager.layers.findIndex(l => l.id === layer2.id);
            
            // Remove dragged layer and insert at target position
            const [draggedLayer] = layerManager.layers.splice(draggedIndex, 1);
            layerManager.layers.splice(targetIndex, 0, draggedLayer);
            layerManager.updateLayerOrders();
            
            // New order: ER diagram (0), Text (1), Rectangle (2)
            expect(layerManager.layers.map(l => l.type)).toEqual(['er-diagram', 'text', 'rectangle']);
            expect(layerManager.layers.map(l => l.order)).toEqual([0, 1, 2]);
        });
    });
});