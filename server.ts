/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from './src/server/db';
import { VendorListing, Product } from './src/types';
import {
  generateFallbackListings,
  generateFallbackRecommendation,
  generateFallbackImageAnalysis,
  generateFallbackChatResponse
} from './src/server/fallback';

// Initialize Express
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Google Gemini API
const geminiApiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Middleware for parsing our simulated Bearer token
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: "Unauthorized access. Please log in first." });
      return;
    }
    const token = authHeader.split(' ')[1];
    if (token === 'guest_token') {
      (req as any).user = { id: 'guest', name: 'Guest User', email: 'guest@example.com' };
      next();
      return;
    }
    // Decode token: we encoded it as base64 JSON string
    const decodedStr = Buffer.from(token, 'base64').toString('utf-8');
    const parsedUser = JSON.parse(decodedStr);
    (req as any).user = parsedUser;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired login session." });
  }
}

// -------------------------------------------------------------
// USER IDENTITY AND ACCESS APIS
// -------------------------------------------------------------

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "All registration fields (name, email, password) are required." });
    return;
  }
  try {
    const passwordHash = Buffer.from(password).toString('base64'); // Simple base64 encoding representing password hashing
    const newUser = db.registerUser(name, email, passwordHash);
    const token = Buffer.from(JSON.stringify(newUser)).toString('base64');
    res.json({ success: true, token, user: newUser });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }
  try {
    const user = db.getUserByEmail(email);
    if (!user) {
      res.status(400).json({ error: "No account exists with this email address." });
      return;
    }
    const passwordHash = Buffer.from(password).toString('base64');
    const isValid = db.verifyUserPassword(email, passwordHash);
    if (!isValid) {
      res.status(400).json({ error: "Incorrect password. Please try again." });
      return;
    }
    const token = Buffer.from(JSON.stringify(user)).toString('base64');
    res.json({ success: true, token, user });
  } catch (err: any) {
    res.status(500).json({ error: "An unexpected authentication error occurred." });
  }
});

// -------------------------------------------------------------
// CORE PRODUCT COMPARISON AND AI RECOMMENDATION APIS
// -------------------------------------------------------------

app.get('/api/products', (req, res) => {
  res.json(db.getProducts());
});

