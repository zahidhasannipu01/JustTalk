export function ok(data = {}, status = 200) { return Response.json({ ok: true, ...data }, { status }); }
export function fail(msg, status = 400) { return Response.json({ ok: false, error: msg }, { status }); }
