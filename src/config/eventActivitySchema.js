// Schema config that drives the dynamic Events & Activity admin form.
// See docs/events-activity-platform.md. Field `type` values:
//   text · textarea · richtext · number · price · bool · select · multi ·
//   date · time · image · gallery · video · tags · map
import INDIAN_STATES from '../utils/indianStates.js';

export const CATEGORIES = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'group', label: 'Group Activity' },
  { value: 'music', label: 'Music Event' },
  { value: 'wellness', label: 'Wellness Retreat' },
  { value: 'spiritual', label: 'Spiritual Retreat' },
  { value: 'diy', label: 'DIY Workshop' },
  { value: 'arts_crafts', label: 'Arts & Crafts' },
  { value: 'poetry', label: 'Poetry Event' },
  { value: 'fun', label: 'Fun & Entertainment' },
  { value: 'theatre', label: 'Theatre Show' },
  { value: 'comedy', label: 'Comedy Show' },
];

export const AUDIENCE_OPTIONS = ['Partners', 'Friends', 'Family', 'Kids', 'Parents', 'Yourself'];

// Common fields — real columns. Each section renders for every category.
// `col` = grid span (1 or 2). Defaults to 1.
export const COMMON_SECTIONS = [
  {
    title: 'Basic information',
    fields: [
      { key: 'title', label: 'Activity title', type: 'text', required: true, col: 2 },
      { key: 'subtitle', label: 'Subtitle', type: 'text', col: 2 },
      { key: 'subCategory', label: 'Sub category', type: 'text' },
      { key: 'activityType', label: 'Activity type', type: 'select', options: ['offline', 'online', 'hybrid'] },
      { key: 'status', label: 'Status', type: 'select', options: ['draft', 'published', 'archived'] },
    ],
  },
  {
    title: 'Location',
    fields: [
      { key: 'venueName', label: 'Venue name', type: 'text' },
      { key: 'landmark', label: 'Landmark', type: 'text' },
      { key: 'venueAddress', label: 'Venue address', type: 'textarea', col: 2 },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'state', label: 'State', type: 'select', options: INDIAN_STATES },
      { key: 'country', label: 'Country', type: 'text' },
      { key: 'pincode', label: 'Pincode', type: 'text' },
      { key: 'latitude', label: 'Latitude', type: 'number' },
      { key: 'longitude', label: 'Longitude', type: 'number' },
      { key: 'mapEmbed', label: 'Google Maps (embed/link)', type: 'map', col: 2 },
    ],
  },
  {
    title: 'Date & timing',
    fields: [
      { key: 'startDate', label: 'Start date', type: 'date' },
      { key: 'endDate', label: 'End date', type: 'date' },
      { key: 'startTime', label: 'Start time', type: 'time' },
      { key: 'endTime', label: 'End time', type: 'time' },
      { key: 'duration', label: 'Duration', type: 'text' },
    ],
  },
  {
    title: 'Capacity',
    fields: [
      { key: 'totalSeats', label: 'Total seats', type: 'number' },
      { key: 'availableSeats', label: 'Available seats', type: 'number' },
      { key: 'minParticipants', label: 'Min participants', type: 'number' },
      { key: 'maxParticipants', label: 'Max participants', type: 'number' },
    ],
  },
  {
    title: 'Pricing (base)',
    fields: [
      { key: 'isPaid', label: 'Paid event', type: 'bool' },
      { key: 'currency', label: 'Currency', type: 'text' },
      { key: 'gstRate', label: 'GST (added to every price)', type: 'gst' },
      { key: 'adultPrice', label: 'Adult price', type: 'price' },
      { key: 'childPrice', label: 'Child price', type: 'price' },
      { key: 'couplePrice', label: 'Couple price', type: 'price' },
      { key: 'groupPrice', label: 'Group price', type: 'price' },
    ],
  },
  {
    title: 'Description',
    fields: [
      { key: 'shortDescription', label: 'Short description', type: 'textarea', col: 2 },
      { key: 'longDescription', label: 'Long description', type: 'richtext', col: 2 },
      { key: 'highlights', label: 'Highlights', type: 'richtext', col: 2 },
      { key: 'whatMakesSpecial', label: 'What makes this special', type: 'richtext', col: 2 },
      { key: 'inclusions', label: 'Inclusions', type: 'richtext', col: 2 },
      { key: 'exclusions', label: 'Exclusions', type: 'richtext', col: 2 },
    ],
  },
  {
    title: 'Policies',
    fields: [
      { key: 'refundPolicy', label: 'Refund policy', type: 'richtext', col: 2 },
      { key: 'cancellationPolicy', label: 'Cancellation policy', type: 'richtext', col: 2 },
      { key: 'termsConditions', label: 'Terms & conditions', type: 'richtext', col: 2 },
    ],
  },
];

