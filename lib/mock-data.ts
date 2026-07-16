import type { DailyReport } from "./types";

const today = new Date().toISOString().slice(0, 10);

export const MOCK_REPORT: DailyReport = {
  id: "mock-report-1",
  reportDate: today,
  status: "ready",
  summary:
    "Short-form velocity is concentrated in sound-led challenges and product demos. Act on the top heat scores within 24–48 hours before saturation.",
  createdAt: new Date().toISOString(),
  trends: [
    {
      id: "t1",
      platform: "tiktok",
      externalId: "tt-001",
      title: "POV: your morning routine but make it chaotic",
      url: "https://www.tiktok.com/@creator/video/1",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=600&h=800&fit=crop",
      creatorHandle: "chaosmorning",
      metrics: { views: 4200000, likes: 510000, comments: 18400, shares: 92000 },
      heatScore: 94,
      category: "Formats & Challenges",
      insight:
        "Format is easy to remake with brand props. Jump in while the sound is still climbing — remix with your product in the third beat.",
      soundOrFormat: "Chaotic Morning Beat",
    },
    {
      id: "t2",
      platform: "youtube",
      externalId: "yt-001",
      title: "I tested 5 viral gadgets so you don't have to",
      url: "https://www.youtube.com/shorts/abc123",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=800&fit=crop",
      creatorHandle: "gadgetlab",
      metrics: { views: 2100000, likes: 98000, comments: 4200 },
      heatScore: 88,
      category: "Products & Brands",
      insight:
        "Product-review Shorts are converting. Pitch your SKU into this 'tested N gadgets' template with a clear winner reveal.",
      soundOrFormat: null,
    },
    {
      id: "t3",
      platform: "instagram",
      externalId: "ig-001",
      title: "Glass skin in 60 seconds — drugstore only",
      url: "https://www.instagram.com/reel/abc",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=800&fit=crop",
      creatorHandle: "glowlab",
      metrics: { views: 1800000, likes: 210000, comments: 6100 },
      heatScore: 86,
      category: "Beauty & Fashion",
      insight:
        "Drugstore beauty tutorials are peaking on Reels. Pair a tight before/after with on-screen SKU callouts for paid amplification.",
      soundOrFormat: "Soft Glow Audio",
    },
    {
      id: "t4",
      platform: "meta",
      externalId: "meta-001",
      title: "This grocery haul hack saves $40/week",
      url: "https://www.instagram.com/reel/def",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=800&fit=crop",
      creatorHandle: "budgetbites",
      metrics: { views: 950000, likes: 72000, comments: 3100 },
      heatScore: 79,
      category: "Food & Drink",
      insight:
        "Savings-led food content travels well on Meta. Brands in CPG should seed creator versions with store-specific price anchors.",
      soundOrFormat: null,
    },
    {
      id: "t5",
      platform: "tiktok",
      externalId: "tt-002",
      title: "Original sound: late-night confession loop",
      url: "https://www.tiktok.com/music/1",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&h=800&fit=crop",
      creatorHandle: null,
      metrics: { views: 8900000, likes: 1200000, shares: 340000 },
      heatScore: 96,
      category: "Sounds & Audio",
      insight:
        "This sound is still early relative to use-count growth. Film a 7-second hook before it hits mainstream saturation.",
      soundOrFormat: "Late-Night Confession Loop",
    },
    {
      id: "t6",
      platform: "x",
      externalId: "x-001",
      title: "Clip of the stadium chant that's everywhere",
      url: "https://x.com/i/status/1",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=600&h=800&fit=crop",
      creatorHandle: "sportsdesk",
      metrics: { views: 3200000, likes: 45000, comments: 2100, shares: 18000 },
      heatScore: 82,
      category: "News & Culture",
      insight:
        "Culture clips spike fast on X then migrate to TikTok. Capture the audio and cut a vertical remake today.",
      soundOrFormat: null,
    },
    {
      id: "t7",
      platform: "reddit",
      externalId: "rd-001",
      title: "This workout form check went nuclear",
      url: "https://www.reddit.com/r/Fitness/comments/1",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=800&fit=crop",
      creatorHandle: "u/formcheck",
      metrics: { views: 410000, likes: 28000, comments: 1900 },
      heatScore: 74,
      category: "Fitness & Wellness",
      insight:
        "Reddit is surfacing the raw clip before Shorts creators polish it. Be first to turn this into a clean how-to Short.",
      soundOrFormat: null,
    },
    {
      id: "t8",
      platform: "youtube",
      externalId: "yt-002",
      title: "AI tool that edits your Shorts in one click",
      url: "https://www.youtube.com/shorts/xyz789",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=800&fit=crop",
      creatorHandle: "toolstack",
      metrics: { views: 1500000, likes: 67000, comments: 2800 },
      heatScore: 81,
      category: "Tech & Gaming",
      insight:
        "Creator-tool demos are hot. If you ship a creator SaaS, film a 30-second before/after using this exact narrative arc.",
      soundOrFormat: null,
    },
    {
      id: "t9",
      platform: "tiktok",
      externalId: "tt-003",
      title: "When the group chat finds out",
      url: "https://www.tiktok.com/@memes/video/3",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=800&fit=crop",
      creatorHandle: "groupchatops",
      metrics: { views: 6700000, likes: 890000, comments: 42000, shares: 210000 },
      heatScore: 91,
      category: "Memes & Humor",
      insight:
        "Relatable group-chat memes are cross-posting hard. Brands can soft-sponsor with reaction overlays — keep logo subtle.",
      soundOrFormat: "Group Chat Sting",
    },
    {
      id: "t10",
      platform: "instagram",
      externalId: "ig-002",
      title: "Outfit transition: thrift vs. designer",
      url: "https://www.instagram.com/reel/ghi",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=800&fit=crop",
      creatorHandle: "thriftor",
      metrics: { views: 1200000, likes: 145000, comments: 5200 },
      heatScore: 77,
      category: "Beauty & Fashion",
      insight:
        "Transition formats remain durable on Reels. Fashion brands should seed dual-look transitions tied to a drop date.",
      soundOrFormat: "Transition Snap",
    },
  ],
};
