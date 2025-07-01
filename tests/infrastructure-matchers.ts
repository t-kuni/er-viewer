/**
 * Infrastructure Mock専用のカスタムマッチャー
 * 
 * テストの可読性と保守性を向上させるため、頻繁に使用される
 * Infrastructure Mock検証パターンをカスタムマッチャーとして提供
 */
import type { InfrastructureMock } from '../public/js/infrastructure/mocks/infrastructure-mock';
import type { MockElement } from '../public/js/infrastructure/mocks/dom-mock';
import type { NetworkRequest } from '../public/js/types/infrastructure';

// Jest カスタムマッチャーの型定義を拡張
declare global {
  namespace jest {
    interface Matchers<R> {
      // DOM関連マッチャー
      toHaveElement(elementId: string): R;
      toHaveAttribute(attributeName: string, expectedValue: string): R;
      toHaveClass(className: string): R;
      toHaveTextContent(expectedText: string): R;
      
      // Network関連マッチャー
      toHaveMadeRequest(url: string, method?: string): R;
      toHaveRequestedWithBody(url: string, expectedBody: any): R;
      toHaveReceivedResponse(url: string, expectedStatus: number): R;
      
      // Storage関連マッチャー
      toHaveStoredItem(key: string, value?: any): R;
      toHaveRetrievedItem(key: string): R;
      
      // DOM操作検証マッチャー
      toHaveSetAttribute(element: MockElement | string, attributeName: string, value: string): R;
      toHaveAddedClass(element: MockElement | string, className: string): R;
      toHaveRemovedClass(element: MockElement | string, className: string): R;
      toHaveSetInnerHTML(element: MockElement | string, html: string): R;
      
      // Error関連マッチャー
      toHaveLoggedError(errorMessage: string): R;
      
      // 一般的な検証マッチャー
      toHaveCalledDOMMethod(methodName: string, ...args: any[]): R;
      toHaveInteractionCount(type: 'network' | 'dom' | 'storage' | 'error', count: number): R;
    }
  }
}

/**
 * DOM要素の存在を検証するマッチャー
 */
export const toHaveElement = (
  infrastructure: InfrastructureMock, 
  elementId: string
) => {
  const element = infrastructure.dom.getElementById(elementId);
  const pass = element !== null;
  
  return {
    pass,
    message: () => pass
      ? `Expected element with id "${elementId}" not to exist`
      : `Expected element with id "${elementId}" to exist`
  };
};

/**
 * DOM要素の属性を検証するマッチャー
 */
export const toHaveAttribute = (
  element: MockElement,
  attributeName: string,
  expectedValue: string
) => {
  const actualValue = element.getAttribute(attributeName);
  const pass = actualValue === expectedValue;
  
  return {
    pass,
    message: () => pass
      ? `Expected element not to have attribute "${attributeName}" with value "${expectedValue}"`
      : `Expected element to have attribute "${attributeName}" with value "${expectedValue}", but got "${actualValue}"`
  };
};

/**
 * DOM要素のクラスを検証するマッチャー
 */
export const toHaveClass = (
  element: MockElement,
  className: string
) => {
  const classes = element.getAttribute('class') || '';
  const classList = classes.split(' ').filter(c => c);
  const pass = classList.includes(className);
  
  return {
    pass,
    message: () => pass
      ? `Expected element not to have class "${className}"`
      : `Expected element to have class "${className}", but has classes: "${classes}"`
  };
};

/**
 * DOM要素のテキストコンテンツを検証するマッチャー
 */
export const toHaveTextContent = (
  element: MockElement,
  expectedText: string
) => {
  const actualText = element.textContent || '';
  const pass = actualText.includes(expectedText);
  
  return {
    pass,
    message: () => pass
      ? `Expected element not to contain text "${expectedText}"`
      : `Expected element to contain text "${expectedText}", but has: "${actualText}"`
  };
};

/**
 * ネットワークリクエストの実行を検証するマッチャー
 */
export const toHaveMadeRequest = (
  infrastructure: InfrastructureMock,
  url: string,
  method?: string
) => {
  const history = infrastructure.getInteractionHistory();
  const requests = history.networkRequests;
  
  const matchingRequest = requests.find(req => 
    req.url === url && (!method || req.method === method)
  );
  
  const pass = matchingRequest !== undefined;
  
  return {
    pass,
    message: () => {
      if (pass) {
        return `Expected not to have made ${method || 'any'} request to "${url}"`;
      } else {
        const requestsInfo = requests.map(r => `${r.method} ${r.url}`).join(', ');
        return `Expected to have made ${method || 'any'} request to "${url}". Actual requests: [${requestsInfo}]`;
      }
    }
  };
};

/**
 * リクエストボディを検証するマッチャー
 */
export const toHaveRequestedWithBody = (
  infrastructure: InfrastructureMock,
  url: string,
  expectedBody: any
) => {
  const history = infrastructure.getInteractionHistory();
  const request = history.networkRequests.find(req => req.url === url);
  
  if (!request) {
    return {
      pass: false,
      message: () => `Expected to have made request to "${url}", but no such request was found`
    };
  }
  
  const actualBody = typeof request.body === 'string' 
    ? JSON.parse(request.body) 
    : request.body;
  
  // Jestのマッチャーオブジェクトを使用した比較を行う
  // expect.objectContaining, expect.stringMatching などを考慮
  let pass: boolean;
  try {
    expect(actualBody).toEqual(expectedBody);
    pass = true;
  } catch {
    pass = false;
  }
  
  return {
    pass,
    message: () => pass
      ? `Expected request to "${url}" not to have body ${JSON.stringify(expectedBody)}`
      : `Expected request to "${url}" to have body ${JSON.stringify(expectedBody)}, but got ${JSON.stringify(actualBody)}`
  };
};

