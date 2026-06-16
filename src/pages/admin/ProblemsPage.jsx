import TaxonomyManager from '../../components/admin/TaxonomyManager.jsx';

export default function ProblemsPage() {
  return (
    <TaxonomyManager
      resource="problems"
      title="Problems / Conditions"
      subtitle="What problems your retreats help solve — used by the problem-based filter."
      labels={{ singular: 'problem', plural: 'problems' }}
      extraFields={[
        { name: 'icon', label: 'Lucide icon name', placeholder: 'heart, brain, leaf, …' },
      ]}
      color="wellness"
    />
  );
}
