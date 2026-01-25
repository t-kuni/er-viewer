import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { LayerItemRef } from '../api/client';
import { LayerItemKind } from '../api/client';
import { useDispatch, useViewModel } from '../store/hooks';
import {
  actionSelectItem,
  actionReorderLayerItems,
  actionMoveLayerItem,
} from '../actions/layerActions';

interface SortableItemProps {
  item: LayerItemRef;
  isSelected: boolean;
  onSelect: (item: LayerItemRef) => void;
}

function SortableItem({ item, isSelected, onSelect }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${item.kind}-${item.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const displayName = item.kind === LayerItemKind.RECTANGLE 
    ? `Rectangle ${item.id.substring(0, 6)}`
    : item.kind === LayerItemKind.TEXT
    ? `Text ${item.id.substring(0, 6)}`
    : item.id;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '8px 12px',
        margin: '4px 0',
        backgroundColor: isSelected ? '#e3f2fd' : '#fff',
        border: '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'move',
        userSelect: 'none',
      }}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(item)}
    >
      {displayName}
    </div>
  );
}

interface DroppableSectionProps {
  id: string;
  children: React.ReactNode;
}

function DroppableSection({ id, children }: DroppableSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: '60px',
        backgroundColor: isOver ? '#f0f0f0' : 'transparent',
        transition: 'background-color 0.2s',
        borderRadius: '4px',
      }}
    >
      {children}
    </div>
  );
}

