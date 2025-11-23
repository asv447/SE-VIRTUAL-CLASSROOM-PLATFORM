import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) throw new Error('MONGODB_URI not set');

let cachedClient = null;
async function getClient() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

function tryObjectId(id) {
  try { return new ObjectId(id); } catch { return id; }
}

// GET a single group by its ID
export async function GET(req, { params }) {
  const groupId = params?.groupId;
  try {
    if (!groupId) {
      return NextResponse.json({ error: 'Invalid groupId' }, { status: 400 });
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'test');
    const groups = db.collection('groups');

    // Try ObjectId first, then string fallback
    let group = await groups.findOne({ _id: tryObjectId(groupId) });
    if (!group) {
      group = await groups.findOne({ _id: groupId });
    }

    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    return NextResponse.json({ group });
  } catch (err) {
    console.error('[api/groups] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH update group by its ID
export async function PATCH(req, { params }) {
  try {
    const groupId = params?.groupId;
    if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 });

    const body = await req.json();
    const allowed = ['name', 'representative', 'members'];
    const updates = {};
    for (const k of allowed) if (Object.prototype.hasOwnProperty.call(body, k)) updates[k] = body[k];
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'test');
    const groups = db.collection('groups');

    const queryId = tryObjectId(groupId);
    
    // Execute update
    const res = await groups.findOneAndUpdate(
      { _id: queryId },
      { $set: updates },
      { returnDocument: 'after' } // 'after' returns the updated document
    );

    // FIX: Handle different driver versions
    // Newer drivers return the doc directly. Older drivers return { value: doc, ok: 1 }
    let updatedGroup = (res && res.value) ? res.value : res;

    // Fallback: Try string ID if not found
    if (!updatedGroup) {
      const retry = await groups.findOneAndUpdate(
        { _id: String(groupId) },
        { $set: updates },
        { returnDocument: 'after' }
      );
      updatedGroup = (retry && retry.value) ? retry.value : retry;
    }

    if (!updatedGroup) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ group: updatedGroup });
  } catch (err) {
    console.error('PATCH /api/groups/[groupId] error', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// DELETE a group
export async function DELETE(req, { params }) {
  try {
    const groupId = params?.groupId;
    if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 });

    const client = await getClient();
    const db = client.db(process.env.MONGODB_DB || 'test');
    const groups = db.collection('groups');

    const queryId = tryObjectId(groupId);
    
    let result = await groups.deleteOne({ _id: queryId });
    
    // Fallback to string id
    if (result.deletedCount === 0) {
      result = await groups.deleteOne({ _id: String(groupId) });
    }

    if (result.deletedCount === 0) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('DELETE /api/groups/[groupId] error', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}