/**
 * Infrastructure Mock専用のカスタムマッチャー
 *
 * テストの可読性と保守性を向上させるため、頻繁に使用される
 * Infrastructure Mock検証パターンをカスタムマッチャーとして提供
 */
import type { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
import type { MockElement } from '../public/js/infrastructure/mocks/dom-mock';
declare global {
    namespace jest {
        interface Matchers<R> {
            toHaveElement(elementId: string): R;
            toHaveAttribute(attributeName: string, expectedValue: string): R;
            toHaveClass(className: string): R;
            toHaveTextContent(expectedText: string): R;
            toHaveMadeRequest(url: string, method?: string): R;
            toHaveRequestedWithBody(url: string, expectedBody: any): R;
            toHaveReceivedResponse(url: string, expectedStatus: number): R;
            toHaveStoredItem(key: string, value?: any): R;
            toHaveRetrievedItem(key: string): R;
            toHaveSetAttribute(element: MockElement | string, attributeName: string, value: string): R;
            toHaveAddedClass(element: MockElement | string, className: string): R;
            toHaveRemovedClass(element: MockElement | string, className: string): R;
            toHaveSetInnerHTML(element: MockElement | string, html: string): R;
            toHaveLoggedError(errorMessage: string): R;
            toHaveCalledDOMMethod(methodName: string, ...args: any[]): R;
            toHaveInteractionCount(type: 'network' | 'dom' | 'storage' | 'error', count: number): R;
        }
    }
}
/**
 * DOM要素の存在を検証するマッチャー
 */
export declare const toHaveElement: (infrastructure: InfrastructureMock, elementId: string) => {
    pass: boolean;
    message: () => string;
};
/**
 * DOM要素の属性を検証するマッチャー
 */
export declare const toHaveAttribute: (element: MockElement, attributeName: string, expectedValue: string) => {
    pass: boolean;
    message: () => string;
};
/**
 * DOM要素のクラスを検証するマッチャー
 */
export declare const toHaveClass: (element: MockElement, className: string) => {
    pass: boolean;
    message: () => string;
};
/**
 * DOM要素のテキストコンテンツを検証するマッチャー
 */
export declare const toHaveTextContent: (element: MockElement, expectedText: string) => {
    pass: boolean;
    message: () => string;
};
/**
 * ネットワークリクエストの実行を検証するマッチャー
 */
export declare const toHaveMadeRequest: (infrastructure: InfrastructureMock, url: string, method?: string) => {
    pass: boolean;
    message: () => string;
};
/**
 * リクエストボディを検証するマッチャー
 */
export declare const toHaveRequestedWithBody: (infrastructure: InfrastructureMock, url: string, expectedBody: any) => {
    pass: boolean;
    message: () => string;
};
/**
 * Storage操作を検証するマッチャー
 */
export declare const toHaveStoredItem: (infrastructure: InfrastructureMock, key: string, value?: any) => {
    pass: boolean;
    message: () => string;
};
/**
 * DOM操作（setAttribute）を検証するマッチャー
 */
export declare const toHaveSetAttribute: (infrastructure: InfrastructureMock, element: MockElement | string, attributeName: string, value: string) => {
    pass: boolean;
    message: () => string;
};
/**
 * エラーログを検証するマッチャー
 */
export declare const toHaveLoggedError: (infrastructure: InfrastructureMock, errorMessage: string) => {
    pass: boolean;
    message: () => string;
};
/**
 * インタラクション回数を検証するマッチャー
 */
export declare const toHaveInteractionCount: (infrastructure: InfrastructureMock, type: "network" | "dom" | "storage" | "error", count: number) => {
    pass: boolean;
    message: () => string;
};
/**
 * カスタムマッチャーを登録する関数
 */
export declare function setupInfrastructureMatchers(): void;
//# sourceMappingURL=infrastructure-matchers.d.ts.map