// Comparison endpoint with dynamic AI simulation fallbacks
app.get('/api/compare', authenticate, async (req, res) => {
  const { query } = req.query;
  const userId = (req as any).user?.id || 'guest';

  if (!query || typeof query !== 'string') {
    res.status(400).json({ error: "Search query is required." });
    return;
  }

  try {
    let listings = db.searchVendorListings(query);

    // AI SYNTHETIC SEARCH FALLBACK:
    // If we don't have database products matching the query, use Gemini to generate mock market listings!
    // This allows the app to perform search & comparisons on ANY product!
    if (listings.length === 0) {
      const runFallbackSourcing = () => {
        console.log(`Using offline high-quality fallback listings generator for '${query}'.`);
        const fallbackListings = generateFallbackListings(query);
        if (fallbackListings && fallbackListings.length > 0) {
          const brand = fallbackListings[0].vendorName || "Retailer";
          const newProduct = db.addProduct({
            name: fallbackListings[0].productName,
            category: "General Merchandise",
            brand,
            basePrice: fallbackListings[0].price,
            specs: fallbackListings[0].specs || {}
          });

          fallbackListings.forEach((item: any) => {
            db.addVendorListing({
              productId: newProduct.id,
              productName: item.productName,
              vendorName: item.vendorName,
              price: item.price,
              discount: item.discount,
              rating: item.rating,
              deliveryCost: item.deliveryCost,
              warranty: item.warranty,
              availability: item.availability,
              specs: item.specs || {},
              productUrl: item.productUrl,
              reviewsCount: item.reviewsCount
            });
          });

          listings = db.searchVendorListings(query);
        }
      };

      if (geminiApiKey) {
        try {
          console.log(`No local catalog listings found for '${query}'. Utilizing Gemini to synthesize market pricing data.`);
          const prompt = `You are a product data aggregator. Generate 4 to 6 realistic multi-vendor shopping listings (with details like pricing, discounts, and delivery charges) for the search query: "${query}".
You MUST include separate listings representing major Indian shopping platforms: Amazon, Flipkart, Meesho, and Myntra where applicable (e.g., fashion, electronics, home items). Also include other relevant stores like Ajio, Nykaa, Reliance Digital, Croma, Tata CLiQ, etc. depending on category.
Return a JSON array strictly conforming to this Schema. Make prices realistic for the item searched:
[
  {
    "productName": "Full descriptive name of the specific product version",
    "vendorName": "Realistic vendor name (e.g. Amazon, Flipkart, Myntra, Meesho, Ajio, Nykaa, Croma, Reliance Digital)",
    "price": 45000, // Price in Rupees (INR) or localized units. Return an integer.
    "discount": 12, // Discount percentage (0-30)
    "rating": 4.5, // Customer rating (3.5 to 5.0)
    "deliveryCost": 99, // Delivery fee (0 to 250)
    "warranty": "Warranty info, e.g. '1 Year Manufacturer' or '2 Year Extended Store'",
    "availability": true, // Boolean
    "specs": { "Primary Spec": "Value", "Secondary Spec": "Value" }, // Key-value spec strings
    "productUrl": "https://example.com/product",
    "reviewsCount": 245
  }
]`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    productName: { type: Type.STRING },
                    vendorName: { type: Type.STRING },
                    price: { type: Type.INTEGER },
                    discount: { type: Type.INTEGER },
                    rating: { type: Type.NUMBER },
                    deliveryCost: { type: Type.INTEGER },
                    warranty: { type: Type.STRING },
                    availability: { type: Type.BOOLEAN },
                    productUrl: { type: Type.STRING },
                    reviewsCount: { type: Type.INTEGER },
                    specs: {
                      type: Type.OBJECT,
                      properties: {
                        "Primary Spec": { type: Type.STRING }
                      },
                      additionalProperties: { type: Type.STRING }
                    }
                  },
                  required: ["productName", "vendorName", "price", "discount", "rating", "deliveryCost", "warranty", "availability"]
                }
              }
            }
          });

          const jsonStr = response.text || "[]";
          const rawListings = JSON.parse(jsonStr.trim());

          // Save generated product and vendors to our db to ensure they persist
          if (rawListings && rawListings.length > 0) {
            // Register a catalog product for the search
            const brand = rawListings[0].vendorName || "Retailer";
            const newProduct = db.addProduct({
              name: rawListings[0].productName,
              category: "General Merchandise",
              brand,
              basePrice: rawListings[0].price,
              specs: rawListings[0].specs || {}
            });

            // Register each listing
            rawListings.forEach((item: any) => {
              db.addVendorListing({
                productId: newProduct.id,
                productName: item.productName,
                vendorName: item.vendorName,
                price: item.price,
                discount: item.discount,
                rating: item.rating,
                deliveryCost: item.deliveryCost,
                warranty: item.warranty,
                availability: item.availability,
                specs: item.specs || {},
                productUrl: item.productUrl || `https://www.${item.vendorName.toLowerCase().replace(/\s+/g, '')}.com/s?q=${encodeURIComponent(item.productName)}`,
                reviewsCount: item.reviewsCount || Math.floor(Math.random() * 500) + 12
              });
            });

            // Fetch the listings we just inserted
            listings = db.searchVendorListings(query);
          }
        } catch (geminiErr) {
          console.error("Gemini listing synthesis failed, falling back to local generator:", geminiErr);
          runFallbackSourcing();
        }
      } else {
        console.log("No Gemini API Key, calling offline generator.");
        runFallbackSourcing();
      }
    }

    // Save search in history
    db.addSearchHistory(userId, query, listings.length);

    res.json({
      query,
      listings
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to perform product search comparison." });
  }
});