export function LayerPanel() {
  const dispatch = useDispatch();
  const layerOrder = useViewModel((vm) => vm.erDiagram.ui.layerOrder);
  const selectedItem = useViewModel((vm) => vm.ui.selectedItem);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    // アイテムの種類とIDを解析
    const parseItemId = (id: string): LayerItemRef | null => {
      const parts = id.split('-');
      if (parts.length < 2) return null;
      const kindStr = parts[0];
      let kind: LayerItemKind;
      
      if (kindStr === 'rectangle') {
        kind = LayerItemKind.RECTANGLE;
      } else if (kindStr === 'text') {
        kind = LayerItemKind.TEXT;
      } else if (kindStr === 'entity') {
        kind = LayerItemKind.ENTITY;
      } else if (kindStr === 'relation') {
        kind = LayerItemKind.RELATION;
      } else {
        return null;
      }
      
      const itemId = parts.slice(1).join('-');
      return { kind, id: itemId };
    };

    const activeItem = parseItemId(active.id as string);
    if (!activeItem) {
      return;
    }

    // どのセクションにアイテムがあるかを判定
    const findPosition = (item: LayerItemRef): 'foreground' | 'background' | null => {
      const inForeground = layerOrder.foregroundItems.some(
        (i) => i.kind === item.kind && i.id === item.id
      );
      if (inForeground) return 'foreground';
      
      const inBackground = layerOrder.backgroundItems.some(
        (i) => i.kind === item.kind && i.id === item.id
      );
      if (inBackground) return 'background';
      
      return null;
    };

    const activePosition = findPosition(activeItem);
    if (!activePosition) {
      return;
    }

    // ドロップ先がセクションかアイテムかを判定
    const overId = over.id as string;
    
    if (overId === 'foreground-section' || overId === 'background-section') {
      // セクションへのドロップ
      const toPosition = overId === 'foreground-section' ? 'foreground' : 'background';
      
      if (activePosition === toPosition) {
        // 同じセクション内の場合は何もしない
        return;
      }
      
      // セクションの末尾に追加
      const toItems = toPosition === 'foreground' 
        ? layerOrder.foregroundItems 
        : layerOrder.backgroundItems;
      const toIndex = toItems.length;
      
      dispatch(actionMoveLayerItem, activeItem, toPosition, toIndex);
    } else {
      // アイテムへのドロップ
      const overItem = parseItemId(overId);
      if (!overItem) {
        return;
      }

      const overPosition = findPosition(overItem);

      if (!overPosition) {
        return;
      }

      // 同一セクション内の並べ替え
      if (activePosition === overPosition) {
        const items = activePosition === 'foreground' 
          ? layerOrder.foregroundItems 
          : layerOrder.backgroundItems;
        
        const activeIndex = items.findIndex(
          (i) => i.kind === activeItem.kind && i.id === activeItem.id
        );
        const overIndex = items.findIndex(
          (i) => i.kind === overItem.kind && i.id === overItem.id
        );

        if (activeIndex !== -1 && overIndex !== -1) {
          dispatch(actionReorderLayerItems, activePosition, activeIndex, overIndex);
        }
      } else {
        // セクション間の移動
        const overItems = overPosition === 'foreground'
          ? layerOrder.foregroundItems
          : layerOrder.backgroundItems;
        
        const overIndex = overItems.findIndex(
          (i) => i.kind === overItem.kind && i.id === overItem.id
        );

        if (overIndex !== -1) {
          dispatch(actionMoveLayerItem, activeItem, overPosition, overIndex);
        }
      }
    }
  };

  const handleSelect = (item: LayerItemRef) => {
    dispatch(actionSelectItem, item);
  };

  const foregroundIds = layerOrder.foregroundItems.map(
    (item) => `${item.kind}-${item.id}`
  );
  const backgroundIds = layerOrder.backgroundItems.map(
    (item) => `${item.kind}-${item.id}`
  );

  const isItemSelected = (item: LayerItemRef) => {
    return selectedItem?.kind === item.kind && selectedItem?.id === item.id;
  };

  // ドラッグ中のアイテムを取得
  const activeItem = React.useMemo(() => {
    if (!activeId) return null;
    const allItems = [...layerOrder.foregroundItems, ...layerOrder.backgroundItems];
    return allItems.find((item) => `${item.kind}-${item.id}` === activeId);
  }, [activeId, layerOrder]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ padding: '16px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>
          レイヤー
        </h3>

        {/* 前面セクション */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            marginBottom: '8px',
            fontWeight: 'bold'
          }}>
            前面
          </div>
          <DroppableSection id="foreground-section">
            <SortableContext items={foregroundIds} strategy={verticalListSortingStrategy}>
              {layerOrder.foregroundItems.length === 0 ? (
                <div style={{ 
                  padding: '16px', 
                  textAlign: 'center', 
                  color: '#999',
                  fontSize: '12px',
                  border: '1px dashed #ddd',
                  borderRadius: '4px'
                }}>
                  (空)
                </div>
              ) : (
                layerOrder.foregroundItems.map((item) => {
                  const layerItem = item as LayerItemRef;
                  return (
                    <SortableItem
                      key={`${layerItem.kind}-${layerItem.id}`}
                      item={layerItem}
                      isSelected={isItemSelected(layerItem)}
                      onSelect={handleSelect}
                    />
                  );
                })
              )}
            </SortableContext>
          </DroppableSection>
        </div>

        {/* ER図セクション（固定） */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            marginBottom: '8px',
            fontWeight: 'bold'
          }}>
            中央
          </div>
          <div
            style={{
              padding: '8px 12px',
              margin: '4px 0',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              color: '#666',
              cursor: 'default',
              userSelect: 'none',
            }}
          >
            ER Diagram
          </div>
        </div>

        {/* 背面セクション */}
        <div>
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            marginBottom: '8px',
            fontWeight: 'bold'
          }}>
            背面
          </div>
          <DroppableSection id="background-section">
            <SortableContext items={backgroundIds} strategy={verticalListSortingStrategy}>
              {layerOrder.backgroundItems.length === 0 ? (
                <div style={{ 
                  padding: '16px', 
                  textAlign: 'center', 
                  color: '#999',
                  fontSize: '12px',
                  border: '1px dashed #ddd',
                  borderRadius: '4px'
                }}>
                  (空)
                </div>
              ) : (
                layerOrder.backgroundItems.map((item) => {
                  const layerItem = item as LayerItemRef;
                  return (
                    <SortableItem
                      key={`${layerItem.kind}-${layerItem.id}`}
                      item={layerItem}
                      isSelected={isItemSelected(layerItem)}
                      onSelect={handleSelect}
                    />
                  );
                })
              )}
            </SortableContext>
          </DroppableSection>
        </div>
      </div>

      <DragOverlay>
        {activeItem ? (
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'move',
              userSelect: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            {activeItem.kind === LayerItemKind.RECTANGLE 
              ? `Rectangle ${activeItem.id.substring(0, 6)}`
              : `Text ${activeItem.id.substring(0, 6)}`}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
