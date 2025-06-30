/**
 * Jest グローバルセットアップ
 * 
 * 全てのテストファイルで利用可能なグローバル設定
 */
import { setupInfrastructureMatchers } from './infrastructure-matchers';

// カスタムマッチャーをグローバルに登録
setupInfrastructureMatchers();

// その他のグローバル設定をここに追加可能