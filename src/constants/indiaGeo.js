// Shared India geography for address capture on the experience forms.
// City is offered as a datalist (pick a known one to avoid typos, or type your
// own); State is a strict select (a fixed, finite list). A clean city + state +
// pincode is what lets the backend geocode the address to an exact point.

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

// A generous set of well-known Indian cities (metros + popular tourist/retreat
// hubs). Suggestions only — the field still accepts any typed value.
export const FAMOUS_CITIES = [
  'Delhi', 'New Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore',
  'Bhopal', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad',
  'Meerut', 'Rajkot', 'Varanasi', 'Amritsar', 'Allahabad', 'Ranchi', 'Coimbatore',
  'Jodhpur', 'Gwalior', 'Vijayawada', 'Madurai', 'Raipur', 'Kota', 'Chandigarh',
  'Guwahati', 'Solapur', 'Hubli', 'Mysuru', 'Tiruchirappalli', 'Bareilly', 'Aligarh',
  'Moradabad', 'Jalandhar', 'Bhubaneswar', 'Salem', 'Warangal', 'Dehradun', 'Rishikesh',
  'Haridwar', 'Shimla', 'Manali', 'Nainital', 'Mussoorie', 'Udaipur', 'Pushkar',
  'Mount Abu', 'Goa', 'Panaji', 'Kochi', 'Munnar', 'Alleppey', 'Thiruvananthapuram',
  'Ooty', 'Kodaikanal', 'Pondicherry', 'Darjeeling', 'Gangtok', 'Shillong', 'Leh',
  'Srinagar', 'Gulmarg', 'Kasol', 'Mcleodganj', 'Dharamshala', 'Rann of Kutch',
  'Hampi', 'Gokarna', 'Mahabaleshwar', 'Lonavala', 'Khajuraho', 'Amritsar', 'Jaisalmer',
  'Bikaner', 'Ajmer', 'Mathura', 'Vrindavan', 'Tirupati', 'Rameswaram', 'Kanyakumari',
];
