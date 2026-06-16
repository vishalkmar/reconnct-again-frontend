import TaxonomyManager from '../../components/admin/TaxonomyManager.jsx';

export default function CitiesPage() {
  return (
    <TaxonomyManager
      resource="cities"
      title="Cities / Destinations"
      subtitle="Cities shown on the home page destination filter."
      labels={{ singular: 'city', plural: 'cities' }}
      extraFields={[
        { name: 'country', label: 'Country', placeholder: 'India, Thailand, etc.' },
      ]}
      color="brand"
    />
  );
}