/**
 * Storage操作を検証するマッチャー
 */
export const toHaveStoredItem = (
  infrastructure: InfrastructureMock,
  key: string,
  value?: any
) => {
  const storageContents = infrastructure.storage.getStorageContents();
  const hasKey = key in storageContents;
  
  if (value === undefined) {
    return {
      pass: hasKey,
      message: () => hasKey
        ? `Expected storage not to contain key "${key}"`
        : `Expected storage to contain key "${key}"`
    };
  }
  
  // StorageMockは値をJSON.stringifyして保存するため、
  // 期待値も同様にJSON.stringifyする必要がある
  const actualValue = storageContents[key];
  const expectedValue = JSON.stringify(value);
  const pass = hasKey && actualValue === expectedValue;
  
  return {
    pass,
    message: () => pass
      ? `Expected storage not to have key "${key}" with value ${JSON.stringify(value)}`
      : `Expected storage to have key "${key}" with value ${JSON.stringify(value)}, but got ${actualValue}`
  };
};

/**
 * DOM操作（setAttribute）を検証するマッチャー
 */
export const toHaveSetAttribute = (
  infrastructure: InfrastructureMock,
  element: MockElement | string,
  attributeName: string,
  value: string
) => {
  const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
  const elementMatcher = typeof element === 'string' 
    ? expect.objectContaining({ id: element })
    : element;
    
  const pass = setAttributeSpy.mock.calls.some(call => {
    const [el, attr, val] = call;
    const elementMatches = typeof element === 'string'
      ? (el as MockElement).getAttribute('id') === element
      : el === element;
    return elementMatches && attr === attributeName && val === value;
  });
  
  return {
    pass,
    message: () => pass
      ? `Expected not to have called setAttribute with (${element}, "${attributeName}", "${value}")`
      : `Expected to have called setAttribute with (${element}, "${attributeName}", "${value}")`
  };
};

/**
 * エラーログを検証するマッチャー
 */
export const toHaveLoggedError = (
  infrastructure: InfrastructureMock,
  errorMessage: string
) => {
  const history = infrastructure.getInteractionHistory();
  const errors = history.errors;
  
  const matchingError = errors.find(error => 
    error.args.some(arg => 
      typeof arg === 'string' && arg.includes(errorMessage)
    )
  );
  
  const pass = matchingError !== undefined;
  
  return {
    pass,
    message: () => pass
      ? `Expected not to have logged error containing "${errorMessage}"`
      : `Expected to have logged error containing "${errorMessage}"`
  };
};

/**
 * インタラクション回数を検証するマッチャー
 */
export const toHaveInteractionCount = (
  infrastructure: InfrastructureMock,
  type: 'network' | 'dom' | 'storage' | 'error',
  count: number
) => {
  const history = infrastructure.getInteractionHistory();
  let actualCount = 0;
  
  switch (type) {
    case 'network':
      actualCount = history.networkRequests.length;
      break;
    case 'error':
      actualCount = history.errors.length;
      break;
    // DOM and storage counts would need to be implemented based on spy calls
  }
  
  const pass = actualCount === count;
  
  return {
    pass,
    message: () => pass
      ? `Expected not to have ${count} ${type} interactions`
      : `Expected to have ${count} ${type} interactions, but had ${actualCount}`
  };
};

/**
 * カスタムマッチャーを登録する関数
 */
export function setupInfrastructureMatchers() {
  expect.extend({
    toHaveElement(infrastructure: InfrastructureMock, elementId: string) {
      return toHaveElement(infrastructure, elementId);
    },
    
    toHaveAttribute(element: MockElement, attributeName: string, expectedValue: string) {
      return toHaveAttribute(element, attributeName, expectedValue);
    },
    
    toHaveClass(element: MockElement, className: string) {
      return toHaveClass(element, className);
    },
    
    toHaveTextContent(element: MockElement, expectedText: string) {
      return toHaveTextContent(element, expectedText);
    },
    
    toHaveMadeRequest(infrastructure: InfrastructureMock, url: string, method?: string) {
      return toHaveMadeRequest(infrastructure, url, method);
    },
    
    toHaveRequestedWithBody(infrastructure: InfrastructureMock, url: string, expectedBody: any) {
      return toHaveRequestedWithBody(infrastructure, url, expectedBody);
    },
    
    toHaveStoredItem(infrastructure: InfrastructureMock, key: string, value?: any) {
      return toHaveStoredItem(infrastructure, key, value);
    },
    
    toHaveSetAttribute(infrastructure: InfrastructureMock, element: MockElement | string, attributeName: string, value: string) {
      return toHaveSetAttribute(infrastructure, element, attributeName, value);
    },
    
    toHaveLoggedError(infrastructure: InfrastructureMock, errorMessage: string) {
      return toHaveLoggedError(infrastructure, errorMessage);
    },
    
    toHaveInteractionCount(infrastructure: InfrastructureMock, type: 'network' | 'dom' | 'storage' | 'error', count: number) {
      return toHaveInteractionCount(infrastructure, type, count);
    }
  });
}