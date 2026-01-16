console.log("Init")

// TypeScript機能のテスト
interface TestInterface {
  message: string;
  timestamp: Date;
}

class TestClass {
  private data: TestInterface;
  
  constructor(message: string) {
    this.data = {
      message,
      timestamp: new Date()
    };
  }
  
  public display(): void {
    console.log("TypeScript読み込み成功:", this.data);
    
    // DOM操作のテスト
    const app = document.getElementById('app');
    if (app) {
      const testDiv = document.createElement('div');
      testDiv.style.position = 'fixed';
      testDiv.style.top = '10px';
      testDiv.style.right = '10px';
      testDiv.style.background = '#4CAF50';
      testDiv.style.color = 'white';
      testDiv.style.padding = '10px';
      testDiv.style.borderRadius = '5px';
      testDiv.style.zIndex = '9999';
      testDiv.textContent = `TS読み込み成功: ${this.data.message}`;
      app.appendChild(testDiv);
      
      // 3秒後に削除
      setTimeout(() => {
        testDiv.remove();
      }, 3000);
    }
  }
}

// 実行
const test = new TestClass("フロントエンドTypeScript動作中");
test.display();
