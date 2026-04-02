
-- Allow anon (unauthenticated) users to read key tables so seed data is visible without login

CREATE POLICY "Anon can view spaces" ON public.project_spaces FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view folders" ON public.folders FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view lists" ON public.lists FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view tasks" ON public.tasks FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view channels" ON public.channels FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view messages" ON public.messages FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view profiles" ON public.profiles FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view invoices" ON public.invoices FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view time_logs" ON public.time_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view payrolls" ON public.payrolls FOR SELECT TO anon USING (true);
