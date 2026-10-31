// Text on the home page that can be edited from the admin page (Texts tab).
// `default` must match what is written in index.html.
export const TEXT_FIELDS = [
  { key: 'heroTagline', label: 'Home: line under the band name', multi: true,
    default: 'Loud, tight and made for the stage. We turn every room into a night people remember.' },
  { key: 'aboutP1', label: 'About: first paragraph', multi: true,
    default: 'Dynamites Band is a group of musicians who love playing live. We bring energy, feeling and a lot of listening to every song, from small rooms to big stages.' },
  { key: 'aboutP2', label: 'About: second paragraph', multi: true,
    default: 'Tell us about your event and we will shape the set to fit it.' },
  { key: 'membersHint', label: 'Members: small hint under the title', multi: false,
    default: 'Tap a member to learn more about them.' },
  { key: 'bookingBlurb', label: 'Booking block on the home page', multi: true,
    default: 'Weddings, parties, festivals, corporate nights. See how booking works and send your request.' },
]
