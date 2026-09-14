-- Aplicación única sobre el proyecto existente, después de revisar el inventario.
-- Conserva las categorías actuales, precios, stock y pedidos.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, name),
  unique (id, category_id)
);

alter table public.products
  add column subcategory_id uuid,
  add constraint products_subcategory_requires_category
    check (subcategory_id is null or category_id is not null),
  add constraint products_subcategory_category_fkey
    foreign key (subcategory_id, category_id)
    references public.subcategories(id, category_id);

create index products_subcategory_category_idx on public.products (subcategory_id, category_id);
alter table public.subcategories enable row level security;
create policy "subcategories are publicly readable" on public.subcategories
  for select to anon, authenticated using (true);
revoke all on public.subcategories from public, anon, authenticated;
grant select on public.subcategories to anon, authenticated;
grant all on public.subcategories to service_role;

insert into public.subcategories (category_id, name, sort_order)
select c.id, v.name, v.sort_order
from (values
  ('Abarrotes', 'Harinas y mezclas', 1),
  ('Abarrotes', 'Arroz y pastas', 2),
  ('Abarrotes', 'Conservas', 3),
  ('Abarrotes', 'Salsas y aderezos', 4),
  ('Abarrotes', 'Margarinas', 5),
  ('Abarrotes', 'Quesos untables', 6),
  ('Bebidas', 'Refrescos', 7),
  ('Bebidas', 'Jugos y néctares', 8),
  ('Bebidas', 'Maltas', 9),
  ('Bebidas', 'Té frío', 10),
  ('Bebidas', 'Hidratantes', 11),
  ('Bebidas', 'Energéticas', 12),
  ('Bebidas', 'Sodas y mezcladores', 13),
  ('Bebidas', 'Cervezas', 14),
  ('Bebidas', 'Sangrías', 15),
  ('Lácteos', 'Yogures', 16),
  ('Limpieza', 'Lavado de ropa', 17),
  ('Limpieza', 'Suavizantes', 18),
  ('Limpieza', 'Lavaplatos', 19),
  ('Limpieza', 'Limpiadores multiuso', 20),
  ('Cuidado Personal', 'Cuidado del cabello', 21),
  ('Cuidado Personal', 'Higiene femenina', 22)
) as v(category_name, name, sort_order)
join public.categories c on c.name = v.category_name;

