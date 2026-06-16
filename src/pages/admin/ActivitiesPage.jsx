import TaxonomyManager from '../../components/admin/TaxonomyManager.jsx';

export default function ActivitiesPage() {
  return (
    <TaxonomyManager
      resource="activities"
      title="Activities"
      subtitle="Activities like Hiking, Surfing, Cooking class, used in the activity filter."
      labels={{ singular: 'activity', plural: 'activities' }}
      extraFields={[
        { name: 'icon', label: 'Lucide icon name', placeholder: 'mountain, waves, utensils, …' },
      ]}
      color="brand"
    />
  );
}
