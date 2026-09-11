// 가짜 Supabase — 서버 없이 로그인·동기화 흐름만 돌려 보기 위한 것.
// dev/cloud-test.mjs 가 index.html 을 복사하면서 진짜 CDN 대신 이 파일을 물린다.
// 서버 흉내는 localStorage 에 남으므로 새로고침해도 "서버에 있던 것"이 유지된다.
(function () {
  const KEY = '__mock_sb';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = s => localStorage.setItem(KEY, JSON.stringify(s));
  const db = Object.assign({ users: {}, session: null, sheets: [], files: {} }, load());
  const flush = () => save(db);
  const ok = data => Promise.resolve({ data, error: null });
  const err = message => Promise.resolve({ data: null, error: { message } });

  const listeners = [];
  const fire = () => listeners.forEach(f => f('CHANGE', db.session));

  function table(name) {
    const rows = () => db[name];
    const api = {
      select() { return thenable(() => ({ data: rows().slice(), error: null })); },
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
          if (rows().some(r => r.fp === row.fp)) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
          rows().push(row); flush();
          return { data: [row], error: null };
        });
      },
      delete() {
        return { eq: (col, val) => thenable(() => { db[name] = rows().filter(r => r[col] !== val); flush(); return { data: null, error: null }; }) };
      },
    };
    return api;
  }
  // supabase-js 의 질의는 await 하면 실행된다. 같은 모양만 흉내 낸다.
  function thenable(run) {
    return { then: (res, rej) => Promise.resolve().then(run).then(res, rej) };
  }

  function bucket(id) {
    return {
      async upload(path, blob) {
        db.files[id + '/' + path] = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
        flush();
        return { data: { path }, error: null };
      },
      async download(path) {
        const src = db.files[id + '/' + path];
        if (!src) return { data: null, error: { message: 'not found' } };
        return { data: await (await fetch(src)).blob(), error: null };
      },
      async remove(paths) { paths.forEach(p => delete db.files[id + '/' + p]); flush(); return { data: null, error: null }; },
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