with assignments(product_id, category_name, subcategory_name) as (values
  ('5e95ca0a-0617-469e-bb34-91b73cf1793f'::uuid, 'Abarrotes', 'Harinas y mezclas'),
  ('dc2af66a-5b8e-42a4-86cb-f3f8b7cd31fe'::uuid, 'Abarrotes', 'Harinas y mezclas'),
  ('d499d5a6-f809-4fec-b343-4b7d307725c2'::uuid, 'Abarrotes', 'Harinas y mezclas'),
  ('f141f21c-51e9-4298-a80b-1468bb4f8d23'::uuid, 'Abarrotes', 'Arroz y pastas'),
  ('4068273a-2e3b-4bdf-8fb0-237d1d5df7c0'::uuid, 'Abarrotes', 'Arroz y pastas'),
  ('522a57d1-fcac-4a2c-8d29-af9eb3e337d4'::uuid, 'Abarrotes', 'Arroz y pastas'),
  ('869b7e78-6fb7-4026-b56c-e2c74dcecea8'::uuid, 'Abarrotes', 'Arroz y pastas'),
  ('bc1d37c8-cef4-47b8-a5ab-42285ef01354'::uuid, 'Abarrotes', 'Conservas'),
  ('e2204b8a-948f-4304-b740-a872f154b0b9'::uuid, 'Abarrotes', 'Conservas'),
  ('fb7ac027-95cd-4125-9dcd-1ff77682451e'::uuid, 'Abarrotes', 'Conservas'),
  ('bf08671c-ae1d-46e1-a910-fe215b9cc645'::uuid, 'Abarrotes', 'Salsas y aderezos'),
  ('0071c00c-99ae-4818-bf57-f011c185ae1e'::uuid, 'Abarrotes', 'Salsas y aderezos'),
  ('ce1c3361-8003-4d20-aacb-7961daeb13d5'::uuid, 'Abarrotes', 'Salsas y aderezos'),
  ('78ffbb1b-e64e-43ee-bfba-33d37975264a'::uuid, 'Abarrotes', 'Salsas y aderezos'),
  ('1d9d0d41-ec5c-4189-a717-cf7cd621decf'::uuid, 'Abarrotes', 'Salsas y aderezos'),
  ('7453c8a7-249e-460f-be9e-6ab201f8cec2'::uuid, 'Abarrotes', 'Salsas y aderezos'),
  ('c578dad4-200e-4fe2-9c00-d760b49333b9'::uuid, 'Abarrotes', 'Salsas y aderezos'),
  ('eae1f00c-0cf6-4289-9cdd-137ccff35a87'::uuid, 'Abarrotes', 'Margarinas'),
  ('948fe2bc-b720-4281-b1c5-14b0d211f09c'::uuid, 'Abarrotes', 'Margarinas'),
  ('68dd125e-2861-436a-a9e9-ff9cd4752ad9'::uuid, 'Abarrotes', 'Margarinas'),
  ('d5cb7211-9e80-42c9-a91b-472fd72b68dc'::uuid, 'Abarrotes', 'Quesos untables'),
  ('f45a6bb2-253d-4bfc-8659-245fca9366c3'::uuid, 'Abarrotes', 'Quesos untables'),
  ('fcbd3f87-8383-4cb1-9b5a-da5a607f3e33'::uuid, 'Bebidas', 'Refrescos'),
  ('3bde5f31-a419-43c6-a5b2-144a01e66940'::uuid, 'Bebidas', 'Refrescos'),
  ('14d86827-20ed-471a-95c7-1db615cbd51d'::uuid, 'Bebidas', 'Refrescos'),
  ('63431b95-f63f-443e-9338-ae5e63b5205b'::uuid, 'Bebidas', 'Refrescos'),
  ('2c24a718-d8e3-45ed-84d5-10209d471cad'::uuid, 'Bebidas', 'Refrescos'),
  ('82f1d8e9-7f10-4cd3-af2e-e8c1ca718398'::uuid, 'Bebidas', 'Refrescos'),
  ('5ad1c420-c07a-4ccd-a8ba-aa55481912c6'::uuid, 'Bebidas', 'Refrescos'),
  ('1cf4c9e4-f68f-4997-bdd8-ae90a1364d1d'::uuid, 'Bebidas', 'Refrescos'),
  ('8c92ea38-009d-42b4-8dd0-218d234b08d0'::uuid, 'Bebidas', 'Refrescos'),
  ('d29382b3-c065-4bba-96cd-886d49139f8c'::uuid, 'Bebidas', 'Refrescos'),
  ('4e638ebd-15f2-4508-ac96-77aac8dbe14a'::uuid, 'Bebidas', 'Refrescos'),
  ('d142765d-cbe7-4982-8f65-b1872610c89f'::uuid, 'Bebidas', 'Refrescos'),
  ('903af033-8253-4f38-95a3-25acadade859'::uuid, 'Bebidas', 'Refrescos'),
  ('f7f0ceda-5b18-4915-88bd-298da51629c6'::uuid, 'Bebidas', 'Jugos y néctares'),
  ('9aae6ea1-33e8-4337-a4b0-99382ea906c7'::uuid, 'Bebidas', 'Jugos y néctares'),
  ('a8f96e37-c591-4a1e-afc8-2150609fc01e'::uuid, 'Bebidas', 'Jugos y néctares'),
  ('bb1a53ff-7e18-4807-9f16-baadf43ea8d5'::uuid, 'Bebidas', 'Jugos y néctares'),
  ('80d69802-48d1-4c1c-afb0-8743c9c344f2'::uuid, 'Bebidas', 'Jugos y néctares'),
  ('bbcc3da2-a7ae-4e1c-a472-730d22bba46d'::uuid, 'Bebidas', 'Maltas'),
  ('3dfad4ab-b0e9-46d4-9d98-040d2fe91769'::uuid, 'Bebidas', 'Maltas'),
  ('4f19ef90-7e74-436d-adce-d7d763b7f191'::uuid, 'Bebidas', 'Maltas'),
  ('044710f3-89c7-4250-af24-f1eaf0588bd4'::uuid, 'Bebidas', 'Té frío'),
  ('f0428939-a8b7-42c5-a078-16cb4386707e'::uuid, 'Bebidas', 'Té frío'),
  ('0613d4a4-4f8f-441a-930c-7ef518aa8f0e'::uuid, 'Bebidas', 'Té frío'),
  ('795cdffa-198c-41f8-8206-a2c8c94bf45c'::uuid, 'Bebidas', 'Té frío'),
  ('d3d3f41b-3ca1-45e0-b321-166ccd9daef5'::uuid, 'Bebidas', 'Hidratantes'),
  ('b10d3160-5c4a-4130-8108-bf26df9bde3a'::uuid, 'Bebidas', 'Hidratantes'),
  ('36d4b945-6338-41f6-9d3f-5f8427ac06fa'::uuid, 'Bebidas', 'Hidratantes'),
  ('b16e4cd5-8e31-408c-881a-47cdfca161c9'::uuid, 'Bebidas', 'Energéticas'),
  ('b5afa304-e8dc-48af-ab76-f4aa1ebcc99e'::uuid, 'Bebidas', 'Sodas y mezcladores'),
  ('c320f650-9006-4293-aba6-3f0a8fa22db5'::uuid, 'Bebidas', 'Sodas y mezcladores'),
  ('650a36ec-f9ce-4169-b84b-ada86fa9947b'::uuid, 'Bebidas', 'Cervezas'),
  ('c77dd119-3281-4375-9869-9ba7803d9425'::uuid, 'Bebidas', 'Cervezas'),
  ('f6489cb9-57b4-4e0b-ab41-fce8b07e1a6b'::uuid, 'Bebidas', 'Cervezas'),
  ('d86211b1-370f-483f-bc2c-9ed8fa238f37'::uuid, 'Bebidas', 'Cervezas'),
  ('f5859dcd-e91c-4adf-9027-2b9953cbe3cc'::uuid, 'Bebidas', 'Sangrías'),
  ('83b15a6e-18ab-46be-b22c-a7a8b46dc9b9'::uuid, 'Bebidas', 'Sangrías'),
  ('4819d0f6-9547-42cc-ade7-383317ba9975'::uuid, 'Bebidas', 'Sangrías'),
  ('126145cc-14c7-4447-98f7-86ffe59b073f'::uuid, 'Bebidas', 'Sangrías'),
  ('e0eec807-2409-4550-be85-9c25812326a6'::uuid, 'Bebidas', 'Sangrías'),
  ('055de13a-6824-482f-9658-871195e64d4c'::uuid, 'Bebidas', 'Sangrías'),
  ('aeab504d-f507-4cc3-a9c7-0ee3d4cab8fe'::uuid, 'Lácteos', 'Yogures'),
  ('2b277da9-8d8a-40d8-81c9-fd9a32c6be23'::uuid, 'Lácteos', 'Yogures'),
  ('3ec3aa55-295c-43b5-9371-eedf0ad9f8cf'::uuid, 'Lácteos', 'Yogures'),
  ('356bce60-da0b-4963-99f1-2fb1c7ed2954'::uuid, 'Lácteos', 'Yogures'),
  ('85016462-3119-4345-8395-1296a749506f'::uuid, 'Lácteos', 'Yogures'),
  ('982cf40a-9d6b-4a49-81fe-0843383ed2d3'::uuid, 'Lácteos', 'Yogures'),
  ('cdc417ed-4ee2-4566-8149-2dea9a2b9ab0'::uuid, 'Lácteos', 'Yogures'),
  ('14383fe5-2984-4a06-8ab9-099b335508e3'::uuid, 'Lácteos', 'Yogures'),
  ('53bcc965-7c00-42ca-bd5b-990cfc862f4c'::uuid, 'Limpieza', 'Lavado de ropa'),
  ('6a473c81-655b-43e8-b99b-6334912efe61'::uuid, 'Limpieza', 'Lavado de ropa'),
  ('03548326-d1fc-4045-95b3-80d4c0ac0162'::uuid, 'Limpieza', 'Lavado de ropa'),
  ('52205b07-a453-433e-800d-e9a0d08be96e'::uuid, 'Limpieza', 'Lavado de ropa'),
  ('9cdebe52-f2a1-4530-80b6-26b6e926b1a8'::uuid, 'Limpieza', 'Lavado de ropa'),
  ('a2fff243-1705-4956-bfbe-730748f7a96e'::uuid, 'Limpieza', 'Lavado de ropa'),
  ('5302f93d-edad-4729-8ef7-af0aff03b73b'::uuid, 'Limpieza', 'Lavado de ropa'),
  ('59161725-2d23-46ae-90ea-8d4a44a11bfa'::uuid, 'Limpieza', 'Suavizantes'),
  ('20b4c030-ea07-4a42-934f-9fb796e17e98'::uuid, 'Limpieza', 'Suavizantes'),
  ('bca72b44-7320-4435-85a8-1f92d82f5b68'::uuid, 'Limpieza', 'Suavizantes'),
  ('90f6bacf-8edf-4524-8d36-3d461f2a275d'::uuid, 'Limpieza', 'Lavaplatos'),
  ('c3449f32-09e7-446d-aaab-ceb7a35540a5'::uuid, 'Limpieza', 'Limpiadores multiuso'),
  ('20cf4630-9b56-44d4-8225-2275a47c25e8'::uuid, 'Limpieza', 'Limpiadores multiuso'),
  ('61793fbe-a498-4083-b87b-cb3d1c7b6899'::uuid, 'Limpieza', 'Limpiadores multiuso'),
  ('f6c3c8cf-30af-41ba-ada7-436b4aa48a63'::uuid, 'Limpieza', 'Limpiadores multiuso'),
  ('5049f1a8-de43-44fa-a3ed-fff0a55a21e4'::uuid, 'Cuidado Personal', 'Cuidado del cabello'),
  ('1b017573-d00b-44b7-a3d7-ce31c6700094'::uuid, 'Cuidado Personal', 'Cuidado del cabello'),
  ('4682b8c9-af28-4321-bb1e-394a9457b7d1'::uuid, 'Cuidado Personal', 'Cuidado del cabello'),
  ('2668a2f3-d534-405f-8dba-b860d84ee374'::uuid, 'Cuidado Personal', 'Cuidado del cabello'),
  ('748aebe9-68b1-434a-b630-0b01afeacfdd'::uuid, 'Cuidado Personal', 'Cuidado del cabello'),
  ('08a4df92-644f-4fd6-8984-0045f43919a1'::uuid, 'Cuidado Personal', 'Cuidado del cabello'),
  ('efea2e49-1cb2-4bc4-91cc-ffca9e95d21b'::uuid, 'Cuidado Personal', 'Higiene femenina'),
  ('4bfd6836-7366-43d9-ad8d-b94ea8f2e835'::uuid, 'Cuidado Personal', 'Higiene femenina')
)
update public.products p
set subcategory_id = s.id
from assignments a
join public.categories c on c.name = a.category_name
join public.subcategories s on s.category_id = c.id and s.name = a.subcategory_name
where p.id = a.product_id and p.category_id = c.id and p.subcategory_id is null;

do $$
begin
  if (select count(*) from public.products where subcategory_id is not null) <> 94 then
    raise exception 'El inventario cambió: revisar las asignaciones antes de aplicar.';
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
