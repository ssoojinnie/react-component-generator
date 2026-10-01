import { useEffect, useState } from 'react';
import type { GeneratedComponent } from '../types';
import { StartIcon } from './Icons';

interface TaskbarProps {
  components: GeneratedComponent[];
  minimized: string[];
  onSelect: (id: string) => void;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export function Taskbar({ components, minimized, onSelect }: TaskbarProps) {
  const time = useClock();

  return (
    <div className="taskbar">
      {/* The Start button does the one thing it should here: start a new component. */}
      <button
        className="taskbar__start"
        onClick={() => {
          const prompt = document.getElementById('prompt');
          prompt?.scrollIntoView({ block: 'nearest' });
          prompt?.focus();
        }}
        title="새 컴포넌트 요청 입력란으로 이동"
        type="button"
      >
        <StartIcon />
        <span>시작</span>
      </button>
      <span className="taskbar__divider" aria-hidden="true" />

      <div className="taskbar__tasks" aria-label="열린 컴포넌트">
        {components.length === 0 ? (
          <span className="taskbar__empty">열린 창 없음</span>
        ) : (
          components.map((component) => (
            <button
              key={component.id}
              className={`taskbar__task ${
                minimized.includes(component.id) ? '' : 'taskbar__task--active'
              }`}
              onClick={() => onSelect(component.id)}
              title={component.prompt}
              type="button"
            >
              {component.prompt}
            </button>
          ))
        )}
      </div>

      <div className="taskbar__tray">
        <span>{time}</span>
      </div>
    </div>
  );
}
