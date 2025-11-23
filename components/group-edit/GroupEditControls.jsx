'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import GroupEditModal from './GroupEditModal';

export default function GroupEditControls({ group, allStudents = [], currentUserRole }) {
  if (currentUserRole !== 'instructor') return null;
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleSaved(updatedGroup) {
    setOpen(false);
    // Refresh server-rendered data so changes appear everywhere
    try { router.refresh(); } catch (e) { /* no-op */ }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1 rounded bg-yellow-500 text-white"
      >
        Edit Group
      </button>

      {open && (
        <GroupEditModal
          group={group}
          allStudents={allStudents}
          onClose={() => setOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}