// Gemini-powered Structured Product Recommendation
app.post('/api/recommend', authenticate, async (req, res) => {
  const { query, listings, imageBase64 } = req.body;
  const userId = (req as any).user?.id || 'guest';

  if (!query || !listings || !Array.isArray(listings) || listings.length === 0) {
    res.status(400).json({ error: "Query and a valid listings list are required to generate recommendations." });
    return;
  }

  try {
    const compileAndSendReport = (rec: any) => {
      // Backward Compatibility Mapping: Map new schema fields to legacy fields so legacy components don't break
      rec.recommendedProduct = rec.product?.name || query;
      rec.recommendedVendor = rec.recommendations?.bestPlatform || "Amazon";

      // Extract numerical price from averagePrice (e.g. "₹2,800" -> 2800)
      const priceStr = rec.pricing?.averagePrice || "";
      const cleanPrice = parseInt(priceStr.replace(/[^0-9]/g, ""), 10) || 1500;
      rec.recommendedPrice = cleanPrice;

      rec.alternative = rec.recommendations?.premiumAlternative || "Alternative option";
      rec.durabilityEstimate = rec.qualityScores?.durability || "High durability";
      rec.bestUseCases = rec.product?.description || "";

      rec.overallQualityScore = parseFloat(rec.qualityScores?.overall) || 8.5;
      rec.valueForMoneyScore = parseFloat(rec.qualityScores?.valueForMoney) || 8.5;
      rec.buildQualityScore = parseFloat(rec.qualityScores?.buildQuality) || 8.5;
      rec.popularityScore = parseFloat(rec.qualityScores?.customerSatisfaction) || 8.5;
      rec.brandTrustScore = parseFloat(rec.qualityScores?.overall) || 8.5;
      rec.customerSatisfactionScore = parseFloat(rec.qualityScores?.customerSatisfaction) || 8.5;

      // Convert recommendations buyDecision and reason into buyingFaq questions
      rec.buyingFaq = [
        { question: "Should I buy this product now?", answer: rec.recommendations?.buyDecision || "Yes" },
        { question: "Is it worth the money?", answer: rec.recommendations?.reason || "Yes" },
        { question: "Who is this product ideal for?", answer: `This is perfect for someone looking for a ${rec.product?.style || "stylish"} and ${rec.product?.material || "high-quality"} option.` },
        { question: "What is the premium alternative?", answer: rec.recommendations?.premiumAlternative || "N/A" }
      ];

      // Convert comparison platforms into similarProducts or visuallySimilar
      rec.similarProducts = (rec.comparison || []).map((c: any) => {
        const pPrice = parseInt(c.price.replace(/[^0-9]/g, ""), 10) || cleanPrice;
        return {
          name: `${rec.product?.name} (${c.platform})`,
          price: pPrice,
          type: c.platform === rec.recommendations?.cheapestPlatform ? "cheaper" : "trending",
          platform: c.platform,
          rating: parseFloat(c.rating) || 4.2
        };
      });

      // Record the recommendation history
      db.addRecommendationHistory(userId, query, rec, imageBase64);

      res.json(rec);
    };

    if (!geminiApiKey) {
      console.log("Gemini API key is missing. Utilizing local high-fidelity recommender.");
      const fallbackRec = generateFallbackRecommendation(query, listings);
      compileAndSendReport(fallbackRec);
      return;
    }

    // Format listings into a clean markdown table for Gemini
    let markdownTable = "| Vendor | Product Name | Price (₹) | Discount (%) | Rating | Delivery (₹) | Warranty | Availability |\n";
    markdownTable += "|---|---|---|---|---|---|---|---|\n";
    listings.forEach((v: VendorListing) => {
      markdownTable += `| ${v.vendorName} | ${v.productName} | ${v.price} | ${v.discount}% | ${v.rating} | ${v.deliveryCost} | ${v.warranty} | ${v.availability ? "In Stock" : "Out of Stock"} |\n`;
    });

    const systemInstruction = `You are ShopGenie AI, an advanced Universal AI Shopping Assistant.
Your task is to analyze ANY product query or image and generate a complete shopping intelligence report.
You must return the result strictly in VALID JSON matching the specified schema.
Never return HTML. Never return Markdown. Never return plain text. Return JSON only.
If live shopping information is unavailable, generate realistic estimated comparison data suitable for demonstration purposes. Do not say "I cannot access shopping websites." Instead, provide intelligent estimated results. Always provide a complete response. Never leave any field empty.`;

    const prompt = `Perform a complete shopping intelligence analysis and comparison report for the query: "${query}"
The available platform listings are:
${markdownTable}

You MUST include comprehensive entries for multiple major e-commerce platforms in India under the "comparison" array. Specifically, you MUST include comparative listings for at least these 4 platforms: Flipkart, Amazon, Meesho, and Myntra, along with other relevant platforms (like Ajio, Nykaa, Croma, Tata CliQ) depending on the product type. Ensure the price, rating, discount, and availability details are filled out with highly realistic estimates for each of these platforms.

Structure the JSON output exactly matching this schema:
{
  "product": {
    "name": "Specific identified name of the product",
    "category": "Main category of product (e.g., Clothing, Cosmetics, Mobiles, Shoes, Watches, Laptops, Furniture, etc.)",
    "subcategory": "Subcategory (e.g., Running Shoes, Chronograph Watches, Gaming Laptops)",
    "brand": "Identified brand (e.g., Nike, Samsung, Sony)",
    "model": "Model name or number if recognized",
    "color": "Plausible primary color",
    "material": "Material composition (e.g., Leather, Mesh, Stainless Steel, Aluminum)",
    "style": "Product style (e.g., Casual, Formal, Sporty, Luxury, Minimalist)",
    "description": "Detailed description of the product mentioning main features, build quality, material quality, design, durability, comfort, expected lifetime, and best usage."
  },
  "pricing": {
    "minimumPrice": "Estimated minimum market price in Rupees (e.g., ₹2,200)",
    "maximumPrice": "Estimated maximum market price in Rupees (e.g., ₹3,500)",
    "averagePrice": "Estimated average selling price in Rupees (e.g., ₹2,800)"
  },
  "comparison": [
    {
      "platform": "Platform Name (e.g., Amazon, Flipkart, Myntra, Ajio, Meesho, Nykaa, Reliance Digital, Croma, Tata CliQ, Pepperfry, FirstCry, Snapdeal)",
      "price": "Plausible platform price (e.g., ₹2,499)",
      "rating": "Platform Rating out of 5 (e.g., 4.3)",
      "discount": "Platform discount percentage (e.g., 15%)",
      "delivery": "Delivery fee or time details (e.g., Free Delivery, Delivery in 2 Days)",
      "availability": "Availability status (e.g., In Stock, Out of Stock, Only 2 Left)",
      "sellerTrust": "Seller Trust Score out of 10 or percentage (e.g., 9.2/10, 92%)"
    }
  ],
  "qualityScores": {
    "overall": "Overall quality score out of 10",
    "buildQuality": "Build Quality score out of 10",
    "design": "Design score out of 10",
    "performance": "Performance score out of 10",
    "durability": "Durability score out of 10",
    "valueForMoney": "Value For Money score out of 10",
    "customerSatisfaction": "Customer Satisfaction score out of 10"
  },
  "pros": [
    "Specific advantage 1",
    "Specific advantage 2"
  ],
  "cons": [
    "Specific limitation or downside 1",
    "Specific limitation or downside 2"
  ],
  "recommendations": {
    "bestPlatform": "Recommended best platform to purchase from",
    "cheapestPlatform": "Platform offering the lowest price",
    "highestRatedPlatform": "Platform with the highest rating",
    "premiumAlternative": "Name of a premium alternative product",
    "budgetAlternative": "Name of a budget-friendly alternative product",
    "buyDecision": "Answer to: Should I Buy It? (e.g., Yes, Buy Now / Wait for Sale / Avoid)",
    "reason": "Detailed explanation of why, is it worth the money, who should buy it, who should avoid it, and if they should wait for a sale."
  },
  "confidenceScore": "Confidence score percentage (e.g., 95%)"
}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              product: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  subcategory: { type: Type.STRING },
                  brand: { type: Type.STRING },
                  model: { type: Type.STRING },
                  color: { type: Type.STRING },
                  material: { type: Type.STRING },
                  style: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["name", "category", "subcategory", "brand", "model", "color", "material", "style", "description"]
              },
              pricing: {
                type: Type.OBJECT,
                properties: {
                  minimumPrice: { type: Type.STRING },
                  maximumPrice: { type: Type.STRING },
                  averagePrice: { type: Type.STRING }
                },
                required: ["minimumPrice", "maximumPrice", "averagePrice"]
              },
              comparison: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    platform: { type: Type.STRING },
                    price: { type: Type.STRING },
                    rating: { type: Type.STRING },
                    discount: { type: Type.STRING },
                    delivery: { type: Type.STRING },
                    availability: { type: Type.STRING },
                    sellerTrust: { type: Type.STRING }
                  },
                  required: ["platform", "price", "rating", "discount", "delivery", "availability", "sellerTrust"]
                }
              },
              qualityScores: {
                type: Type.OBJECT,
                properties: {
                  overall: { type: Type.STRING },
                  buildQuality: { type: Type.STRING },
                  design: { type: Type.STRING },
                  performance: { type: Type.STRING },
                  durability: { type: Type.STRING },
                  valueForMoney: { type: Type.STRING },
                  customerSatisfaction: { type: Type.STRING }
                },
                required: ["overall", "buildQuality", "design", "performance", "durability", "valueForMoney", "customerSatisfaction"]
              },
              pros: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              cons: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              recommendations: {
                type: Type.OBJECT,
                properties: {
                  bestPlatform: { type: Type.STRING },
                  cheapestPlatform: { type: Type.STRING },
                  highestRatedPlatform: { type: Type.STRING },
                  premiumAlternative: { type: Type.STRING },
                  budgetAlternative: { type: Type.STRING },
                  buyDecision: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["bestPlatform", "cheapestPlatform", "highestRatedPlatform", "premiumAlternative", "budgetAlternative", "buyDecision", "reason"]
              },
              confidenceScore: { type: Type.STRING }
            },
            required: [
              "product",
              "pricing",
              "comparison",
              "qualityScores",
              "pros",
              "cons",
              "recommendations",
              "confidenceScore"
            ]
          }
        }
      });

      const resultText = response.text || "{}";
      const recommendation = JSON.parse(resultText.trim());
      compileAndSendReport(recommendation);
    } catch (geminiErr: any) {
      console.error("Gemini model call failed or returned bad JSON. Utilizing local fallback recommender.", geminiErr);
      const fallbackRec = generateFallbackRecommendation(query, listings);
      compileAndSendReport(fallbackRec);
    }
  } catch (err: any) {
    console.error("Critical error in /api/recommend handler:", err);
    res.status(500).json({ error: `Recommendation failed: ${err.message}` });
  }
});

// Gemini Vision Image-Based Product Search
app.post('/api/image-search', authenticate, async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  const userId = (req as any).user?.id || 'guest';

  if (!imageBase64) {
    res.status(400).json({ error: "Product image base64 data is required." });
    return;
  }

  // Helper to run offline fallback
  const runOfflineFallback = () => {
    console.log("Using offline fallback image analysis & listings generator.");
    const analysis = generateFallbackImageAnalysis(imageBase64);
    const targetProductQuery = analysis.productName;

    // Generate robust listings for Flipkart, Amazon, Meesho, Myntra
    const fallbackListings = generateFallbackListings(targetProductQuery);
    let listings: VendorListing[] = [];

    if (fallbackListings && fallbackListings.length > 0) {
      const newProduct = db.addProduct({
        name: fallbackListings[0].productName,
        category: analysis.productCategory,
        brand: analysis.brand,
        basePrice: fallbackListings[0].price,
        specs: {
          "Color": analysis.primaryColor,
          "Material": analysis.material,
          "Style": analysis.style,
          "Pattern": analysis.patternOrDesign
        }
      });

      fallbackListings.forEach((item: any) => {
        db.addVendorListing({
          productId: newProduct.id,
          productName: item.productName,
          vendorName: item.vendorName,
          price: item.price,
          discount: item.discount,
          rating: item.rating,
          deliveryCost: item.deliveryCost,
          warranty: item.warranty,
          availability: item.availability,
          specs: item.specs || {},
          productUrl: item.productUrl,
          reviewsCount: item.reviewsCount
        });
      });

      listings = db.searchVendorListings(targetProductQuery);
    }

    db.addSearchHistory(userId, targetProductQuery, listings.length, {
      ...analysis,
      imageBase64
    });

    res.json({
      success: true,
      analysis,
      listings,
      query: targetProductQuery
    });
  };

  try {
    if (!geminiApiKey) {
      console.log("No Gemini API key. Utilizing local fallback image analysis.");
      runOfflineFallback();
      return;
    }

    // Clean base64 string
    let cleanedBase64 = imageBase64;
    if (imageBase64.includes(';base64,')) {
      cleanedBase64 = imageBase64.split(';base64,')[1];
    }

    console.log("Analyzing product image using Gemini Vision...");
    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: cleanedBase64
      }
    };

    const promptPart = {
      text: `You are an expert AI Shopping Assistant. Analyze the uploaded product image.
Identify:
1. Product Name (be highly specific, include version or descriptors if possible)
2. Product Category (such as Clothing, Shoes, Watches, Handbags, Accessories, Cosmetics, Mobiles, Laptops, Tablets, Headphones, Home Appliances, etc.)
3. Brand Name (identify any visible logos, patterns, or brand design style; if not recognized, estimate a typical plausible brand in that category)
4. Primary Color
5. Material (e.g. leather, cotton, rubber, steel, plastic, glass)
6. Pattern or Design (e.g. solid, striped, checkered, athletic, textured)
7. Product Type (e.g. sneakers, dress, chronograph, tote bag, wireless headphones)
8. Style (e.g. casual, formal, sporty, luxury, streetwear)
9. Estimated Price Range (realistic range in Rupees (INR), e.g. "₹2,500 - ₹3,500" or "₹60,000 - ₹70,000")

Provide the output strictly as a JSON object matching this schema:
{
  "productName": "Descriptive Product Name",
  "productCategory": "Product Category",
  "brand": "Identified Brand Name",
  "primaryColor": "Main Color",
  "material": "Estimated Material",
  "patternOrDesign": "Pattern Description",
  "productType": "Specific Type",
  "style": "Fashion or Product Style",
  "estimatedPriceRange": "Estimated Price Range"
}`
    };

    let visionResponse;
    try {
      visionResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: { parts: [imagePart, promptPart] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              productCategory: { type: Type.STRING },
              brand: { type: Type.STRING },
              primaryColor: { type: Type.STRING },
              material: { type: Type.STRING },
              patternOrDesign: { type: Type.STRING },
              productType: { type: Type.STRING },
              style: { type: Type.STRING },
              estimatedPriceRange: { type: Type.STRING }
            },
            required: ["productName", "productCategory", "brand", "primaryColor", "material", "patternOrDesign", "productType", "style", "estimatedPriceRange"]
          }
        }
      });
    } catch (visionErr) {
      console.error("Gemini Vision content generation failed:", visionErr);
      runOfflineFallback();
      return;
    }

    const analysisText = visionResponse.text || "{}";
    let analysis;
    try {
      analysis = JSON.parse(analysisText.trim());
    } catch (parseErr) {
      console.error("Failed to parse Gemini Vision response JSON:", parseErr);
      runOfflineFallback();
      return;
    }

    // Clean name for query
    const targetProductQuery = analysis.productName;

    // Search existing DB listings first
    let listings = db.searchVendorListings(targetProductQuery);

    // If no direct database matches, synthesize multi-vendor listings using Gemini
    if (listings.length === 0) {
      console.log(`Synthesizing dynamic multi-vendor listings for analyzed product: '${targetProductQuery}'`);
      const synthesisPrompt = `You are a shopping search engine. Generate 3 to 4 realistic multi-vendor shopping listings for the identified product: "${targetProductQuery}" (Category: ${analysis.productCategory}, brand: ${analysis.brand}).
The listings MUST be spread across relevant shopping platforms depending on the product's category (for example: Amazon, Flipkart, Myntra, Ajio, Nykaa, Tata CLiQ, Reliance Digital, Croma, Meesho, Snapdeal, FirstCry, IKEA, Pepperfry, etc. Choose platforms that make sense for fashion vs electronics vs home products!).
Return a JSON array strictly conforming to this Schema. Make prices realistic and in Indian Rupees (INR):
[
  {
    "productName": "Full descriptive name of the specific product version matching original",
    "vendorName": "Platform (e.g. Amazon, Myntra, Ajio, Nykaa)",
    "price": 2500, // Return an integer
    "discount": 15, // percentage
    "rating": 4.4,
    "deliveryCost": 50,
    "warranty": "Warranty/Return policy description",
    "availability": true,
    "specs": { "Main Spec": "Value" },
    "productUrl": "https://example.com/product",
    "reviewsCount": 150
  }
]`;

      try {
        const synthesisResponse = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: synthesisPrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productName: { type: Type.STRING },
                  vendorName: { type: Type.STRING },
                  price: { type: Type.INTEGER },
                  discount: { type: Type.INTEGER },
                  rating: { type: Type.NUMBER },
                  deliveryCost: { type: Type.INTEGER },
                  warranty: { type: Type.STRING },
                  availability: { type: Type.BOOLEAN },
                  productUrl: { type: Type.STRING },
                  reviewsCount: { type: Type.INTEGER },
                  specs: {
                    type: Type.OBJECT,
                    properties: {
                      "Main Spec": { type: Type.STRING }
                    },
                    additionalProperties: { type: Type.STRING }
                  }
                },
                required: ["productName", "vendorName", "price", "discount", "rating", "deliveryCost", "warranty", "availability"]
              }
            }
          }
        });

        const rawSynthesisListings = JSON.parse(synthesisResponse.text || "[]");
        if (rawSynthesisListings && rawSynthesisListings.length > 0) {
          // Save to DB so they persist
          const newProduct = db.addProduct({
            name: rawSynthesisListings[0].productName,
            category: analysis.productCategory,
            brand: analysis.brand,
            basePrice: rawSynthesisListings[0].price,
            specs: {
              "Color": analysis.primaryColor,
              "Material": analysis.material,
              "Style": analysis.style,
              "Pattern": analysis.patternOrDesign
            }
          });

          rawSynthesisListings.forEach((item: any) => {
            db.addVendorListing({
              productId: newProduct.id,
              productName: item.productName,
              vendorName: item.vendorName,
              price: item.price,
              discount: item.discount,
              rating: item.rating,
              deliveryCost: item.deliveryCost,
              warranty: item.warranty,
              availability: item.availability,
              specs: item.specs || {},
              productUrl: item.productUrl || `https://www.${item.vendorName.toLowerCase().replace(/\s+/g, '')}.com/s?q=${encodeURIComponent(item.productName)}`,
              reviewsCount: item.reviewsCount || Math.floor(Math.random() * 500) + 12
            });
          });

          listings = db.searchVendorListings(targetProductQuery);
        }
      } catch (synthErr) {
        console.error("Gemini listing synthesis failed, using local listings generator:", synthErr);
        const fallbackListings = generateFallbackListings(targetProductQuery);
        if (fallbackListings && fallbackListings.length > 0) {
          const newProduct = db.addProduct({
            name: fallbackListings[0].productName,
            category: analysis.productCategory,
            brand: analysis.brand,
            basePrice: fallbackListings[0].price,
            specs: {
              "Color": analysis.primaryColor,
              "Material": analysis.material,
              "Style": analysis.style,
              "Pattern": analysis.patternOrDesign
            }
          });

          fallbackListings.forEach((item: any) => {
            db.addVendorListing({
              productId: newProduct.id,
              productName: item.productName,
              vendorName: item.vendorName,
              price: item.price,
              discount: item.discount,
              rating: item.rating,
              deliveryCost: item.deliveryCost,
              warranty: item.warranty,
              availability: item.availability,
              specs: item.specs || {},
              productUrl: item.productUrl,
              reviewsCount: item.reviewsCount
            });
          });

          listings = db.searchVendorListings(targetProductQuery);
        }
      }
    }

    // Save search in history with image analysis details
    db.addSearchHistory(userId, targetProductQuery, listings.length, {
      ...analysis,
      imageBase64: imageBase64 // store full image
    });

    res.json({
      success: true,
      analysis,
      listings,
      query: targetProductQuery
    });
  } catch (err: any) {
    console.error("Critical error in /api/image-search:", err);
    runOfflineFallback();
  }
});

