import TaxonomyManager from '../../components/admin/TaxonomyManager.jsx';

export default function CategoriesPage() {
  return (
    <TaxonomyManager
      resource="categories"
      title="Categories"
      subtitle="Wellness categories — Yoga, Ayurveda, Detox, Meditation, etc."
      labels={{ singular: 'category', plural: 'categories' }}
      color="wellness"
    />
  );
}
