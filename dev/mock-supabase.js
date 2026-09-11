// 가짜 Supabase — 서버 없이 로그인·동기화 흐름만 돌려 보기 위한 것.
// dev/cloud-test.mjs 가 index.html 을 복사하면서 진짜 CDN 대신 이 파일을 물린다.
// 서버 흉내는 localStorage 에 남으므로 새로고침해도 "서버에 있던 것"이 유지된다.
//
// 앱이 실제로 쓰는 만큼만 흉내 낸다. select/insert/upsert/delete, eq, maybeSingle,
// storage 의 upload/download/remove/list. 규칙(RLS)은 흉내 내지 않는다 — 그건 진짜
// 서버에서만 확인할 수 있다.
(function () {
  const KEY = '__mock_sb';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const db = Object.assign({ users: {}, session: null, sheets: [], contis: [], files: {} }, load());
  const flush = () => localStorage.setItem(KEY, JSON.stringify(db));
  const ok = data => Promise.resolve({ data, error: null });

  const listeners = [];
  const fire = () => listeners.forEach(f => f('CHANGE', db.session));

  // supabase-js 의 질의는 await 할 때 실행된다. 같은 모양만 흉내 낸다.
  const thenable = run => ({
    then: (res, rej) => Promise.resolve().then(run).then(res, rej),
  });

  function table(name) {
    const rows = () => (db[name] = db[name] || []);
    return {
      select() {
        const filters = [];
        const q = {
          eq(col, val) { filters.push([col, val]); return q; },
          order() { return q; },
          maybeSingle() {
            return thenable(() => {
              const hit = rows().find(r => filters.every(([c, v]) => r[c] === v));
              return { data: hit || null, error: null };
            });
          },
          then: (res, rej) => Promise.resolve()
            .then(() => ({ data: rows().filter(r => filters.every(([c, v]) => r[c] === v)), error: null }))
            .then(res, rej),
        };
        return q;
      },
      upsert(row) {
        return thenable(() => {
          const i = rows().findIndex(r => r.id === row.id);
          if (i >= 0) rows()[i] = row; else rows().push(row);
          flush();
          return { data: [row], error: null };
        });
      },
      insert(row) {
        return thenable(() => {
          if (row.fp && rows().some(r => r.fp === row.fp)) {
            return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
          }
          rows().push(row); flush();
          return { data: [row], error: null };
        });
      },
      delete() {
        return {
          eq: (col, val) => thenable(() => {
            db[name] = rows().filter(r => r[col] !== val);
            flush();
            return { data: null, error: null };
          }),
        };
      },
    };
  }

  function bucket(id) {
    const key = path => id + '/' + path;
    return {
      async upload(path, blob) {
        db.files[key(path)] = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
        flush();
        return { data: { path }, error: null };
      },
      async download(path) {
        const src = db.files[key(path)];
        if (!src) return { data: null, error: { message: 'not found' } };
        return { data: await (await fetch(src)).blob(), error: null };
      },
      async remove(paths) { paths.forEach(p => delete db.files[key(p)]); flush(); return { data: null, error: null }; },
      async list(prefix) {
        const head = key(prefix ? prefix + '/' : '');
        const names = Object.keys(db.files).filter(k => k.startsWith(head)).map(k => ({ name: k.slice(head.length) }));
        return { data: names, error: null };
      },
    };
  }

  window.supabase = {
    createClient() {
      return {
        auth: {
          getSession: () => ok({ session: db.session }),
          onAuthStateChange(cb) { listeners.push(cb); return { data: { subscription: { unsubscribe() { } } } }; },
          async signInWithPassword({ email, password }) {
            const u = db.users[email];
            if (!u || u.password !== password) return { data: null, error: { message: 'Invalid login credentials' } };
            db.session = { user: { id: u.id, email, user_metadata: {} } }; flush(); fire();
            return ok({ session: db.session });
          },
          async signUp({ email, password }) {
            if (db.users[email]) return { data: null, error: { message: 'User already registered' } };
            db.users[email] = { id: 'u_' + Math.random().toString(36).slice(2, 8), password };
            db.session = { user: { id: db.users[email].id, email, user_metadata: {} } }; flush(); fire();
            return ok({ session: db.session });
          },
          async signOut() { db.session = null; flush(); fire(); return { error: null }; },
        },
        from: table,
        storage: { from: bucket },
      };
    },
  };
})();
