'use client';

import type {
  Announcements,
  DndContextProps,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import tunnel from 'tunnel-rat';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const t = tunnel();

export type { DragEndEvent } from '@dnd-kit/core';

// Base types
export type KanbanItemProps = {
  id: string;
  name: string;
  column: string;
} & Record<string, unknown>;

export type KanbanColumnProps = {
  id: string;
  name: string;
} & Record<string, unknown>;

// Context type
type KanbanContextValue<
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
> = {
  columns: C[];
  data: T[];
  activeCardId: string | null;
};

// Create context with proper typing
const KanbanContext = createContext<KanbanContextValue | null>(null);

// Provider props type
export type KanbanProviderProps<
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
> = Omit<DndContextProps, 'children'> & {
  children: (column: C) => ReactNode;
  className?: string;
  columns: C[];
  data: T[];
  onDataChange?: (data: T[]) => void;
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
};

// Provider component
export const KanbanProvider = <
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
>({
  children,
  onDragStart,
  onDragEnd,
  onDragOver,
  className,
  columns,
  data,
  onDataChange,
  ...props
}: KanbanProviderProps<T, C>) => {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [internalData, setInternalData] = useState<T[]>(data);

  useEffect(() => {
    setInternalData(data);
  }, [data]);

  const moveItem = (items: T[], activeId: string, overId: string | null): T[] => {
    const activeIndex = items.findIndex((item) => item.id === activeId);
    if (activeIndex === -1) {
      return items;
    }

    const activeItem = items[activeIndex];
    const overItem = overId ? items.find((item) => item.id === overId) : undefined;
    const overColumn =
      overItem?.column ||
      columns.find((col) => col.id === overId)?.id ||
      activeItem.column;

    if (overColumn === activeItem.column && !overItem) {
      return items;
    }

    const updatedItems = [...items];
    updatedItems[activeIndex] = {
      ...activeItem,
      column: overColumn,
    };

    if (overItem) {
      const overIndex = updatedItems.findIndex((item) => item.id === overId);
      if (overIndex !== -1 && overIndex !== activeIndex) {
        return arrayMove(updatedItems, activeIndex, overIndex);
      }
    }

    return updatedItems;
  };

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const card = internalData.find((item) => item.id === event.active.id);
    if (card) {
      setActiveCardId(event.active.id as string);
    }
    onDragStart?.(event);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    setInternalData((items) => moveItem(items, active.id as string, over.id as string));

    onDragOver?.(event);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCardId(null);

    const { active, over } = event;

    if (!over) {
      setInternalData(data);
      onDragEnd?.(event);
      return;
    }

    let finalData: T[] = [];

    setInternalData((items) => {
      const updated = moveItem(items, active.id as string, over.id as string);
      finalData = updated;
      return updated;
    });

    onDragEnd?.(event);

    const prevItem = data.find((item) => item.id === active.id);
    const nextItem = finalData.find((item) => item.id === active.id);

    if (!prevItem || !nextItem) {
      return;
    }

    const columnChanged = prevItem.column !== nextItem.column;
    const positionChanged =
      finalData.findIndex((item) => item.id === active.id) !==
      data.findIndex((item) => item.id === active.id);

    if (columnChanged || positionChanged) {
      onDataChange?.(finalData);
    }
  };

  const announcements: Announcements = {
    onDragStart({ active }) {
      const { name, column } = internalData.find((item) => item.id === active.id) ?? {};

      return `Picked up the card "${name}" from the "${column}" column`;
    },
    onDragOver({ active, over }) {
      const { name } = internalData.find((item) => item.id === active.id) ?? {};
      const newColumn = columns.find((column) => column.id === over?.id)?.name;

      return `Dragged the card "${name}" over the "${newColumn}" column`;
    },
    onDragEnd({ active, over }) {
      const { name } = data.find((item) => item.id === active.id) ?? {};
      const newColumn = columns.find((column) => column.id === over?.id)?.name;

      return `Dropped the card "${name}" into the "${newColumn}" column`;
    },
    onDragCancel({ active }) {
      const { name } = internalData.find((item) => item.id === active.id) ?? {};

      return `Cancelled dragging the card "${name}"`;
    },
  };

  return (
    <KanbanContext.Provider value={{ columns, data: internalData, activeCardId }}>
      <DndContext
        accessibility={{ announcements }}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        sensors={sensors}
        {...props}
      >
        <div
          className={cn('grid size-full auto-cols-fr grid-flow-col gap-4', className)}
        >
          {columns.map((column) => children(column))}
        </div>
        {typeof window !== 'undefined' &&
          createPortal(
            <DragOverlay>
              <t.Out />
            </DragOverlay>,
            document.body
          )}
      </DndContext>
    </KanbanContext.Provider>
  );
};

// Hook to use Kanban context
export const useKanban = <
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
>() => {
  const context = useContext(KanbanContext) as KanbanContextValue<T, C> | null;

  if (!context) {
    throw new Error('useKanban must be used within a KanbanProvider');
  }

  return context;
};

// KanbanBoard component (column wrapper)
export type KanbanBoardProps = {
  id: string;
  children?: ReactNode;
  className?: string;
};

export const KanbanBoard = ({ id, children, className }: KanbanBoardProps) => {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div ref={setNodeRef} className={cn('flex h-full flex-col', className)}>
      {children}
    </div>
  );
};

// KanbanHeader component
export type KanbanHeaderProps = HTMLAttributes<HTMLDivElement>;

export const KanbanHeader = ({ children, className, ...props }: KanbanHeaderProps) => {
  return (
    <div className={cn('flex-shrink-0', className)} {...props}>
      {children}
    </div>
  );
};

// KanbanCards component (scrollable container for cards)
export type KanbanCardsProps<T extends KanbanItemProps = KanbanItemProps> = {
  id: string;
  children: (item: T) => ReactNode;
  className?: string;
};

export const KanbanCards = <T extends KanbanItemProps = KanbanItemProps>({
  id,
  children,
  className,
}: KanbanCardsProps<T>) => {
  const { data } = useKanban<T>();
  const items = data.filter((item) => item.column === id);

  return (
    <ScrollArea className={cn('flex-1', className)}>
      <SortableContext items={items.map((item) => item.id)}>
        <div className="space-y-2">
          {items.map((item) => children(item))}
        </div>
      </SortableContext>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
};

// Card component props
export type KanbanCardProps = {
  id: string;
  column: string;
  name: string;
  children?: ReactNode;
  className?: string;
};

// Card component
export const KanbanCard = ({ id, column, name, children, className }: KanbanCardProps) => {
  const { activeCardId } = useKanban();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: id,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Render in portal for drag overlay
  if (activeCardId === id) {
    return (
      <>
        <div ref={setNodeRef} style={style} className="invisible">
          <Card className={className}>{children}</Card>
        </div>
        <t.In>
          <Card className={cn('cursor-grabbing', className)}>{children}</Card>
        </t.In>
      </>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className={cn('cursor-grab active:cursor-grabbing', className)}>
        {children}
      </Card>
    </div>
  );
};

// Export everything
export { KanbanContext };