import React, { useEffect } from 'react';
import type { ToastType } from '../types';
import './Toast.css';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

function Toast({ message, type, onClose }: ToastProps): React.ReactElement {
  useEffect((): (() => void) => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(onClose, 4000);
    return (): void => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>&times;</button>
    </div>
  );
}

export default Toast;
