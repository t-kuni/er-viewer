import { DefaultService } from './api/client';
import type { BuildInfo } from './api/client';

// DOM要素の取得
const buildInfoBtn = document.getElementById('build-info') as HTMLButtonElement;
const buildInfoModal = document.getElementById('build-info-modal') as HTMLDivElement;
const buildInfoContent = document.getElementById('build-info-content') as HTMLDivElement;
const closeBuildInfoBtn = document.getElementById('close-build-info') as HTMLButtonElement;

// ビルド情報をHTML形式に整形
function formatBuildInfo(buildInfo: BuildInfo): string {
  return `
    <div class="build-info-details">
      <div class="build-info-item">
        <strong>アプリケーション名:</strong>
        <span>${buildInfo.name}</span>
      </div>
      <div class="build-info-item">
        <strong>バージョン:</strong>
        <span>${buildInfo.version}</span>
      </div>
      <div class="build-info-item">
        <strong>ビルド日時:</strong>
        <span>${buildInfo.buildDate}</span>
      </div>
      <div class="build-info-item">
        <strong>ビルドタイムスタンプ:</strong>
        <span>${buildInfo.buildTime}</span>
      </div>
      <div class="build-info-item">
        <strong>Git コミット:</strong>
        <span>${buildInfo.git.commit}</span>
      </div>
      <div class="build-info-item">
        <strong>Git ブランチ:</strong>
        <span>${buildInfo.git.branch}</span>
      </div>
      <div class="build-info-item">
        <strong>Git タグ:</strong>
        <span>${buildInfo.git.tag || '(なし)'}</span>
      </div>
      <div class="build-info-item">
        <strong>Git 状態:</strong>
        <span>${buildInfo.git.dirty ? '変更あり' : 'クリーン'}</span>
      </div>
    </div>
  `;
}

// ビルド情報を取得して表示
async function loadBuildInfo(): Promise<void> {
  try {
    buildInfoContent.innerHTML = '<p>ビルド情報を読み込み中...</p>';
    
    const buildInfo = await DefaultService.apiGetBuildInfo();
    buildInfoContent.innerHTML = formatBuildInfo(buildInfo);
  } catch (error) {
    console.error('ビルド情報の取得に失敗しました:', error);
    buildInfoContent.innerHTML = `
      <div class="error-message">
        <p>ビルド情報の取得に失敗しました。</p>
        <p>エラー: ${error instanceof Error ? error.message : String(error)}</p>
      </div>
    `;
  }
}

// モーダルを表示
function showBuildInfoModal(): void {
  buildInfoModal.style.display = 'block';
  loadBuildInfo();
}

// モーダルを非表示
function hideBuildInfoModal(): void {
  buildInfoModal.style.display = 'none';
}

// イベントリスナーの設定
buildInfoBtn.addEventListener('click', showBuildInfoModal);
closeBuildInfoBtn.addEventListener('click', hideBuildInfoModal);

// モーダル外をクリックしたら閉じる
buildInfoModal.addEventListener('click', (event) => {
  if (event.target === buildInfoModal) {
    hideBuildInfoModal();
  }
});

console.log('ER Diagram Viewer initialized');
