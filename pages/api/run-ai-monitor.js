import { detectSlippingEngagementAndSuggestActions } from "@/lib/ai/engagement";

export default async function handler(req, res) {
  try {
    const result = await detectSlippingEngagementAndSuggestActions();
    return res.status(200).json({
      success: true,
      message: "AI monitoring executed",
      updated: result.updated,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message ?? "cron failed",
    });
  }
}
