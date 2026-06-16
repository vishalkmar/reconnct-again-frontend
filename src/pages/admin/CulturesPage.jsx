import TaxonomyManager from '../../components/admin/TaxonomyManager.jsx';

export default function CulturesPage() {
  return (
    <TaxonomyManager
      resource="cultures"
      title="Cultures"
      subtitle="Cultural themes for packages (e.g. Ayurvedic, Tibetan, Mediterranean, …). Used as a package filter."
      labels={{ singular: 'culture', plural: 'cultures' }}
      color="wellness"
    />
  );
}
