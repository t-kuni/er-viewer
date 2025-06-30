// Type definitions for highlighting
interface HighlightableElement extends HTMLElement {
  style: CSSStyleDeclaration;
}

// Highlighting and hover effects manager
export class HighlightManager {
  private currentHighlights: Set<Element>;

  constructor() {
    this.currentHighlights = new Set();
  }

  highlightEntity(tableName: string): void {
    const entity = document.querySelector(`[data-table="${tableName}"]`);
    if (entity) {
      // Highlight the main entity with strongest emphasis
      entity.classList.add('highlighted');
      (entity as HTMLElement).style.zIndex = '1002';
      this.currentHighlights.add(entity);

      // Get all relationships connected to this entity
      const relationships = document.querySelectorAll(`[data-from="${tableName}"], [data-to="${tableName}"]`);
      relationships.forEach((rel) => {
        const relElement = rel as HighlightableElement;
        // Highlight relationship lines with enhanced effect
        relElement.classList.add('highlighted');
        relElement.style.zIndex = '1001';
        this.currentHighlights.add(relElement);

        // Highlight the related entities with secondary emphasis
        const fromTable = relElement.getAttribute('data-from');
        const toTable = relElement.getAttribute('data-to');

        // Highlight the other entity in each relationship
        const relatedTable = fromTable === tableName ? toTable : fromTable;
        if (relatedTable) {
          const relatedEntity = document.querySelector(`[data-table="${relatedTable}"]`);
          if (relatedEntity) {
            relatedEntity.classList.add('highlighted-related');
            (relatedEntity as HTMLElement).style.zIndex = '1000';
            this.currentHighlights.add(relatedEntity);
          }
        }

        // Highlight the related columns with enhanced visibility
        const fromColumn = relElement.getAttribute('data-from-column');
        const toColumn = relElement.getAttribute('data-to-column');

        if (fromColumn && fromTable) {
          const fromColumnElement = document.querySelector(
            `[data-table="${fromTable}"] .entity-column[data-column="${fromColumn}"]`,
          );
          if (fromColumnElement) {
            fromColumnElement.classList.add('highlighted-column');
            this.currentHighlights.add(fromColumnElement);
          }
        }

        if (toColumn && toTable) {
          const toColumnElement = document.querySelector(
            `[data-table="${toTable}"] .entity-column[data-column="${toColumn}"]`,
          );
          if (toColumnElement) {
            toColumnElement.classList.add('highlighted-column');
            this.currentHighlights.add(toColumnElement);
          }
        }
      });
    }
  }

  highlightRelationshipColumns(relationshipElement: HighlightableElement): void {
    const fromTable = relationshipElement.getAttribute('data-from');
    const toTable = relationshipElement.getAttribute('data-to');
    const fromColumn = relationshipElement.getAttribute('data-from-column');
    const toColumn = relationshipElement.getAttribute('data-to-column');

    // Highlight the relationship line itself with strongest emphasis
    relationshipElement.classList.add('highlighted');
    relationshipElement.style.zIndex = '1003';
    this.currentHighlights.add(relationshipElement);

    // Highlight both connected entities with strong emphasis for relationship hover
    if (fromTable) {
      const fromEntity = document.querySelector(`[data-table="${fromTable}"]`);
      if (fromEntity) {
        fromEntity.classList.add('highlighted-related');
        (fromEntity as HTMLElement).style.zIndex = '1002';
        this.currentHighlights.add(fromEntity);
      }
    }

    if (toTable) {
      const toEntity = document.querySelector(`[data-table="${toTable}"]`);
      if (toEntity) {
        toEntity.classList.add('highlighted-related');
        (toEntity as HTMLElement).style.zIndex = '1002';
        this.currentHighlights.add(toEntity);
      }
    }

    // Highlight the specific columns in both entities
    if (fromTable && fromColumn) {
      const fromColumnElement = document.querySelector(
        `[data-table="${fromTable}"] .entity-column[data-column="${fromColumn}"]`,
      );
      if (fromColumnElement) {
        fromColumnElement.classList.add('highlighted-column');
        this.currentHighlights.add(fromColumnElement);
      }
    }

    if (toTable && toColumn) {
      const toColumnElement = document.querySelector(
        `[data-table="${toTable}"] .entity-column[data-column="${toColumn}"]`,
      );
      if (toColumnElement) {
        toColumnElement.classList.add('highlighted-column');
        this.currentHighlights.add(toColumnElement);
      }
    }
  }

  clearHighlights(): void {
    // Remove highlighted class from elements
    document.querySelectorAll('.highlighted').forEach((el) => {
      const element = el as HighlightableElement;
      element.classList.remove('highlighted');
      element.style.zIndex = '';
    });

    document.querySelectorAll('.highlighted-related').forEach((el) => {
      const element = el as HighlightableElement;
      element.classList.remove('highlighted-related');
      element.style.zIndex = '';
    });

    document.querySelectorAll('.highlighted-column').forEach((el) => {
      el.classList.remove('highlighted-column');
    });

    // Clear the tracking set
    this.currentHighlights.clear();
  }

  handleHover(target: HTMLElement | null): void {
    this.clearHighlights();

    if (target) {
      if (target.classList.contains('entity')) {
        const tableName = target.getAttribute('data-table');
        if (tableName) {
          this.highlightEntity(tableName);
        }
      } else if (target.classList.contains('relationship')) {
        this.highlightRelationshipColumns(target as HighlightableElement);
      }
    }
  }
}
