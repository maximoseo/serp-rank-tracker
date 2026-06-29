export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          domain: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          domain: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          domain?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      keywords: {
        Row: {
          id: string;
          project_id: string;
          keyword: string;
          location_code: number;
          language_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          keyword: string;
          location_code?: number;
          language_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          keyword?: string;
          location_code?: number;
          language_code?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "keywords_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      rankings: {
        Row: {
          id: string;
          keyword_id: string;
          rank_absolute: number | null;
          url: string | null;
          search_volume: number | null;
          checked_at: string;
        };
        Insert: {
          id?: string;
          keyword_id: string;
          rank_absolute?: number | null;
          url?: string | null;
          search_volume?: number | null;
          checked_at?: string;
        };
        Update: {
          id?: string;
          keyword_id?: string;
          rank_absolute?: number | null;
          url?: string | null;
          search_volume?: number | null;
          checked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rankings_keyword_id_fkey";
            columns: ["keyword_id"];
            isOneToOne: false;
            referencedRelation: "keywords";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
