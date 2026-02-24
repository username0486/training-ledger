import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExerciseReorderAndGroupList } from './ExerciseReorderAndGroupList';
import type { ExerciseItem, GroupItem, SessionListItem } from './exerciseDnDUtils';

const ex = (id: string, name: string): ExerciseItem => ({ type: 'exercise', id, name });
const grp = (id: string, children: ExerciseItem[]): GroupItem => ({ type: 'group', id, children });

describe('ExerciseReorderAndGroupList', () => {
  it('renders solo exercises', () => {
    const items: SessionListItem[] = [ex('a', 'A'), ex('b', 'B')];
    const onChange = vi.fn();
    render(
      <ExerciseReorderAndGroupList
        items={items}
        onChange={onChange}
        renderExerciseRow={(item) => <span data-testid={`ex-${item.id}`}>{item.name}</span>}
        renderGroupRow={(group, _, { children }) => (
          <div data-testid={`group-${group.id}`}>{children}</div>
        )}
      />
    );
    expect(screen.getByTestId('ex-a')).toHaveTextContent('A');
    expect(screen.getByTestId('ex-b')).toHaveTextContent('B');
  });

  it('renders groups and exercises', () => {
    const items: SessionListItem[] = [
      ex('a', 'A'),
      grp('g1', [ex('b', 'B'), ex('c', 'C')]),
      ex('d', 'D'),
    ];
    const onChange = vi.fn();
    render(
      <ExerciseReorderAndGroupList
        items={items}
        onChange={onChange}
        renderExerciseRow={(item) => <span data-testid={`ex-${item.id}`}>{item.name}</span>}
        renderGroupRow={(group, _, { children }) => (
          <div data-testid={`group-${group.id}`}>{children}</div>
        )}
      />
    );
    expect(screen.getByTestId('ex-a')).toHaveTextContent('A');
    expect(screen.getByTestId('group-g1')).toBeInTheDocument();
    expect(screen.getByTestId('ex-d')).toHaveTextContent('D');
  });

  it('passes dragHandleProps to exercise and group rows', () => {
    const items: SessionListItem[] = [ex('a', 'A')];
    const onChange = vi.fn();
    render(
      <ExerciseReorderAndGroupList
        items={items}
        onChange={onChange}
        renderExerciseRow={(item, { dragHandleProps }) => (
          <div data-testid="ex-row">
            <div data-testid="handle" {...dragHandleProps} />
            {item.name}
          </div>
        )}
        renderGroupRow={() => null}
      />
    );
    expect(screen.getByTestId('handle')).toHaveAttribute('data-drag-handle');
  });
});
