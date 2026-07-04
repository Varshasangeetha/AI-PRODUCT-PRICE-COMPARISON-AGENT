/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  basePrice: number;
  specs: Record<string, string>;
}

export interface VendorListing {
  id: string;
  productId: string;
  productName: string;
  vendorName: string;
  price: number;
  discount: number; // percentage, e.g. 10 for 10%
  rating: number; // 1.0 to 5.0
  deliveryCost: number;
  warranty: string;
  availability: boolean;
  specs: Record<string, string>;
  productUrl?: string;
  reviewsCount?: number;
}

export interface SearchRecord {
  id: string;
  userId: string;
  query: string;
  timestamp: string;
  vendorCount: number;
  imageAnalysis?: ImageAnalysis;
}

export interface ImageAnalysis {
  productName: string;
  productCategory: string;
  brand: string;
  primaryColor: string;
  material: string;
  patternOrDesign: string;
  productType: string;
  style: string;
  estimatedPriceRange: string;
  imageBase64?: string;
}

export interface AiRecommendation {
  // New ShopGenie Schema
  product?: {
    name: string;
    category: string;
    subcategory: string;
    brand: string;
    model: string;
    color: string;
    material: string;
    style: string;
    description: string;
  };
  pricing?: {
    minimumPrice: string;
    maximumPrice: string;
    averagePrice: string;
  };
  comparison?: {
    platform: string;
    price: string;
    rating: string;
    discount: string;
    delivery: string;
    availability: string;
    sellerTrust: string;
  }[];
  qualityScores?: {
    overall: string;
    buildQuality: string;
    design: string;
    performance: string;
    durability: string;
    valueForMoney: string;
    customerSatisfaction: string;
  };
  recommendations?: {
    bestPlatform: string;
    cheapestPlatform: string;
    highestRatedPlatform: string;
    premiumAlternative: string;
    budgetAlternative: string;
    buyDecision: string;
    reason: string;
  };
  confidenceScore?: string;

  // Legacy fields (optional)
  recommendedVendor?: string;
  recommendedProduct?: string;
  recommendedPrice?: number;
  reasoning?: string[];
  pros?: string[];
  cons?: string[];
  alternative?: string;
  overallQualityScore?: number;
  valueForMoneyScore?: number;
  buildQualityScore?: number;
  popularityScore?: number;
  brandTrustScore?: number;
  customerSatisfactionScore?: number;
  durabilityEstimate?: string;
  bestUseCases?: string;
  buyingFaq?: { question: string; answer: string }[];
  similarProducts?: { name: string; price: number; type: 'cheaper' | 'premium' | 'trending' | 'higher-rating' | string; platform: string; rating: number }[];
  visuallySimilar?: { name: string; price: number; matchPercentage: number; platform: string; color: string; relation: string }[];
}

export interface AiRecommendationRecord {
  id: string;
  userId: string;
  query: string;
  recommendation: AiRecommendation;
  timestamp: string;
  imageBase64?: string;
}

export interface FavoriteProduct {
  id: string;
  userId: string;
  productName: string;
  vendorName: string;
  price: number;
  discount: number;
  rating: number;
  productUrl?: string;
  savedAt: string;
}

export interface ProductRating {
  id: string;
  userId: string;
  userName: string;
  productName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface Message {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

