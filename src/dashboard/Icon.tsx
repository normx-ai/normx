import React from 'react';

interface IconProps {
  name: string;
  color?: string;
  size?: string;
  className?: string;
  style?: React.CSSProperties;
}

function Icon({ name, color = '', size = '', className = '', style = {} }: IconProps) {
  const classes = [
    'cicon', `cicon-${name}`,
    color ? `cicon-${color}` : '',
    size ? `cicon-${size}` : '',
    className || '',
  ].filter(Boolean).join(' ');

  return <span className={classes} style={style}></span>;
}

export default Icon;
