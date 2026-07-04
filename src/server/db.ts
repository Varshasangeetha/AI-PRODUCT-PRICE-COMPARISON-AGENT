/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { User, Product, VendorListing, SearchRecord, AiRecommendationRecord, FavoriteProduct, ProductRating, ImageAnalysis } from '../types';

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'db.json');

// Initialize empty DB structures
interface DatabaseSchema {
  users: User[];
  passwordHashes: Record<string, string>; // email -> hashed_password (or simple password for prototype)
  products: Product[];
  vendors: VendorListing[];
  searchHistory: SearchRecord[];
  recommendationHistory: AiRecommendationRecord[];
  favorites: FavoriteProduct[];
  productRatings: ProductRating[];
}

const defaultDb: DatabaseSchema = {
  users: [],
  passwordHashes: {},
  products: [
    {
      id: "p1",
      name: "iPhone 15 (128GB)",
      category: "Smartphones",
      brand: "Apple",
      basePrice: 79900,
      specs: { "Display": "6.1 inches Super Retina XDR", "Chip": "A16 Bionic", "Camera": "48MP Dual Camera" }
    },
    {
      id: "p2",
      name: "ASUS VivoBook 15 (Ryzen 5, 16GB)",
      category: "Laptops",
      brand: "ASUS",
      basePrice: 48990,
      specs: { "Processor": "AMD Ryzen 5 5500U", "RAM": "16GB DDR4", "Storage": "512GB SSD" }
    },
    {
      id: "p3",
      name: "Lenovo IdeaPad Slim 3 (Core i5, 16GB)",
      category: "Laptops",
      brand: "Lenovo",
      basePrice: 58990,
      specs: { "Processor": "Intel Core i5 12th Gen", "RAM": "16GB DDR4", "Storage": "512GB SSD" }
    },
    {
      id: "p4",
      name: "Razer BlackShark V2 Pro",
      category: "Audio",
      brand: "Razer",
      basePrice: 15999,
      specs: { "Connection": "Wireless Hyperspeed", "Drivers": "Triforce Titanium 50mm", "Microphone": "HyperClear Supercardioid" }
    },
    {
      id: "p5",
      name: "Logitech G435 Lightspeed",
      category: "Audio",
      brand: "Logitech",
      basePrice: 6495,
      specs: { "Connection": "Bluetooth & Lightspeed Wireless", "Weight": "165g", "Battery": "18 Hours" }
    },
    {
      id: "p6",
      name: "Sony WH-1000XM5",
      category: "Audio",
      brand: "Sony",
      basePrice: 29990,
      specs: { "ANC": "Industry Leading Noise Cancelling", "Battery": "30 Hours", "Driver": "30mm specially designed" }
    }
  ],
  vendors: [
    // iPhone 15 Listings
    {
      id: "v1_1",
      productId: "p1",
      productName: "iPhone 15 (128GB)",
      vendorName: "Amazon",
      price: 71200,
      discount: 11,
      rating: 4.6,
      deliveryCost: 0,
      warranty: "1 Year Apple Warranty",
      availability: true,
      specs: { "Color": "Black", "Delivery": "In 1 Day" }
    },
    {
      id: "v1_2",
      productId: "p1",
      productName: "iPhone 15 (128GB)",
      vendorName: "Flipkart",
      price: 69999,
      discount: 12,
      rating: 4.5,
      deliveryCost: 99,
      warranty: "1 Year Apple Warranty",
      availability: true,
      specs: { "Color": "Blue", "Delivery": "In 3 Days" }
    },
    {
      id: "v1_3",
      productId: "p1",
      productName: "iPhone 15 (128GB)",
      vendorName: "Croma",
      price: 72900,
      discount: 9,
      rating: 4.7,
      deliveryCost: 0,
      warranty: "1 Year Apple + 1 Year Extended Croma Warranty",
      availability: true,
      specs: { "Color": "Black", "Delivery": "Same Day Pickup" }
    },
    {
      id: "v1_4",
      productId: "p1",
      productName: "iPhone 15 (128GB)",
      vendorName: "Reliance Digital",
      price: 73500,
      discount: 8,
      rating: 4.4,
      deliveryCost: 150,
      warranty: "1 Year Apple Warranty",
      availability: false,
      specs: { "Color": "Yellow", "Delivery": "Out of Stock" }
    },

    // ASUS VivoBook 15 Listings
    {
      id: "v2_1",
      productId: "p2",
      productName: "ASUS VivoBook 15 (Ryzen 5, 16GB)",
      vendorName: "Amazon",
      price: 44990,
      discount: 8,
      rating: 4.2,
      deliveryCost: 0,
      warranty: "1 Year Brand Warranty",
      availability: true,
      specs: { "Delivery": "2 Days" }
    },
    {
      id: "v2_2",
      productId: "p2",
      productName: "ASUS VivoBook 15 (Ryzen 5, 16GB)",
      vendorName: "Flipkart",
      price: 43500,
      discount: 11,
      rating: 4.0,
      deliveryCost: 149,
      warranty: "1 Year Brand Warranty",
      availability: true,
      specs: { "Delivery": "5 Days" }
    },
    {
      id: "v2_3",
      productId: "p2",
      productName: "ASUS VivoBook 15 (Ryzen 5, 16GB)",
      vendorName: "Croma",
      price: 46990,
      discount: 4,
      rating: 4.4,
      deliveryCost: 0,
      warranty: "2 Year Extended Store Warranty",
      availability: true,
      specs: { "Delivery": "Instant Store Pickup" }
    },

    // Lenovo Slim 3 Listings
    {
      id: "v3_1",
      productId: "p3",
      productName: "Lenovo IdeaPad Slim 3 (Core i5, 16GB)",
      vendorName: "Amazon",
      price: 54990,
      discount: 7,
      rating: 4.3,
      deliveryCost: 0,
      warranty: "1 Year Brand Warranty",
      availability: true,
      specs: { "Delivery": "1 Day" }
    },
    {
      id: "v3_2",
      productId: "p3",
      productName: "Lenovo IdeaPad Slim 3 (Core i5, 16GB)",
      vendorName: "Flipkart",
      price: 52990,
      discount: 10,
      rating: 4.1,
      deliveryCost: 200,
      warranty: "1 Year Brand Warranty",
      availability: true,
      specs: { "Delivery": "4 Days" }
    },
    {
      id: "v3_3",
      productId: "p3",
      productName: "Lenovo IdeaPad Slim 3 (Core i5, 16GB)",
      vendorName: "Reliance Digital",
      price: 56900,
      discount: 4,
      rating: 4.4,
      deliveryCost: 0,
      warranty: "1 Year Manufacturer Warranty",
      availability: true,
      specs: { "Delivery": "Next Day Delivery" }
    },

    // Razer BlackShark Listings
    {
      id: "v4_1",
      productId: "p4",
      productName: "Razer BlackShark V2 Pro",
      vendorName: "Amazon",
      price: 14200,
      discount: 11,
      rating: 4.6,
      deliveryCost: 0,
      warranty: "2 Year Razer Warranty",
      availability: true,
      specs: { "Delivery": "2 Days" }
    },
    {
      id: "v4_2",
      productId: "p4",
      productName: "Razer BlackShark V2 Pro",
      vendorName: "Elite Gamers Store",
      price: 13500,
      discount: 15,
      rating: 4.8,
      deliveryCost: 150,
      warranty: "1 Year Store Replacement Warranty",
      availability: true,
      specs: { "Delivery": "3-5 Days" }
    },

    // Logitech G435 Listings
    {
      id: "v5_1",
      productId: "p5",
      productName: "Logitech G435 Lightspeed",
      vendorName: "Amazon",
      price: 5999,
      discount: 8,
      rating: 4.4,
      deliveryCost: 0,
      warranty: "2 Year Logitech Warranty",
      availability: true,
      specs: { "Delivery": "1 Day" }
    },
    {
      id: "v5_2",
      productId: "p5",
      productName: "Logitech G435 Lightspeed",
      vendorName: "Flipkart",
      price: 5799,
      discount: 10,
      rating: 4.2,
      deliveryCost: 99,
      warranty: "2 Year Logitech Warranty",
      availability: true,
      specs: { "Delivery": "3 Days" }
    },

    // Sony WH-1000XM5 Listings
    {
      id: "v6_1",
      productId: "p6",
      productName: "Sony WH-1000XM5",
      vendorName: "Amazon",
      price: 27990,
      discount: 7,
      rating: 4.7,
      deliveryCost: 0,
      warranty: "1 Year Sony India Warranty",
      availability: true,
      specs: { "Delivery": "1 Day" }
    },
    {
      id: "v6_2",
      productId: "p6",
      productName: "Sony WH-1000XM5",
      vendorName: "Croma",
      price: 26990,
      discount: 10,
      rating: 4.8,
      deliveryCost: 0,
      warranty: "1 Year Sony India Warranty",
      availability: true,
      specs: { "Delivery": "Instant Store Pickup" }
    }
  ],
  searchHistory: [],
  recommendationHistory: [],
  favorites: [],
  productRatings: []
};

