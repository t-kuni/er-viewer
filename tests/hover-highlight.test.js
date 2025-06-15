/**
 * @jest-environment jsdom
 */

import { HighlightManager } from '../public/js/highlighting/highlight-manager.js';

describe('Hover Highlight Tests', () => {
    let highlightManager;
    let mockCanvas;

    beforeEach(() => {
        // Set up DOM mock
        document.body.innerHTML = `
            <div id="test-container">
                <svg id="er-canvas">
                    <g class="entity" data-table="users">
                        <rect width="150" height="100"></rect>
                        <g class="entity-column" data-column="id"></g>
                        <g class="entity-column" data-column="name"></g>
                    </g>
                    <g class="entity" data-table="orders">
                        <rect width="150" height="100"></rect>
                        <g class="entity-column" data-column="id"></g>
                        <g class="entity-column" data-column="user_id"></g>
                    </g>
                    <path class="relationship" 
                          data-from="users" 
                          data-to="orders" 
                          data-from-column="id" 
                          data-to-column="user_id">
                    </path>
                </svg>
            </div>
        `;

        highlightManager = new HighlightManager();
        mockCanvas = document.getElementById('er-canvas');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Entity Hover Highlighting', () => {
        test('should highlight entity and related elements on hover', () => {
            const entityElement = document.querySelector('[data-table="users"]');
            
            highlightManager.highlightEntity('users');
            
            // Check entity is highlighted
            expect(entityElement.classList.contains('highlighted')).toBe(true);
            expect(entityElement.style.zIndex).toBe('1002');
            
            // Check related entity is highlighted
            const relatedEntity = document.querySelector('[data-table="orders"]');
            expect(relatedEntity.classList.contains('highlighted-related')).toBe(true);
            expect(relatedEntity.style.zIndex).toBe('1000');
            
            // Check relationship is highlighted
            const relationship = document.querySelector('.relationship');
            expect(relationship.classList.contains('highlighted')).toBe(true);
            expect(relationship.style.zIndex).toBe('1001');
        });

        test('should highlight related columns when entity is hovered', () => {
            highlightManager.highlightEntity('users');
            
            // Check from column is highlighted
            const fromColumn = document.querySelector('[data-table="users"] .entity-column[data-column="id"]');
            expect(fromColumn.classList.contains('highlighted-column')).toBe(true);
            
            // Check to column is highlighted
            const toColumn = document.querySelector('[data-table="orders"] .entity-column[data-column="user_id"]');
            expect(toColumn.classList.contains('highlighted-column')).toBe(true);
        });

        test('should handle entities with no relationships', () => {
            // Add entity with no relationships
            document.querySelector('#er-canvas').innerHTML += `
                <g class="entity" data-table="standalone">
                    <rect width="150" height="100"></rect>
                    <g class="entity-column" data-column="id"></g>
                </g>
            `;

            const standaloneEntity = document.querySelector('[data-table="standalone"]');
            
            highlightManager.highlightEntity('standalone');
            
            expect(standaloneEntity.classList.contains('highlighted')).toBe(true);
            expect(standaloneEntity.style.zIndex).toBe('1002');
        });
    });

    describe('Relationship Hover Highlighting', () => {
        test('should highlight relationship and connected entities/columns on hover', () => {
            const relationshipElement = document.querySelector('.relationship');
            
            highlightManager.highlightRelationshipColumns(relationshipElement);
            
            // Check relationship is highlighted with highest priority
            expect(relationshipElement.classList.contains('highlighted')).toBe(true);
            expect(relationshipElement.style.zIndex).toBe('1003');
            
            // Check both connected entities are highlighted
            const fromEntity = document.querySelector('[data-table="users"]');
            const toEntity = document.querySelector('[data-table="orders"]');
            
            expect(fromEntity.classList.contains('highlighted-related')).toBe(true);
            expect(fromEntity.style.zIndex).toBe('1002');
            expect(toEntity.classList.contains('highlighted-related')).toBe(true);
            expect(toEntity.style.zIndex).toBe('1002');
            
            // Check connected columns are highlighted
            const fromColumn = document.querySelector('[data-table="users"] .entity-column[data-column="id"]');
            const toColumn = document.querySelector('[data-table="orders"] .entity-column[data-column="user_id"]');
            
            expect(fromColumn.classList.contains('highlighted-column')).toBe(true);
            expect(toColumn.classList.contains('highlighted-column')).toBe(true);
        });

        test('should handle relationship with missing column data', () => {
            // Create relationship without column data
            const relationshipElement = document.createElement('path');
            relationshipElement.className = 'relationship';
            relationshipElement.setAttribute('data-from', 'users');
            relationshipElement.setAttribute('data-to', 'orders');
            // Intentionally missing column data
            
            highlightManager.highlightRelationshipColumns(relationshipElement);
            
            // Should still highlight entities
            const fromEntity = document.querySelector('[data-table="users"]');
            const toEntity = document.querySelector('[data-table="orders"]');
            
            expect(fromEntity.classList.contains('highlighted-related')).toBe(true);
            expect(toEntity.classList.contains('highlighted-related')).toBe(true);
        });
    });

    describe('Highlight Management', () => {
        test('should clear all highlights', () => {
            // First highlight some elements
            highlightManager.highlightEntity('users');
            
            // Verify elements are highlighted
            expect(document.querySelector('[data-table="users"]').classList.contains('highlighted')).toBe(true);
            expect(document.querySelector('[data-table="orders"]').classList.contains('highlighted-related')).toBe(true);
            
            // Clear highlights
            highlightManager.clearHighlights();
            
            // Verify all highlights are cleared
            expect(document.querySelectorAll('.highlighted').length).toBe(0);
            expect(document.querySelectorAll('.highlighted-related').length).toBe(0);
            expect(document.querySelectorAll('.highlighted-column').length).toBe(0);
            
            // Verify z-index is reset
            const entities = document.querySelectorAll('.entity');
            entities.forEach(entity => {
                expect(entity.style.zIndex).toBe('');
            });
        });

        test('should handle hover with different target types', () => {
            const entityElement = document.querySelector('[data-table="users"]');
            const relationshipElement = document.querySelector('.relationship');
            
            // Test entity hover
            highlightManager.handleHover(entityElement);
            expect(entityElement.classList.contains('highlighted')).toBe(true);
            
            // Clear and test relationship hover
            highlightManager.clearHighlights();
            highlightManager.handleHover(relationshipElement);
            expect(relationshipElement.classList.contains('highlighted')).toBe(true);
            
            // Test null hover (should clear)
            highlightManager.handleHover(null);
            expect(document.querySelectorAll('.highlighted').length).toBe(0);
        });

        test('should track highlighted elements correctly', () => {
            expect(highlightManager.currentHighlights.size).toBe(0);
            
            highlightManager.highlightEntity('users');
            expect(highlightManager.currentHighlights.size).toBeGreaterThan(0);
            
            highlightManager.clearHighlights();
            expect(highlightManager.currentHighlights.size).toBe(0);
        });
    });

    describe('CSS Class Application', () => {
        test('should apply correct CSS classes for different highlight levels', () => {
            highlightManager.highlightEntity('users');
            
            const primaryEntity = document.querySelector('[data-table="users"]');
            const relatedEntity = document.querySelector('[data-table="orders"]');
            const relationship = document.querySelector('.relationship');
            const column = document.querySelector('[data-table="users"] .entity-column[data-column="id"]');
            
            // Verify distinct CSS classes
            expect(primaryEntity.classList.contains('highlighted')).toBe(true);
            expect(relatedEntity.classList.contains('highlighted-related')).toBe(true);
            expect(relationship.classList.contains('highlighted')).toBe(true);
            expect(column.classList.contains('highlighted-column')).toBe(true);
            
            // Verify z-index hierarchy
            expect(primaryEntity.style.zIndex).toBe('1002');
            expect(relatedEntity.style.zIndex).toBe('1000');
            expect(relationship.style.zIndex).toBe('1001');
        });

        test('should maintain visual hierarchy with z-index values', () => {
            highlightManager.highlightEntity('users');
            
            const primaryEntity = document.querySelector('[data-table="users"]');
            const relatedEntity = document.querySelector('[data-table="orders"]');
            const relationship = document.querySelector('.relationship');
            
            const primaryZ = parseInt(primaryEntity.style.zIndex);
            const relatedZ = parseInt(relatedEntity.style.zIndex);
            const relationshipZ = parseInt(relationship.style.zIndex);
            
            // Primary entity should be highest
            expect(primaryZ).toBeGreaterThan(relatedZ);
            expect(primaryZ).toBeGreaterThan(relationshipZ);
            
            // Relationship should be higher than related entities
            expect(relationshipZ).toBeGreaterThan(relatedZ);
        });
    });
});