import { DUMMY_IMAGE } from '../utils/format';

// Stock fallback photo per broad category slug — starts from the app's
// HomeScreen CATEGORY_IMG map. The live taxonomy uses slugs the app map never
// covered (wellness-healing, arts-creativity, …), which made every tile the
// same DUMMY_IMAGE; on the web a keyword match picks a fitting photo instead.
// Two of the app's photo ids (adventure, cultural) now 404 on Unsplash and were
// swapped for live ones here.
const U = (id) => `https://images.unsplash.com/photo-${id}?w=400&q=70&auto=format&fit=crop`;

export const CATEGORY_IMG = {
  'adventure-outdoors': U('1551632811-561732d1e306'),
  adventure: U('1551632811-561732d1e306'),
  cultural: U('1524492412937-b28074a5d7da'),
  'heritage-culture': U('1524492412937-b28074a5d7da'),
  food: U('1414235077428-338989a2e8c0'),
  'food-culinary': U('1414235077428-338989a2e8c0'),
  nature: U('1441974231531-c6227db76b6e'),
  'nature-wildlife': U('1441974231531-c6227db76b6e'),
  wellness: U('1544367567-0f2fcb009e0b'),
  'wellness-relaxation': U('1544367567-0f2fcb009e0b'),
};

const KEYWORD_IMG = [
  [/wellness|heal|spa|yoga|relax/, U('1544367567-0f2fcb009e0b')],
  [/adventure|explor|outdoor|trek/, U('1551632811-561732d1e306')],
  [/food|culinary|cuisine|dining/, U('1414235077428-338989a2e8c0')],
  [/nature|wildlife|eco/, U('1441974231531-c6227db76b6e')],
  [/spiritual|heritage|cultur|histor/, U('1524492412937-b28074a5d7da')],
  [/art|creativ|craft/, U('1513364776144-60967b0f800f')],
  [/learn|growth|personal|skill/, U('1522202176988-66273c2fd55f')],
  [/sport|fun|game|play/, U('1461896836934-ffe607ba8211')],
  [/relationship|communit|social/, U('1529156069898-49953e39b3ac')],
  [/group/, U('1511632765486-a01980e01a18')],
  [/corporate|team|business/, U('1522071820081-009f0129c71c')],
];

export const categoryImage = (slug, name = '') => {
  if (CATEGORY_IMG[slug]) return CATEGORY_IMG[slug];
  const key = `${slug || ''} ${name || ''}`.toLowerCase();
  const hit = KEYWORD_IMG.find(([re]) => re.test(key));
  return hit ? hit[1] : DUMMY_IMAGE;
};
