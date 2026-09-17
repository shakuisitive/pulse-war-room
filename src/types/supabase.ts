export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      action_items: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          description: string
          due_at: string | null
          id: string
          incident_id: string
          org_id: string
          post_mortem_id: string
          status: Database["public"]["Enums"]["action_item_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          due_at?: string | null
          id?: string
          incident_id: string
          org_id: string
          post_mortem_id: string
          status?: Database["public"]["Enums"]["action_item_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          due_at?: string | null
          id?: string
          incident_id?: string
          org_id?: string
          post_mortem_id?: string
          status?: Database["public"]["Enums"]["action_item_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_items_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["commander_profile_id"]
          },
          {
            foreignKeyName: "action_items_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "analytics_base_view"
            referencedColumns: ["incident_id"]
          },
          {
            foreignKeyName: "action_items_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_post_mortem_id_fkey"
            columns: ["post_mortem_id"]
            isOneToOne: false
            referencedRelation: "post_mortems"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          org_id: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          incident_id: string
          is_stakeholder_visible: boolean
          org_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          incident_id: string
          is_stakeholder_visible?: boolean
          org_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          incident_id?: string
          is_stakeholder_visible?: boolean
          org_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "analytics_base_view"
            referencedColumns: ["incident_id"]
          },
          {
            foreignKeyName: "chat_messages_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["commander_profile_id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_policies: {
        Row: {
          acknowledge_threshold_minutes: number
          created_at: string
          escalation_action: Json
          id: string
          org_id: string
          resolve_threshold_minutes: number
          severity: Database["public"]["Enums"]["severity_level"]
          updated_at: string
        }
        Insert: {
          acknowledge_threshold_minutes: number
          created_at?: string
          escalation_action?: Json
          id?: string
          org_id: string
          resolve_threshold_minutes: number
          severity: Database["public"]["Enums"]["severity_level"]
          updated_at?: string
        }
        Update: {
          acknowledge_threshold_minutes?: number
          created_at?: string
          escalation_action?: Json
          id?: string
          org_id?: string
          resolve_threshold_minutes?: number
          severity?: Database["public"]["Enums"]["severity_level"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          caption: string | null
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          incident_id: string
          is_stakeholder_visible: boolean
          org_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          incident_id: string
          is_stakeholder_visible?: boolean
          org_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          incident_id?: string
          is_stakeholder_visible?: boolean
          org_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "analytics_base_view"
            referencedColumns: ["incident_id"]
          },
          {
            foreignKeyName: "evidence_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["commander_profile_id"]
          },
          {
            foreignKeyName: "evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_participants: {
        Row: {
          incident_id: string
          incident_role: Database["public"]["Enums"]["incident_role"]
          is_active: boolean
          joined_at: string
          left_at: string | null
          org_id: string
          user_id: string
        }
        Insert: {
          incident_id: string
          incident_role: Database["public"]["Enums"]["incident_role"]
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          org_id: string
          user_id: string
        }
        Update: {
          incident_id?: string
          incident_role?: Database["public"]["Enums"]["incident_role"]
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_participants_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "analytics_base_view"
            referencedColumns: ["incident_id"]
          },
          {
            foreignKeyName: "incident_participants_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_participants_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_participants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["commander_profile_id"]
          },
          {
            foreignKeyName: "incident_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          acknowledged_at: string | null
          commander_id: string | null
          created_at: string
          declared_at: string
          declared_by: string | null
          description: string
          embedding: string | null
          id: string
          metadata: Json
          org_id: string
          resolved_at: string | null
          search_vector: unknown
          severity: Database["public"]["Enums"]["severity_level"]
          status: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          commander_id?: string | null
          created_at?: string
          declared_at?: string
          declared_by?: string | null
          description?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          org_id: string
          resolved_at?: string | null
          search_vector?: unknown
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          commander_id?: string | null
          created_at?: string
          declared_at?: string
          declared_by?: string | null
          description?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          resolved_at?: string | null
          search_vector?: unknown
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_commander_id_fkey"
            columns: ["commander_id"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["commander_profile_id"]
          },
          {
            foreignKeyName: "incidents_commander_id_fkey"
            columns: ["commander_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_declared_by_fkey"
            columns: ["declared_by"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["commander_profile_id"]
          },
          {
            foreignKeyName: "incidents_declared_by_fkey"
            columns: ["declared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          incident_id: string | null
          is_read: boolean
          notification_type: Database["public"]["Enums"]["notification_type"]
          org_id: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          incident_id?: string | null
          is_read?: boolean
          notification_type: Database["public"]["Enums"]["notification_type"]
          org_id: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          incident_id?: string | null
          is_read?: boolean
          notification_type?: Database["public"]["Enums"]["notification_type"]
          org_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "analytics_base_view"
            referencedColumns: ["incident_id"]
          },
          {
            foreignKeyName: "notifications_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["commander_profile_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      on_call_rotations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          org_id: string
          rotation_type: Database["public"]["Enums"]["rotation_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          rotation_type?: Database["public"]["Enums"]["rotation_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          rotation_type?: Database["public"]["Enums"]["rotation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "on_call_rotations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      on_call_slots: {
        Row: {
          created_at: string
          day_of_week: number | null
          end_time: string
          id: string
          org_id: string
          rotation_id: string
          start_time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          end_time: string
          id?: string
          org_id: string
          rotation_id: string
          start_time: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          end_time?: string
          id?: string
          org_id?: string
          rotation_id?: string
          start_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "on_call_slots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "on_call_slots_rotation_id_fkey"
            columns: ["rotation_id"]
            isOneToOne: false
            referencedRelation: "on_call_rotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "on_call_slots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["commander_profile_id"]
          },
          {
            foreignKeyName: "on_call_slots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_mortems: {
        Row: {
          authored_by: string | null
          contributing_factors: string
          created_at: string
          id: string
          incident_id: string
          is_published: boolean
          is_stakeholder_visible: boolean
          lessons_learned: string
          org_id: string
          published_at: string | null
          root_cause: string
          summary: string
          timeline_narrative: string
          updated_at: string
        }
        Insert: {
          authored_by?: string | null
          contributing_factors?: string
          created_at?: string
          id?: string
          incident_id: string
          is_published?: boolean
          is_stakeholder_visible?: boolean
          lessons_learned?: string
          org_id: string
          published_at?: string | null
          root_cause?: string
          summary?: string
          timeline_narrative?: string
          updated_at?: string
        }
        Update: {
          authored_by?: string | null
          contributing_factors?: string
          created_at?: string
          id?: string
          incident_id?: string
          is_published?: boolean
          is_stakeholder_visible?: boolean
          lessons_learned?: string
          org_id?: string
          published_at?: string | null
          root_cause?: string
          summary?: string
          timeline_narrative?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_mortems_authored_by_fkey"
            columns: ["authored_by"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["commander_profile_id"]
          },
          {
            foreignKeyName: "post_mortems_authored_by_fkey"
            columns: ["authored_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_mortems_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: true
            referencedRelation: "analytics_base_view"
            referencedColumns: ["incident_id"]
          },
          {
            foreignKeyName: "post_mortems_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: true
            referencedRelation: "incident_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_mortems_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: true
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_mortems_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          notification_preferences: Json
          org_id: string
          org_role: Database["public"]["Enums"]["org_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          is_active?: boolean
          notification_preferences?: Json
          org_id: string
          org_role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          notification_preferences?: Json
          org_id?: string
          org_role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string
          due_at: string | null
          id: string
          incident_id: string
          org_id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_at?: string | null
          id?: string
          incident_id: string
          org_id: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_at?: string | null
          id?: string
          incident_id?: string
          org_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["commander_profile_id"]
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["commander_profile_id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "analytics_base_view"
            referencedColumns: ["incident_id"]
          },
          {
            foreignKeyName: "tasks_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_entries: {
        Row: {
          actor_id: string | null
          content: string
          created_at: string
          entry_type: Database["public"]["Enums"]["timeline_entry_type"]
          id: string
          incident_id: string
          is_stakeholder_visible: boolean
          metadata: Json
          org_id: string
        }
        Insert: {
          actor_id?: string | null
          content?: string
          created_at?: string
          entry_type: Database["public"]["Enums"]["timeline_entry_type"]
          id?: string
          incident_id: string
          is_stakeholder_visible?: boolean
          metadata?: Json
          org_id: string
        }
        Update: {
          actor_id?: string | null
          content?: string
          created_at?: string
          entry_type?: Database["public"]["Enums"]["timeline_entry_type"]
          id?: string
          incident_id?: string
          is_stakeholder_visible?: boolean
          metadata?: Json
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_entries_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["commander_profile_id"]
          },
          {
            foreignKeyName: "timeline_entries_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_entries_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "analytics_base_view"
            referencedColumns: ["incident_id"]
          },
          {
            foreignKeyName: "timeline_entries_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_entries_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_integrations: {
        Row: {
          created_at: string
          default_severity: Database["public"]["Enums"]["severity_level"]
          endpoint_slug: string
          id: string
          is_active: boolean
          name: string
          org_id: string
          payload_mapping: Json
          signing_secret: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_severity?: Database["public"]["Enums"]["severity_level"]
          endpoint_slug: string
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          payload_mapping?: Json
          signing_secret: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_severity?: Database["public"]["Enums"]["severity_level"]
          endpoint_slug?: string
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          payload_mapping?: Json
          signing_secret?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      analytics_base_view: {
        Row: {
          acknowledged_at: string | null
          commander_id: string | null
          commander_name: string | null
          declared_at: string | null
          incident_id: string | null
          minutes_to_acknowledge: number | null
          minutes_to_resolve: number | null
          org_id: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["severity_level"] | null
          status: Database["public"]["Enums"]["incident_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_commander_id_fkey"
            columns: ["commander_id"]
            isOneToOne: false
            referencedRelation: "incident_summary_view"
            referencedColumns: ["commander_profile_id"]
          },
          {
            foreignKeyName: "incidents_commander_id_fkey"
            columns: ["commander_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_summary_view: {
        Row: {
          acknowledged_at: string | null
          commander_avatar_url: string | null
          commander_name: string | null
          commander_profile_id: string | null
          completed_task_count: number | null
          created_at: string | null
          declared_at: string | null
          description: string | null
          id: string | null
          open_task_count: number | null
          org_id: string | null
          participant_count: number | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["severity_level"] | null
          status: Database["public"]["Enums"]["incident_status"] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_manage_tasks: { Args: { p_incident_id: string }; Returns: boolean }
      can_post_chat: { Args: { p_incident_id: string }; Returns: boolean }
      can_read_full_war_room: {
        Args: { p_incident_id: string }
        Returns: boolean
      }
      can_write_incident_core: {
        Args: { p_incident_id: string }
        Returns: boolean
      }
      check_sla_breaches: { Args: never; Returns: number }
      claim_embedding_jobs: {
        Args: { p_batch_size?: number }
        Returns: {
          incident_id: string
          msg_id: number
          org_id: string
        }[]
      }
      complete_embedding_job: { Args: { p_msg_id: number }; Returns: undefined }
      create_organization_with_owner: {
        Args: { org_name: string; org_slug: string; owner_display_name: string }
        Returns: string
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      enqueue_incident_notifications: {
        Args: {
          p_body?: string
          p_incident_id: string
          p_notification_type: Database["public"]["Enums"]["notification_type"]
          p_title: string
        }
        Returns: undefined
      }
      enqueue_notification_job: { Args: { p_payload: Json }; Returns: number }
      get_incident_role: {
        Args: { p_incident_id: string }
        Returns: Database["public"]["Enums"]["incident_role"]
      }
      get_org_analytics: {
        Args: {
          p_end?: string
          p_severity?: Database["public"]["Enums"]["severity_level"]
          p_start?: string
        }
        Returns: Json
      }
      get_similar_incidents: {
        Args: { p_incident_id: string; p_limit?: number }
        Returns: {
          id: string
          severity: Database["public"]["Enums"]["severity_level"]
          similarity: number
          status: Database["public"]["Enums"]["incident_status"]
          title: string
        }[]
      }
      is_incident_commander: {
        Args: { p_incident_id: string }
        Returns: boolean
      }
      is_incident_participant: {
        Args: { p_incident_id: string }
        Returns: boolean
      }
      is_incident_stakeholder: {
        Args: { p_incident_id: string }
        Returns: boolean
      }
      is_org_admin: { Args: never; Returns: boolean }
      is_stakeholder_only_user: { Args: never; Returns: boolean }
      jwt_org_id: { Args: never; Returns: string }
      jwt_org_role: {
        Args: never
        Returns: Database["public"]["Enums"]["org_role"]
      }
      process_notification_jobs: {
        Args: { p_batch_size?: number }
        Returns: number
      }
      resolve_current_on_call: { Args: { p_org_id: string }; Returns: string }
      search_incidents_by_embedding: {
        Args: { p_embedding: string; p_limit?: number }
        Returns: {
          id: string
          severity: Database["public"]["Enums"]["severity_level"]
          similarity: number
          status: Database["public"]["Enums"]["incident_status"]
          title: string
        }[]
      }
      search_incidents_keyword: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          acknowledged_at: string | null
          commander_avatar_url: string | null
          commander_name: string | null
          commander_profile_id: string | null
          completed_task_count: number | null
          created_at: string | null
          declared_at: string | null
          description: string | null
          id: string | null
          open_task_count: number | null
          org_id: string | null
          participant_count: number | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["severity_level"] | null
          status: Database["public"]["Enums"]["incident_status"] | null
          title: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "incident_summary_view"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      action_item_status: "open" | "in_progress" | "completed"
      incident_role: "commander" | "responder" | "observer" | "stakeholder"
      incident_status:
        | "declared"
        | "investigating"
        | "identified"
        | "monitoring"
        | "resolved"
      notification_type:
        | "incident_assigned"
        | "task_assigned"
        | "mentioned"
        | "sla_warning"
        | "escalation"
        | "postmortem_published"
      org_role: "owner" | "admin" | "member"
      rotation_type: "weekly" | "daily" | "custom"
      severity_level: "sev1" | "sev2" | "sev3" | "sev4"
      task_status: "pending" | "in_progress" | "completed"
      timeline_entry_type:
        | "incident_declared"
        | "severity_changed"
        | "status_changed"
        | "participant_joined"
        | "participant_left"
        | "task_created"
        | "task_completed"
        | "evidence_uploaded"
        | "commander_reassigned"
        | "escalation_triggered"
        | "ai_summary_generated"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      action_item_status: ["open", "in_progress", "completed"],
      incident_role: ["commander", "responder", "observer", "stakeholder"],
      incident_status: [
        "declared",
        "investigating",
        "identified",
        "monitoring",
        "resolved",
      ],
      notification_type: [
        "incident_assigned",
        "task_assigned",
        "mentioned",
        "sla_warning",
        "escalation",
        "postmortem_published",
      ],
      org_role: ["owner", "admin", "member"],
      rotation_type: ["weekly", "daily", "custom"],
      severity_level: ["sev1", "sev2", "sev3", "sev4"],
      task_status: ["pending", "in_progress", "completed"],
      timeline_entry_type: [
        "incident_declared",
        "severity_changed",
        "status_changed",
        "participant_joined",
        "participant_left",
        "task_created",
        "task_completed",
        "evidence_uploaded",
        "commander_reassigned",
        "escalation_triggered",
        "ai_summary_generated",
      ],
    },
  },
} as const