// Day-group options for the availability builder.
export const DAY_GROUPS = ['All days', 'Weekdays (Mon–Fri)', 'Weekends (Sat–Sun)', 'Custom', 'Specific dates'];
export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const SCHEDULE_MODES = [
  { value: 'fixed_slots', label: 'Fixed time slots' },
  { value: 'hourly', label: 'Hourly (pick any slot in a window)' },
  { value: 'range', label: 'Duration range' },
  { value: 'full_day', label: 'Full day' },
  { value: 'multi_day', label: 'Multi-day' },
];
export const SLOT_INTERVALS = [
  { value: 15, label: 'Every 15 min' },
  { value: 30, label: 'Every 30 min' },
  { value: 60, label: 'Every 1 hour' },
  { value: 90, label: 'Every 90 min' },
  { value: 120, label: 'Every 2 hours' },
];
export const CONFIRMATION_OPTIONS = [
  { value: 'instant', label: 'Instant confirmation' },
  { value: 'on_request', label: 'On request (needs approval)' },
];

// Host / SEO / Reviews — common blocks rendered after category fields.
export const HOST_FIELDS = [
  { key: 'hostName', label: 'Host name', type: 'text' },
  { key: 'hostImage', label: 'Host image', type: 'image' },
  { key: 'hostBio', label: 'Host bio', type: 'textarea', col: 2 },
  { key: 'hostInstagram', label: 'Instagram', type: 'text' },
  { key: 'hostFacebook', label: 'Facebook', type: 'text' },
  { key: 'hostWebsite', label: 'Website', type: 'text' },
];
export const SEO_FIELDS = [
  { key: 'metaTitle', label: 'Meta title', type: 'text', col: 2 },
  { key: 'metaDescription', label: 'Meta description', type: 'textarea', col: 2 },
  { key: 'metaKeywords', label: 'Meta keywords', type: 'tags', col: 2 },
];
export const REVIEW_FIELDS = [
  { key: 'rating', label: 'Rating (0–5)', type: 'rating' },
  { key: 'userImages', label: 'User images', type: 'gallery', col: 2 },
];

