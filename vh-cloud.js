/* ════════════════════════════════════════════════════════════
   VAVEhub — cloud data layer (Supabase)
   Shared by auth.html, training.html, certificate.html, verify.html.
   Gracefully no-ops to localStorage when Supabase isn't configured,
   so every page keeps working in demo mode.
   Expose: window.VHCloud
   ════════════════════════════════════════════════════════════ */
window.VHCloud = (function () {
  "use strict";
  const cfg = window.VF_CONFIG || {};
  const LIVE = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  let client = null, ready;

  // Load the Supabase SDK on demand, then create the client.
  ready = (function () {
    if (!LIVE) return Promise.resolve(null);
    return new Promise((resolve) => {
      if (window.supabase) { resolve(mk()); return; }
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = () => resolve(mk());
      s.onerror = () => resolve(null); // fall back silently
      document.head.appendChild(s);
    });
    function mk() {
      try { client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey); } catch (e) { client = null; }
      return client;
    }
  })();

  async function user() {
    if (!LIVE) return null;
    await ready; if (!client) return null;
    const { data } = await client.auth.getUser();
    return data && data.user ? data.user : null;
  }

  return {
    live: LIVE,
    ready,
    client: () => client,
    user,

    // ── session name for greeting/nav ──
    async displayName() {
      const u = await user();
      if (!u) return null;
      return (u.user_metadata && u.user_metadata.full_name) || (u.email ? u.email.split("@")[0] : null);
    },

    async signOut() {
      if (LIVE) { await ready; if (client) await client.auth.signOut(); }
      try { localStorage.removeItem("vh-session"); } catch (e) {}
    },

    // ── progress: push/pull the course state blob ──
    async saveProgress(state) {
      const u = await user(); if (!u) return;
      try { await client.from("progress").upsert({ user_id: u.id, data: state, updated_at: new Date().toISOString() }); } catch (e) {}
    },
    async loadProgress() {
      const u = await user(); if (!u) return null;
      try {
        const { data } = await client.from("progress").select("data").eq("user_id", u.id).maybeSingle();
        return data ? data.data : null;
      } catch (e) { return null; }
    },

    // ── certificates ──
    async registerCertificate(cert) {
      const u = await user(); if (!u) return;
      try {
        await client.from("certificates").upsert({
          id: cert.id, user_id: u.id, full_name: cert.name, score: cert.score, issued_at: new Date(cert.date).toISOString(),
        });
      } catch (e) {}
    },
    // total certificates issued — public count for social proof
    async certCount() {
      if (!LIVE) return null;
      await ready; if (!client) return null;
      try {
        const { count, error } = await client.from("certificates").select("id", { count: "exact", head: true });
        return error ? null : count;
      } catch (e) { return null; }
    },
    async verifyCertificate(id) {
      if (!LIVE) return { status: "demo" };
      await ready; if (!client) return { status: "demo" };
      try {
        const { data, error } = await client.from("certificates").select("id,full_name,score,issued_at").eq("id", id).maybeSingle();
        if (error) return { status: "error" };
        return data ? { status: "valid", cert: data } : { status: "notfound" };
      } catch (e) { return { status: "error" }; }
    },
  };
})();
