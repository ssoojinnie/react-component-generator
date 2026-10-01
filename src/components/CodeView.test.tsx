import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CodeView } from './CodeView';

describe('CodeView 스트리밍 표시', () => {
  it('스트리밍 중에는 복사 버튼을 막는다', () => {
    render(<CodeView code="const A" isStreaming />);

    expect(screen.getByRole('button', { name: '코드 복사' })).toBeDisabled();
  });

  it('스트리밍이 끝나면 복사할 수 있다', () => {
    render(<CodeView code="const A" isStreaming={false} />);

    expect(screen.getByRole('button', { name: '코드 복사' })).toBeEnabled();
  });

  it('스트리밍 중임을 알리는 표시를 보여준다', () => {
    render(<CodeView code="const A" isStreaming />);

    expect(screen.getByText('생성 중')).toBeInTheDocument();
  });

  it('스트리밍이 아니면 줄 수를 보여준다', () => {
    render(<CodeView code={'a\nb'} isStreaming={false} />);

    expect(screen.getByText(/2줄/)).toBeInTheDocument();
  });
});
