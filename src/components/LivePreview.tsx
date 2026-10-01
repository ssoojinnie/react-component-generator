import { LiveProvider, LivePreview as ReactLivePreview, LiveError } from 'react-live';

interface LivePreviewProps {
  code: string;
}

export function LivePreview({ code }: LivePreviewProps) {
  return (
    <LiveProvider code={code} noInline>
      <div className="preview__canvas">
        <ReactLivePreview />
      </div>
      <LiveError className="preview__error" />
    </LiveProvider>
  );
}
