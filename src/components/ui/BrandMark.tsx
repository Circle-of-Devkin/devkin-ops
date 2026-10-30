import React from 'react';
import iconSrc from '../../assets/icon.png';

export interface BrandMarkProps {
  size?: 'small' | 'medium' | 'large' | number;
  className?: string;
  style?: React.CSSProperties;
}

export default function BrandMark({ size = 'medium', className = '', style }: BrandMarkProps) {
  const sizeMap: Record<string, number> = {
    small: 18,
    medium: 26,
    large: 36
  };
  const dimension = typeof size === 'number' ? size : (sizeMap[size] || 26);
  const sizeClass = typeof size === 'string' ? `brand-mark-${size}` : '';

  return (
    <div
      className={`brand-mark ${sizeClass} ${className}`.trim()}
      style={{
        width: `${dimension}px`,
        height: `${dimension}px`,
        ...style
      }}
      aria-hidden="true"
    >
      <img
        src={iconSrc}
        alt="DevKin Ops"
        className="brand-mark-img"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
    </div>
  );
}