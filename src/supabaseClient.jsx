// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://khznjlbaqfoualuaxtqm.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtoem5qbGJhcWZvdWFsdWF4dHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5NDgxMzYsImV4cCI6MjA1OTUyNDEzNn0.hh7lr638aWPr4WQICG88mVyResWoR_TG7rXwjVfu7Ls";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
