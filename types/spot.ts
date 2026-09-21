export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface Spot {
  id: string;
  name: string;
  address: string;
  category?: string; // vd: "Hẹn hò", "Tụ họp", "Cú đêm" hoặc danh mục tùy chỉnh
  note?: string;
  google_maps_url?: string;
  created_by?: string;
  author_name: string;
  created_at: string;
}