// ── Per-category fields (stored under `categoryData`) ──────────────────────
export const CATEGORY_SCHEMA = {
  birthday: [
    { key: 'eventType', label: 'Event type', type: 'select', options: ['Kids Birthday', 'Adult Birthday', 'Surprise Birthday', 'Theme Birthday'] },
    { key: 'themeName', label: 'Theme name', type: 'text' },
    { key: 'themeColor', label: 'Theme color', type: 'text' },
    { key: 'decorationStyle', label: 'Decoration style', type: 'select', options: ['Balloon', 'Floral', 'Cartoon', 'Neon', 'Elegant'] },
    { key: 'cakeIncluded', label: 'Cake included', type: 'bool' },
    { key: 'cakeWeight', label: 'Cake weight', type: 'select', options: ['0.5 kg', '1 kg', '2 kg', '3 kg'] },
    { key: 'cakeFlavor', label: 'Cake flavor', type: 'select', options: ['Chocolate', 'Vanilla', 'Butterscotch', 'Red Velvet', 'Pineapple'] },
    { key: 'entertainment', label: 'Entertainment', type: 'multi', options: ['DJ', 'Magic Show', 'Puppet Show', 'Mascot', 'Games Host'] },
    { key: 'snacksIncluded', label: 'Snacks included', type: 'bool' },
    { key: 'dinnerIncluded', label: 'Dinner included', type: 'bool' },
    { key: 'customMenu', label: 'Custom menu', type: 'textarea', col: 2 },
    { key: 'photographer', label: 'Photographer', type: 'bool' },
    { key: 'videographer', label: 'Videographer', type: 'bool' },
    { key: 'droneCoverage', label: 'Drone coverage', type: 'bool' },
    { key: 'returnGifts', label: 'Return gifts', type: 'bool' },
    { key: 'ageGroup', label: 'Age group', type: 'select', options: ['1–5', '6–10', '11–15', 'Adult'] },
  ],
  anniversary: [
    { key: 'anniversaryNumber', label: 'Anniversary number', type: 'number' },
    { key: 'coupleNames', label: 'Couple names', type: 'text' },
    { key: 'setup', label: 'Setup', type: 'multi', options: ['Candle Light Dinner', 'Flower Decoration', 'Romantic Decor', 'Rose Path', 'Balloon Arch'] },
    { key: 'addOns', label: 'Add-ons', type: 'multi', options: ['Live Singer', 'Couple Photoshoot', 'Couple Videography', 'Personalized Gifts', 'Customized Cake'] },
    { key: 'ambienceLocation', label: 'Location type', type: 'select', options: ['Rooftop', 'Beach', 'Garden', 'Private Room', 'Poolside'] },
    { key: 'musicType', label: 'Music type', type: 'select', options: ['Live', 'DJ', 'Acoustic', 'Piano'] },
  ],
  group: [
    { key: 'groupType', label: 'Group type', type: 'select', options: ['Corporate', 'Friends', 'Family', 'College', 'Team Building'] },
    { key: 'activitySet', label: 'Activities', type: 'multi', options: ['Games', 'Sports', 'Adventure', 'Cooking', 'Bonfire'] },
    { key: 'minGroupSize', label: 'Min group size', type: 'number' },
    { key: 'maxGroupSize', label: 'Max group size', type: 'number' },
    { key: 'facilitatorProvided', label: 'Facilitator provided', type: 'bool' },
    { key: 'transportIncluded', label: 'Transport included', type: 'bool' },
    { key: 'mealsIncluded', label: 'Meals included', type: 'bool' },
  ],
  music: [
    { key: 'artistName', label: 'Artist name', type: 'text' },
    { key: 'bandName', label: 'Band name', type: 'text' },
    { key: 'genre', label: 'Genre', type: 'multi', options: ['Bollywood', 'Rock', 'Pop', 'Classical', 'EDM', 'Sufi', 'Jazz'] },
    { key: 'eventFormat', label: 'Format', type: 'select', options: ['Concert', 'DJ Night', 'Open Mic', 'Live Band', 'Unplugged'] },
    { key: 'audienceSeating', label: 'Audience seating', type: 'select', options: ['Standing', 'Seating', 'VIP Seating', 'Mixed'] },
    { key: 'stageSetup', label: 'Stage setup', type: 'bool' },
    { key: 'lightShow', label: 'Light show', type: 'bool' },
    { key: 'language', label: 'Language', type: 'multi', options: ['Hindi', 'English', 'Punjabi', 'Regional'] },
  ],
  wellness: [
    { key: 'retreatType', label: 'Retreat type', type: 'multi', options: ['Yoga', 'Meditation', 'Detox', 'Ayurveda', 'Spa', 'Naturopathy'] },
    { key: 'trainerName', label: 'Trainer name', type: 'text' },
    { key: 'trainerBio', label: 'Trainer bio', type: 'textarea', col: 2 },
    { key: 'experienceYears', label: 'Experience (years)', type: 'number' },
    { key: 'dailySchedule', label: 'Daily schedule', type: 'richtext', col: 2 },
    { key: 'difficultyLevel', label: 'Difficulty', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'] },
    { key: 'mealsIncluded', label: 'Meals included', type: 'bool' },
    { key: 'stayIncluded', label: 'Stay included', type: 'bool' },
    { key: 'mealType', label: 'Meal type', type: 'select', options: ['Veg', 'Vegan', 'Sattvic', 'Jain'] },
    { key: 'medicalRestrictions', label: 'Medical restrictions', type: 'textarea', col: 2 },
    { key: 'ageRestrictions', label: 'Age restrictions', type: 'text' },
  ],
  spiritual: [
    { key: 'spiritualType', label: 'Spiritual type', type: 'multi', options: ['Meditation', 'Satsang', 'Silent Retreat', 'Temple Tour', 'Kirtan'] },
    { key: 'guruName', label: 'Guru name', type: 'text' },
    { key: 'facilitatorName', label: 'Facilitator name', type: 'text' },
    { key: 'activities', label: 'Activities', type: 'multi', options: ['Chanting', 'Prayers', 'Group Meditation', 'Fire Ceremony', 'Yoga Nidra'] },
    { key: 'silencePeriods', label: 'Silence periods', type: 'bool' },
    { key: 'dietType', label: 'Diet type', type: 'select', options: ['Sattvic', 'Veg', 'Fasting Option'] },
    { key: 'accommodationType', label: 'Accommodation', type: 'select', options: ['Ashram', 'Tents', 'Rooms'] },
  ],
  diy: [
    { key: 'skillLevel', label: 'Skill level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'] },
    { key: 'workshopTopic', label: 'Workshop topic', type: 'text' },
    { key: 'materialsIncluded', label: 'Materials included', type: 'bool' },
    { key: 'toolsIncluded', label: 'Tools included', type: 'bool' },
    { key: 'takeHomeProduct', label: 'Take-home product', type: 'bool' },
    { key: 'certificate', label: 'Certificate', type: 'bool' },
    { key: 'batchSize', label: 'Batch size', type: 'number' },
    { key: 'kitDescription', label: 'Kit description', type: 'textarea', col: 2 },
  ],
  arts_crafts: [
    { key: 'artType', label: 'Art type', type: 'multi', options: ['Painting', 'Pottery', 'Resin Art', 'Sketching', 'Calligraphy', 'Candle Making'] },
    { key: 'materialIncluded', label: 'Material included', type: 'bool' },
    { key: 'takeawayArtwork', label: 'Takeaway artwork', type: 'bool' },
    { key: 'mediumUsed', label: 'Medium used', type: 'text' },
    { key: 'canvasSize', label: 'Canvas size', type: 'text' },
    { key: 'instructorName', label: 'Instructor name', type: 'text' },
  ],
  poetry: [
    { key: 'eventType', label: 'Event type', type: 'select', options: ['Open Mic', 'Poetry Slam', 'Competition', 'Recital'] },
    { key: 'language', label: 'Language', type: 'multi', options: ['Hindi', 'English', 'Urdu', 'Punjabi', 'Regional'] },
    { key: 'performanceSlots', label: 'Performance slots', type: 'number' },
    { key: 'judgesPresent', label: 'Judges present', type: 'bool' },
    { key: 'prizeForWinners', label: 'Prize for winners', type: 'bool' },
    { key: 'theme', label: 'Theme', type: 'text' },
  ],
  fun: [
    { key: 'activityType', label: 'Activity type', type: 'select', options: ['Escape Room', 'Treasure Hunt', 'Game Night', 'Family Fun', 'Carnival'] },
    { key: 'winnerPrize', label: 'Winner prize', type: 'text' },
    { key: 'participationGift', label: 'Participation gift', type: 'text' },
    { key: 'difficulty', label: 'Difficulty', type: 'select', options: ['Easy', 'Medium', 'Hard'] },
    { key: 'teamBased', label: 'Team based', type: 'bool' },
    { key: 'indoorOutdoor', label: 'Indoor / Outdoor', type: 'select', options: ['Indoor', 'Outdoor', 'Both'] },
    { key: 'ageLimit', label: 'Age limit', type: 'text' },
  ],
  theatre: [
    { key: 'playName', label: 'Play name', type: 'text' },
    { key: 'director', label: 'Director', type: 'text' },
    { key: 'castMembers', label: 'Cast members', type: 'textarea', col: 2 },
    { key: 'genre', label: 'Genre', type: 'select', options: ['Drama', 'Musical', 'Comedy', 'Tragedy', 'Experimental'] },
    { key: 'language', label: 'Language', type: 'multi', options: ['Hindi', 'English', 'Marathi', 'Regional'] },
    { key: 'intervalIncluded', label: 'Interval included', type: 'bool' },
    { key: 'durationMinutes', label: 'Duration (minutes)', type: 'number' },
    { key: 'ageRestriction', label: 'Age restriction', type: 'text' },
  ],
  comedy: [
    { key: 'showType', label: 'Show type', type: 'select', options: ['Standup', 'Roast', 'Improv', 'Sketch'] },
    { key: 'comedianName', label: 'Comedian name', type: 'text' },
    { key: 'lineup', label: 'Lineup', type: 'textarea', col: 2 },
    { key: 'language', label: 'Language', type: 'multi', options: ['Hindi', 'English', 'Hinglish', 'Regional'] },
    { key: 'ageRestriction', label: 'Age restriction', type: 'text' },
    { key: 'seatingType', label: 'Seating type', type: 'select', options: ['Standing', 'Seating', 'VIP'] },
  ],
};

export const categoryLabel = (value) => CATEGORIES.find((c) => c.value === value)?.label || value;
