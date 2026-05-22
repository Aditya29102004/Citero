export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type TableDef<Row> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_people_mentions: TableDef<{
        id: string
        scan_id: string
        brand_id: string
        name: string | null
        role: string | null
        company: string | null
        relevance: string
        snippet: string
        created_at: string
      }>
      ai_scan_results: TableDef<{
        id: string
        brand_id: string
        scan_number: number
        visibility_score: number | null
        citation_share: number | null
        sentiment_positive: number
        sentiment_neutral: number
        sentiment_negative: number
        competitor_scores: Json
        citation_sources: Json
        provider: string | null
        platform: string | null
        total_prompts: number
        total_citations: number
        created_at: string
      }>
      audits: TableDef<{
        id: string
        brand_id: string
        user_id: string
        category: string
        score: number
        issues: Json
        recommendations: Json
        details: Json
        created_at: string
        updated_at: string
      }>
      blogs: TableDef<{
        id: string
        brand_id: string
        user_id: string
        title: string | null
        content: string | null
        status: string
        created_at: string
        updated_at: string
        published_at: string | null
        seo_keywords: string[]
        topic: string | null
        ai_provider: string | null
        word_count: number
        blog_goal: string | null
        tone: string | null
        competitor_focus: string | null
        is_platform_blog: boolean
      }>
      brand_visibility_scores: TableDef<{
        brand_id: string
        calculated_at: string
        id: string
        negative_mentions: number
        neutral_mentions: number
        positive_mentions: number
        scan_id: string | null
        score: number
        total_mentions: number
        user_id: string
      }>
      brands: TableDef<{
        aliases: string | null
        audience: string | null
        ai_provider: string | null
        competitors: Json
        country: string | null
        created_at: string | null
        date_added: string
        description: string | null
        id: string
        industry: string | null
        name: string
        onboarding_completed: boolean
        primary_competitors: Json
        topics: string[]
        updated_at: string | null
        user_id: string
        website_url: string | null
      }>
      competitor_visibility_history: TableDef<{
        id: string
        brand_id: string
        competitor_name: string
        scan_id: string | null
        visibility_score: number
        citation_share: number
        sentiment_weighted_score: number
        mentions: number
        positive_mentions: number
        neutral_mentions: number
        negative_mentions: number
        created_at: string
      }>
      feedback: TableDef<{
        id: string
        feedback_type: string
        message: string
        user_id: string | null
        user_email: string | null
        created_at: string
        status: string
      }>
      founder_notes: TableDef<{
        id: string
        brand_id: string
        user_id: string
        brand_review: string
        action_steps: string
        created_at: string
        updated_at: string
        created_by: string | null
      }>
      mentions: TableDef<{
        ai_summary: string | null
        brand_id: string
        created_at: string | null
        date: string
        id: string
        sentiment: string
        snippet: string | null
        source: string
        title: string
        user_id: string
      }>
      outreach_emails: TableDef<{
        id: string
        target_id: string
        brand_id: string
        user_id: string
        subject: string
        body: string
        status: string
        sent_at: string | null
        created_at: string
        updated_at: string
      }>
      outreach_targets: TableDef<{
        id: string
        brand_id: string
        user_id: string
        source_domain: string
        source_url: string
        article_title: string | null
        person_name: string | null
        person_email: string | null
        person_role: string | null
        company_name: string | null
        priority_score: number
        citation_count: number
        last_mentioned: string | null
        status: string
        created_at: string
        updated_at: string
      }>
      payments: TableDef<{
        id: string
        user_id: string
        subscription_id: string | null
        razorpay_payment_id: string | null
        razorpay_order_id: string | null
        amount: number
        currency: string
        status: string
        plan_type: string
        payment_method: string | null
        metadata: Json | null
        created_at: string
        updated_at: string
      }>
      profiles: TableDef<{
        created_at: string | null
        email: string | null
        id: string
        is_admin: boolean | null
        name: string | null
      }>
      prompt_runs: TableDef<{
        id: string
        prompt_id: string
        brand_id: string
        user_id: string
        model: string
        country: string
        answer_text: string
        brand_mentioned: boolean
        competitors: string[]
        sentiment: string | null
        sources: string[]
        visibility_score: number
        status: string
        error_message: string | null
        created_at: string
      }>
      prompts: TableDef<{
        id: string
        topic: string
        text: string
        created_at: string
        updated_at: string
      }>
      scan_responses: TableDef<{
        ai_response: string
        brand_id: string
        brand_mentioned: boolean
        created_at: string
        id: string
        mentioned_brands: string[] | null
        question_category: string | null
        question_template: string
        question_text: string
        scan_id: string
        sentiment: string | null
        user_id: string
      }>
      scans: TableDef<{
        ai_summary: string | null
        brand_id: string
        completed_at: string | null
        completed_questions: number
        created_at: string
        deep_insight_analysis: Json | null
        id: string
        recommendations: string[] | null
        started_at: string
        status: string
        strengths: string[] | null
        total_questions: number
        user_id: string
        visibility_score: number | null
        weaknesses: string[] | null
      }>
      source_citations: TableDef<{
        id: string
        brand_id: string
        domain: string
        name: string
        first_seen: string
        last_seen: string
        mention_count: number
        sentiment_score: number | null
        geo: string | null
        category: string | null
        created_at: string
        updated_at: string
      }>
      source_citations_history: TableDef<{
        id: string
        brand_id: string
        domain: string
        scan_id: string | null
        daily_mentions: number
        created_at: string
      }>
      subscriptions: TableDef<{
        id: string
        user_id: string
        plan_type: string
        status: string
        razorpay_subscription_id: string | null
        razorpay_order_id: string | null
        subscription_id: string | null
        plan_id: string | null
        current_period_start: string
        current_period_end: string
        amount_paid: number
        currency: string
        is_founder: boolean
        seats_allowed: number
        metadata: Json | null
        created_at: string
        updated_at: string
      }>
      waitlist: TableDef<{
        id: string
        email: string
        plan: string
        comments: string | null
        created_at: string
        updated_at: string
      }>
      demo_submissions: TableDef<{
        id: string
        full_name: string
        work_email: string
        company: string
        company_size: string
        heard_about: string
        is_agency: boolean
        created_at: string
      }>
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
