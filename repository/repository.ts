import { supabase } from "../config/supabase.js";

export class DBRepository {
  protected get client() {
    return supabase;
  }
}
