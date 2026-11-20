// Supabase layer for AI at Work for NGO Teams.
// Adds sign-in, progress sync across devices, the pilot surveys and the trainer dashboard.
// Without a config in config.js, it only shows a notice and the site keeps working offline.
(function () {
  "use strict";
  var CFG = window.AIW_CONFIG || {};
  var AIW = window.AIW;
  var ON = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  var sb = null, user = null, profile = null, orgName = "", admin = false, pushTimer = null, lastPushed = "";

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function status(el, msg, bad) { el.textContent = msg; el.className = "bk-msg" + (bad ? " bad" : ""); }

  // ---------- account modal ----------
  var modal = document.createElement("div");
  modal.className = "bk-modal"; modal.id = "authModal"; modal.hidden = true;
  modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-labelledby", "bkTitle");
  modal.innerHTML =
    '<div class="bk-card">' +
    '<button class="btn small bk-x" id="bkClose" aria-label="Close">Close</button>' +
    '<h3 id="bkTitle">Sign in</h3>' +
    '<div data-pane="email"><p>Enter your work email. We\'ll send you a sign-in link, so there\'s no password to remember.</p>' +
    '<form id="bkEmailForm"><label>Work email<input type="email" id="bkEmail" required autocomplete="email"></label>' +
    '<button class="btn primary" type="submit">Send sign-in link</button></form></div>' +
    '<div data-pane="sent" hidden><p>Check your inbox for a link from Supabase. Open it on this device to finish signing in. You can close this window.</p></div>' +
    '<div data-pane="join" hidden><p>One last step. Your trainer gave your organization a pilot code.</p>' +
    '<form id="bkJoinForm"><label>Your full name<input id="bkName" required maxlength="120" autocomplete="name"></label>' +
    '<label>Pilot code<input id="bkCode" required maxlength="40" autocapitalize="characters"></label>' +
    '<label class="bk-check"><input type="checkbox" id="bkConsent" required> I agree that my name, work email, course progress and survey answers are stored so my trainer can track the pilot. They are shared outside my organization only as anonymized results.</label>' +
    '<button class="btn primary" type="submit">Join the course</button></form></div>' +
    '<div data-pane="account" hidden><p id="bkWho"></p><p class="bk-sub" id="bkSync">Your progress is saved to your account.</p>' +
    '<div class="bk-row"><a class="btn" href="#surveys" id="bkToSurvey">Pilot surveys</a><button class="btn" id="bkOut">Sign out</button></div>' +
    '<p class="bk-sub">On a shared computer, always sign out when you finish. Signing out also clears your progress from this browser.</p></div>' +
    '<p class="bk-msg" id="bkMsg" aria-live="polite"></p></div>';
  document.body.appendChild(modal);

  function pane(name) { modal.querySelectorAll("[data-pane]").forEach(function (p) { p.hidden = p.dataset.pane !== name; }); }
  function openModal() {
    status($("bkMsg"), "");
    if (!user) pane("email"); else if (!profile) pane("join"); else { pane("account"); $("bkWho").innerHTML = "Signed in as <b>" + esc(profile.full_name) + "</b>" + (orgName ? " · " + esc(orgName) : ""); }
    $("bkTitle").textContent = !user ? "Sign in" : !profile ? "Join your pilot" : "Your account";
    modal.hidden = false;
    var f = modal.querySelector("[data-pane]:not([hidden]) input"); if (f) f.focus();
  }
  function closeModal() { modal.hidden = true; }
  $("bkClose").addEventListener("click", closeModal);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeModal(); });
  $("bkToSurvey").addEventListener("click", closeModal);

  var acct = $("acctBtn");
  function paintAcct() {
    if (!ON) { acct.hidden = true; return; }
    acct.hidden = false;
    acct.querySelector(".full").textContent = !user ? "Sign in" : profile ? profile.full_name.split(" ")[0] : "Finish sign-in";
    acct.querySelector(".short").textContent = !user ? "Sign in" : "Account";
    $("tocTrainer").hidden = !admin;
  }
  acct.addEventListener("click", function () { if (ON) openModal(); });

  // ---------- views ----------
  function renderSurveys() {
    var box = $("surveyBox");
    if (!ON) { box.innerHTML = '<div class="callout yellow"><h4>Surveys aren\'t switched on yet</h4><p>Your trainer still needs to connect this site to its database. Until then, your progress is saved only in this browser.</p></div>'; return; }
    if (!user || !profile) { box.innerHTML = '<div class="callout blue"><h4>Sign in to take the pilot surveys</h4><p>You need your work email and the pilot code from your trainer.</p><p><button class="btn primary" id="svSign">Sign in</button></p></div>'; $("svSign").onclick = openModal; return; }
    box.innerHTML = '<p class="bk-sub" id="svState">Loading your answers…</p>' +
      '<form id="svForm" class="card bk-form">' +
      '<fieldset><legend>Which survey are you taking?</legend>' +
      '<label class="bk-inline"><input type="radio" name="kind" value="baseline" checked> Start of course (before session 1)</label>' +
      '<label class="bk-inline"><input type="radio" name="kind" value="final"> End of course (after session 4)</label></fieldset>' +
      '<fieldset><legend>How confident are you using AI tools safely at work?</legend><div class="bk-scale">' +
      [1, 2, 3, 4, 5].map(function (n) { return '<label><input type="radio" name="confidence" value="' + n + '" required><span>' + n + '</span></label>'; }).join("") +
      '</div><small>1 = not at all, 5 = very confident</small></fieldset>' +
      '<label>One task you do often<input name="task_name" maxlength="120" placeholder="For example: first draft of the quarterly donor report"></label>' +
      '<label>How many minutes does that task take you now?<input name="task_minutes" type="number" min="0" max="10000" inputmode="numeric"></label>' +
      '<label data-final>In the last two weeks, how many AI mistakes did you catch before using the output?<input name="ai_errors_caught" type="number" min="0" max="1000" inputmode="numeric"></label>' +
      '<label>Anything else? (optional)<textarea name="comment" maxlength="1000"></textarea></label>' +
      '<p class="bk-sub">Don\'t write beneficiary names, donor details or any other personal data here.</p>' +
      '<button class="btn primary" type="submit">Save my answers</button> <span class="bk-msg" id="svMsg" aria-live="polite"></span></form>';
    var form = $("svForm"), have = {};
    function fill() {
      var k = form.kind.value, r = have[k] || {};
      form.querySelectorAll("[data-final]").forEach(function (el) { el.hidden = k !== "final"; });
      form.querySelectorAll('[name="confidence"]').forEach(function (x) { x.checked = String(r.confidence) === x.value; });
      form.task_name.value = r.task_name || ""; form.task_minutes.value = r.task_minutes == null ? "" : r.task_minutes;
      form.ai_errors_caught.value = r.ai_errors_caught == null ? "" : r.ai_errors_caught; form.comment.value = r.comment || "";
      $("svState").textContent = "Start survey: " + (have.baseline ? "done" : "not done") + " · End survey: " + (have.final ? "done" : "not done");
    }
    form.addEventListener("change", function (e) { if (e.target.name === "kind") fill(); });
    sb.from("surveys").select("*").eq("user_id", user.id).then(function (res) {
      (res.data || []).forEach(function (r) { have[r.kind] = r; });
      if (have.baseline && !have.final) form.kind.value = "final";
      fill();
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var k = form.kind.value, num = function (v) { return v === "" ? null : parseInt(v, 10); };
      var row = { user_id: user.id, kind: k, confidence: parseInt(form.confidence.value, 10), task_name: form.task_name.value.trim() || null,
        task_minutes: num(form.task_minutes.value), ai_errors_caught: k === "final" ? num(form.ai_errors_caught.value) : null, comment: form.comment.value.trim() || null };
      status($("svMsg"), "Saving…");
      sb.from("surveys").upsert(row, { onConflict: "user_id,kind" }).select().single().then(function (res) {
        if (res.error) return status($("svMsg"), "Couldn't save: " + res.error.message, true);
        have[k] = res.data; fill(); status($("svMsg"), "Saved. Thank you.");
      });
    });
  }

  function avg(a) { a = a.filter(function (x) { return x != null; }); return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
  function median(a) { a = a.filter(function (x) { return x != null; }).sort(function (x, y) { return x - y; }); if (!a.length) return null; var m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
  function f1(x) { return x == null ? "–" : (Math.round(x * 10) / 10).toString(); }
  var lastData = null;

  function renderTrainer() {
    var box = $("trainerBox");
    if (!admin) { box.innerHTML = '<p>This page is only for the course trainer.</p>'; return; }
    box.innerHTML = '<p class="bk-sub">Loading pilot data…</p>';
    Promise.all([sb.from("organizations").select("*").order("created_at"), sb.from("profiles").select("*"), sb.from("progress").select("*"), sb.from("surveys").select("*")]).then(function (r) {
      var err = r.filter(function (x) { return x.error; })[0]; if (err) { box.innerHTML = '<p class="bk-msg bad">' + esc(err.error.message) + '</p>'; return; }
      var orgs = r[0].data, people = r[1].data.filter(function (p) { return p.role !== "admin"; }), prog = {}, sv = r[3].data;
      r[2].data.forEach(function (p) { prog[p.user_id] = p; });
      lastData = { orgs: orgs, people: people, prog: prog, sv: sv };
      var rows = orgs.map(function (o) {
        var ps = people.filter(function (p) { return p.organization_id === o.id; });
        var sums = ps.map(function (p) { return AIW.summary(prog[p.id] ? prog[p.id].state : {}); });
        var b = sv.filter(function (s) { return s.organization_id === o.id && s.kind === "baseline"; }), f = sv.filter(function (s) { return s.organization_id === o.id && s.kind === "final"; });
        var mb = median(b.map(function (s) { return s.task_minutes; })), mf = median(f.map(function (s) { return s.task_minutes; }));
        return '<tr><td><b>' + esc(o.name) + '</b><br><code>' + esc(o.pilot_code) + '</code></td><td class="num">' + ps.length + '</td><td class="num">' +
          (sums.length ? Math.round(avg(sums.map(function (s) { return s.pct; }))) + "%" : "–") + '</td><td class="num">' + sums.filter(function (s) { return s.coreDone === s.coreTotal; }).length + '</td><td class="num">' +
          f1(avg(b.map(function (s) { return s.confidence; }))) + ' → ' + f1(avg(f.map(function (s) { return s.confidence; }))) + '</td><td class="num">' +
          f1(mb) + ' → ' + f1(mf) + (mb && mf ? ' <small>(' + Math.round((1 - mf / mb) * 100) + '% less)</small>' : '') + '</td><td class="num">' +
          f.reduce(function (s, x) { return s + (x.ai_errors_caught || 0); }, 0) + '</td><td class="num">' + b.length + ' / ' + f.length + '</td></tr>';
      }).join("");
      var lrn = people.map(function (p) {
        var s = AIW.summary(prog[p.id] ? prog[p.id].state : {}), o = orgs.filter(function (x) { return x.id === p.organization_id; })[0];
        var mine = sv.filter(function (x) { return x.user_id === p.id; }), kinds = mine.map(function (x) { return x.kind === "baseline" ? "start" : "end"; }).join(", ");
        return '<tr><td>' + esc(p.full_name) + '</td><td>' + esc(o ? o.name : "–") + '</td><td class="num">' + s.pct + '%</td><td class="num">' + s.coreDone + '/' + s.coreTotal + '</td><td>' + (kinds || "none") + '</td><td>' + (prog[p.id] ? new Date(prog[p.id].updated_at).toLocaleDateString() : "–") + '</td></tr>';
      }).join("");
      box.innerHTML =
        '<h3>Pilot results by organization</h3><div class="tbl"><table><thead><tr><th>Organization and code</th><th>Learners</th><th>Avg. progress</th><th>Finished core</th><th>Confidence start → end</th><th>Task minutes, median, start → end</th><th>AI errors caught</th><th>Surveys start / end</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="8">No organizations yet. Add your first pilot below.</td></tr>') + '</tbody></table></div>' +
        '<p class="bk-row"><button class="btn" id="trCsv">Download survey answers (CSV)</button> <button class="btn" id="trReload">Refresh</button></p>' +
        '<h3>Add a pilot organization</h3><form id="trOrg" class="card bk-form bk-grid"><label>Organization name<input name="name" required maxlength="120"></label>' +
        '<label>Pilot code to give its staff<input name="code" required maxlength="40" pattern="[A-Za-z0-9-]{4,40}" title="4 to 40 letters, numbers or dashes"></label>' +
        '<button class="btn primary" type="submit">Add organization</button> <span class="bk-msg" id="trMsg" aria-live="polite"></span></form>' +
        '<h3>Learners</h3><div class="tbl"><table><thead><tr><th>Name</th><th>Organization</th><th>Progress</th><th>Core chapters passed</th><th>Surveys done</th><th>Last active</th></tr></thead><tbody>' +
        (lrn || '<tr><td colspan="6">No learners have joined yet.</td></tr>') + '</tbody></table></div>' +
        '<p class="bk-sub">Names are shown here for you only. Share results outside the organization only as anonymized totals, as agreed with each NGO.</p>';
      $("trReload").onclick = renderTrainer;
      $("trCsv").onclick = csv;
      $("trOrg").addEventListener("submit", function (e) {
        e.preventDefault(); var fm = e.target;
        sb.from("organizations").insert({ name: fm.name.value.trim(), pilot_code: fm.code.value.trim().toUpperCase() }).then(function (res) {
          if (res.error) return status($("trMsg"), res.error.message.indexOf("duplicate") >= 0 ? "That pilot code is already in use." : res.error.message, true);
          renderTrainer();
        });
      });
    });
  }
  function csv() {
    if (!lastData) return;
    var org = {}; lastData.orgs.forEach(function (o) { org[o.id] = o.name; });
    var cols = ["organization", "learner_ref", "survey", "confidence", "task_name", "task_minutes", "ai_errors_caught", "comment", "date"], ref = {}, n = 0;
    var lines = [cols.join(",")].concat(lastData.sv.map(function (s) {
      if (!ref[s.user_id]) ref[s.user_id] = "L" + (++n); // anonymized learner reference instead of a name
      return [org[s.organization_id] || "", ref[s.user_id], s.kind, s.confidence, s.task_name, s.task_minutes, s.ai_errors_caught, s.comment, s.created_at.slice(0, 10)]
        .map(function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(",");
    }));
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = "pilot-surveys.csv"; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  AIW.onView = function (v) { if (v === "surveys") renderSurveys(); if (v === "trainer") renderTrainer(); };

  // ---------- progress sync ----------
  function merge(remote, local) {
    var out = {}; ["answers", "games", "notes", "checks", "seen"].forEach(function (k) { out[k] = Object.assign({}, (remote || {})[k], (local || {})[k]); });
    out.last = (local && local.last) || (remote && remote.last); return out;
  }
  function push() {
    if (!user || !profile) return;
    var st = JSON.stringify(AIW.getState()); if (st === lastPushed) return;
    sb.from("progress").upsert({ user_id: user.id, state: JSON.parse(st), updated_at: new Date().toISOString() }).then(function (res) {
      if (res.error) { if ($("bkSync")) $("bkSync").textContent = "Couldn't save to your account just now. Your progress is still saved in this browser."; return; }
      lastPushed = st; if ($("bkSync")) $("bkSync").textContent = "Your progress is saved to your account.";
    });
  }
  AIW.onSave = function () { clearTimeout(pushTimer); pushTimer = setTimeout(push, 1500); };
  window.addEventListener("pagehide", push);

  function pull() {
    return sb.from("progress").select("state").eq("user_id", user.id).maybeSingle().then(function (res) {
      var local = AIW.getState(), merged = merge(res.data && res.data.state, local);
      var before = JSON.stringify(merge({}, local));
      return sb.from("progress").upsert({ user_id: user.id, state: merged, updated_at: new Date().toISOString() }).then(function () {
        lastPushed = JSON.stringify(merged);
        if (JSON.stringify(merge({}, merged)) !== before) { AIW.writeLocal(merged); location.reload(); }
      });
    });
  }

  function loadProfile() {
    if (!user) { profile = null; admin = false; orgName = ""; paintAcct(); AIW.onView(location.hash.slice(1)); return Promise.resolve(); }
    return sb.from("profiles").select("*").eq("id", user.id).maybeSingle().then(function (res) {
      profile = res.data || null; admin = !!(profile && profile.role === "admin");
      if (!profile) { paintAcct(); openModal(); return; }
      return sb.rpc("my_org_name").then(function (o) { orgName = o.data || ""; paintAcct(); AIW.onView(location.hash.slice(1)); return pull(); });
    });
  }

  if (!ON) { paintAcct(); AIW.onView(location.hash.slice(1)); return; }

  import(CFG.supabaseLib || "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm").then(function (mod) {
    sb = mod.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, detectSessionInUrl: true } });
    paintAcct();
    var started = false;
    sb.auth.onAuthStateChange(function (ev, session) {
      var u = session ? session.user : null, changed = (u && u.id) !== (user && user.id);
      user = u;
      if (changed || !started) { started = true; setTimeout(loadProfile, 0); }
    });

    $("bkEmailForm").addEventListener("submit", function (e) {
      e.preventDefault(); status($("bkMsg"), "Sending…");
      var back = location.origin + location.pathname;
      sb.auth.signInWithOtp({ email: $("bkEmail").value.trim(), options: { emailRedirectTo: back } }).then(function (res) {
        if (res.error) return status($("bkMsg"), res.error.message, true);
        status($("bkMsg"), ""); pane("sent");
      });
    });
    $("bkJoinForm").addEventListener("submit", function (e) {
      e.preventDefault(); status($("bkMsg"), "Joining…");
      sb.rpc("join_pilot", { p_code: $("bkCode").value, p_full_name: $("bkName").value }).then(function (res) {
        if (res.error) return status($("bkMsg"), res.error.message, true);
        status($("bkMsg"), ""); closeModal(); loadProfile();
      });
    });
    $("bkOut").addEventListener("click", function () {
      push(); sb.auth.signOut().then(function () { AIW.clearLocal(); location.hash = "home"; location.reload(); });
    });
  }, function (err) {
    acct.hidden = true; // the Supabase library couldn't load (offline); the course still works locally
    if (window.console) console.warn("Supabase library did not load:", err);
  });
})();
