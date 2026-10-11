import React from 'react';

export default function BrandMark({ size = 'medium' }) {
  return (
    <div className={`brand-mark brand-mark-${size}`} aria-hidden="true">
      <span className="brand-mark-stem" />
      <span className="brand-mark-curve">D</span>
      <span className="brand-mark-node brand-mark-node-top" />
      <span className="brand-mark-node brand-mark-node-bottom" />
    </div>
  );
}