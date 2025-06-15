# Page snapshot

```yaml
- banner:
  - heading "ER Diagram Viewer" [level=1]
  - button "リバースエンジニア"
  - button "レイアウト保存"
  - button "データ読み込み"
  - button "ビルド情報"
- main:
  - img: activities 🔑 id 🔗 user_id activity_type entity_type entity_id description metadata created_at categories 🔑 id name description 🔗 parent_id sort_order is_active comments 🔑 id 🔗 post_id 🔗 user_id 🔗 parent_id content is_approved created_at updated_at files 🔑 id 🔗 user_id filename original_filename file_path file_size mime_type file_hash is_public uploaded_at notifications 🔑 id 🔗 user_id title message notification_type is_read action_url created_at read_at organizations 🔑 id name description website logo_url 🔗 created_by created_at post_categories 🔑 🔗 post_id 🔑 🔗 category_id post_files 🔑 🔗 post_id 🔑 🔗 file_id display_order post_tags 🔑 🔗 post_id 🔑 🔗 tag_id posts 🔑 id 🔗 user_id title content excerpt status featured_image_url view_count published_at created_at updated_at project_teams 🔑 🔗 project_id 🔑 🔗 team_id assigned_at projects 🔑 id 🔗 organization_id name description status priority start_date end_date budget 🔗 created_by created_at roles 🔑 id name description is_active tags 🔑 id name slug description usage_count task_dependencies 🔑 🔗 task_id 🔑 🔗 depends_on_task_id created_at tasks 🔑 id 🔗 project_id title description status priority estimated_hours actual_hours due_date 🔗 assigned_to 🔗 created_by created_at updated_at team_members 🔑 🔗 team_id 🔑 🔗 user_id role joined_at teams 🔑 id 🔗 organization_id name description 🔗 team_lead_id created_at user_profiles 🔑 id 🔗 user_id bio phone website location birth_date privacy_level user_roles 🔑 🔗 user_id 🔑 🔗 role_id assigned_at 🔗 assigned_by users 🔑 id username email password_hash first_name last_name avatar_url is_active last_login created_at updated_at
  - heading "テーブル詳細" [level=3]
  - button "×"
  - paragraph: テーブルをクリックして詳細を表示
```