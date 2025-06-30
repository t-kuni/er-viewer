export = StorageManager;
declare class StorageManager {
    dataDir: string;
    erDataFile: string;
    layoutDataFile: string;
    ensureDataDir(): Promise<void>;
    saveERData(erData: any): Promise<void>;
    loadERData(): Promise<any>;
    saveLayoutData(layoutData: any): Promise<void>;
    loadLayoutData(): Promise<any>;
    mergeERDataWithLayout(erData: any, layoutData: any): Promise<any>;
    performIncrementalUpdate(newERData: any): Promise<any>;
    calculateNewEntityPosition(index: any, layoutData: any): any;
    adjustPositionForCollisions(proposedPosition: any, layoutData: any): any;
}
//# sourceMappingURL=storage.d.ts.map