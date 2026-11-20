// Supabase connection for the learning site.
// Paste your values from Supabase: Project Settings -> API.
// The anon (public) key is meant to be in front-end code: the row level security rules in
// supabase/schema.sql decide what each signed-in person can read and write.
// Leave both empty and the site runs as before, saving progress only in the learner's browser.
window.AIW_CONFIG = {
  supabaseUrl: "https://hgcdaprvhptodfmugxah.supabase.co",
  supabaseAnonKey: "sb_publishable_dM6q5dGEY5Fh4uWi-A5VTA__yv6YVd7"   // publishable (public) key
};
