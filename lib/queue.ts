import { promises as fs } from 'node:fs';
import path from 'node:path';

// The AliExpress import list: product links collected with the browser button, waiting to be added.
export interface QueueItem {
  id: string;
  title: string;
  source?: string;
  addedAt: string;
  status: 'pending' | 'added' | 'skipped';
  note?: string;
  doneAt?: string;
}

const file = () => path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'ae-queue.json');

// One request at a time, so two saves can't overwrite each other.
let lock: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.catch(() => undefined);
  return run;
}

async function load(): Promise<QueueItem[]> {
  try {
    return JSON.parse(await fs.readFile(file(), 'utf8'));
  } catch {
    return [];
  }
}

async function save(items: QueueItem[]) {
  await fs.mkdir(path.dirname(file()), { recursive: true });
  const tmp = file() + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(items));
  await fs.rename(tmp, file());
}

export function addToQueue(incoming: { id: string; title?: string }[], source?: string) {
  return serial(async () => {
    const items = await load();
    const seen = new Set(items.map((i) => i.id));
    let fresh = 0;
    for (const it of incoming) {
      const id = String(it.id || '').replace(/\D/g, '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      items.push({ id, title: String(it.title || '').slice(0, 300), source: source?.slice(0, 500), addedAt: new Date().toISOString(), status: 'pending' });
      fresh++;
    }
    await save(items);
    return { ...counts(items), newly: fresh, duplicates: incoming.length - fresh };
  });
}

export function markQueue(ids: string[], status: QueueItem['status'], note?: string) {
  return serial(async () => {
    const items = await load();
    const want = new Set(ids.map(String));
    let changed = 0;
    for (const it of items) {
      if (want.has(it.id)) {
        it.status = status;
        it.note = note;
        it.doneAt = new Date().toISOString();
        changed++;
      }
    }
    await save(items);
    return { changed, ...counts(items) };
  });
}

export async function listQueue(status?: QueueItem['status'], limit = 1000) {
  const items = await load();
  return { items: items.filter((i) => !status || i.status === status).slice(0, limit), ...counts(items) };
}

function counts(items: QueueItem[]) {
  return {
    pending: items.filter((i) => i.status === 'pending').length,
    added: items.filter((i) => i.status === 'added').length,
    skipped: items.filter((i) => i.status === 'skipped').length,
    total: items.length,
  };
}