// FAVORITE PRODUCTS ROUTING
app.get('/api/favorites', authenticate, (req, res) => {
  const userId = (req as any).user?.id || 'guest';
  res.json(db.getFavorites(userId));
});

app.post('/api/favorites', authenticate, (req, res) => {
  const userId = (req as any).user?.id || 'guest';
  const { productName, vendorName, price, discount, rating, productUrl } = req.body;

  if (!productName || !vendorName) {
    res.status(400).json({ error: "productName and vendorName are required." });
    return;
  }

  const favorite = db.addFavorite(
    userId,
    productName,
    vendorName,
    Number(price || 0),
    Number(discount || 0),
    Number(rating || 4.0),
    productUrl
  );

  res.json({ success: true, favorite });
});

app.delete('/api/favorites/:id', authenticate, (req, res) => {
  const userId = (req as any).user?.id || 'guest';
  const { id } = req.params;

  const success = db.removeFavorite(userId, id);
  if (success) {
    res.json({ success: true, message: "Favorite product removed successfully." });
  } else {
    res.status(404).json({ error: "Favorite item not found." });
  }
});

// PRODUCT RATINGS & REVIEWS ROUTING
app.get('/api/ratings', (req, res) => {
  const { productName } = req.query;
  if (productName && typeof productName === 'string') {
    res.json(db.getProductRatings(productName));
  } else {
    res.json(db.getAllProductRatings());
  }
});

