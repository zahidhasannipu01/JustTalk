// Clean line icons, same paths as the approved preview.
const P = {
  home: <path d="M4 11 12 4l8 7v8.5A1.5 1.5 0 0 1 18.5 21h-4v-6h-5v6h-4A1.5 1.5 0 0 1 4 19.5Z" />,
  room: <><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" /><path d="M3 21h18" /><path d="M15.5 12h.01" strokeWidth="2.8" /></>,
  people: <><circle cx="9" cy="8" r="3.5" /><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M16 5.2a3.5 3.5 0 0 1 0 5.9M17.8 14.9c1.5.7 2.4 2.2 2.7 4.1" /></>,
  plus: <><circle cx="12" cy="12" r="9" /><path d="M12 8.5v7M8.5 12h7" /></>,
  chat: <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 20.5l1.6-5.4A8.5 8.5 0 1 1 21 11.5Z" />,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M5 20.5c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="3" /><path d="M2.5 10h19" /></>,
  support: <><path d="M4 13a8 8 0 0 1 16 0" /><rect x="2.5" y="13" width="4.5" height="6" rx="2" /><rect x="17" y="13" width="4.5" height="6" rx="2" /><path d="M19.5 19.5c0 1.2-1 2-2.5 2H13" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" /></>,
  bell: <><path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9" /><path d="M10 20a2.2 2.2 0 0 0 4 0" /></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />,
  video: <><rect x="2.5" y="6" width="13" height="12" rx="2.5" /><path d="M15.5 10.8 21.5 7.2v9.6l-6-3.6" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></>,
  micoff: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M4 4l16 16" /></>,
  headphone: <><path d="M4 14a8 8 0 0 1 16 0" /><rect x="2.5" y="14" width="4.5" height="6.5" rx="2" /><rect x="17" y="14" width="4.5" height="6.5" rx="2" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  speaker: <><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></>,
  send: <><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" /></>,
  emoji: <><circle cx="12" cy="12" r="9" /><path d="M8.5 14.2c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8" /><path d="M9 9.5h.01M15 9.5h.01" strokeWidth="2.6" /></>,
  image: <><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m4.5 18 5-5 3.2 3.2 2.6-2.6 4.2 4.4" /></>,
  flag: <><path d="M5 21.5v-17" /><path d="M5 4.8h11.2L13.6 8.6l2.6 3.8H5" /></>,
  unblock: <><circle cx="12" cy="12" r="9" /><path d="M8.6 12.3l2.3 2.3 4.5-5" /></>,
  lockOpen: <><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 7.8-1.4" /></>,
  camera: <><path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.4" /></>,
  chevD: <path d="m6 9 6 6 6-6" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
  list: <><path d="M4 6h16M4 12h16M4 18h10" /><circle cx="19" cy="18" r="1.6" /></>,
  coin: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v10M15 9.2c-.6-1-1.7-1.4-3-1.4-1.7 0-3 .9-3 2.2 0 3 6 1.8 6 4 0 1.3-1.3 2.2-3 2.2-1.3 0-2.4-.5-3-1.5" /></>,
  sparkle: <><path d="M12 3.5 13.8 8.7 19.3 10.5 13.8 12.3 12 17.5 10.2 12.3 4.7 10.5 10.2 8.7Z" /><path d="M18.8 15.8l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" /></>,
  sliders: <><path d="M4 8h9M19 8h1M4 16h3M13 16h7" /><circle cx="16" cy="8" r="2.2" /><circle cx="10" cy="16" r="2.2" /></>,
  flagAdm: <path d="M5 21V4h11l-2 4 2 4H5" />,
  ban: <><circle cx="12" cy="12" r="9" /><path d="M5.5 5.5l13 13" /></>,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  settings: <><circle cx="12" cy="12" r="3.2" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2Z" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
  minus: <path d="M5 12h14" />,
  adduser: <><circle cx="10" cy="8" r="3.5" /><path d="M4 19.5c.5-3 2.6-4.7 6-4.7 1 0 1.9.2 2.7.5M18 8v6M15 11h6" /></>,
  removeuser: <><circle cx="10" cy="8" r="3.5" /><path d="M4 19.5c.5-3 2.6-4.7 6-4.7 1 0 1.9.2 2.7.5M15 11h6" /></>,
  hand: <path d="M8 12V5.8a1.4 1.4 0 0 1 2.8 0V11m0-6.5a1.4 1.4 0 0 1 2.8 0V11m0-5.8a1.4 1.4 0 0 1 2.8 0V13m0-3.5a1.4 1.4 0 0 1 2.8 0V15a6.5 6.5 0 0 1-6.5 6.5h-.6c-2.2 0-3.9-.9-5.3-2.7L4.6 16a1.7 1.7 0 0 1 2.7-2L8 15" />,
  pin: <><path d="M9 4h6l-1 7 3 3v2H7v-2l3-3-1-7z" /><path d="M12 16v5" /></>,
  share: <><rect x="3" y="4.5" width="18" height="13" rx="2.5" /><path d="M12 14.5v-6M9.5 10.5 12 8l2.5 2.5M9 21h6" /></>,
  videooff: <><rect x="2.5" y="6" width="13" height="12" rx="2.5" /><path d="M15.5 10.8 21.5 7.2v9.6l-6-3.6M3 3l18 18" /></>,
};
export function Ic({ n, size }) {
  return <span className="ic" style={size ? { width: size, height: size } : undefined}><svg viewBox="0 0 24 24">{P[n] || null}</svg></span>;
}
export function Avatar({ user, size = 40, fontSize, initialsOnly = false, cls = '' }) {
  const style = cls ? { background: user?.color || '#101210' } : { width: size, height: size, fontSize: fontSize || Math.round(size * 0.3), background: user?.color || '#101210' };
  return <span className={`avatar ${cls}`} style={style}>{user?.avatar && !initialsOnly ? <img src={user.avatar} alt="" /> : (user?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</span>;
}
