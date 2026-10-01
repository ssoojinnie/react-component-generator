import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptInput } from './PromptInput';

describe('PromptInput', () => {
  it('프롬프트가 비어 있으면 생성 버튼이 비활성이다', () => {
    render(<PromptInput onGenerate={vi.fn()} isLoading={false} />);
    expect(screen.getByRole('button', { name: '컴포넌트 생성' })).toBeDisabled();
  });

  it('입력하면 버튼이 활성화되고 클릭 시 입력값으로 onGenerate가 호출된다', async () => {
    const onGenerate = vi.fn();
    const user = userEvent.setup();
    render(<PromptInput onGenerate={onGenerate} isLoading={false} />);

    await user.type(screen.getByRole('textbox'), '프로필 카드');
    const submit = screen.getByRole('button', { name: '컴포넌트 생성' });
    expect(submit).toBeEnabled();

    await user.click(submit);
    expect(onGenerate).toHaveBeenCalledWith('프로필 카드');
  });

  it('로딩 중에는 생성 버튼이 비활성이고 "생성 중..." 을 보여준다', () => {
    render(<PromptInput onGenerate={vi.fn()} isLoading={true} />);
    expect(screen.getByRole('button', { name: '생성 중...' })).toBeDisabled();
  });

  it('500자를 넘으면 생성 버튼이 비활성이다', async () => {
    const user = userEvent.setup();
    render(<PromptInput onGenerate={vi.fn()} isLoading={false} />);

    await user.click(screen.getByRole('textbox'));
    await user.paste('가'.repeat(501));

    expect(screen.getByRole('button', { name: '컴포넌트 생성' })).toBeDisabled();
  });

  it('500자를 넘으면 초과 사실을 알리는 메시지를 보여준다', async () => {
    const user = userEvent.setup();
    render(<PromptInput onGenerate={vi.fn()} isLoading={false} />);

    await user.click(screen.getByRole('textbox'));
    await user.paste('가'.repeat(501));

    expect(
      screen.getByText('프롬프트는 500자까지 입력할 수 있습니다. 현재 501자입니다.')
    ).toBeInTheDocument();
  });

  it('500자를 넘으면 Ctrl+Enter로도 생성되지 않는다', async () => {
    const onGenerate = vi.fn();
    const user = userEvent.setup();
    render(<PromptInput onGenerate={onGenerate} isLoading={false} />);

    await user.click(screen.getByRole('textbox'));
    await user.paste('가'.repeat(501));
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(onGenerate).not.toHaveBeenCalled();
  });

  it('현재 글자 수를 상한과 함께 보여준다', async () => {
    const user = userEvent.setup();
    render(<PromptInput onGenerate={vi.fn()} isLoading={false} />);

    expect(screen.getByText('0 / 500자')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox'), '프로필 카드');
    expect(screen.getByText('6 / 500자')).toBeInTheDocument();
  });
});
