import { CreatorCrawl } from "@creatorcrawl/sdk";

let client: CreatorCrawl | null = null;

export function getCreatorCrawl(): CreatorCrawl {
  const apiKey = process.env.CREATORCRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("CREATORCRAWL_API_KEY is not set");
  }
  if (!client) {
    client = new CreatorCrawl({ apiKey, timeout: 45_000 });
  }
  return client;
}

export function isCreatorCrawlConfigured(): boolean {
  return Boolean(process.env.CREATORCRAWL_API_KEY);
}
