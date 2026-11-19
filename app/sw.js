// שיתוף מהטלפון ל"משרד סרגייב": שומר את מה ששותף ופותח את האפליקציה על קונה חדש. לא שומר שום דבר אחר.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'POST' || !/\/share\/?$/.test(u.pathname)) return;
  e.respondWith((async function () {
    var f = await e.request.formData(), files = [];
    for (var x of f.getAll('file')) if (x && x.text) files.push(await x.text());
    var c = await caches.open('sg-share');
    await c.put('share', new Response(JSON.stringify({ title: f.get('title') || '', text: f.get('text') || '', url: f.get('url') || '', files: files }), { headers: { 'Content-Type': 'application/json' } }));
    return Response.redirect(new URL('./#share', u).href, 303);
  })());
});
