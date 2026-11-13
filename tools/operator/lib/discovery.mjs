// LAN discovery between the kit preview server and the engine dev server (magic coauthor-discovery/1).
// JSON datagrams < 512 bytes on a multicast group (TTL 1), also sent as subnet broadcast. Announce every ~15 s with jitter and on
// start; "query" is answered by unicast; "bye" on exit; entries expire after ~45 s. No secrets travel here (pairing code stays out).
// Group and port are fixed here and in the engine's tools/serve-local.py: keep them equal.
import dgram from 'node:dgram';
import os from 'node:os';
import crypto from 'node:crypto';

export const MAGIC = 'coauthor-discovery/1';
export const GROUP = '239.255.42.99';
export const PORT = 41999;
const PRIVATE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|169\.254\.)/;

export function lanAddress() {
  for (const list of Object.values(os.networkInterfaces())) for (const i of list || []) if (i.family === 'IPv4' && !i.internal && PRIVATE.test(i.address)) return i.address;
  return '127.0.0.1';
}
const pack = (m) => { const s = JSON.stringify({ magic: MAGIC, ...m }); return Buffer.from(s.length > 500 ? JSON.stringify({ magic: MAGIC, type: m.type, role: m.role, id: m.id, name: m.name, url: m.url }) : s); };

export function startDiscovery({ role, name, url, info = {}, onPeers = () => {} }) {
  const id = crypto.randomBytes(4).toString('hex');
  const peers = new Map();
  const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  const me = () => ({ type: 'announce', role, id, name, url: typeof url === 'function' ? url() : url, ...info });
  const send = (m, host, port = PORT) => sock.send(pack(m), port, host, () => {});
  const announce = () => { send(me(), GROUP); send(me(), '255.255.255.255'); };
  const prune = () => { const now = Date.now(); let ch = false; for (const [k, p] of peers) if (now - p.seen > 45000) { peers.delete(k); ch = true; } if (ch) onPeers([...peers.values()]); };
  sock.on('message', (buf, rinfo) => {
    if (!PRIVATE.test(rinfo.address) || buf.length > 512) return;
    let m; try { m = JSON.parse(buf.toString()); } catch { return; }
    if (m.magic !== MAGIC || !m.id || m.id === id || typeof m.url !== 'string' || !/^https?:\/\//.test(m.url)) return;
    if (m.type === 'bye') { if (peers.delete(m.id)) onPeers([...peers.values()]); return; }
    if (m.type === 'query') { send(me(), rinfo.address, rinfo.port); return; }
    if (m.type === 'announce') { const isNew = !peers.has(m.id); peers.set(m.id, { ...m, from: rinfo.address, seen: Date.now() }); if (isNew) onPeers([...peers.values()]); }
  });
  let timer, ptimer;
  const ready = new Promise((resolve) => {
    sock.on('error', () => resolve(false));
    sock.bind(PORT, () => {
      try { sock.addMembership(GROUP); sock.setMulticastTTL(1); sock.setBroadcast(true); } catch { /* broadcast only */ }
      announce(); send({ type: 'query', role, id, name, url: typeof url === 'function' ? url() : url }, GROUP); send({ type: 'query', role, id, name, url: typeof url === 'function' ? url() : url }, '255.255.255.255');
      const tick = () => { announce(); prune(); timer = setTimeout(tick, 15000 + Math.random() * 3000); };
      timer = setTimeout(tick, 15000); ptimer = setInterval(prune, 5000);
      resolve(true);
    });
  });
  return {
    ready, peers: () => [...peers.values()],
    stop() { clearTimeout(timer); clearInterval(ptimer); try { send({ type: 'bye', role, id, name, url: typeof url === 'function' ? url() : url }, GROUP); } catch { /* closing */ } setTimeout(() => { try { sock.close(); } catch { /* closed */ } }, 100); },
  };
}

// doctor --net: can this host send and receive its own multicast datagram?
export async function probeMulticast() {
  return new Promise((resolve) => {
    const port = 41998; const s = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const done = (ok, detail) => { try { s.close(); } catch { /* closed */ } resolve({ ok, detail }); };
    const t = setTimeout(() => done(false, 'no datagram came back in 2 s (firewall, Docker bridge, or Wi-Fi client isolation)'), 2000);
    s.on('error', (e) => { clearTimeout(t); done(false, e.message); });
    s.on('message', () => { clearTimeout(t); done(true, `group ${GROUP}, interface ${lanAddress()}`); });
    s.bind(port, () => { try { s.addMembership(GROUP); s.setMulticastLoopback(true); s.send(Buffer.from('probe'), port, GROUP); } catch (e) { clearTimeout(t); done(false, e.message); } });
  });
}
