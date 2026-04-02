
-- Allow anon users to INSERT into tables needed for the add-project form
CREATE POLICY "Anon can insert spaces" ON public.project_spaces FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can insert folders" ON public.folders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can insert lists" ON public.lists FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can insert tasks" ON public.tasks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can insert profiles" ON public.profiles FOR INSERT TO anon WITH CHECK (true);
