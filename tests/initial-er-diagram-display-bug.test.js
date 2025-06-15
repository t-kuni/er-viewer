/**
 * Test suite for initial ER diagram display bug
 * Tests the bug where relation lines are displayed in front of entities on initial load when data exists
 */

import 'jest-canvas-mock';

// Import required modules
import { StateManager } from '../public/js/state/state-manager.js';
import { CoordinateTransform } from '../public/js/utils/coordinate-transform.js';
import { CanvasRenderer } from '../public/js/rendering/canvas-renderer.js';
import LayerManager from '../public/js/layer-manager.js';

describe('Initial ER Diagram Display Bug', () => {
    let canvas, stateManager, coordinateTransform, canvasRenderer, layerManager;

    beforeEach(() => {
        // Mock required DOM elements for LayerManager
        const mockLayerSidebar = document.createElement('div');
        mockLayerSidebar.id = 'layer-sidebar';
        const mockLayerList = document.createElement('div');
        mockLayerList.id = 'layer-list';
        const mockCollapseBtn = document.createElement('button');
        mockCollapseBtn.id = 'collapse-layer-sidebar';
        document.body.appendChild(mockLayerSidebar);
        document.body.appendChild(mockLayerList);
        document.body.appendChild(mockCollapseBtn);

        // Create mock canvas
        canvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        canvas.id = 'er-canvas';
        canvas.style.width = '800px';
        canvas.style.height = '600px';

        // Mock getBoundingClientRect for canvas
        canvas.getBoundingClientRect = jest.fn(() => ({
            left: 0,
            top: 0,
            width: 800,
            height: 600,
            x: 0,
            y: 0
        }));

        document.body.appendChild(canvas);

        // Initialize core components
        stateManager = new StateManager();
        coordinateTransform = new CoordinateTransform();
        canvasRenderer = new CanvasRenderer(canvas, coordinateTransform);
        layerManager = new LayerManager(stateManager);

        // Initialize state with test data
        stateManager.setState({
            erData: { entities: [], relationships: [] },
            layoutData: { entities: {}, rectangles: [], texts: [] },
            viewport: { panX: 0, panY: 0, scale: 1 },
            interactionMode: 'default'
        });

        // Initialize canvas
        canvasRenderer.initializeCanvas();

        // Reset console mocks
        console.log = jest.fn();
        console.warn = jest.fn();
        console.error = jest.fn();
    });

    afterEach(() => {
        // Clean up DOM
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('Bug Reproduction: Relation lines appear in front of entities on initial display', () => {
        test('should render entities in front of relationships when data exists on initial load', () => {
            // Create test ER data with entities and relationships
            const testERData = {
                entities: [
                    {
                        name: 'User',
                        columns: [
                            { name: 'id', type: 'int', key: 'PRI' },
                            { name: 'name', type: 'varchar(100)' },
                            { name: 'email', type: 'varchar(255)' }
                        ],
                        foreignKeys: []
                    },
                    {
                        name: 'Order', 
                        columns: [
                            { name: 'id', type: 'int', key: 'PRI' },
                            { name: 'user_id', type: 'int' },
                            { name: 'amount', type: 'decimal(10,2)' }
                        ],
                        foreignKeys: [
                            { column: 'user_id', referencedTable: 'User', referencedColumn: 'id' }
                        ]
                    }
                ],
                relationships: [
                    {
                        from: 'User',
                        to: 'Order',
                        fromColumn: 'id',
                        toColumn: 'user_id',
                        type: 'one-to-many'
                    }
                ]
            };

            const testLayoutData = {
                entities: {
                    'User': { x: 100, y: 100 },
                    'Order': { x: 400, y: 100 }
                },
                rectangles: [],
                texts: []
            };

            // Update state with test data
            stateManager.setState({
                erData: testERData,
                layoutData: testLayoutData
            });

            // Test scenario 1: Initial render without layer manager (fallback rendering)
            // This is the problematic case where entities might be rendered before relationships
            canvasRenderer.renderER(testERData, testLayoutData, null);

            // Check that entities group contains entity elements
            const entitiesGroup = canvas.querySelector('#entities-group');
            expect(entitiesGroup).toBeTruthy();
            
            const entityElements = entitiesGroup.querySelectorAll('.entity');
            expect(entityElements).toHaveLength(2);

            // Check that relationships group contains relationship elements
            const relationshipsGroup = canvas.querySelector('#relationships-group');
            expect(relationshipsGroup).toBeTruthy();
            
            const relationshipElements = relationshipsGroup.querySelectorAll('.relationship');
            expect(relationshipElements).toHaveLength(1);

            // Verify DOM structure: relationships group should come BEFORE entities group
            // This ensures relationships are rendered behind entities
            const mainGroup = canvas.querySelector('#main-group');
            const children = Array.from(mainGroup.children);
            
            const entitiesGroupIndex = children.indexOf(entitiesGroup);
            const relationshipsGroupIndex = children.indexOf(relationshipsGroup);
            
            // Relationships group should appear before entities group in DOM
            // (earlier in DOM = rendered first = appears behind)
            expect(relationshipsGroupIndex).toBeLessThan(entitiesGroupIndex);
            
            // Additional verification: entities should have higher z-index by virtue of DOM order
            const computedStyle = window.getComputedStyle(entitiesGroup);
            const relComputedStyle = window.getComputedStyle(relationshipsGroup);
            
            // In SVG, later elements in DOM appear on top
            // So entities group (higher index) should visually appear on top of relationships group
            expect(entitiesGroupIndex).toBeGreaterThan(relationshipsGroupIndex);
        });

        test('should render entities in front of relationships with layer manager', () => {
            // Create test ER data
            const testERData = {
                entities: [
                    {
                        name: 'Product',
                        columns: [
                            { name: 'id', type: 'int', key: 'PRI' },
                            { name: 'name', type: 'varchar(255)' },
                            { name: 'category_id', type: 'int' }
                        ],
                        foreignKeys: [
                            { column: 'category_id', referencedTable: 'Category', referencedColumn: 'id' }
                        ]
                    },
                    {
                        name: 'Category',
                        columns: [
                            { name: 'id', type: 'int', key: 'PRI' },
                            { name: 'name', type: 'varchar(100)' }
                        ],
                        foreignKeys: []
                    }
                ],
                relationships: [
                    {
                        from: 'Category',
                        to: 'Product', 
                        fromColumn: 'id',
                        toColumn: 'category_id',
                        type: 'one-to-many'
                    }
                ]
            };

            const testLayoutData = {
                entities: {
                    'Product': { x: 200, y: 200 },
                    'Category': { x: 500, y: 200 }
                },
                rectangles: [],
                texts: []
            };

            // Update state with test data
            stateManager.setState({
                erData: testERData,
                layoutData: testLayoutData
            });

            // Test with layer manager (layer-based rendering)
            canvasRenderer.renderER(testERData, testLayoutData, layerManager);

            // Check dynamic layer contains both entities and relationships
            const dynamicLayer = canvas.querySelector('#dynamic-layer');
            expect(dynamicLayer).toBeTruthy();
            
            const children = Array.from(dynamicLayer.children);
            
            // Find relationship and entity elements in dynamic layer
            const relationshipElements = children.filter(child => 
                child.classList.contains('relationship') || 
                child.getAttribute('data-from') || 
                child.tagName === 'path'
            );
            
            const entityElements = children.filter(child => 
                child.classList.contains('entity') || 
                child.getAttribute('data-table')
            );

            expect(relationshipElements.length).toBeGreaterThan(0);
            expect(entityElements.length).toBeGreaterThan(0);

            // In layer-based rendering, entities should be rendered AFTER relationships
            // (later in DOM = appears on top)
            if (relationshipElements.length > 0 && entityElements.length > 0) {
                const firstRelationshipIndex = children.indexOf(relationshipElements[0]);
                const firstEntityIndex = children.indexOf(entityElements[0]);
                
                // Entities should come after relationships in DOM order
                expect(firstEntityIndex).toBeGreaterThan(firstRelationshipIndex);
            }
        });

        test('should maintain correct visual hierarchy when both entities and relationships are present', () => {
            // Create complex ER diagram with multiple entities and relationships
            const testERData = {
                entities: [
                    {
                        name: 'User',
                        columns: [
                            { name: 'id', type: 'int', key: 'PRI' },
                            { name: 'name', type: 'varchar(100)' }
                        ],
                        foreignKeys: []
                    },
                    {
                        name: 'Order',
                        columns: [
                            { name: 'id', type: 'int', key: 'PRI' },
                            { name: 'user_id', type: 'int' },
                            { name: 'product_id', type: 'int' }
                        ],
                        foreignKeys: [
                            { column: 'user_id', referencedTable: 'User', referencedColumn: 'id' },
                            { column: 'product_id', referencedTable: 'Product', referencedColumn: 'id' }
                        ]
                    },
                    {
                        name: 'Product',
                        columns: [
                            { name: 'id', type: 'int', key: 'PRI' },
                            { name: 'name', type: 'varchar(255)' }
                        ],
                        foreignKeys: []
                    }
                ],
                relationships: [
                    {
                        from: 'User',
                        to: 'Order',
                        fromColumn: 'id',
                        toColumn: 'user_id',
                        type: 'one-to-many'
                    },
                    {
                        from: 'Product',
                        to: 'Order',
                        fromColumn: 'id', 
                        toColumn: 'product_id',
                        type: 'one-to-many'
                    }
                ]
            };

            const testLayoutData = {
                entities: {
                    'User': { x: 50, y: 50 },
                    'Order': { x: 300, y: 150 },
                    'Product': { x: 550, y: 50 }
                },
                rectangles: [],
                texts: []
            };

            // Test both rendering scenarios
            
            // Scenario 1: Without layer manager (fallback rendering)
            canvasRenderer.renderER(testERData, testLayoutData, null);
            
            // Verify fallback structure
            const entitiesGroup = canvas.querySelector('#entities-group');
            const relationshipsGroup = canvas.querySelector('#relationships-group');
            const mainGroup = canvas.querySelector('#main-group');
            
            expect(entitiesGroup).toBeTruthy();
            expect(relationshipsGroup).toBeTruthy();
            expect(mainGroup).toBeTruthy();
            
            // Check that both groups have content
            expect(entitiesGroup.children.length).toBeGreaterThan(0);
            expect(relationshipsGroup.children.length).toBeGreaterThan(0);
            
            // Scenario 2: With layer manager
            canvasRenderer.renderER(testERData, testLayoutData, layerManager);
            
            const dynamicLayer = canvas.querySelector('#dynamic-layer');
            expect(dynamicLayer).toBeTruthy();
            expect(dynamicLayer.children.length).toBeGreaterThan(0);
            
            // Both scenarios should result in proper visual hierarchy
            // This test verifies that the rendering doesn't fail and produces visual elements
        });
    });
});