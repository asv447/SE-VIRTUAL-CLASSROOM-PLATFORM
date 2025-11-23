'use client';
import React from 'react';

export default function GroupCard({ group, setGroup, onClick }) {
  function handleClick() {
    if (typeof setGroup === 'function') return setGroup(group);
    if (typeof onClick === 'function') return onClick(group);
  }

  return (
    <div onClick={handleClick} className="group-card">
      {/* ... */}
    </div>
  );
}