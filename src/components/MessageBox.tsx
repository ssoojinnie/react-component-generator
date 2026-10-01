import { ErrorIcon } from './Icons';

interface MessageBoxProps {
  /** Title bar caption. */
  title: string;
  /** Bold first line: what happened, in the user's terms. */
  heading: string;
  /** The detail, usually straight from the server. */
  message: string;
  onDismiss: () => void;
}

export function MessageBox({ title, heading, message, onDismiss }: MessageBoxProps) {
  const titleId = `msgbox-${title}`;

  return (
    <div className="dialog" role="alertdialog" aria-labelledby={titleId}>
      <div className="titlebar">
        <span className="titlebar__text" id={titleId}>
          {title}
        </span>
      </div>
      <div className="dialog__body">
        <ErrorIcon />
        <p className="dialog__message">
          <strong>{heading}</strong>
          {message}
        </p>
      </div>
      <div className="dialog__footer">
        <button className="btn btn--default" onClick={onDismiss} type="button">
          확인
        </button>
      </div>
    </div>
  );
}
