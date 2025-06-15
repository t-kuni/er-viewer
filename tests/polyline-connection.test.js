/**
 * @jest-environment jsdom
 */

import { SmartRouting } from '../public/js/pathfinding/smart-routing.js';
import { ConnectionPoints } from '../public/js/pathfinding/connection-points.js';

// Mock for SVGUtils
jest.mock('../public/js/utils/svg-utils.js', () => ({
    SVGUtils: {
        pathPointsToSVG: jest.fn((points) => {
            return points.map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ');
        })
    },
    GeometryUtils: {
        pathIntersectsEntities: jest.fn(() => false)
    }
}));

describe('Polyline Connection Tests', () => {
    let smartRouting;
    let connectionPoints;

    beforeEach(() => {
        smartRouting = new SmartRouting();
        connectionPoints = new ConnectionPoints();
    });

    describe('SmartRouting', () => {
        test('should create L-shaped path with horizontal and vertical lines only', () => {
            const from = { x: 100, y: 100 };
            const to = { x: 300, y: 200 };
            
            const path = smartRouting.createLShapedPath(from, to);
            
            expect(path).toHaveLength(4);
            expect(path[0]).toEqual({ x: 100, y: 100 });
            expect(path[1]).toEqual({ x: 200, y: 100 }); // horizontal line
            expect(path[2]).toEqual({ x: 200, y: 200 }); // vertical line
            expect(path[3]).toEqual({ x: 300, y: 200 });
            
            // Verify no diagonal lines
            for (let i = 1; i < path.length; i++) {
                const prev = path[i - 1];
                const curr = path[i];
                const isDiagonal = prev.x !== curr.x && prev.y !== curr.y;
                expect(isDiagonal).toBe(false);
            }
        });

        test('should generate valid polyline SVG path', () => {
            const from = { x: 50, y: 50 };
            const to = { x: 250, y: 150 };
            
            const svgPath = smartRouting.createPolylinePath(from, to);
            
            // Verify SVG path format
            expect(svgPath).toContain('M ');
            expect(svgPath).toContain('L ');
            expect(typeof svgPath).toBe('string');
        });

        test('should handle entity bounds for collision avoidance', () => {
            const entityBounds = [
                { left: 120, top: 80, right: 180, bottom: 120 }
            ];
            
            smartRouting.setEntityBounds(entityBounds);
            
            const from = { x: 100, y: 100 };
            const to = { x: 200, y: 100 };
            
            const path = smartRouting.findSmartPath(from, to);
            
            expect(path).toBeDefined();
            expect(Array.isArray(path)).toBe(true);
            expect(path.length).toBeGreaterThan(0);
        });

        test('should route around entities with different strategies', () => {
            const from = { x: 100, y: 100 };
            const to = { x: 300, y: 200 };
            
            const horizontalPath = smartRouting.routeAroundEntities(from, to, 'horizontal');
            const verticalPath = smartRouting.routeAroundEntities(from, to, 'vertical');
            
            expect(horizontalPath).toHaveLength(4);
            expect(verticalPath).toHaveLength(4);
            
            // Verify horizontal strategy starts with horizontal movement
            expect(horizontalPath[0].y).toBe(horizontalPath[1].y);
            
            // Verify vertical strategy starts with vertical movement
            expect(verticalPath[0].x).toBe(verticalPath[1].x);
        });
    });

    describe('ConnectionPoints', () => {
        test('should find optimal connection points between entities', () => {
            const fromEntity = {
                left: 100, top: 100, right: 200, bottom: 150,
                width: 100, height: 50, centerX: 150, centerY: 125
            };
            const toEntity = {
                left: 300, top: 200, right: 400, bottom: 250,
                width: 100, height: 50, centerX: 350, centerY: 225
            };
            
            const points = connectionPoints.getEntityConnectionPoints(fromEntity, toEntity);
            
            expect(points).toHaveProperty('from');
            expect(points).toHaveProperty('to');
            expect(typeof points.from.x).toBe('number');
            expect(typeof points.from.y).toBe('number');
            expect(typeof points.to.x).toBe('number');
            expect(typeof points.to.y).toBe('number');
        });

        test('should calculate entity edge points correctly', () => {
            const entity = {
                left: 100, top: 100, right: 200, bottom: 150,
                width: 100, height: 50, centerX: 150, centerY: 125
            };
            
            const points = connectionPoints.getEntityEdgePoints(entity);
            
            expect(points).toHaveProperty('top');
            expect(points).toHaveProperty('bottom');
            expect(points).toHaveProperty('left');
            expect(points).toHaveProperty('right');
            
            // Verify center points with margin
            expect(points.top.x).toBe(150); // center x
            expect(points.top.y).toBe(95); // top y - margin
            expect(points.bottom.x).toBe(150); // center x
            expect(points.bottom.y).toBe(155); // bottom y + margin
        });
    });

    describe('Integration Tests', () => {
        test('should create complete polyline connection without diagonal lines', () => {
            const entityBounds = [
                { left: 50, top: 50, right: 150, bottom: 100 },
                { left: 250, top: 150, right: 350, bottom: 200 }
            ];
            
            smartRouting.setEntityBounds(entityBounds);
            
            const from = { x: 150, y: 75 }; // right edge of first entity
            const to = { x: 250, y: 175 }; // left edge of second entity
            
            const svgPath = smartRouting.createPolylinePath(from, to);
            
            expect(svgPath).toBeDefined();
            expect(typeof svgPath).toBe('string');
            expect(svgPath.startsWith('M')).toBe(true);
        });

        test('should handle edge cases with same position entities', () => {
            const from = { x: 100, y: 100 };
            const to = { x: 100, y: 100 };
            
            const path = smartRouting.createLShapedPath(from, to);
            
            expect(path).toHaveLength(4);
            expect(path[0]).toEqual(from);
            expect(path[3]).toEqual(to);
        });

        test('should verify no diagonal lines in complex routing scenarios', () => {
            // Test various complex routing scenarios to ensure no diagonal lines
            const testCases = [
                // Case 1: Entities far apart horizontally
                { from: { x: 100, y: 100 }, to: { x: 400, y: 100 } },
                // Case 2: Entities far apart vertically
                { from: { x: 100, y: 100 }, to: { x: 100, y: 400 } },
                // Case 3: Entities diagonally positioned
                { from: { x: 100, y: 100 }, to: { x: 300, y: 250 } },
                // Case 4: Complex positioning
                { from: { x: 50, y: 200 }, to: { x: 350, y: 80 } }
            ];

            testCases.forEach((testCase, index) => {
                const path = smartRouting.createLShapedPath(testCase.from, testCase.to);
                
                // Verify all segments are either horizontal or vertical
                for (let i = 1; i < path.length; i++) {
                    const prev = path[i - 1];
                    const curr = path[i];
                    const isDiagonal = prev.x !== curr.x && prev.y !== curr.y;
                    expect(isDiagonal).toBe(false, 
                        `Test case ${index + 1}: Diagonal line found between (${prev.x},${prev.y}) and (${curr.x},${curr.y})`);
                }
            });
        });

        test('should properly connect relationship endpoints with polylines', () => {
            // Simulate real relationship connection scenario
            const fromEntity = {
                left: 100, top: 100, right: 200, bottom: 150,
                width: 100, height: 50, centerX: 150, centerY: 125
            };
            const toEntity = {
                left: 300, top: 200, right: 400, bottom: 250,
                width: 100, height: 50, centerX: 350, centerY: 225
            };

            const connPoints = connectionPoints.getEntityConnectionPoints(fromEntity, toEntity);
            const svgPath = smartRouting.createPolylinePath(connPoints.from, connPoints.to);
            
            // Verify SVG path contains only M and L commands (no diagonal lines)
            const pathCommands = svgPath.match(/[ML]\s*[\d.-]+\s*[\d.-]+/g);
            expect(pathCommands).toBeDefined();
            expect(pathCommands.length).toBeGreaterThan(1);
            
            // Parse coordinates and verify no diagonal segments
            const coordinates = [];
            pathCommands.forEach(cmd => {
                const match = cmd.match(/([\d.-]+)\s+([\d.-]+)/);
                if (match) {
                    coordinates.push({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
                }
            });

            for (let i = 1; i < coordinates.length; i++) {
                const prev = coordinates[i - 1];
                const curr = coordinates[i];
                const isDiagonal = prev.x !== curr.x && prev.y !== curr.y;
                expect(isDiagonal).toBe(false, 
                    `Diagonal segment found in SVG path between (${prev.x},${prev.y}) and (${curr.x},${curr.y})`);
            }
        });
    });
});