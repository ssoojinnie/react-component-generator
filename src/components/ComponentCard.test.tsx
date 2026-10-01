import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ComponentCard } from './ComponentCard';
import type { GeneratedComponent } from '../types';

const component: GeneratedComponent = {
  id: 'c1',
  prompt: '카드',
  code: 'const A = () => <div>hi</div>;\n\nrender(<A />);',
  createdAt: new Date('2026-10-01T12:00:00'),
};

function setup(props: Partial<Parameters<typeof ComponentCard>[0]> = {}) {
  return render(
    <ComponentCard
      component={component}
      isMinimized={false}
      isStreaming={false}
      onToggleMinimize={vi.fn()}
      onRemove={vi.fn()}
      onRegenerate={vi.fn()}
      isLoading={false}
      {...props}
    />,
  );
}

const tab = (name: string) => screen.getByRole('tab', { name });

describe('ComponentCard 탭 전환', () => {
  it('스트리밍 중이면 코드 탭이 활성이다', () => {
    setup({ isStreaming: true });

    expect(tab('코드')).toHaveAttribute('aria-selected', 'true');
  });

  it('스트리밍이 아니면 미리보기 탭이 활성이다', () => {
    setup();

    expect(tab('미리보기')).toHaveAttribute('aria-selected', 'true');
  });

  // 생성이 끝나는 순간 결과를 바로 보여주는 것이 이 기능의 목적이다.
  it('스트리밍이 끝나면 미리보기 탭으로 넘어간다', () => {
    const { rerender } = setup({ isStreaming: true });

    expect(tab('코드')).toHaveAttribute('aria-selected', 'true');

    rerender(
      <ComponentCard
        component={component}
        isMinimized={false}
        isStreaming={false}
        onToggleMinimize={vi.fn()}
        onRemove={vi.fn()}
        onRegenerate={vi.fn()}
        isLoading={false}
      />,
    );

    expect(tab('미리보기')).toHaveAttribute('aria-selected', 'true');
  });

  // 반쪽짜리 코드를 react-live 가 평가하면 에러만 뜬다.
  it('스트리밍 중에는 미리보기 탭을 누를 수 없다', () => {
    setup({ isStreaming: true });

    expect(tab('미리보기')).toBeDisabled();
  });

  it('스트리밍이 끝나면 다시 탭을 고를 수 있다', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(tab('코드'));

    expect(tab('코드')).toHaveAttribute('aria-selected', 'true');
  });

  it('스트리밍 중에는 다시 생성 버튼을 막는다', () => {
    setup({ isStreaming: true });

    expect(screen.getByRole('button', { name: /다시 생성/ })).toBeDisabled();
  });
});
