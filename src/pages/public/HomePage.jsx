import SearchTabs from '../../components/public/SearchTabs.jsx';
import AuditChecklistSection from '../../components/public/AuditChecklistSection.jsx';
import HomeResultsTabs from '../../components/public/HomeResultsTabs.jsx';
import PersonalisedRecommendationCTA from '../../components/public/PersonalisedRecommendationCTA.jsx';
import PromoBannerSection from '../../components/public/PromoBannerSection.jsx';
import TestimonialsSection from '../../components/public/TestimonialsSection.jsx';
import VideoTestimonialsBand from '../../components/public/VideoTestimonialsBand.jsx';
import BlogsSection from '../../components/public/BlogsSection.jsx';

export default function HomePage() {
  return (
    <>
      <SearchTabs />
      <AuditChecklistSection />
      <HomeResultsTabs />
      <PersonalisedRecommendationCTA />
      <VideoTestimonialsBand />
      <PromoBannerSection page="home" position="below-video-testimonials" />
      <TestimonialsSection />
      <BlogsSection />
    </>
  );
}
