'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function GroupEditModal({ group = {}, allStudents = [], onClose, onSaved }) {
  const initialMembers = Array.isArray(group.members) ? group.members.map(String) : [];
  const [name, setName] = useState(group.name || '');
  const [members, setMembers] = useState(initialMembers);
  const [repId, setRepId] = useState(group.repId ? String(group.repId) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // keep local state in sync if group prop changes
    setName(group.name || '');
    setMembers(Array.isArray(group.members) ? group.members.map(String) : []);
    setRepId(group.repId ? String(group.repId) : '');
  }, [group]);

  function toggleMember(id) {
    id = String(id);
    setMembers(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      // if representative was removed, clear it
      if (!next.includes(String(repId))) setRepId('');
      return next;
    });
  }

  async function save() {
    setLoading(true);
    setError(null);

    // ensure rep is one of members or empty
    const repToSend = repId && members.includes(String(repId)) ? repId : null;

    const groupId = group._id || group.id;
    if (!groupId) {
      setError('Missing group id');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          // placeholder header for demo; replace with real auth if needed
          'x-role': 'instructor'
        },
        credentials: 'include',
        body: JSON.stringify({ name, members, repId: repToSend })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save group');

      onSaved && onSaved(data.group || data);
      onClose && onClose();
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded shadow-lg w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit Group</h3>
          <button aria-label="Close" onClick={onClose} className="text-sm px-2 py-1 rounded border">
            Close
          </button>
        </div>

        <label className="block mb-3">
          <div className="text-sm mb-1">Group Name</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border rounded px-2 py-1"
            placeholder="Group name"
          />
        </label>

        <div className="mb-3">
          <div className="text-sm mb-2">Members</div>
          <div className="grid grid-cols-2 gap-2 max-h-44 overflow-auto border rounded p-2">
            {allStudents.map(s => {
              const id = String(s._id || s.id);
              const checked = members.includes(id);
              return (
                <label key={id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMember(id)}
                  />
                  <span>{s.name || s.email || id}</span>
                </label>
              );
            })}
            {allStudents.length === 0 && <div className="text-sm text-gray-500">No students available</div>}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm mb-2">Representative</div>
          <select
            value={repId || ''}
            onChange={e => setRepId(e.target.value)}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="">(none)</option>
            {members.map(mId => {
              const u = allStudents.find(s => String(s._id || s.id) === String(mId));
              return <option key={mId} value={mId}>{u ? (u.name || u.email) : mId}</option>;
            })}
          </select>
          <div className="text-xs text-gray-500 mt-1">Representative must be a group member.</div>
        </div>

        {error && <div className="text-red-500 mb-3">{error}</div>}

        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="px-3 py-1 rounded border">Cancel</button>
          <button
            onClick={save}
            disabled={loading}
            className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}