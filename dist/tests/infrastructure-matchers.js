/**
 * DOM要素の存在を検証するマッチャー
 */
export const toHaveElement = (infrastructure, elementId) => {
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
export const toHaveAttribute = (element, attributeName, expectedValue) => {
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
export const toHaveClass = (element, className) => {
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
export const toHaveTextContent = (element, expectedText) => {
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
export const toHaveMadeRequest = (infrastructure, url, method) => {
    const history = infrastructure.getInteractionHistory();
    const requests = history.networkRequests;
    const matchingRequest = requests.find(req => req.url === url && (!method || req.method === method));
    const pass = matchingRequest !== undefined;
    return {
        pass,
        message: () => {
            if (pass) {
                return `Expected not to have made ${method || 'any'} request to "${url}"`;
            }
            else {
                const requestsInfo = requests.map(r => `${r.method} ${r.url}`).join(', ');
                return `Expected to have made ${method || 'any'} request to "${url}". Actual requests: [${requestsInfo}]`;
            }
        }
    };
};
/**
 * リクエストボディを検証するマッチャー
 */
export const toHaveRequestedWithBody = (infrastructure, url, expectedBody) => {
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
    const pass = JSON.stringify(actualBody) === JSON.stringify(expectedBody);
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
export const toHaveStoredItem = (infrastructure, key, value) => {
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
export const toHaveSetAttribute = (infrastructure, element, attributeName, value) => {
    const setAttributeSpy = jest.spyOn(infrastructure.dom, 'setAttribute');
    const elementMatcher = typeof element === 'string'
        ? expect.objectContaining({ id: element })
        : element;
    const pass = setAttributeSpy.mock.calls.some(call => {
        const [el, attr, val] = call;
        const elementMatches = typeof element === 'string'
            ? el.getAttribute('id') === element
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
export const toHaveLoggedError = (infrastructure, errorMessage) => {
    const history = infrastructure.getInteractionHistory();
    const errors = history.errors;
    const matchingError = errors.find(error => error.args.some(arg => typeof arg === 'string' && arg.includes(errorMessage)));
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
export const toHaveInteractionCount = (infrastructure, type, count) => {
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
        toHaveElement(infrastructure, elementId) {
            return toHaveElement(infrastructure, elementId);
        },
        toHaveAttribute(element, attributeName, expectedValue) {
            return toHaveAttribute(element, attributeName, expectedValue);
        },
        toHaveClass(element, className) {
            return toHaveClass(element, className);
        },
        toHaveTextContent(element, expectedText) {
            return toHaveTextContent(element, expectedText);
        },
        toHaveMadeRequest(infrastructure, url, method) {
            return toHaveMadeRequest(infrastructure, url, method);
        },
        toHaveRequestedWithBody(infrastructure, url, expectedBody) {
            return toHaveRequestedWithBody(infrastructure, url, expectedBody);
        },
        toHaveStoredItem(infrastructure, key, value) {
            return toHaveStoredItem(infrastructure, key, value);
        },
        toHaveSetAttribute(infrastructure, element, attributeName, value) {
            return toHaveSetAttribute(infrastructure, element, attributeName, value);
        },
        toHaveLoggedError(infrastructure, errorMessage) {
            return toHaveLoggedError(infrastructure, errorMessage);
        },
        toHaveInteractionCount(infrastructure, type, count) {
            return toHaveInteractionCount(infrastructure, type, count);
        }
    });
}
//# sourceMappingURL=infrastructure-matchers.js.map