/**
 * Test suite for initial ER diagram display bug
 * Tests the bug where ER diagram is not displayed on initial load
 */

import 'jest-canvas-mock';

// Import required modules
import { StateManager } from '../public/js/state/state-manager.js';
import { CoordinateTransform } from '../public/js/utils/coordinate-transform.js';
import { CanvasRenderer } from '../public/js/rendering/canvas-renderer.js';
import { ERViewerCore } from '../public/js/core/er-viewer-core.js';
import LayerManager from '../public/js/layer-manager.js';

// Mock file operations
global.fetch = jest.fn();

describe('Initial ER Diagram Display Bug', () => {
    let canvas, stateManager, coordinateTransform, canvasRenderer, layerManager, erViewerCore;

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
        erViewerCore = new ERViewerCore();

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

    describe('Bug Reproduction: Initial ER diagram not displayed', () => {
        test('should load and display ER diagram on initialization', async () => {
            // Mock ER data that should be loaded initially
            const mockErData = {
                entities: [
                    {
                        name: 'users',
                        columns: [
                            { name: 'id', type: 'int', isPrimaryKey: true },
                            { name: 'name', type: 'varchar(100)', isNotNull: true },
                            { name: 'email', type: 'varchar(255)', isNotNull: true }
                        ]
                    },
                    {
                        name: 'posts',
                        columns: [
                            { name: 'id', type: 'int', isPrimaryKey: true },
                            { name: 'user_id', type: 'int', isForeignKey: true },
                            { name: 'title', type: 'varchar(200)', isNotNull: true },
                            { name: 'content', type: 'text' }
                        ]
                    }
                ],
                relationships: [
                    {
                        from: 'users',
                        to: 'posts',
                        fromColumn: 'id',
                        toColumn: 'user_id',
                        type: 'one-to-many'
                    }
                ]
            };

            const mockLayoutData = {
                entities: {
                    'users': { x: 100, y: 100, width: 200, height: 120 },
                    'posts': { x: 400, y: 100, width: 200, height: 150 }
                },
                rectangles: [],
                texts: []
            };

            // Mock fetch responses for data files
            global.fetch.mockImplementation((url) => {
                if (url.includes('er-data.json')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve(mockErData)
                    });
                } else if (url.includes('layout-data.json')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve(mockLayoutData)
                    });
                }
                return Promise.reject(new Error(`Unknown URL: ${url}`));
            });

            // Initialize state with empty data (like on app startup)
            stateManager.setState({
                erData: { entities: [], relationships: [] },
                layoutData: { entities: {}, rectangles: [], texts: [] },
                viewport: { panX: 0, panY: 0, scale: 1 },
                interactionMode: 'default'
            });

            // Initialize canvas
            canvasRenderer.initializeCanvas();

            // Simulate initial data loading (like in ERViewerCore)
            try {
                // Load ER data
                const erDataResponse = await fetch('/data/er-data.json');
                const erData = await erDataResponse.json();
                
                // Load layout data
                const layoutDataResponse = await fetch('/data/layout-data.json');
                const layoutData = await layoutDataResponse.json();

                // Update state with loaded data
                stateManager.setState({
                    erData: erData,
                    layoutData: layoutData
                });

                // BUG CHECK: Initial render should display the ER diagram
                const currentState = stateManager.getState();
                
                // Verify data was loaded
                expect(currentState.erData.entities).toHaveLength(2);
                expect(currentState.erData.relationships).toHaveLength(1);
                expect(Object.keys(currentState.layoutData.entities)).toHaveLength(2);

                // Render the ER diagram
                canvasRenderer.renderEntities(currentState.erData.entities, currentState.layoutData.entities);
                canvasRenderer.renderRelationships(currentState.erData.relationships, currentState.layoutData.entities, currentState.erData.entities);

                // Check if entities are rendered on canvas
                const entityElements = canvas.querySelectorAll('.entity');
                const relationshipElements = canvas.querySelectorAll('.relationship');

                // BUG: These elements should exist after initial load and render
                expect(entityElements.length).toBe(2);
                expect(relationshipElements.length).toBe(1);

                // Check specific entity elements
                const usersEntity = Array.from(entityElements).find(el => 
                    el.querySelector('.entity-name')?.textContent === 'users'
                );
                const postsEntity = Array.from(entityElements).find(el => 
                    el.querySelector('.entity-name')?.textContent === 'posts'
                );

                expect(usersEntity).toBeTruthy();
                expect(postsEntity).toBeTruthy();

                // Check entity positioning
                expect(usersEntity.getAttribute('data-x')).toBe('100');
                expect(usersEntity.getAttribute('data-y')).toBe('100');
                expect(postsEntity.getAttribute('data-x')).toBe('400');
                expect(postsEntity.getAttribute('data-y')).toBe('100');

            } catch (error) {
                // This catch block simulates the bug where data loading fails
                console.error('Failed to load initial ER data:', error);
                
                // When bug occurs, no entities should be rendered
                const entityElements = canvas.querySelectorAll('.entity');
                expect(entityElements.length).toBe(0);
                
                // Mark this as expected failure due to bug
                throw new Error('Initial ER diagram not displayed due to data loading failure');
            }
        });

        test('should display empty state message when no ER data is available', () => {
            // Mock empty data responses
            global.fetch.mockImplementation((url) => {
                if (url.includes('er-data.json')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ entities: [], relationships: [] })
                    });
                } else if (url.includes('layout-data.json')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ entities: {}, rectangles: [], texts: [] })
                    });
                }
                return Promise.reject(new Error(`Unknown URL: ${url}`));
            });

            // Initialize with empty state
            stateManager.setState({
                erData: { entities: [], relationships: [] },
                layoutData: { entities: {}, rectangles: [], texts: [] },
                viewport: { panX: 0, panY: 0, scale: 1 },
                interactionMode: 'default'
            });

            // Initialize canvas
            canvasRenderer.initializeCanvas();

            // Render empty state
            const currentState = stateManager.getState();
            canvasRenderer.renderEntities(currentState.erData.entities, currentState.layoutData.entities);

            // Should have no entity elements
            const entityElements = canvas.querySelectorAll('.entity');
            expect(entityElements.length).toBe(0);

            // Should have empty canvas structure
            const entitiesGroup = canvas.querySelector('#entities-group');
            expect(entitiesGroup).toBeTruthy();
            expect(entitiesGroup.children.length).toBe(0);
        });

        test('should handle data loading errors gracefully', async () => {
            // Mock fetch to simulate network error
            global.fetch.mockRejectedValue(new Error('Network error'));

            // Initialize state
            stateManager.setState({
                erData: { entities: [], relationships: [] },
                layoutData: { entities: {}, rectangles: [], texts: [] },
                viewport: { panX: 0, panY: 0, scale: 1 },
                interactionMode: 'default'
            });

            // Initialize canvas
            canvasRenderer.initializeCanvas();

            // Attempt to load data (should fail)
            try {
                await fetch('/data/er-data.json');
                // If we reach here, the test should fail
                expect(true).toBe(false); // Force failure
            } catch (error) {
                // Expected error - should handle gracefully
                expect(error.message).toBe('Network error');

                // Verify canvas is still in valid state
                const entitiesGroup = canvas.querySelector('#entities-group');
                expect(entitiesGroup).toBeTruthy();

                // Verify no entities are rendered (due to loading failure)
                const entityElements = canvas.querySelectorAll('.entity');
                expect(entityElements.length).toBe(0);
            }
        });
    });

    describe('ER Diagram Rendering Integration', () => {
        test('should properly initialize canvas structure for ER diagram', () => {
            // Initialize canvas
            canvasRenderer.initializeCanvas();

            // Check if required SVG groups are created
            expect(canvas.querySelector('#entities-group')).toBeTruthy();
            expect(canvas.querySelector('#relationships-group')).toBeTruthy();
            expect(canvas.querySelector('#annotations-group')).toBeTruthy();

            // Verify canvas has proper dimensions
            expect(canvas.getAttribute('width')).toBeTruthy();
            expect(canvas.getAttribute('height')).toBeTruthy();
        });

        test('should render entities with correct structure', () => {
            const testEntities = [
                {
                    name: 'test_table',
                    columns: [
                        { name: 'id', type: 'int', isPrimaryKey: true },
                        { name: 'name', type: 'varchar(100)' }
                    ]
                }
            ];

            const testLayout = {
                entities: {
                    'test_table': { x: 100, y: 100, width: 200, height: 100 }
                }
            };

            // Initialize canvas
            canvasRenderer.initializeCanvas();

            // Render entities
            canvasRenderer.renderEntities(testEntities, testLayout.entities);

            // Check if entity was rendered
            const entityElements = canvas.querySelectorAll('.entity');
            expect(entityElements.length).toBe(1);

            const entity = entityElements[0];
            expect(entity.querySelector('.entity-name')?.textContent).toBe('test_table');
            expect(entity.getAttribute('data-name')).toBe('test_table');

            // Check columns
            const columnElements = entity.querySelectorAll('.column');
            expect(columnElements.length).toBe(2);
        });
    });
});