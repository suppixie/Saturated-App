-- These catalogue records have no bundled transparent artwork in the app.
-- Keep the records and related data intact, but remove them from the published
-- catalogue until replacement images are added and they are republished.
update public.beverages
set
  is_published = false,
  updated_at = timezone('utc', now())
where id in (
  'barq-s-root-beer',
  'mountain-dew-livewire',
  'dr-pepper-cherry',
  'dr-pepper-and-cream-soda',
  'a-and-w-cream-soda',
  'mug-root-beer',
  'sunkist-grape',
  'sunkist-berry-lemonade',
  'crush-grape',
  'crush-pineapple',
  'schweppes-bitter-lemon',
  'fever-tree-mediterranean-tonic-water',
  'fever-tree-premium-ginger-beer',
  'sanpellegrino-limonata',
  'sanpellegrino-aranciata-rossa',
  'sanpellegrino-pompelmo',
  'bundaberg-lemon-lime-and-bitters',
  'bundaberg-blood-orange',
  'bundaberg-burgundee-creaming-soda',
  'fentimans-victorian-lemonade',
  'fentimans-ginger-beer',
  'jarritos-lime',
  'jarritos-guava',
  'jarritos-mango',
  'jarritos-mexican-cola',
  'jones-berry-lemonade-soda',
  'jones-orange-and-cream-soda',
  'almdudler-original',
  'kofola-original',
  'fritz-kola-original',
  'afri-cola-original',
  'sinalco-orange',
  'vinea-white'
);
