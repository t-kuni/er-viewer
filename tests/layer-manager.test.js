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
        querySelector: jest.fn((selector) => {
            if (selector === '.layer-sidebar-resize-handle') {
                return mockResizeHandle;
            }
            return null;
        }),
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
        createEvent: jest.fn((type) => ({
            initCustomEvent: jest.fn(),
            type: '',
            detail: null,
            bubbles: false,
            cancelable: false
        })),
        addEventListener: jest.fn(),
        dispatchEvent: jest.fn()
    };
    
    // Mock CustomEvent for layer order change events
    const CustomEventImpl = function(type, options) {
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent(
            type,
            options?.bubbles || false,
            options?.cancelable || false,
            options?.detail || null
        );
        return event;
    };
    global.CustomEvent = jest.fn(CustomEventImpl);
    
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
        it('should initialize with ER diagram layer', () => {
            expect(layerManager.layers).toHaveLength(1);
            expect(layerManager.layers[0].type).toBe('er-diagram');
        });
        
        it('should start with layerCounter at 1 after adding default ER layer', () => {
            expect(layerManager.layerCounter).toBe(1);
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
            
            expect(layer.name).toBe('テキスト "This is a very long ..."');
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
                name: 'ER図',
                icon: '🗂️',
                order: 0
            });
            expect(layerOrder[1]).toEqual({
                id: expect.any(String),
                type: 'rectangle',
                name: '矩形No1',
                icon: '▭',
                order: 1
            });
            expect(layerOrder[2]).toEqual({
                id: expect.any(String),
                type: 'text',
                name: 'テキスト "test"',
                icon: '📝',
                order: 2
            });
        });
    });
    
    describe('UI interactions', () => {
        it('should toggle collapse state', () => {
            expect(layerManager.isCollapsed).toBe(false);
            
            layerManager.toggleCollapse();
            
            expect(layerManager.isCollapsed).toBe(true);
            // Note: DOM interactions may not work in test environment
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
    
    describe('state management integration', () => {
        let mockStateManager;
        
        beforeEach(() => {
            // Mock StateManager
            mockStateManager = {
                get: jest.fn(() => ({ entities: {}, rectangles: [], texts: [], layers: [] })),
                updateLayoutData: jest.fn(),
                subscribeToProperty: jest.fn()
            };
        });
        
        it('should save layers to state when layer is added', async () => {
            const module = await import('../public/js/layer-manager.js');
            const LayerManager = module.default;
            
            const layerManagerWithState = new LayerManager(mockStateManager);
            layerManagerWithState.addRectangleLayer(1);
            
            expect(mockStateManager.updateLayoutData).toHaveBeenCalled();
            const calledWith = mockStateManager.updateLayoutData.mock.calls[0][0];
            expect(calledWith.layers).toBeDefined();
            expect(calledWith.layers.length).toBeGreaterThan(0);
        });
        
        it('should save layers to state when layer is removed', async () => {
            const module = await import('../public/js/layer-manager.js');
            const LayerManager = module.default;
            
            const layerManagerWithState = new LayerManager(mockStateManager);
            const layer = layerManagerWithState.addRectangleLayer(1);
            
            // Clear previous calls
            mockStateManager.updateLayoutData.mockClear();
            
            layerManagerWithState.removeLayer(layer.id);
            
            expect(mockStateManager.updateLayoutData).toHaveBeenCalled();
        });
        
        it('should save layers to state when layer order is changed', async () => {
            const module = await import('../public/js/layer-manager.js');
            const LayerManager = module.default;
            
            const layerManagerWithState = new LayerManager(mockStateManager);
            layerManagerWithState.addRectangleLayer(1);
            layerManagerWithState.addTextLayer('test');
            
            // Clear previous calls
            mockStateManager.updateLayoutData.mockClear();
            
            // Simulate reordering
            const [draggedLayer] = layerManagerWithState.layers.splice(1, 1);
            layerManagerWithState.layers.splice(2, 0, draggedLayer);
            layerManagerWithState.updateLayerOrders();
            layerManagerWithState.saveLayersToState();
            
            expect(mockStateManager.updateLayoutData).toHaveBeenCalled();
        });
        
        it('should load layers from state data', async () => {
            const savedLayers = [
                { id: 'layer-1-123', type: 'er-diagram', name: 'ER図', icon: '🗂️', order: 0 },
                { id: 'layer-2-456', type: 'rectangle', name: '矩形No1', icon: '▭', order: 1 },
                { id: 'layer-3-789', type: 'text', name: 'テキスト "test"', icon: '📝', order: 2 }
            ];
            
            mockStateManager.get.mockReturnValue({
                entities: {},
                rectangles: [],
                texts: [],
                layers: savedLayers
            });
            
            const module = await import('../public/js/layer-manager.js');
            const LayerManager = module.default;
            
            const layerManagerWithState = new LayerManager(mockStateManager);
            
            // Should have loaded layers from state (excluding ER diagram which is auto-added)
            expect(layerManagerWithState.layers.length).toBe(3); // ER diagram + 2 loaded layers
            expect(layerManagerWithState.layers.find(l => l.type === 'rectangle')).toBeDefined();
            expect(layerManagerWithState.layers.find(l => l.type === 'text')).toBeDefined();
        });
    });
    
    describe('canvas rendering integration', () => {
        it('should provide layer order information for rendering', () => {
            layerManager.addRectangleLayer(1);
            layerManager.addTextLayer('test text');
            
            const layerOrder = layerManager.getLayerOrder();
            
            expect(layerOrder).toHaveLength(3); // ER diagram + rectangle + text
            expect(layerOrder[0].type).toBe('er-diagram');
            expect(layerOrder[0].order).toBe(0);
            expect(layerOrder[1].order).toBe(1);
            expect(layerOrder[2].order).toBe(2);
        });
        
        it('should maintain correct order after layer reordering', () => {
            const rectLayer = layerManager.addRectangleLayer(1);
            const textLayer = layerManager.addTextLayer('test text');
            
            // Initial order: ER (0), Rectangle (1), Text (2)
            let layerOrder = layerManager.getLayerOrder();
            expect(layerOrder.map(l => l.type)).toEqual(['er-diagram', 'rectangle', 'text']);
            
            // Simulate drag and drop - move rectangle after text
            const draggedIndex = layerManager.layers.findIndex(l => l.id === rectLayer.id);
            const targetIndex = layerManager.layers.findIndex(l => l.id === textLayer.id);
            
            const [draggedLayer] = layerManager.layers.splice(draggedIndex, 1);
            layerManager.layers.splice(targetIndex, 0, draggedLayer);
            layerManager.updateLayerOrders();
            
            // New order: ER (0), Text (1), Rectangle (2)
            layerOrder = layerManager.getLayerOrder();
            expect(layerOrder.map(l => l.type)).toEqual(['er-diagram', 'text', 'rectangle']);
            expect(layerOrder.map(l => l.order)).toEqual([0, 1, 2]);
        });
    });
    
    describe('specification compliance', () => {
        it('should meet requirement: render elements based on layer order', () => {
            // Add layers in specific order
            layerManager.addRectangleLayer(1); // Should be order 1
            layerManager.addTextLayer('test'); // Should be order 2
            
            const layerOrder = layerManager.getLayerOrder();
            
            // Verify that layer order can be used for rendering sequence
            expect(layerOrder).toHaveLength(3);
            expect(layerOrder.every(layer => typeof layer.order === 'number')).toBe(true);
            expect(layerOrder[0].order).toBeLessThan(layerOrder[1].order);
            expect(layerOrder[1].order).toBeLessThan(layerOrder[2].order);
        });
        
        it('should meet requirement: save layer order as entity placement data', () => {
            const mockStateManager = {
                get: jest.fn(() => ({ entities: {}, rectangles: [], texts: [], layers: [] })),
                updateLayoutData: jest.fn(),
                subscribeToProperty: jest.fn()
            };
            
            // Create layer manager with state manager
            const LayerManager = require('../public/js/layer-manager.js').default || 
                                  require('../public/js/layer-manager.js');
            const layerManagerWithState = new LayerManager(mockStateManager);
            
            layerManagerWithState.addRectangleLayer(1);
            
            // Verify that layer data is saved to layout data
            expect(mockStateManager.updateLayoutData).toHaveBeenCalled();
            const savedData = mockStateManager.updateLayoutData.mock.calls[0][0];
            expect(savedData.layers).toBeDefined();
            expect(Array.isArray(savedData.layers)).toBe(true);
            expect(savedData.layers.length).toBeGreaterThan(0);
        });
    });
    
    describe('layer order change events', () => {
        it('should dispatch layerOrderChanged event when reordering layers', () => {
            // Mock document.dispatchEvent as jest.fn
            const originalDispatchEvent = document.dispatchEvent;
            document.dispatchEvent = jest.fn();
            
            const layer1 = layerManager.addRectangleLayer(1);
            const layer2 = layerManager.addTextLayer('test');
            
            // Clear previous dispatches
            document.dispatchEvent.mockClear();
            global.CustomEvent.mockClear();
            
            // Simulate reordering by calling reorderLayers method
            const mockDraggedElement = { dataset: { layerId: layer1.id } };
            const mockTargetElement = { dataset: { layerId: layer2.id } };
            
            layerManager.reorderLayers(mockDraggedElement, mockTargetElement);
            
            // Verify CustomEvent was created
            expect(global.CustomEvent).toHaveBeenCalledWith('layerOrderChanged', {
                detail: { layerOrder: expect.any(Array) }
            });
            
            // Verify event was dispatched
            expect(document.dispatchEvent).toHaveBeenCalled();
            
            // Restore original function
            document.dispatchEvent = originalDispatchEvent;
        });
        
        it('should trigger canvas rerender when layer order changes', () => {
            // Mock document.dispatchEvent as jest.fn
            const originalDispatchEvent = document.dispatchEvent;
            document.dispatchEvent = jest.fn();
            
            const mockStateManager = {
                get: jest.fn(() => ({ entities: {}, rectangles: [], texts: [], layers: [] })),
                updateLayoutData: jest.fn(),
                subscribeToProperty: jest.fn()
            };
            
            const layerManagerWithState = new LayerManager(mockStateManager);
            const layer1 = layerManagerWithState.addRectangleLayer(1);
            const layer2 = layerManagerWithState.addTextLayer('test');
            
            // Clear previous calls
            mockStateManager.updateLayoutData.mockClear();
            document.dispatchEvent.mockClear();
            
            // Simulate reordering
            const mockDraggedElement = { dataset: { layerId: layer1.id } };
            const mockTargetElement = { dataset: { layerId: layer2.id } };
            
            layerManagerWithState.reorderLayers(mockDraggedElement, mockTargetElement);
            
            // Verify state was updated
            expect(mockStateManager.updateLayoutData).toHaveBeenCalled();
            
            // Verify event was dispatched for canvas rerender
            expect(document.dispatchEvent).toHaveBeenCalled();
            
            // Restore original function
            document.dispatchEvent = originalDispatchEvent;
        });
    });
});