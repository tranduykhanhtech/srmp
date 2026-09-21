-- ==============================================================================
-- SCHEMA CHO ỨNG DỤNG LƯU ĐỊA ĐIỂM ĂN UỐNG (ANIMON)
-- Domain: animon.io.vn
-- Copy và chạy script này trong Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. BẢNG HỒ SƠ NGƯỜI DÙNG (PROFILES - GOOGLE OAUTH)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger tự động đồng bộ khi user đăng nhập lần đầu bằng Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. BẢNG ĐỊA ĐIỂM ĂN UỐNG (SPOTS)
CREATE TABLE IF NOT EXISTS public.spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Ẩn danh',
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  category TEXT DEFAULT 'Tụ họp',
  note TEXT DEFAULT '',
  google_maps_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;

-- Ai cũng có thể xem danh sách quán
CREATE POLICY "Spots are viewable by everyone" 
  ON public.spots FOR SELECT USING (true);

-- Chỉ user đã đăng nhập mới được tạo quán và gán đúng ID của mình
CREATE POLICY "Authenticated users can create spots" 
  ON public.spots FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated' AND (created_by IS NULL OR auth.uid() = created_by));

-- Chỉ chủ bài viết mới được sửa quán của mình
CREATE POLICY "Users can update their own spots" 
  ON public.spots FOR UPDATE 
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Chỉ chủ bài viết mới được xóa quán của mình
CREATE POLICY "Users can delete their own spots" 
  ON public.spots FOR DELETE 
  USING (auth.uid() = created_by);


-- 3. BẢNG LƯU QUÁN YÊU THÍCH (BOOKMARKS)
CREATE TABLE IF NOT EXISTS public.bookmarks (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  spot_id UUID REFERENCES public.spots(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (user_id, spot_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- User xem danh sách quán đã lưu của chính mình
CREATE POLICY "Users can view their own bookmarks" 
  ON public.bookmarks FOR SELECT 
  USING (auth.uid() = user_id);

-- User lưu quán cho chính mình
CREATE POLICY "Users can insert their own bookmarks" 
  ON public.bookmarks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- User bỏ lưu quán của chính mình
CREATE POLICY "Users can delete their own bookmarks" 
  ON public.bookmarks FOR DELETE 
  USING (auth.uid() = user_id);

