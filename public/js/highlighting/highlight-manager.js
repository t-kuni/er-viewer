// Highlighting and hover effects manager
export class HighlightManager {
    constructor() {
        this.currentHighlights = new Set();
    }

    highlightEntity(tableName) {
        const entity = document.querySelector(`[data-table="${tableName}"]`);
        if (entity) {
            // Highlight the main entity with strongest emphasis
            entity.classList.add('highlighted');
            entity.style.zIndex = '1002';
            this.currentHighlights.add(entity);
            
            // Get all relationships connected to this entity
            const relationships = document.querySelectorAll(`[data-from="${tableName}"], [data-to="${tableName}"]`);
            relationships.forEach(rel => {
                // Highlight relationship lines with enhanced effect
                rel.classList.add('highlighted');
                rel.style.zIndex = '1001';
                this.currentHighlights.add(rel);
                
                // Highlight the related entities with secondary emphasis
                const fromTable = rel.getAttribute('data-from');
                const toTable = rel.getAttribute('data-to');
                
                // Highlight the other entity in each relationship
                const relatedTable = fromTable === tableName ? toTable : fromTable;
                const relatedEntity = document.querySelector(`[data-table="${relatedTable}"]`);
                if (relatedEntity) {
                    relatedEntity.classList.add('highlighted-related');
                    relatedEntity.style.zIndex = '1000';
                    this.currentHighlights.add(relatedEntity);
                }
                
                // Highlight the related columns with enhanced visibility
                const fromColumn = rel.getAttribute('data-from-column');
                const toColumn = rel.getAttribute('data-to-column');
                
                if (fromColumn) {
                    const fromColumnElement = document.querySelector(`[data-table="${fromTable}"] .column[data-column="${fromColumn}"]`);
                    if (fromColumnElement) {
                        fromColumnElement.classList.add('highlighted-column');
                        this.currentHighlights.add(fromColumnElement);
                    }
                }
                
                if (toColumn) {
                    const toColumnElement = document.querySelector(`[data-table="${toTable}"] .column[data-column="${toColumn}"]`);
                    if (toColumnElement) {
                        toColumnElement.classList.add('highlighted-column');
                        this.currentHighlights.add(toColumnElement);
                    }
                }
            });
        }
    }

    highlightRelationshipColumns(relationshipElement) {
        const fromTable = relationshipElement.getAttribute('data-from');
        const toTable = relationshipElement.getAttribute('data-to');
        const fromColumn = relationshipElement.getAttribute('data-from-column');
        const toColumn = relationshipElement.getAttribute('data-to-column');

        // Highlight the relationship line itself with strongest emphasis
        relationshipElement.classList.add('highlighted');
        relationshipElement.style.zIndex = '1003';
        this.currentHighlights.add(relationshipElement);

        // Highlight both connected entities with strong emphasis for relationship hover
        const fromEntity = document.querySelector(`[data-table="${fromTable}"]`);
        const toEntity = document.querySelector(`[data-table="${toTable}"]`);
        
        if (fromEntity) {
            fromEntity.classList.add('highlighted-related');
            fromEntity.style.zIndex = '1002';
            this.currentHighlights.add(fromEntity);
        }
        
        if (toEntity) {
            toEntity.classList.add('highlighted-related');
            toEntity.style.zIndex = '1002';
            this.currentHighlights.add(toEntity);
        }

        // Highlight the specific columns in both entities
        if (fromTable && fromColumn) {
            const fromColumnElement = document.querySelector(`[data-table="${fromTable}"] .column[data-column="${fromColumn}"]`);
            if (fromColumnElement) {
                fromColumnElement.classList.add('highlighted-column');
                this.currentHighlights.add(fromColumnElement);
            }
        }

        if (toTable && toColumn) {
            const toColumnElement = document.querySelector(`[data-table="${toTable}"] .column[data-column="${toColumn}"]`);
            if (toColumnElement) {
                toColumnElement.classList.add('highlighted-column');
                this.currentHighlights.add(toColumnElement);
            }
        }
    }

    clearHighlights() {
        // Remove highlighted class from elements
        document.querySelectorAll('.highlighted').forEach(el => {
            el.classList.remove('highlighted');
            el.style.zIndex = '';
        });
        
        document.querySelectorAll('.highlighted-related').forEach(el => {
            el.classList.remove('highlighted-related');
            el.style.zIndex = '';
        });
        
        document.querySelectorAll('.highlighted-column').forEach(el => {
            el.classList.remove('highlighted-column');
        });
        
        // Clear the tracking set
        this.currentHighlights.clear();
    }

    handleHover(target) {
        this.clearHighlights();
        
        if (target) {
            if (target.classList.contains('entity')) {
                this.highlightEntity(target.getAttribute('data-table'));
            } else if (target.classList.contains('relationship')) {
                this.highlightRelationshipColumns(target);
            }
        }
    }
}