/**
 * @jest-environment jsdom
 */

import { CanvasRenderer } from '../public/js/rendering/canvas-renderer.js';

// Mock for SmartRouting and ConnectionPoints
jest.mock('../public/js/pathfinding/smart-routing.js', () => ({
    SmartRouting: jest.fn().mockImplementation(() => ({
        setEntityBounds: jest.fn(),
        createPolylinePath: jest.fn((from, to) => `M ${from.x} ${from.y} L ${to.x} ${to.y}`)
    }))
}));

jest.mock('../public/js/pathfinding/connection-points.js', () => ({
    ConnectionPoints: jest.fn().mockImplementation(() => ({
        setERData: jest.fn(),
        findOptimalConnectionPoints: jest.fn((fromBounds, toBounds, relationship) => ({
            from: { x: fromBounds.right, y: fromBounds.centerY },
            to: { x: toBounds.left, y: toBounds.centerY }
        }))
    }))
}));

describe('Relationship Rendering Tests', () => {
    let canvasRenderer;
    let mockSvgElement;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <svg id="canvas" width="800" height="600">
                <defs>
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="#666666"/>
                    </marker>
                </defs>
                <g id="relationships-group"></g>
            </svg>
        `;
        
        mockSvgElement = document.getElementById('canvas');
        canvasRenderer = new CanvasRenderer(mockSvgElement);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('should render relationships with proper SVG paths', () => {
        const relationships = [
            {
                sourceTable: 'users',
                targetTable: 'posts',
                sourceColumn: 'id',
                targetColumn: 'user_id'
            },
            {
                sourceTable: 'categories',
                targetTable: 'posts',
                sourceColumn: 'id',
                targetColumn: 'category_id'
            }
        ];

        const entityPositions = {
            'users': { x: 100, y: 100 },
            'posts': { x: 300, y: 100 },
            'categories': { x: 500, y: 100 }
        };

        const entities = [
            { name: 'users', columns: [{ name: 'id', type: 'int' }] },
            { name: 'posts', columns: [{ name: 'user_id', type: 'int' }, { name: 'category_id', type: 'int' }] },
            { name: 'categories', columns: [{ name: 'id', type: 'int' }] }
        ];

        canvasRenderer.renderRelationships(relationships, entityPositions, entities);

        // Check that relationship paths were created
        const pathElements = mockSvgElement.querySelectorAll('path.relationship');
        expect(pathElements.length).toBe(2);

        // Check first relationship
        const firstPath = pathElements[0];
        expect(firstPath.getAttribute('data-from')).toBe('users');
        expect(firstPath.getAttribute('data-to')).toBe('posts');
        expect(firstPath.getAttribute('data-from-column')).toBe('id');
        expect(firstPath.getAttribute('data-to-column')).toBe('user_id');
        expect(firstPath.getAttribute('d')).toContain('M ');
        expect(firstPath.getAttribute('d')).toContain('L ');

        // Check second relationship
        const secondPath = pathElements[1];
        expect(secondPath.getAttribute('data-from')).toBe('categories');
        expect(secondPath.getAttribute('data-to')).toBe('posts');
        expect(secondPath.getAttribute('data-from-column')).toBe('id');
        expect(secondPath.getAttribute('data-to-column')).toBe('category_id');
    });

    test('should calculate entity bounds correctly', () => {
        const entityPositions = {
            'users': { x: 100, y: 150 }
        };

        const bounds = canvasRenderer.getEntityBounds('users', entityPositions);

        expect(bounds).toHaveProperty('left', 100);
        expect(bounds).toHaveProperty('top', 150);
        expect(bounds).toHaveProperty('right');
        expect(bounds).toHaveProperty('bottom');
        expect(bounds).toHaveProperty('width');
        expect(bounds).toHaveProperty('height');
        expect(bounds).toHaveProperty('centerX');
        expect(bounds).toHaveProperty('centerY');
        
        // centerX and centerY should be calculated correctly
        expect(bounds.centerX).toBe(bounds.left + bounds.width / 2);
        expect(bounds.centerY).toBe(bounds.top + bounds.height / 2);
    });

    test('should handle missing entity positions gracefully', () => {
        const relationships = [
            {
                sourceTable: 'nonexistent1',
                targetTable: 'nonexistent2',
                sourceColumn: 'id',
                targetColumn: 'user_id'
            }
        ];

        const entityPositions = {};
        const entities = [];

        // Should not throw error
        expect(() => {
            canvasRenderer.renderRelationships(relationships, entityPositions, entities);
        }).not.toThrow();

        // Should not create any path elements
        const pathElements = mockSvgElement.querySelectorAll('path.relationship');
        expect(pathElements.length).toBe(0);
    });

    test('should set proper SVG attributes for relationship paths', () => {
        const relationships = [
            {
                sourceTable: 'users',
                targetTable: 'posts',
                sourceColumn: 'id',
                targetColumn: 'user_id'
            }
        ];

        const entityPositions = {
            'users': { x: 100, y: 100 },
            'posts': { x: 300, y: 100 }
        };

        const entities = [
            { name: 'users', columns: [{ name: 'id', type: 'int' }] },
            { name: 'posts', columns: [{ name: 'user_id', type: 'int' }] }
        ];

        canvasRenderer.renderRelationships(relationships, entityPositions, entities);

        const pathElement = mockSvgElement.querySelector('path.relationship');
        
        expect(pathElement.getAttribute('stroke')).toBe('#666666');
        expect(pathElement.getAttribute('fill')).toBe('none');
        expect(pathElement.getAttribute('marker-end')).toBe('url(#arrow)');
        expect(pathElement.getAttribute('class')).toBe('relationship');
    });

    test('should calculate entity bounds for all entities', () => {
        const entityPositions = {
            'users': { x: 100, y: 100 },
            'posts': { x: 300, y: 200 },
            'categories': { x: 500, y: 300 }
        };

        const entityBounds = canvasRenderer.calculateEntityBounds(entityPositions);

        expect(entityBounds).toHaveLength(3);
        
        entityBounds.forEach(bounds => {
            expect(bounds).toHaveProperty('left');
            expect(bounds).toHaveProperty('top');
            expect(bounds).toHaveProperty('right');
            expect(bounds).toHaveProperty('bottom');
            expect(typeof bounds.left).toBe('number');
            expect(typeof bounds.top).toBe('number');
            expect(typeof bounds.right).toBe('number');
            expect(typeof bounds.bottom).toBe('number');
        });
    });
});