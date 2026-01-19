import React, { createContext, useContext, useState, useCallback } from 'react';
import type { components } from '../../../lib/generated/api-types';

type ERDiagramViewModel = components['schemas']['ERDiagramViewModel'];

// ホバー中の要素タイプ
type HoverElementType = 'entity' | 'edge' | 'column' | null;

// ホバー状態の型定義
interface HoverState {
  elementType: HoverElementType;
  elementId: string | null;
  columnName: string | null;
  highlightedNodes: Set<string>;
  highlightedEdges: Set<string>;
  highlightedColumns: Map<string, Set<string>>; // entityId -> Set<columnName>
}

// Contextが提供する値の型
interface HoverContextValue {
  hoverState: HoverState;
  setHoverEntity: (entityId: string) => void;
  setHoverEdge: (edgeId: string) => void;
  setHoverColumn: (entityId: string, columnName: string) => void;
  clearHover: () => void;
}

const HoverContext = createContext<HoverContextValue | undefined>(undefined);

// 初期状態
const initialHoverState: HoverState = {
  elementType: null,
  elementId: null,
  columnName: null,
  highlightedNodes: new Set(),
  highlightedEdges: new Set(),
  highlightedColumns: new Map(),
};

interface HoverProviderProps {
  children: React.ReactNode;
  viewModel: ERDiagramViewModel;
}

export function HoverProvider({ children, viewModel }: HoverProviderProps) {
  const [hoverState, setHoverState] = useState<HoverState>(initialHoverState);

  // エンティティホバー時の処理
  const setHoverEntity = useCallback(
    (entityId: string) => {
      const highlightedNodes = new Set<string>([entityId]);
      const highlightedEdges = new Set<string>();
      const highlightedColumns = new Map<string, Set<string>>();

      // そのエンティティに接続されている全エッジを検索
      Object.values(viewModel.edges).forEach((edge) => {
        if (edge.source === entityId) {
          highlightedEdges.add(edge.id);
          highlightedNodes.add(edge.target);
        } else if (edge.target === entityId) {
          highlightedEdges.add(edge.id);
          highlightedNodes.add(edge.source);
        }
      });

      setHoverState({
        elementType: 'entity',
        elementId: entityId,
        columnName: null,
        highlightedNodes,
        highlightedEdges,
        highlightedColumns,
      });
    },
    [viewModel]
  );

  // エッジホバー時の処理
  const setHoverEdge = useCallback(
    (edgeId: string) => {
      const edge = viewModel.edges[edgeId];
      if (!edge) return;

      const highlightedNodes = new Set<string>([edge.source, edge.target]);
      const highlightedEdges = new Set<string>([edgeId]);
      const highlightedColumns = new Map<string, Set<string>>();

      // fromColumnとtoColumnをハイライト対象に追加
      highlightedColumns.set(edge.source, new Set([edge.fromColumn]));
      highlightedColumns.set(edge.target, new Set([edge.toColumn]));

      setHoverState({
        elementType: 'edge',
        elementId: edgeId,
        columnName: null,
        highlightedNodes,
        highlightedEdges,
        highlightedColumns,
      });
    },
    [viewModel]
  );

  // カラムホバー時の処理
  const setHoverColumn = useCallback(
    (entityId: string, columnName: string) => {
      const highlightedNodes = new Set<string>([entityId]);
      const highlightedEdges = new Set<string>();
      const highlightedColumns = new Map<string, Set<string>>();
      highlightedColumns.set(entityId, new Set([columnName]));

      // 全エッジからそのカラムが関係するものを検索
      Object.values(viewModel.edges).forEach((edge) => {
        if (edge.source === entityId && edge.fromColumn === columnName) {
          highlightedEdges.add(edge.id);
          highlightedNodes.add(edge.target);
          if (!highlightedColumns.has(edge.target)) {
            highlightedColumns.set(edge.target, new Set());
          }
          highlightedColumns.get(edge.target)!.add(edge.toColumn);
        } else if (edge.target === entityId && edge.toColumn === columnName) {
          highlightedEdges.add(edge.id);
          highlightedNodes.add(edge.source);
          if (!highlightedColumns.has(edge.source)) {
            highlightedColumns.set(edge.source, new Set());
          }
          highlightedColumns.get(edge.source)!.add(edge.fromColumn);
        }
      });

      setHoverState({
        elementType: 'column',
        elementId: entityId,
        columnName: columnName,
        highlightedNodes,
        highlightedEdges,
        highlightedColumns,
      });
    },
    [viewModel]
  );

  // ホバー解除時の処理
  const clearHover = useCallback(() => {
    setHoverState(initialHoverState);
  }, []);

  const value: HoverContextValue = {
    hoverState,
    setHoverEntity,
    setHoverEdge,
    setHoverColumn,
    clearHover,
  };

  return <HoverContext.Provider value={value}>{children}</HoverContext.Provider>;
}

// カスタムフック
export function useHover(): HoverContextValue {
  const context = useContext(HoverContext);
  if (context === undefined) {
    throw new Error('useHover must be used within a HoverProvider');
  }
  return context;
}
