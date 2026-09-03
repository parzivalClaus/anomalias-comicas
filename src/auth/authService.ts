import { supabase } from '../lib/supabase';

export async function signInWithGoogle() {
  if (!supabase) return;

  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
}

export async function signOut() {
  if (!supabase) return;

  await supabase.auth.signOut();
}
