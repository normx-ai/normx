/**
 * Zone de commentaire editable reutilisable pour toutes les Notes
 */

import React from 'react';
import { textareaStyle } from './noteStyles';

interface EditableCommentProps {
  value: string;
  onChange: (value: string) => void;
  editing: boolean;
  minHeight?: number;
}

export default function EditableComment({ value, onChange, editing, minHeight = 80 }: EditableCommentProps): React.JSX.Element {
  if (editing) {
    return (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...textareaStyle, minHeight }}
      />
    );
  }

  return (
    <p style={{ fontSize: 12, fontStyle: 'italic', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
      {value}
    </p>
  );
}
