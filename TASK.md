# ER Diagram Viewer - Task Breakdown

Based on SPEC.md requirements and current implementation analysis.

## 1. Database Reverse Engineering (RDBからER図をリバース)

### 1.2 Initial Entity Clustering
- [ ] **Smart Positioning Algorithm** - Implement clustering for initial entity placement
  - Currently: All entities placed at (50,50)
  - Required: Intelligent positioning based on relationships
  - Priority: Medium
  - Estimate: 4-6 hours

### 1.3 Incremental Reverse Engineering
- [ ] **Improved New Entity Positioning** - Better default positioning for new entities
  - Currently: Fixed position (50,50)
  - Required: Left-top area clustering
  - Priority: Low
  - Estimate: 2-3 hours

## 2. GUI Display (ER図をGUIで表示)


### 2.2 Relationship Visualization
- [ ] **Smart Line Routing** - Avoid entity overlaps and improve visual clarity
  - Currently: Basic straight polylines
  - Required: Intelligent routing around entities
  - Priority: Medium
  - Estimate: 6-8 hours

### 2.4 Entity Display Enhancement
- [ ] **Column Icon Display** - Show icons for different column types for better visibility
  - Currently: Column names displayed without visual indicators
  - Required: Column type icons (PK, FK, etc.) displayed to the left of column names
  - Priority: Medium
  - Estimate: 3-4 hours
- [ ] **Dynamic Entity Width Adjustment** - Adjust entity width based on table and column name lengths
  - Currently: Fixed entity width
  - Required: Dynamic width calculation based on content
  - Priority: Medium
  - Estimate: 2-3 hours

### 2.3 Hover Effects
- [ ] **Column-Level Relationship Highlighting** - Highlight specific columns on relationship hover
  - Currently: Only highlights relationship line
  - Required: Highlight source and target columns
  - Priority: Medium
  - Estimate: 4-5 hours

### 2.5 DDL Sidebar Enhancement
- [ ] **DDL Syntax Highlighting** - Add syntax highlighting to DDL display in right sidebar
  - Currently: Plain text DDL display
  - Required: SQL syntax highlighting for better readability
  - Priority: Medium
  - Estimate: 3-4 hours



## 3. Entity Positioning (エンティティの配置をGUI上で操作)


### 3.2 Advanced Positioning
- [ ] **Snap to Grid** - Optional grid snapping for precise alignment
  - Priority: Low
  - Estimate: 2-3 hours
- [ ] **Alignment Tools** - Align multiple entities
  - Priority: Low
  - Estimate: 4-5 hours

## 4. User Interface Controls (GUI上からトリガー)



## 5. Annotation Features (矩形・テキスト描画)

### 5.1 Rectangle Annotations
- [ ] **Rectangle Property Editing** - Edit line color, fill color, size, position interactively
  - Currently: Fixed styling
  - Required: Interactive color picker, size adjustment UI, and position editing
  - Priority: Medium
  - Estimate: 6-8 hours
- [ ] **Rectangle Repositioning** - Drag rectangles after creation
  - Currently: Fixed position after creation
  - Required: Drag and drop for repositioning
  - Priority: Medium
  - Estimate: 3-4 hours

### 5.2 Text Annotations
- [ ] **Text Property Editing** - Edit color, size interactively
  - Currently: Fixed styling
  - Required: Interactive property panel for text customization
  - Priority: Medium
  - Estimate: 5-6 hours
- [ ] **Text Repositioning** - Drag text after creation
  - Currently: Fixed position after creation
  - Required: Drag and drop for repositioning
  - Priority: Medium
  - Estimate: 2-3 hours

### 5.3 Annotation Management
- [ ] **Annotation Selection** - Select and modify annotations
  - Priority: Medium
  - Estimate: 4-5 hours

## 6. Docker Containerization (dockerコンテナとして提供)




## 7. Quality Improvements & Polish

### 7.1 User Experience
- [ ] **Loading Indicators** - Show progress during reverse engineering
  - Currently: Basic loading overlay
  - Required: Progress indicators and status messages
  - Priority: Low
  - Estimate: 2-3 hours
- [ ] **Error Messages** - Better error handling and user feedback
  - Currently: Basic alert() messages
  - Required: Toast notifications or status bar
  - Priority: Medium
  - Estimate: 3-4 hours

### 7.2 Performance Optimization
- [ ] **Large Schema Handling** - Optimize for databases with many tables
  - Currently: No optimization
  - Required: Virtualization or pagination for large schemas
  - Priority: Low
  - Estimate: 8-10 hours
- [ ] **Memory Management** - Optimize DOM manipulation and event handling
  - Priority: Low
  - Estimate: 4-5 hours

### 7.3 Accessibility & Compatibility
- [ ] **Keyboard Navigation** - Support keyboard-only operation
  - Priority: Low
  - Estimate: 6-8 hours
- [ ] **Mobile Optimization** - Improve touch interface support
  - Currently: Basic responsive design
  - Required: Touch gestures and mobile-specific UI
  - Priority: Low
  - Estimate: 8-10 hours

## Summary

**Total Requirements**: 48 tasks
**Completed**: 31 tasks (65%) - moved to TASK_DONE.md
**In Progress**: 0 tasks  
**Not Started**: 17 tasks (35%)

**High Priority Remaining**: 0 tasks (0 hours)
**Medium Priority Remaining**: 11 tasks (~45-56 hours)  
**Low Priority Remaining**: 6 tasks (~30-40 hours)

**Core Functionality Status**: ✅ Complete (all essential features working)
**Enhancement Status**: ⚠️ Partial (user experience improvements needed)
**Production Readiness**: 🔄 Good (ready for use with minor limitations)

## Next Steps Recommendation

1. **Phase 1 (High Priority)**: Complete hover effects and annotation editing
2. **Phase 2 (Medium Priority)**: Smart positioning and line routing
3. **Phase 3 (Polish)**: UI improvements and performance optimization