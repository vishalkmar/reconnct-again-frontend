import {
  Sprout, Star, Users, Heart, UtensilsCrossed, Dumbbell, TreePine, Mountain,
  Palette, Plane, Sun, Briefcase, BookOpen, Compass, Globe, Tag,
} from 'lucide-react';

/*
  Web twin of the app's iconForCategory (App/reconnct/src/icons.js): same
  keyword order, same word-start matching (so "Partner" never hits "art"),
  lucide icons in place of the app's PNGs.
*/
const startsWord = (n, w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(n);

export function iconForCategory(name) {
  const n = (name || '').toLowerCase();
  const has = (...ws) => ws.some((w) => startsWord(n, w));

  if (has('yourself', 'solo', 'self')) return Sprout;
  if (has('kid', 'teen', 'child', 'little one')) return Star;
  if (has('elder', 'senior')) return Users;

  if (has('romantic', 'couple', 'love', 'partner')) return Heart;
  if (has('food', 'culinary', 'dining', 'cuisine', 'nightlife')) return UtensilsCrossed;
  if (has('fitness', 'gym', 'sport', 'workout')) return Dumbbell;
  if (has('nature', 'wildlife', 'eco', 'garden', 'outdoor')) return TreePine;
  if (has('adventure', 'trek', 'hiking', 'play', 'thrill')) return Mountain;
  if (has('art', 'creativ', 'craft', 'paint', 'design')) return Palette;
  if (has('travel', 'getaway', 'trip', 'tour', 'staycation')) return Plane;
  if (has('wellness', 'relax', 'spa', 'health', 'well-being', 'wellbeing', 'spiritual', 'inner', 'meditat', 'mindful', 'yoga')) return Sun;
  if (has('corporate', 'team', 'business', 'work', 'professional', 'network')) return Briefcase;
  if (has('learn', 'education', 'knowledge', 'study', 'skill')) return BookOpen;
  if (has('discover', 'explore', 'journey')) return Compass;
  if (has('volunteer', 'impact', 'charity', 'giving')) return Heart;
  if (has('social', 'communit', 'together', 'family', 'group', 'friend', 'connection')) return Users;
  if (has('entertainment', 'music', 'show', 'celebrat', 'recognition', 'fun')) return Star;
  if (has('growth', 'personal', 'develop')) return Sprout;
  if (has('cultur', 'heritage', 'histor')) return Globe;
  return Tag;
}
