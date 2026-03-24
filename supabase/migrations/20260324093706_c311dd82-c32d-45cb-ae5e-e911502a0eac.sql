
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.organizations(id),
  title text NOT NULL DEFAULT 'New Chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  confirmation_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can view chat_conversations" ON public.chat_conversations FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert chat_conversations" ON public.chat_conversations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update chat_conversations" ON public.chat_conversations FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete chat_conversations" ON public.chat_conversations FOR DELETE TO anon USING (true);
CREATE POLICY "Auth can view chat_conversations" ON public.chat_conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert chat_conversations" ON public.chat_conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can update chat_conversations" ON public.chat_conversations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth can delete chat_conversations" ON public.chat_conversations FOR DELETE TO authenticated USING (true);

CREATE POLICY "Anon can view chat_messages" ON public.chat_messages FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert chat_messages" ON public.chat_messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Auth can view chat_messages" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can insert chat_messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at);
CREATE INDEX idx_chat_conversations_updated ON public.chat_conversations(updated_at DESC);