app.post('/api/ratings', authenticate, (req, res) => {
  const userId = (req as any).user?.id || 'guest';
  const userName = (req as any).user?.name || 'Anonymous User';
  const { productName, rating, comment } = req.body;

  if (!productName || !rating) {
    res.status(400).json({ error: "productName and rating are required." });
    return;
  }

  const review = db.addProductRating(
    userId,
    userName,
    productName,
    Number(rating),
    comment || ""
  );

  res.json({ success: true, review });
});

// Follow-up questions conversation api
app.post('/api/recommend/chat', authenticate, async (req, res) => {
  const { query, recommendationContext, chatHistory, userMessage } = req.body;

  if (!query || !recommendationContext || !userMessage) {
    res.status(400).json({ error: "Query, recommendation context, and user message are required." });
    return;
  }

  try {
    if (!geminiApiKey) {
      console.log("No Gemini API key available. Running offline chat fallback.");
      const reply = generateFallbackChatResponse(query, userMessage, recommendationContext);
      res.json({ reply });
      return;
    }

    // Convert chat history to structure
    const formattedHistory = (chatHistory || []).map((msg: any) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // Start Chat session using the standard SDK chat helper
    const chat = ai.chats.create({
      model: 'gemini-3.5-flash',
      config: {
        systemInstruction: `You are an expert AI Price Comparison Assistant in a final-year student project.
You previously analyzed product listings for the search query: "${query}"
The AI recommend option was: "${recommendationContext.recommendedProduct}" from vendor "${recommendationContext.recommendedVendor}" at Price ₹${recommendationContext.recommendedPrice}.
Keep your answers helpful, highly objective, concise (under 120 words), and focus strictly on helping the user select the best shopping option.`
      },
      history: formattedHistory
    });

    const response = await chat.sendMessage({ message: userMessage });
    res.json({ reply: response.text });
  } catch (err: any) {
    console.error("Gemini chat follow-up failed, falling back to offline reply:", err);
    const reply = generateFallbackChatResponse(query, userMessage, recommendationContext);
    res.json({ reply });
  }
});

// -------------------------------------------------------------
// USER DASHBOARD AND HISTORICAL AUDITS
// -------------------------------------------------------------

app.get('/api/history', authenticate, (req, res) => {
  const userId = (req as any).user?.id || 'guest';
  res.json(db.getUserHistory(userId));
});

app.get('/api/profile', authenticate, (req, res) => {
  const userId = (req as any).user?.id || 'guest';
  const history = db.getUserHistory(userId);
  res.json({
    user: (req as any).user,
    totalSearches: history.searches.length,
    totalRecommendations: history.recommendations.length,
    recentSearches: history.searches.slice(0, 5)
  });
});

// -------------------------------------------------------------
// ADMIN DATA ACTIONS
// -------------------------------------------------------------

app.post('/api/admin/products', authenticate, (req, res) => {
  const { name, category, brand, basePrice, specs } = req.body;
  if (!name || !category || !brand || !basePrice) {
    res.status(400).json({ error: "Name, category, brand, and basePrice are required." });
    return;
  }
  const newProduct = db.addProduct({ name, category, brand, basePrice, specs: specs || {} });
  res.json({ success: true, product: newProduct });
});

app.post('/api/admin/vendors', authenticate, (req, res) => {
  const { productId, productName, vendorName, price, discount, rating, deliveryCost, warranty, availability, specs } = req.body;
  if (!productId || !productName || !vendorName || price === undefined) {
    res.status(400).json({ error: "ProductId, productName, vendorName, and price are required." });
    return;
  }
  const newListing = db.addVendorListing({
    productId,
    productName,
    vendorName,
    price: Number(price),
    discount: Number(discount || 0),
    rating: Number(rating || 4.0),
    deliveryCost: Number(deliveryCost || 0),
    warranty: warranty || "1 Year Warranty",
    availability: availability !== false,
    specs: specs || {}
  });
  res.json({ success: true, listing: newListing });
});

// Global error handler to catch middleware errors (like PayloadTooLargeError) and return JSON
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    console.error("Express global error handler caught error:", err);
    res.status(err.status || 500).json({
      error: err.message || "An unexpected server-side error occurred."
    });
    return;
  }
  next();
});

// -------------------------------------------------------------
// FRAMEWORK STATIC FILE SERVERS AND VITE INTEGRATIONS
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite middleware in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve build bundle in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Price Comparison Agent server running on http://localhost:${PORT}`);
  });
}

export default app;

if (!process.env.VERCEL) {
  startServer();
}
