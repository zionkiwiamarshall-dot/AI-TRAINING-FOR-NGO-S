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
    '<div data-pane="signin"><form id="bkInForm">' +
    '<label>Email<input type="email" id="bkInEmail" required autocomplete="email"></label>' +
    '<label>Password<input type="password" id="bkInPass" required autocomplete="current-password"></label>' +
    '<button class="btn primary" type="submit">Sign in</button></form>' +
    '<p class="bk-links"><button class="bk-link" data-go-pane="signup">Create an account</button> · <button class="bk-link" data-go-pane="forgot">Forgot password?</button></p></div>' +
    '<div data-pane="signup" hidden><form id="bkUpForm">' +
    '<label>Your full name<input id="bkUpName" required maxlength="120" autocomplete="name"></label>' +
    '<label>Email<input type="email" id="bkUpEmail" required autocomplete="email"></label>' +
    '<label>Password (at least 8 characters)<input type="password" id="bkUpPass" required minlength="8" autocomplete="new-password"></label>' +
    '<label class="bk-check"><input type="checkbox" id="bkConsent" required> I agree that my name, email, course progress and survey answers are stored so my trainer can follow my learning. They are only ever shared as anonymized results.</label>' +
    '<button class="btn primary" type="submit">Create my account</button></form>' +
    '<p class="bk-links">Already have an account? <button class="bk-link" data-go-pane="signin">Sign in</button></p></div>' +
    '<div data-pane="forgot" hidden><p>Use the recovery code you saved when you created your account.</p><form id="bkFgForm">' +
    '<label>Email<input type="email" id="bkFgEmail" required autocomplete="email"></label>' +
    '<label>Recovery code<input id="bkFgCode" required autocomplete="off" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX-XXXX"></label>' +
    '<label>New password (at least 8 characters)<input type="password" id="bkFgPass" required minlength="8" autocomplete="new-password"></label>' +
    '<button class="btn primary" type="submit">Set new password</button></form>' +
    '<p class="bk-sub">Lost your recovery code too? Ask your trainer to reset your password.</p>' +
    '<p class="bk-links"><button class="bk-link" data-go-pane="signin">Back to sign in</button></p></div>' +
    '<div data-pane="sent" hidden><p id="bkSentTxt"></p><p class="bk-links"><button class="bk-link" data-go-pane="signin">Back to sign in</button></p></div>' +
    '<div data-pane="code" hidden><p>Save this recovery code somewhere safe: a photo, your notes app, or on paper. If you forget your password, you\'ll need it to set a new one. You won\'t see it again.</p>' +
    '<p class="bk-codeval" id="bkCodeVal"></p><p class="bk-row"><button class="btn" id="bkCopy" type="button">Copy code</button></p>' +
    '<label class="bk-check"><input type="checkbox" id="bkSaved"> I\'ve saved my recovery code</label>' +
    '<button class="btn primary" id="bkCodeDone" type="button" disabled>Continue</button></div>' +
    '<div data-pane="reset" hidden><form id="bkRsForm"><label>New password (at least 8 characters)<input type="password" id="bkRsPass" required minlength="8" autocomplete="new-password"></label>' +
    '<button class="btn primary" type="submit">Save new password</button></form></div>' +
    '<div data-pane="account" hidden><p id="bkWho"></p><p class="bk-sub" id="bkSync">Your progress is saved to your account.</p>' +
    '<div class="bk-row"><a class="btn" href="#surveys" id="bkToSurvey">Surveys</a><button class="btn" id="bkNewCode" type="button">New recovery code</button><button class="btn" id="bkOut">Sign out</button></div>' +
    '<details class="bk-code" id="bkCodeBox"><summary>Have a pilot code from your organization?</summary><form id="bkJoinForm">' +
    '<label>Pilot code<input id="bkCode" required maxlength="40" autocapitalize="characters"></label>' +
    '<button class="btn" type="submit">Join my organization</button></form></details>' +
    '<p class="bk-sub">On a shared computer, always sign out when you finish. Signing out also clears your progress from this browser.</p></div>' +
    '<p class="bk-msg" id="bkMsg" aria-live="polite"></p></div>';
  document.body.appendChild(modal);

  var TITLES = { signin: "Sign in", signup: "Create your account", forgot: "Reset your password", sent: "Check your email", code: "Your recovery code", reset: "Set a new password", account: "Your account" };
  function pane(name) {
    modal.querySelectorAll("[data-pane]").forEach(function (p) { p.hidden = p.dataset.pane !== name; });
    $("bkTitle").textContent = TITLES[name]; status($("bkMsg"), "");
    var f = modal.querySelector('[data-pane="' + name + '"] input'); if (f && !modal.hidden) f.focus();
  }
  modal.addEventListener("click", function (e) { var g = e.target.closest("[data-go-pane]"); if (g) { e.preventDefault(); pane(g.dataset.goPane); } });
  function openModal(which) {
    modal.hidden = false;
    if (which) return pane(which);
    if (!user) return pane("signin");
    pane("account");
    $("bkWho").innerHTML = "Signed in as <b>" + esc(profile ? profile.full_name : user.email) + "</b>" + (orgName ? " · " + esc(orgName) : " · individual learner");
    $("bkCodeBox").hidden = !!orgName;
  }
  function closeModal() { modal.hidden = true; }
  var ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function randomCode(groups) {
    var a = new Uint32Array(groups * 4), out = []; crypto.getRandomValues(a);
    for (var g = 0; g < groups; g++) { var t = ""; for (var i = 0; i < 4; i++) t += ALPH[a[g * 4 + i] % ALPH.length]; out.push(t); }
    return out.join("-");
  }
  // Creates a fresh recovery code, stores its hash, and shows it once.
  function issueCode(after) {
    var code = randomCode(4);
    return sb.rpc("set_recovery_code", { p_code: code.replace(/-/g, "") }).then(function (res) {
      if (res.error) { status($("bkMsg"), "Couldn't create a recovery code: " + res.error.message, true); return; }
      modal.hidden = false; pane("code"); $("bkCodeVal").textContent = code; $("bkSaved").checked = false; $("bkCodeDone").disabled = true;
      $("bkCodeDone").onclick = function () { if (after) after(); else closeModal(); };
    });
  }
  $("bkSaved").addEventListener("change", function () { $("bkCodeDone").disabled = !this.checked; });
  $("bkCopy").addEventListener("click", function () {
    var t = $("bkCodeVal").textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { status($("bkMsg"), "Copied."); }, function () { status($("bkMsg"), "Select the code and copy it by hand."); });
  });
  $("bkClose").addEventListener("click", closeModal);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeModal(); });
  $("bkToSurvey").addEventListener("click", closeModal);

  var acct = $("acctBtn");
  function paintAcct() {
    if (!ON) { acct.hidden = true; return; }
    acct.hidden = false;
    var first = profile && profile.full_name ? profile.full_name.split(" ")[0] : "Account";
    acct.querySelector(".full").textContent = user ? first : "Sign in";
    acct.querySelector(".short").textContent = user ? "Account" : "Sign in";
    $("tocTrainer").hidden = !admin;
  }
  acct.addEventListener("click", function () { if (ON) openModal(); });

  // ---------- views ----------
  function renderSurveys() {
    var box = $("surveyBox");
    if (!ON) { box.innerHTML = '<div class="callout yellow"><h4>Surveys aren\'t switched on yet</h4><p>Your trainer still needs to connect this site to its database. Until then, your progress is saved only in this browser.</p></div>'; return; }
    if (!user || !profile) { box.innerHTML = '<div class="callout blue"><h4>Sign in to take the surveys</h4><p>Create a free account with your email and a password, or sign in if you already have one.</p><p><button class="btn primary" id="svSign">Sign in or create an account</button></p></div>'; $("svSign").onclick = function () { openModal(); }; return; }
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
    Promise.all([sb.from("organizations").select("*").order("created_at"), sb.from("profiles").select("*"), sb.from("progress").select("*"), sb.from("surveys").select("*"), sb.rpc("admin_user_emails")]).then(function (r) {
      var emails = {}; (r[4].data || []).forEach(function (x) { emails[x.id] = x.email; }); r = r.slice(0, 4);
      var err = r.filter(function (x) { return x.error; })[0]; if (err) { box.innerHTML = '<p class="bk-msg bad">' + esc(err.error.message) + '</p>'; return; }
      var orgs = r[0].data, people = r[1].data.filter(function (p) { return p.role !== "admin"; }), prog = {}, sv = r[3].data;
      r[2].data.forEach(function (p) { prog[p.user_id] = p; });
      lastData = { orgs: orgs, people: people, prog: prog, sv: sv };
      var groups = orgs.concat([{ id: null, name: "Individual learners", pilot_code: "" }]);
      var rows = groups.map(function (o) {
        var ps = people.filter(function (p) { return p.organization_id === o.id; });
        var sums = ps.map(function (p) { return AIW.summary(prog[p.id] ? prog[p.id].state : {}); });
        var b = sv.filter(function (s) { return s.organization_id === o.id && s.kind === "baseline"; }), f = sv.filter(function (s) { return s.organization_id === o.id && s.kind === "final"; });
        var mb = median(b.map(function (s) { return s.task_minutes; })), mf = median(f.map(function (s) { return s.task_minutes; }));
        return '<tr><td><b>' + esc(o.name) + '</b>' + (o.pilot_code ? '<br><code>' + esc(o.pilot_code) + '</code>' : '<br><small>signed up on their own</small>') + '</td><td class="num">' + ps.length + '</td><td class="num">' +
          (sums.length ? Math.round(avg(sums.map(function (s) { return s.pct; }))) + "%" : "–") + '</td><td class="num">' + sums.filter(function (s) { return s.coreDone === s.coreTotal; }).length + '</td><td class="num">' +
          f1(avg(b.map(function (s) { return s.confidence; }))) + ' → ' + f1(avg(f.map(function (s) { return s.confidence; }))) + '</td><td class="num">' +
          f1(mb) + ' → ' + f1(mf) + (mb && mf ? ' <small>(' + Math.round((1 - mf / mb) * 100) + '% less)</small>' : '') + '</td><td class="num">' +
          f.reduce(function (s, x) { return s + (x.ai_errors_caught || 0); }, 0) + '</td><td class="num">' + b.length + ' / ' + f.length + '</td></tr>';
      }).join("");
      var lrn = people.map(function (p) {
        var s = AIW.summary(prog[p.id] ? prog[p.id].state : {}), o = orgs.filter(function (x) { return x.id === p.organization_id; })[0];
        var mine = sv.filter(function (x) { return x.user_id === p.id; }), kinds = mine.map(function (x) { return x.kind === "baseline" ? "start" : "end"; }).join(", ");
        return '<tr><td>' + esc(p.full_name) + (emails[p.id] ? '<br><small>' + esc(emails[p.id]) + '</small>' : '') + '</td><td>' + esc(o ? o.name : "Individual") + '</td><td class="num">' + s.pct + '%</td><td class="num">' + s.coreDone + '/' + s.coreTotal + '</td><td>' + (kinds || "none") + '</td><td>' + (prog[p.id] ? new Date(prog[p.id].updated_at).toLocaleDateString() : "–") + '</td><td><button class="btn small" data-reset-pw="' + p.id + '">Reset password</button><div class="bk-tmp" data-tmp="' + p.id + '"></div></td></tr>';
      }).join("");
      box.innerHTML =
        '<h3>Pilot results by organization</h3><div class="tbl"><table><thead><tr><th>Organization and code</th><th>Learners</th><th>Avg. progress</th><th>Finished core</th><th>Confidence start → end</th><th>Task minutes, median, start → end</th><th>AI errors caught</th><th>Surveys start / end</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="8">No organizations yet. Add your first pilot below.</td></tr>') + '</tbody></table></div>' +
        '<p class="bk-row"><button class="btn" id="trCsv">Download survey answers (CSV)</button> <button class="btn" id="trReload">Refresh</button></p>' +
        '<h3>Add a pilot organization</h3><form id="trOrg" class="card bk-form bk-grid"><label>Organization name<input name="name" required maxlength="120"></label>' +
        '<label>Pilot code to give its staff<input name="code" required maxlength="40" pattern="[A-Za-z0-9-]{4,40}" title="4 to 40 letters, numbers or dashes"></label>' +
        '<button class="btn primary" type="submit">Add organization</button> <span class="bk-msg" id="trMsg" aria-live="polite"></span></form>' +
        '<h3>Learners</h3><div class="tbl"><table><thead><tr><th>Name</th><th>Organization</th><th>Progress</th><th>Core chapters passed</th><th>Surveys done</th><th>Last active</th><th>Password</th></tr></thead><tbody>' +
        (lrn || '<tr><td colspan="7">No learners have joined yet.</td></tr>') + '</tbody></table></div>' +
        '<p class="bk-sub">Names are shown here for you only. Share results outside the organization only as anonymized totals, as agreed with each NGO.</p>';
      $("trReload").onclick = renderTrainer;
      box.querySelectorAll("[data-reset-pw]").forEach(function (btn) {
        btn.onclick = function () {
          var id = btn.dataset.resetPw, tmp = randomCode(3), out = box.querySelector('[data-tmp="' + id + '"]');
          btn.disabled = true;
          sb.rpc("admin_set_password", { p_user: id, p_new_password: tmp }).then(function (res) {
            btn.disabled = false;
            out.innerHTML = res.error ? '<span class="bk-msg bad">' + esc(res.error.message) + '</span>'
              : 'Temporary password: <code>' + esc(tmp) + '</code><br><small>Give it to the learner privately. They can sign in, then make a new recovery code.</small>';
          });
        };
      });
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
      return [org[s.organization_id] || "Individual", ref[s.user_id], s.kind, s.confidence, s.task_name, s.task_minutes, s.ai_errors_caught, s.comment, s.created_at.slice(0, 10)]
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
    function fetchProfile() { return sb.from("profiles").select("*").eq("id", user.id).maybeSingle(); }
    return fetchProfile().then(function (res) {
      if (res.data) return res;
      // The database creates the profile at sign-up; this covers accounts made before that existed.
      var name = (user.user_metadata && user.user_metadata.full_name) || (user.email || "").split("@")[0];
      return sb.rpc("ensure_profile", { p_full_name: name }).then(fetchProfile);
    }).then(function (res) {
      profile = res.data || null; admin = !!(profile && profile.role === "admin");
      return sb.rpc("my_org_name").then(function (o) { orgName = o.data || ""; });
    }).then(function () {
      paintAcct(); AIW.onView(location.hash.slice(1));
      sb.rpc("has_recovery_code").then(function (h) { if (h.data === false) issueCode(); });
      return pull();
    });
  }

  if (!ON) { paintAcct(); AIW.onView(location.hash.slice(1)); return; }

  import(CFG.supabaseLib || "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm").then(function (mod) {
    sb = mod.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    paintAcct();
    sb.auth.onAuthStateChange(function (ev, session) {
      var u = session ? session.user : null, changed = (u && u.id) !== (user && user.id);
      user = u;
      if (ev === "PASSWORD_RECOVERY") setTimeout(function () { openModal("reset"); }, 0);
      if (changed || ev === "INITIAL_SESSION") setTimeout(loadProfile, 0);
    });
    function busy(form, on) { var b = form.querySelector("button[type=submit]"); if (b) b.disabled = on; }
    function friendly(err) {
      var m = (err && err.message) || "Something went wrong. Please try again.";
      if (/invalid login/i.test(m)) return "That email and password don't match. Check them, or use Forgot password.";
      if (/email not confirmed/i.test(m)) return "Please confirm your email first: open the link we sent you, then sign in.";
      if (/already registered/i.test(m)) return "There's already an account with that email. Sign in instead.";
      return m;
    }
    var back = location.origin + location.pathname;

    $("bkInForm").addEventListener("submit", function (e) {
      e.preventDefault(); var f = e.target; busy(f, true); status($("bkMsg"), "Signing in…");
      sb.auth.signInWithPassword({ email: $("bkInEmail").value.trim(), password: $("bkInPass").value }).then(function (res) {
        busy(f, false);
        if (res.error) return status($("bkMsg"), friendly(res.error), true);
        f.reset(); closeModal();
      });
    });
    $("bkUpForm").addEventListener("submit", function (e) {
      e.preventDefault(); var f = e.target; busy(f, true); status($("bkMsg"), "Creating your account…");
      sb.auth.signUp({ email: $("bkUpEmail").value.trim(), password: $("bkUpPass").value,
        options: { data: { full_name: $("bkUpName").value.trim() }, emailRedirectTo: back } }).then(function (res) {
        busy(f, false);
        if (res.error) return status($("bkMsg"), friendly(res.error), true);
        if (res.data && res.data.user && res.data.user.identities && res.data.user.identities.length === 0) return status($("bkMsg"), friendly({ message: "already registered" }), true);
        if (res.data && res.data.session) { f.reset(); closeModal(); return; }
        $("bkSentTxt").textContent = "We sent a confirmation link to " + $("bkUpEmail").value.trim() + ". Open it, then sign in with your email and password.";
        f.reset(); pane("sent");
      });
    });
    $("bkFgForm").addEventListener("submit", function (e) {
      e.preventDefault(); var f = e.target, email = $("bkFgEmail").value.trim(), pw = $("bkFgPass").value; busy(f, true);
      sb.rpc("reset_password_with_code", { p_email: email, p_code: $("bkFgCode").value.replace(/[^A-Za-z0-9]/g, ""), p_new_password: pw }).then(function (res) {
        if (res.error) { busy(f, false); return status($("bkMsg"), friendly(res.error), true); }
        var r = res.data;
        if (r !== "ok") { busy(f, false); return status($("bkMsg"), r === "locked" ? "Too many wrong tries. Wait 15 minutes, or ask your trainer." : r === "short" ? "Your new password needs at least 8 characters." : "That email and recovery code don't match.", true); }
        // The old code is used up: sign in, and the site issues a fresh one automatically.
        return sb.auth.signInWithPassword({ email: email, password: pw }).then(function (si) {
          busy(f, false); f.reset();
          if (si.error) return status($("bkMsg"), "Password changed. Please sign in.", false), pane("signin");
          status($("bkMsg"), "");
        });
      });
    });
    $("bkRsForm").addEventListener("submit", function (e) {
      e.preventDefault(); var f = e.target; busy(f, true);
      sb.auth.updateUser({ password: $("bkRsPass").value }).then(function (res) {
        busy(f, false);
        if (res.error) return status($("bkMsg"), friendly(res.error), true);
        f.reset(); openModal(); status($("bkMsg"), "Password saved. You're signed in.");
      });
    });
    $("bkJoinForm").addEventListener("submit", function (e) {
      e.preventDefault(); status($("bkMsg"), "Joining…");
      sb.auth.getSession().then(function (s) {
        if (!s.data.session) return status($("bkMsg"), "Your session ended. Please sign in again.", true);
        return sb.rpc("join_pilot", { p_code: $("bkCode").value, p_full_name: profile ? profile.full_name : "" }).then(function (res) {
          if (res.error) return status($("bkMsg"), friendly(res.error), true);
          $("bkCode").value = ""; loadProfile().then(function () { openModal(); status($("bkMsg"), "You've joined " + orgName + "."); });
        });
      });
    });
    $("bkNewCode").addEventListener("click", function () { issueCode(function () { openModal(); }); });
    $("bkOut").addEventListener("click", function () {
      push(); sb.auth.signOut().then(function () { AIW.clearLocal(); location.hash = "home"; location.reload(); });
    });
  }, function (err) {
    acct.hidden = true; // the Supabase library couldn't load (offline); the course still works locally
    if (window.console) console.warn("Supabase library did not load:", err);
  });
})();
