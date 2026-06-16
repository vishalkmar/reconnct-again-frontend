import TaxonomyManager from '../../components/admin/TaxonomyManager.jsx';

export default function BlogCategoriesPage() {
  return (
    <TaxonomyManager
      resource="blog-categories"
      title="Blog Categories"
      subtitle="Topics like Wellness Tips, Yoga, Travel Stories, Ayurveda, etc."
      labels={{ singular: 'category', plural: 'categories' }}
    />
  );
}
