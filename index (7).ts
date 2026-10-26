import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { clothingItems, occasion, weather, styleProfile } = await req.json();

    if (!clothingItems || !Array.isArray(clothingItems) || clothingItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "No clothing items available. Add items to your wardrobe first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const itemsSummary = clothingItems.map((item: any, i: number) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      color: item.color,
      material: item.material,
      season: item.season,
      style_tags: item.style_tags || [],
    }));

    const profileContext = styleProfile ? `
User's style profile:
- Body type: ${styleProfile.body_type || "unknown"}
- Skin tone: ${styleProfile.skin_tone || "unknown"}
- Preferred colors: ${(styleProfile.preferred_colors || []).join(", ") || "none specified"}
- Style preferences: ${(styleProfile.style_preferences || []).join(", ") || "none specified"}
` : "";

    const prompt = `You are an expert AI personal stylist. Create 3 outfit combinations from the user's wardrobe for this occasion.

Occasion: ${occasion || "casual"}
Weather: ${weather || "not specified"}
${profileContext}

Available clothing items (JSON array):
${JSON.stringify(itemsSummary, null, 2)}

Return ONLY a JSON object with this structure:
{
  "outfits": [
    {
      "name": "short creative name for the outfit",
      "item_ids": ["id1", "id2", ...],
      "explanation": "2-3 sentence explanation of why this outfit works for the occasion, referencing color coordination, style balance, and appropriateness",
      "style_tags": ["tag1", "tag2"]
    }
  ]
}

Rules:
- Each outfit must use 2-6 items from the available items
- Prioritize color coordination and style coherence
- Match items to the occasion and weather
- If weather is cold, include outerwear if available
- Vary the outfits (different combinations, not just swapping one item)
- Use item IDs exactly as provided in the "id" field
- Return exactly 3 outfits`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return new Response(
        JSON.stringify({ error: "AI outfit generation failed", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const textContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return new Response(
        JSON.stringify({ error: "AI returned no content" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(textContent);
    } catch {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response");
      }
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
