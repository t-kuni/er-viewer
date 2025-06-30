interface HighlightableElement extends HTMLElement {
    style: CSSStyleDeclaration;
}
export declare class HighlightManager {
    private currentHighlights;
    constructor();
    highlightEntity(tableName: string): void;
    highlightRelationshipColumns(relationshipElement: HighlightableElement): void;
    clearHighlights(): void;
    handleHover(target: HTMLElement | null): void;
}
export {};
//# sourceMappingURL=highlight-manager.d.ts.map