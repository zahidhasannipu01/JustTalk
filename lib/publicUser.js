// Phone visibility: 'public' -> everyone, 'friends' -> friends only, 'onlyme' -> owner only.
export function shapeUser(u, viewerId, isFriend) {
  const showPhone = u.id === viewerId || u.phone_visibility === 'public' || (u.phone_visibility === 'friends' && isFriend);
  return { id: u.id, name: u.name, color: u.color || null, username: u.username || null, note: u.note || null, goal: u.goal || null, email: u.id === viewerId ? u.email : undefined, avatar: u.avatar, gender: u.gender, talk_preference: u.talk_preference, online: u.online_now != null ? !!Number(u.online_now) : (u.is_online && u.last_seen_at ? (Date.now() - new Date(u.last_seen_at).getTime()) < 90000 : false), last_seen_at: u.last_seen_at, phone: showPhone ? u.phone : null, phone_visibility: u.id === viewerId ? u.phone_visibility : undefined, city: u.city, country: u.country, rating: u.rating != null ? Number(u.rating) : null, ratings_count: u.ratings_count || 0, rating_cats: u.rating_cats || null };
}
export const RATING_SQL = '(SELECT ROUND(AVG((r.fluency + r.speaking + r.behaviour) / 3), 1) FROM ratings r WHERE r.ratee_id = u.id) AS rating, (SELECT COUNT(*) FROM ratings r WHERE r.ratee_id = u.id) AS ratings_count';
export const RATING_CATS_SQL = `(SELECT CONCAT(ROUND(AVG(r.fluency),1), ',', ROUND(AVG(r.speaking),1), ',', ROUND(AVG(r.behaviour),1)) FROM ratings r WHERE r.ratee_id = u.id) AS rating_cats_raw`;
export function parseCats(u) {
  if (!u.rating_cats_raw) return u;
  const [f, s, b] = String(u.rating_cats_raw).split(',').map(Number);
  u.rating_cats = { fluency: f, speaking: s, behaviour: b };
  delete u.rating_cats_raw;
  return u;
}
