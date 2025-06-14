* SPEC.md：要件が記載されています。この要件を満たすソフトウェアを作って下さい
* TASK.md：SPEC.mdからブレークダウンした詳細なタスクが記載されています。完了したタスクはTASK_DONE.mdに移動します。
* TASK_DONE.md：完了したタスクが記載されています。
* 「要件からタスクを洗い出して」と指示した場合は、後述のコマンドでSPEC.mdの差分を確認し、タスクにブレークダウンしてTASK.mdに追記してください
* タスクが完了や中断する場合は `notify-send "タイトル" "メッセージ"` でアラートを出して下さい
* 差分確認： `git add -A && GIT_PAGER=cat git diff HEAD`
* サーバー起動： `docker compose up -d`
* サーバー起動状態確認： `docker compose ps`