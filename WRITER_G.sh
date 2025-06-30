#!/bin/bash

# パラメータ設定
SLEEP_TIME=30

echo "執筆スクリプトを開始します..."

# 無限ループでclaudeコマンドを実行
while true; do
    # COMPLETE.mdファイルの存在確認
    if [ -f "COMPLETE.md" ]; then
        echo "執筆完了しました。"
        notify-send "執筆完了" "COMPLETE.mdが作成されました。執筆が完了しました。"
        exit 0
    fi
    
    gemini -p --yolo < WRITER_PROMPT.md
    
    # # claudeコマンドが0以外を返した場合もループを抜ける
    # if [ $? -ne 0 ]; then
    #     echo "claudeコマンドがエラーで終了しました。執筆スクリプトを終了します。"
    #     notify-send "執筆スクリプト終了" "claudeコマンドがエラーで終了しました。"
    #     exit 1
    # fi
    
    sleep $SLEEP_TIME
done