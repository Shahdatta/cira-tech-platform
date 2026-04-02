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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      attendances: {
        Row: {
          check_in: string | null
          check_out: string | null
          id: string
          total_hours: number | null
          user_id: string
          work_date: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          id?: string
          total_hours?: number | null
          user_id: string
          work_date: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          id?: string
          total_hours?: number | null
          user_id?: string
          work_date?: string
        }
        Relationships: []
      }
      channels: {
        Row: {
          created_at: string
          id: string
          is_private: boolean | null
          name: string
          space_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_private?: boolean | null
          name: string
          space_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_private?: boolean | null
          name?: string
          space_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channels_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "project_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          space_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          space_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "project_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          description: string | null
          id: string
          invoice_id: string
          line_total: number | null
          quantity_hours: number | null
          time_log_id: string | null
          unit_price: number | null
        }
        Insert: {
          description?: string | null
          id?: string
          invoice_id: string
          line_total?: number | null
          quantity_hours?: number | null
          time_log_id?: string | null
          unit_price?: number | null
        }
        Update: {
          description?: string | null
          id?: string
          invoice_id?: string
          line_total?: number | null
          quantity_hours?: number | null
          time_log_id?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_time_log_id_fkey"
            columns: ["time_log_id"]
            isOneToOne: false
            referencedRelation: "time_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          status: Database["public"]["Enums"]["invoice_status"] | null
          sub_total: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          status?: Database["public"]["Enums"]["invoice_status"] | null
          sub_total?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          status?: Database["public"]["Enums"]["invoice_status"] | null
          sub_total?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lists: {
        Row: {
          created_at: string
          folder_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          folder_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          folder_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      payrolls: {
        Row: {
          base_salary: number | null
          created_at: string
          id: string
          overtime_hours: number | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["payroll_status"] | null
          total_amount: number | null
          total_hours: number | null
          user_id: string
        }
        Insert: {
          base_salary?: number | null
          created_at?: string
          id?: string
          overtime_hours?: number | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["payroll_status"] | null
          total_amount?: number | null
          total_hours?: number | null
          user_id: string
        }
        Update: {
          base_salary?: number | null
          created_at?: string
          id?: string
          overtime_hours?: number | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["payroll_status"] | null
          total_amount?: number | null
          total_hours?: number | null
          user_id?: string
        }
        Relationships: []
      }
      performance_appraisals: {
        Row: {
          avg_turnaround_time: number | null
          bug_rate: number | null
          created_at: string
          evaluator_id: string | null
          hr_comments: string | null
          id: string
          overall_score: number | null
          user_id: string
        }
        Insert: {
          avg_turnaround_time?: number | null
          bug_rate?: number | null
          created_at?: string
          evaluator_id?: string | null
          hr_comments?: string | null
          id?: string
          overall_score?: number | null
          user_id: string
        }
        Update: {
          avg_turnaround_time?: number | null
          bug_rate?: number | null
          created_at?: string
          evaluator_id?: string | null
          hr_comments?: string | null
          id?: string
          overall_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          contract_type: Database["public"]["Enums"]["contract_type"] | null
          created_at: string
          email: string
          full_name: string
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_type?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string
          email: string
          full_name: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_type?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string
          email?: string
          full_name?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_spaces: {
        Row: {
          client_organization: string | null
          created_at: string
          description: string | null
          id: string
          manager_id: string | null
          name: string
          status: string | null
          total_budget: number | null
          updated_at: string
        }
        Insert: {
          client_organization?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          status?: string | null
          total_budget?: number | null
          updated_at?: string
        }
        Update: {
          client_organization?: string | null
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          status?: string | null
          total_budget?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          list_id: string
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          list_id: string
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          list_id?: string
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          created_at: string
          duration_hours: number | null
          end_time: string | null
          id: string
          is_billable: boolean | null
          is_manual_entry: boolean | null
          reason_manual: string | null
          start_time: string
          status: Database["public"]["Enums"]["time_log_status"] | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_hours?: number | null
          end_time?: string | null
          id?: string
          is_billable?: boolean | null
          is_manual_entry?: boolean | null
          reason_manual?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["time_log_status"] | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_hours?: number | null
          end_time?: string | null
          id?: string
          is_billable?: boolean | null
          is_manual_entry?: boolean | null
          reason_manual?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["time_log_status"] | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "pm" | "hr" | "member" | "guest"
      contract_type: "ft" | "pt" | "fl"
      invoice_status: "draft" | "sent" | "paid"
      payroll_status: "draft" | "approved" | "paid"
      task_status: "todo" | "in_progress" | "in_review" | "done"
      time_log_status: "unbilled" | "billed"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "pm", "hr", "member", "guest"],
      contract_type: ["ft", "pt", "fl"],
      invoice_status: ["draft", "sent", "paid"],
      payroll_status: ["draft", "approved", "paid"],
      task_status: ["todo", "in_progress", "in_review", "done"],
      time_log_status: ["unbilled", "billed"],
    },
  },
} as const