class LocalDB {
  private data: DatabaseSchema;

  constructor() {
    this.data = { ...defaultDb };
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.data = {
          ...defaultDb,
          ...parsed,
          // Guarantee pre-seeded elements aren't wiped, but append custom additions
          products: parsed.products && parsed.products.length > 0 ? parsed.products : defaultDb.products,
          vendors: parsed.vendors && parsed.vendors.length > 0 ? parsed.vendors : defaultDb.vendors,
          favorites: parsed.favorites || [],
          productRatings: parsed.productRatings || []
        };
      } else {
        this.save();
      }
    } catch (e) {
      console.error("Failed to read database, falling back to pre-seeded defaults:", e);
      this.data = { ...defaultDb };
    }
  }

  private save() {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error("Failed to write to database:", e);
    }
  }

  // User Actions
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public registerUser(name: string, email: string, passwordHash: string): User {
    const existing = this.getUserByEmail(email);
    if (existing) {
      throw new Error("A user with this email address already exists.");
    }

    const newUser: User = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      name,
      email,
      createdAt: new Date().toISOString()
    };

    this.data.users.push(newUser);
    this.data.passwordHashes[email.toLowerCase()] = passwordHash;
    this.save();
    return newUser;
  }

  public verifyUserPassword(email: string, passwordHash: string): boolean {
    const stored = this.data.passwordHashes[email.toLowerCase()];
    return stored === passwordHash;
  }

  // Catalog Actions
  public getProducts(): Product[] {
    return this.data.products;
  }

  public addProduct(product: Omit<Product, 'id'>): Product {
    const newProduct: Product = {
      id: "p_" + Math.random().toString(36).substring(2, 9),
      ...product
    };
    this.data.products.push(newProduct);
    this.save();
    return newProduct;
  }

  public getVendors(): VendorListing[] {
    return this.data.vendors;
  }

  public addVendorListing(listing: Omit<VendorListing, 'id'>): VendorListing {
    const newListing: VendorListing = {
      id: "v_" + Math.random().toString(36).substring(2, 9),
      ...listing
    };
    this.data.vendors.push(newListing);
    this.save();
    return newListing;
  }

  // Searching logic
  public searchVendorListings(query: string): VendorListing[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    // Simple natural language matching logic or keyword extraction
    // If user says "laptop under ₹60,000" or similar, let's extract keywords:
    const keywords = q.split(/\s+/).filter(w => w.length > 2);

    // Let's check matching listings
    let matches = this.data.vendors.filter(v => {
      const nameMatch = v.productName.toLowerCase().includes(q) || q.includes(v.productName.toLowerCase());
      const brandMatch = v.vendorName.toLowerCase().includes(q) || q.includes(v.vendorName.toLowerCase());
      
      // Keyword intersections
      const intersection = keywords.filter(kw => 
        v.productName.toLowerCase().includes(kw) || 
        (v.specs && Object.values(v.specs).some(val => val.toLowerCase().includes(kw)))
      );

      return nameMatch || brandMatch || intersection.length >= 2;
    });

    // Handle price thresholds in queries like "under 60000" or "under 60,000" or "under 10000"
    const priceMatch = q.match(/under\s*(?:rs\.?|₹)?\s*(\d+[\d,]*)/i);
    if (priceMatch && priceMatch[1]) {
      const maxPrice = parseInt(priceMatch[1].replace(/,/g, ''), 10);
      if (!isNaN(maxPrice)) {
        matches = matches.filter(v => v.price <= maxPrice);
      }
    }

    // Fallback: If no direct matches in the pre-seeded lists, let's look for partial category matches,
    // e.g., if user searches "gaming", return Razer and Logitech headsets
    if (matches.length === 0) {
      if (q.includes("gaming") || q.includes("headphones") || q.includes("audio")) {
        matches = this.data.vendors.filter(v => 
          v.productName.toLowerCase().includes("razer") || 
          v.productName.toLowerCase().includes("logitech") ||
          v.productName.toLowerCase().includes("sony")
        );
      } else if (q.includes("laptop") || q.includes("notebook")) {
        matches = this.data.vendors.filter(v => 
          v.productName.toLowerCase().includes("asus") || 
          v.productName.toLowerCase().includes("lenovo")
        );
      } else if (q.includes("phone") || q.includes("mobile") || q.includes("iphone")) {
        matches = this.data.vendors.filter(v => 
          v.productName.toLowerCase().includes("iphone")
        );
      }
    }

    return matches;
  }

  // History tracking
  public addSearchHistory(userId: string, query: string, vendorCount: number, imageAnalysis?: ImageAnalysis): SearchRecord {
    const record: SearchRecord = {
      id: "sh_" + Math.random().toString(36).substring(2, 9),
      userId,
      query,
      timestamp: new Date().toISOString(),
      vendorCount,
      imageAnalysis
    };
    this.data.searchHistory.push(record);
    this.save();
    return record;
  }

  public addRecommendationHistory(userId: string, query: string, recommendation: any, imageBase64?: string): AiRecommendationRecord {
    const record: AiRecommendationRecord = {
      id: "rec_" + Math.random().toString(36).substring(2, 9),
      userId,
      query,
      recommendation,
      timestamp: new Date().toISOString(),
      imageBase64
    };
    this.data.recommendationHistory.push(record);
    this.save();
    return record;
  }

  public getUserHistory(userId: string): { searches: SearchRecord[], recommendations: AiRecommendationRecord[] } {
    return {
      searches: this.data.searchHistory.filter(h => h.userId === userId).sort((a,b) => b.timestamp.localeCompare(a.timestamp)),
      recommendations: this.data.recommendationHistory.filter(r => r.userId === userId).sort((a,b) => b.timestamp.localeCompare(a.timestamp))
    };
  }

  // Favorites management
  public getFavorites(userId: string): FavoriteProduct[] {
    return this.data.favorites.filter(f => f.userId === userId);
  }

  public addFavorite(userId: string, productName: string, vendorName: string, price: number, discount: number, rating: number, productUrl?: string): FavoriteProduct {
    const existing = this.data.favorites.find(f => f.userId === userId && f.productName === productName && f.vendorName === vendorName);
    if (existing) {
      return existing;
    }
    const newFav: FavoriteProduct = {
      id: "fav_" + Math.random().toString(36).substring(2, 9),
      userId,
      productName,
      vendorName,
      price,
      discount,
      rating,
      productUrl,
      savedAt: new Date().toISOString()
    };
    this.data.favorites.push(newFav);
    this.save();
    return newFav;
  }

  public removeFavorite(userId: string, id: string): boolean {
    const initialLen = this.data.favorites.length;
    this.data.favorites = this.data.favorites.filter(f => !(f.id === id && f.userId === userId));
    const deleted = this.data.favorites.length < initialLen;
    if (deleted) {
      this.save();
    }
    return deleted;
  }

  // Product ratings/reviews management
  public getProductRatings(productName: string): ProductRating[] {
    const pNameLower = productName.toLowerCase();
    return this.data.productRatings.filter(r => r.productName.toLowerCase() === pNameLower || pNameLower.includes(r.productName.toLowerCase()));
  }

  public getAllProductRatings(): ProductRating[] {
    return this.data.productRatings;
  }

  public addProductRating(userId: string, userName: string, productName: string, rating: number, comment: string): ProductRating {
    const newRating: ProductRating = {
      id: "rtg_" + Math.random().toString(36).substring(2, 9),
      userId,
      userName,
      productName,
      rating,
      comment,
      createdAt: new Date().toISOString()
    };
    this.data.productRatings.push(newRating);
    this.save();
    return newRating;
  }
}

export const db = new LocalDB();
