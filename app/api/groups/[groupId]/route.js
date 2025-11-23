// app/api/groups/[groupId]/route.js

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
// replaced connectToDatabase (not exported in your lib) with the collection helper
import { getGroupsCollection } from '../../../../lib/mongodb';

function devJsonError(message, err) {
  const payload = { error: message };
  if (process.env.NODE_ENV !== 'production' && err) payload.stack = err.stack || String(err);
  return NextResponse.json(payload, { status: 500 });
}

// GET a single group by its ID
export async function GET(req, { params }) {
  const groupId = params?.groupId;
  try {
    console.log('[api/groups] GET hit, params.groupId=', groupId, 'url=', req.url);
    if (!groupId || !ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: 'Invalid groupId' }, { status: 400 });
    }

    const groups = await getGroupsCollection();
    const group = await groups.findOne({ _id: new ObjectId(groupId) });
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    return NextResponse.json({ group });
  } catch (err) {
    console.error('[api/groups] GET error:', err && (err.stack || err));
    return devJsonError('Internal server error (GET)', err);
  }
}

// PATCH update group by its ID
export async function PATCH(req, { params }) {
  const groupId = params?.groupId;
  try {
    console.log('[api/groups] PATCH hit, params.groupId=', groupId, 'url=', req.url);
    if (!groupId || !ObjectId.isValid(groupId)) {
      return NextResponse.json({ error: 'Invalid groupId' }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { name, members, repId } = body || {};
    if (name === undefined && members === undefined && repId === undefined) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const groups = await getGroupsCollection();

    const update = {};
    if (name !== undefined) update.name = name;
    if (Array.isArray(members)) update.members = members;
    if (repId !== undefined) update.repId = repId || null;

    const result = await groups.findOneAndUpdate(
      { _id: new ObjectId(groupId) },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result.value) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    return NextResponse.json({ ok: true, group: result.value });
  } catch (err) {
    console.error('[api/groups] PATCH error:', err && (err.stack || err));
    return devJsonError('Internal server error (PATCH)', err);
  }
}