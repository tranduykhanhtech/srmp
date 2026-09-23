-- ==============================================================================
-- SEED DATA BAN ĐẦU CHO ANIMON (animon.io.vn)
-- Chạy script này trong Supabase Dashboard -> SQL Editor để nạp 15 quán chuẩn gu
-- ==============================================================================

-- 1. Đảm bảo bảng spots đã có đầy đủ cột latitude & longitude
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2. Chèn 15 quán ăn & cafe chuẩn gu giới trẻ với tọa độ thực tế
INSERT INTO public.spots (
  id, 
  name, 
  address, 
  category, 
  note, 
  google_maps_url, 
  latitude, 
  longitude, 
  author_name, 
  created_at
) VALUES
(
  '11111111-1111-4111-8111-111111111101',
  'The Workshop Coffee',
  '27 Ngô Đức Kế, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  'Chạy deadline',
  'Quán specialty coffee đầu tiên ở Sài Gòn. Bàn làm việc to dài, nhiều ổ cắm, gọi Cold Brew Cam sả bao tỉnh táo.',
  'https://maps.google.com/?q=10.7735,106.7042',
  10.7735,
  106.7042,
  'nguyen_dev',
  NOW() - INTERVAL '4 days'
),
(
  '11111111-1111-4111-8111-111111111102',
  'Cà Phê Vợt Ba Lù (Chợ Thiếc)',
  '193 Phùng Hưng, Phường 14, Quận 5, TP. Hồ Chí Minh',
  'Cú đêm',
  'Cafe vợt rang bơ bằng củi hơn 70 năm tuổi người Hoa. Đi tầm 5h sáng hoặc đêm muộn hít mùi cafe thơm nức mũi.',
  'https://maps.google.com/?q=10.7538,106.6575',
  10.7538,
  106.6575,
  'sai_gon_xua',
  NOW() - INTERVAL '4 days'
),
(
  '11111111-1111-4111-8111-111111111103',
  'Bánh Mì Huỳnh Hoa',
  '26 Lê Thị Riêng, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
  'Ăn vặt',
  'Ổ bánh mì "ô tô" đẫm thịt chả và pate béo ngậy. Một ổ 2 người ăn mới hết, nhớ dặn xin thêm đồ chua ăn đỡ ngấy.',
  'https://maps.google.com/?q=10.7711,106.6924',
  10.7711,
  106.6924,
  'foodie_viet',
  NOW() - INTERVAL '3 days'
),
(
  '11111111-1111-4111-8111-111111111104',
  'Là Việt Coffee Saigon',
  '191 Hai Bà Trưng, Phường 6, Quận 3, TP. Hồ Chí Minh',
  'Cafe chill',
  'Không gian phong cách industrial tối giản, hạt Arabica Cầu Đất thơm nồng. Drip V60 và Cascara tea cực đỉnh.',
  'https://maps.google.com/?q=10.7842,106.6961',
  10.7842,
  106.6961,
  'tranduykhanh',
  NOW() - INTERVAL '3 days'
),
(
  '11111111-1111-4111-8111-111111111105',
  'Ốc Đào Nguyễn Trãi',
  'Hẻm 212B Nguyễn Trãi, Phường Nguyễn Cư Trinh, Quận 1, TP. Hồ Chí Minh',
  'Tụ họp',
  'Ốc hương xào bơ tỏi chấm bánh mì nóng hổi, răng mực xào bơ cay xé lưỡi. Đi nhóm 4 người ăn no nê.',
  'https://maps.google.com/?q=10.7634,106.6872',
  10.7634,
  106.6872,
  'team_me_oc',
  NOW() - INTERVAL '3 days'
),
(
  '11111111-1111-4111-8111-111111111106',
  'Bơ By Butterman',
  '218 Nguyễn Đình Chiểu, Phường 6, Quận 3, TP. Hồ Chí Minh',
  'Ăn vặt',
  'Thiên đường cookie choco chip dẻo quánh và marshmallow nướng. Quán nhỏ xinh thơm nức mùi bơ bánh.',
  'https://maps.google.com/?q=10.7794,106.6912',
  10.7794,
  106.6912,
  'sweet_tooth',
  NOW() - INTERVAL '2 days'
),
(
  '11111111-1111-4111-8111-111111111107',
  'Okkio Caffe Tự Do',
  '151 Đồng Khởi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  'Hẹn hò',
  'Nằm nép mình trên lầu chung cư cũ nhìn thẳng Nhà Hát Thành Phố. Tone gạch nung ấm cúng, nhạc Jazz lãng mạn.',
  'https://maps.google.com/?q=10.7766,106.7032',
  10.7766,
  106.7032,
  'chill_with_me',
  NOW() - INTERVAL '2 days'
),
(
  '11111111-1111-4111-8111-111111111108',
  'Phở Hòa Pasteur',
  '260C Pasteur, Phường 8, Quận 3, TP. Hồ Chí Minh',
  'Tụ họp',
  'Tô phở tái nạm gầu thơm mùi quế hồi truyền thống, quẩy giòn rụm. Nhớ ăn kèm chén tiết trứng béo ngậy.',
  'https://maps.google.com/?q=10.7892,106.6891',
  10.7892,
  106.6891,
  'pho_lover',
  NOW() - INTERVAL '2 days'
),
(
  '11111111-1111-4111-8111-111111111109',
  'Maison Marou Flagship',
  '167-169 Calmette, Phường Nguyễn Thái Bình, Quận 1, TP. Hồ Chí Minh',
  'Hẹn hò',
  'Chocolate nguyên chất Việt Nam đẳng cấp thế giới. Thử món socola nóng Signature và bánh Tart chanh socola.',
  'https://maps.google.com/?q=10.7699,106.6989',
  10.7699,
  106.6989,
  'chocoholic',
  NOW() - INTERVAL '1 day'
),
(
  '11111111-1111-4111-8111-111111111110',
  'Trà Sữa Bố Già (Mở Muộn)',
  '251 Đề Thám, Phường Phạm Ngũ Lão, Quận 1, TP. Hồ Chí Minh',
  'Cú đêm',
  'Trà sữa truyền thống béo đậm vị trà, mở đến tận 2h sáng. Chỗ ngồi vỉa hè ngắm phố Tây Bùi Viện về đêm.',
  'https://maps.google.com/?q=10.7671,106.6938',
  10.7671,
  106.6938,
  'cu_dem_sg',
  NOW() - INTERVAL '1 day'
),
(
  '11111111-1111-4111-8111-111111111111',
  'Cơm Tấm Ba Ghiền',
  '84 Đặng Văn Ngữ, Phường 10, Quận Phú Nhuận, TP. Hồ Chí Minh',
  'Tụ họp',
  'Miếng sườn nướng than to che kín cả đĩa cơm, ướp đậm đà mềm mọng. Gọi thêm chén mỡ hành tóp mỡ giòn rụm.',
  'https://maps.google.com/?q=10.7938,106.6713',
  10.7938,
  106.6713,
  'khanh_duy',
  NOW() - INTERVAL '1 day'
),
(
  '11111111-1111-4111-8111-111111111112',
  'Rang Rang Coffee',
  '1 Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  'Chạy deadline',
  'Không gian tối giản phong cách Bắc Âu chuẩn xịn. Bàn làm việc riêng tư, ánh sáng dịu mắt, Espresso tonic rất fresh.',
  'https://maps.google.com/?q=10.7745,106.7058',
  10.7745,
  106.7058,
  'animon',
  NOW() - INTERVAL '12 hours'
),
(
  '11111111-1111-4111-8111-111111111113',
  'Hủ Tiếu Nam Vang Nhân Quán',
  '122 Nguyễn Thị Nhỏ, Phường 15, Quận 11, TP. Hồ Chí Minh',
  'Cú đêm',
  'Hủ tiếu khô trộn sốt chua ngọt gia truyền cực dính, tôm tươi giòn sần sật, nước súp ngọt thanh từ xương ống.',
  'https://maps.google.com/?q=10.7658,106.6543',
  10.7658,
  106.6543,
  'sai_gon_dem',
  NOW() - INTERVAL '8 hours'
),
(
  '11111111-1111-4111-8111-111111111114',
  'S\'mores Saigon Caffe',
  '1A Phan Tôn, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
  'Cafe chill',
  'Tone gạch mộc và cây xanh mát rượi giữa lòng quận 1. Rất nhiều góc sống ảo vintage hoài niệm, trà trái cây thanh mát.',
  'https://maps.google.com/?q=10.7905,106.6975',
  10.7905,
  106.6975,
  'vintage_vibes',
  NOW() - INTERVAL '4 hours'
),
(
  '11111111-1111-4111-8111-111111111115',
  'Bánh Tráng Nướng Cao Thắng',
  '53 Cao Thắng, Phường 3, Quận 3, TP. Hồ Chí Minh',
  'Ăn vặt',
  '"Pizza Việt Nam" nướng than hoa giòn rụm với trứng cút, tép khô, bò khô và sốt mayonnaise béo ngậy. Ăn nóng tại chỗ siêu ngon.',
  'https://maps.google.com/?q=10.7712,106.6834',
  10.7712,
  106.6834,
  'an_vat_sai_thanh',
  NOW() - INTERVAL '2 hours'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  category = EXCLUDED.category,
  note = EXCLUDED.note,
  google_maps_url = EXCLUDED.google_maps_url,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  author_name = EXCLUDED.author_name;
