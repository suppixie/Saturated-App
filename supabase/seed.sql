insert into public.flavour_tags (name)
values
  ('Citrusy'),
  ('Fresh'),
  ('Tangy'),
  ('Sweet'),
  ('Strong'),
  ('Floral'),
  ('Nutty'),
  ('Bitter'),
  ('Creamy'),
  ('Refreshing'),
  ('Tarty'),
  ('Fizzy'),
  ('Bubblegum')
on conflict (name) do nothing;

insert into public.badges (id, name, description, target)
values
  ('first-sip', 'First Sip', 'Log your first drink.', 1),
  ('five-sips', 'Five Sips', 'Log five drinks.', 5),
  ('ten-sips', 'Ten Sips', 'Log ten drinks.', 10),
  ('social-sipper', 'Social Sipper', 'Comment on twenty reviews written by other people.', 20),
  ('wine-much', 'Wine much', 'Review ten wines.', 10),
  ('caffeine-in-my-blood', 'Caffeine in my Blood', 'Review ten coffee drinks.', 10),
  ('around-the-world', 'Around the World', 'Review drinks from ten different origins.', 10),
  ('pint-master', 'Pint Master', 'Review fifteen beers.', 15),
  ('cocktailio', 'Cocktailio', 'Review fifteen cocktails.', 15),
  ('always-on-the-rocks', 'Always on the rocks', 'Review ten whiskeys.', 10),
  ('drink-buddy', 'The Drink Buddy', 'Connect with twenty buddies.', 20),
  ('receipt-maxx', 'Receipt Maxx', 'Review fifty drinks.', 50)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  target = excluded.target;

delete from public.badges
where id in ('coke-zero-gang', 'spritz-or-nothing');
