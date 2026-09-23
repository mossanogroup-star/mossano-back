/**
 * The home page's quarry-to-project slider — Phase-3 feedback.
 *
 * Five steps, full screen, one photograph each. The copy lives in code for the
 * same reason LOOKS and APPLICATIONS do: adding or dropping a step is a design
 * decision about the page, not data entry. The photography does not — each step
 * takes its image from the media library, matched on `slug`, so the client
 * re-shoots a step by uploading over it rather than by asking for a deploy.
 *
 * Wording is the client's own, from the reference layout they sent.
 */
const PROCESS_STEPS = [
  {
    slug: "sourcing",
    title: "Sourcing",
    body: "We source marble, granite and natural stone from quarries worldwide.",
  },
  {
    slug: "selection",
    title: "Selection",
    body: "We curate only what is worth specifying.",
  },
  {
    slug: "realphotography",
    title: "Real Photography",
    body: "Every lot is photographed as it actually is.",
  },
  {
    slug: "verification",
    title: "Verification",
    body: "Its availability is verified rather than assumed.",
  },
  {
    slug: "readyforproject",
    title: "Ready for Your Project",
    body: "Exceptional natural stone, curated for spaces that last.",
  },
];

const PROCESS_SLUGS = PROCESS_STEPS.map((step) => step.slug);

export { PROCESS_STEPS, PROCESS_SLUGS };
