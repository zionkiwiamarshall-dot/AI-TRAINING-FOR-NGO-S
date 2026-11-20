// Supabase connection for the learning site.
// Paste your values from Supabase: Project Settings -> API.
// The anon (public) key is meant to be in front-end code: the row level security rules in
// supabase/schema.sql decide what each signed-in person can read and write.
// Leave both empty and the site runs as before, saving progress only in the learner's browser.
window.AIW_CONFIG = {
  supabaseUrl: "",      // e.g. "https://abcdefghijkl.supabase.co"
  supabaseAnonKey: ""   // the long "anon public" key
};
