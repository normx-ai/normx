import React from 'react';

function Icon({ name, color, size, className, style }) {
  const classes = [
    'cicon', `cicon-${name}`,
    color ? `cicon-${color}` : '',
    size ? `cicon-${size}` : '',
    className || '',
  ].filter(Boolean).join(' ');

  return <span className={classes} style={style}></span>;
}

export default Icon;
