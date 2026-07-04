/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  TrendingUp,
  History as HistoryIcon,
  User as UserIcon,
  ShieldCheck,
  Sparkles,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  ExternalLink,
  MessageSquare,
  Send,
  Loader2,
  Lock,
  Mail,
  UserPlus,
  LogIn,
  Layers,
  Database,
  BookOpen,
  Info,
  ChevronRight,
  RefreshCw,
  Plus,
  Award,
  DollarSign,
  Upload,
  Heart,
  Star,
  Trash,
  FileDown,
  Camera,
  Scan,
  Sliders,
  Filter
} from 'lucide-react';
import { VendorListing, Product, SearchRecord, AiRecommendationRecord, Message, FavoriteProduct, ProductRating } from './types';

// Safely parse API response ensuring it is valid JSON and handling errors properly
async function safeParseResponse(res: Response) {
  const contentType = res.headers.get('content-type');
  let data: any = null;
  let isJson = false;

  if (contentType && contentType.toLowerCase().includes('application/json')) {
    try {
      data = await res.json();
      isJson = true;
    } catch (err) {
      console.error("JSON parsing error on response body:", err);
      isJson = false;
    }
  }

  if (!isJson) {
    const text = await res.text();
    console.error("Received non-JSON response from server:", text);
    throw new Error(text || `Request failed with server status ${res.status}`);
  }

  if (!res.ok) {
    const errMsg = data.message || data.error || `Server responded with status ${res.status}`;
    throw new Error(errMsg);
  }

  return data;
}

export default function App() {
  // Authentication State
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Auth Inputs
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  // App Navigation & Tab State
  const [activeTab, setActiveTab] = useState<'search' | 'favorites' | 'history' | 'profile' | 'admin'>('search');

  // Search & Comparison States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [listings, setListings] = useState<VendorListing[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Image Upload / Vision Search States
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [imageFileName, setImageFileName] = useState<string>('');
  const [imageAnalysis, setImageAnalysis] = useState<any | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'discount'>('price');

  // Client Side Filtering States
  const [filterBrand, setFilterBrand] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>('');
  const [filterMinRating, setFilterMinRating] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);

  // AI Recommendation States
  const [recommendation, setRecommendation] = useState<any | null>(null);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendError, setRecommendError] = useState<string | null>(null);

  // Chat/Follow-up Conversation
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);

  // Stored Favorites State
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  // Ratings / Reviews State for current searched product
  const [currentProductReviews, setCurrentProductReviews] = useState<ProductRating[]>([]);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Historical / User Profiles State
  const [historySearches, setHistorySearches] = useState<SearchRecord[]>([]);
  const [historyRecommendations, setHistoryRecommendations] = useState<AiRecommendationRecord[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Admin / Seed States
  const [adminProduct, setAdminProduct] = useState({ name: '', category: 'Clothing', brand: '', basePrice: 1500 });
  const [adminListing, setAdminListing] = useState({
    productId: '',
    vendorName: 'Amazon',
    price: 1200,
    discount: 15,
    rating: 4.4,
    deliveryCost: 50,
    warranty: 'Returnable within 10 days',
    availability: true
  });
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [adminStatus, setAdminStatus] = useState<string | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Trigger Toast Helper
  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Fetch Session Profile on mount & whenever token changes
  useEffect(() => {
    if (token) {
      fetchProfile();
      fetchHistory();
      fetchCatalog();
      fetchFavorites();
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeParseResponse(res);
      setUser(data.user);
      setStats(data);
    } catch (e) {
      console.error("Error retrieving user profile:", e);
      handleLogout();
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeParseResponse(res);
      setHistorySearches(data.searches || []);
      setHistoryRecommendations(data.recommendations || []);
    } catch (e) {
      console.error("Error retrieving search history:", e);
    }
  };

  const fetchCatalog = async () => {
    try {
      const res = await fetch('/api/products');
      const products = await safeParseResponse(res);
      setCatalogProducts(products || []);
      if (products && products.length > 0 && !adminListing.productId) {
        setAdminListing(prev => ({ ...prev, productId: products[0].id }));
      }
    } catch (e) {
      console.error("Error fetching available products catalog:", e);
    }
  };

  const fetchFavorites = async () => {
    if (!token) return;
    setFavoritesLoading(true);
    try {
      const res = await fetch('/api/favorites', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeParseResponse(res);
      setFavorites(data || []);
    } catch (e) {
      console.error("Error fetching favorites:", e);
    } finally {
      setFavoritesLoading(false);
    }
  };

  const fetchProductReviews = async (pName: string) => {
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/ratings?productName=${encodeURIComponent(pName)}`);
      const data = await safeParseResponse(res);
      setCurrentProductReviews(data || []);
    } catch (e) {
      console.error("Error fetching reviews:", e);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Authentication Handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    const payload = authMode === 'login' 
      ? { email: emailInput, password: passwordInput }
      : { name: nameInput, email: emailInput, password: passwordInput };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await safeParseResponse(res);
      
      const tokenVal = data.data?.token || data.token;
      const userVal = data.data?.user || data.user;

      if (!tokenVal) {
        throw new Error("Authentication succeeded but no token was returned.");
      }

      localStorage.setItem('auth_token', tokenVal);
      setToken(tokenVal);
      setUser(userVal || null);
      triggerToast(authMode === 'login' ? "Welcome back! Login successful." : "Account registered successfully!", "success");
    } catch (err: any) {
      console.error("Authentication process error:", err);
      setAuthError(err.message);
      triggerToast(err.message, "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestToken = 'guest_token';
    localStorage.setItem('auth_token', guestToken);
    setToken(guestToken);
    setUser({ id: 'guest', name: 'Guest User', email: 'guest@example.com' });
    triggerToast("Logged in as Guest for evaluation", "success");
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    setListings([]);
    setSearchPerformed(false);
    setImagePreview(null);
    setImageBase64(null);
    setImageAnalysis(null);
    setRecommendation(null);
    setShowChatPanel(false);
    setChatMessages([]);
    triggerToast("Logged out successfully.", "success");
  };

  // Handle Drag & Drop Files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      triggerToast("Only image files are supported.", "error");
      return;
    }
    setImageFileName(file.name);
    setImageMimeType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      const base64Str = result.split(',')[1] || result;
      setImageBase64(base64Str);
      triggerToast("Image loaded! Ready for Visual AI Search.", "success");
    };
    reader.onerror = () => {
      triggerToast("Failed to read image file.", "error");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageAnalysis(null);
    setImageFileName('');
    triggerToast("Image attachment cleared.", "success");
  };

  // Search Action
  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = (customQuery || searchQuery).trim();

    // Trigger visual image search if an image is uploaded and no query was typed, or if explicitly requested
    if (!query && imageBase64) {
      handleImageSearch();
      return;
    }

    if (!query) {
      triggerToast("Please input a search query or upload an image.", "error");
      return;
    }

    if (customQuery) {
      setSearchQuery(customQuery);
    }

    setSearchLoading(true);
    setSearchError(null);
    setImageAnalysis(null);
    setRecommendation(null);
    setShowChatPanel(false);
    setChatMessages([]);

    try {
      const res = await fetch(`/api/compare?query=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeParseResponse(res);

      setListings(data.listings || []);
      setSearchPerformed(true);

      if (data.listings && data.listings.length > 0) {
        generateAiRecommendation(query, data.listings);
        fetchProductReviews(data.listings[0].productName);
      } else {
        triggerToast("No listings found.", "error");
      }
    } catch (err: any) {
      setSearchError(err.message);
      triggerToast(err.message, "error");
    } finally {
      setSearchLoading(false);
    }
  };

  // Perform Image-Based search via Gemini Vision
  const handleImageSearch = async () => {
    if (!imageBase64) return;

    setSearchLoading(true);
    setSearchError(null);
    setImageAnalysis(null);
    setRecommendation(null);
    setShowChatPanel(false);
    setChatMessages([]);

    try {
      const response = await fetch('/api/image-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          imageBase64,
          mimeType: imageMimeType
        })
      });

      const data = await safeParseResponse(response);

      setImageAnalysis(data.analysis);
      setSearchQuery(data.query);
      setListings(data.listings || []);
      setSearchPerformed(true);

      if (data.listings && data.listings.length > 0) {
        generateAiRecommendation(data.query, data.listings, imageBase64);
        fetchProductReviews(data.listings[0].productName);
      } else {
        triggerToast("Vision identified the product, but no catalog pricing could be compiled.", "error");
      }
    } catch (err: any) {
      setSearchError(err.message);
      triggerToast(err.message, "error");
    } finally {
      setSearchLoading(false);
    }
  };

  // Generate AI Smart Choices
  const generateAiRecommendation = async (query: string, currentListings: VendorListing[], imgB64?: string | null) => {
    setRecommendLoading(true);
    setRecommendError(null);

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query, listings: currentListings, imageBase64: imgB64 || undefined })
      });

      const data = await safeParseResponse(res);

      setRecommendation(data);
      setChatMessages([
        {
          sender: 'assistant',
          text: `Hello! I am your AI Price Comparison Agent. I analyzed these vendor platforms and recommend **${data.recommendedProduct}** from **${data.recommendedVendor}** (effective price ₹${data.recommendedPrice.toLocaleString()}). I can answer any questions you have regarding its durability, features, shipping costs, or visual similarity search results!`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } catch (err: any) {
      setRecommendError(err.message);
      triggerToast(err.message, "error");
    } finally {
      setRecommendLoading(false);
      fetchHistory(); 
    }
  };

  // Submit follow up chat message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !recommendation) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    
    const newMsg: Message = {
      sender: 'user',
      text: userMsg,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, newMsg]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/recommend/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: searchQuery,
          recommendationContext: recommendation,
          chatHistory: chatMessages,
          userMessage: userMsg
        })
      });

      const data = await safeParseResponse(res);

      setChatMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } catch (err: any) {
      triggerToast(err.message, 'error');
    } finally {
      setChatLoading(false);
    }
  };

  // Save Favorite item to server DB
  const handleAddFavorite = async (listing: VendorListing) => {
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productName: listing.productName,
          vendorName: listing.vendorName,
          price: listing.price,
          discount: listing.discount,
          rating: listing.rating,
          productUrl: listing.productUrl
        })
      });

      const data = await safeParseResponse(res);

      triggerToast(`Saved ${listing.vendorName} listing to your Favorites!`, "success");
      fetchFavorites();
    } catch (err: any) {
      triggerToast(err.message, "error");
    }
  };

  // Remove Favorite item
  const handleRemoveFavorite = async (id: string) => {
    try {
      const res = await fetch(`/api/favorites/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await safeParseResponse(res);

      triggerToast("Favorite item removed.", "success");
      fetchFavorites();
    } catch (err: any) {
      triggerToast(err.message, "error");
    }
  };

  // Submit Product Review
  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    const targetProduct = listings[0]?.productName || searchQuery;
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productName: targetProduct,
          rating: reviewRating,
          comment: reviewComment
        })
      });

      const data = await safeParseResponse(res);

      triggerToast("Review posted successfully!", "success");
      setReviewComment('');
      fetchProductReviews(targetProduct);
    } catch (err: any) {
      triggerToast(err.message, "error");
    }
  };

  // Download printable HTML report of evaluation (academically formal)
  const downloadComparisonReport = () => {
    if (!listings.length || !recommendation) return;

    const isNew = !!recommendation.product;
    const prodName = isNew ? recommendation.product.name : recommendation.recommendedProduct;
    const prodVendor = isNew ? (recommendation.recommendations?.bestPlatform || 'Multiple platforms') : recommendation.recommendedVendor;
    const prodPrice = isNew ? (recommendation.pricing?.averagePrice || 'N/A') : `₹${recommendation.recommendedPrice.toLocaleString()}`;
    const altName = isNew ? (recommendation.recommendations?.budgetAlternative || 'N/A') : recommendation.alternative;
    const targetConsumer = isNew ? recommendation.product.description : (recommendation.bestUseCases || 'All general users');

    const printStyles = `
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; padding: 40px; }
      .header { border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
      .title { font-size: 26px; font-weight: bold; color: #0f172a; margin: 0; }
      .subtitle { font-size: 13px; color: #64748b; font-family: monospace; margin: 5px 0 0 0; }
      .section-title { font-size: 18px; font-weight: bold; color: #1e1b4b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 30px; margin-bottom: 15px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .bento-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; }
      .metric { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #475569; }
      .value { font-size: 20px; font-weight: 800; color: #4f46e5; }
      table { w-full; border-collapse: collapse; margin-top: 15px; width: 100%; }
      th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 13px; }
      th { bg-color: #f1f5f9; font-weight: bold; }
      .badge { display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: bold; border-radius: 9999px; }
      .badge-pro { background: #d1fae5; color: #065f46; }
      .badge-con { background: #fee2e2; color: #991b1b; }
      .faq-q { font-weight: bold; color: #0f172a; margin-top: 10px; font-size: 13px; }
      .faq-a { color: #475569; font-size: 13px; margin-bottom: 15px; }
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Universal AI Shopping Assistant Comparison Report</title>
        <style>${printStyles}</style>
      </head>
      <body>
        <div class="header">
          <p style="text-transform: uppercase; font-size: 11px; font-weight: bold; letter-spacing: 1px; color: #4f46e5; margin: 0;">Capstone Evaluation Report</p>
          <h1 class="title">AI Shopping Assistant Price Comparison</h1>
          <p class="subtitle">Query: "${searchQuery}" • Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} UTC</p>
        </div>

        ${imageAnalysis ? `
        <div class="bento-card" style="margin-bottom: 25px;">
          <h3 style="margin-top: 0; color: #4f46e5;">Gemini Vision Image Identification</h3>
          <p style="font-size: 14px; margin: 5px 0;"><strong>Product Identified:</strong> ${imageAnalysis.productName} (${imageAnalysis.brand})</p>
          <p style="font-size: 13px; margin: 5px 0;"><strong>Category:</strong> ${imageAnalysis.productCategory} | <strong>Color:</strong> ${imageAnalysis.primaryColor} | <strong>Material:</strong> ${imageAnalysis.material} | <strong>Style:</strong> ${imageAnalysis.style}</p>
          <p style="font-size: 13px; margin: 5px 0;"><strong>Estimated Market Value:</strong> ${imageAnalysis.estimatedPriceRange}</p>
        </div>
        ` : ''}

        <div class="bento-card" style="background: #eef2ff; border-color: #c7d2fe;">
          <h2 style="margin-top:0; color:#312e81; font-size: 16px;">★ Best Choice recommendation: ${prodName}</h2>
          <p style="margin: 5px 0; font-size:13px;"><strong>Recommended Vendor/Platform:</strong> ${prodVendor} | <strong>Effective Cost / Price range:</strong> ${prodPrice}</p>
          <p style="margin: 5px 0; font-size:13px;"><strong>Alternative / Budget Choice:</strong> ${altName}</p>
          <p style="margin: 10px 0 0 0; font-size:13px;"><strong>Optimal Buyer Target / Description:</strong> ${targetConsumer}</p>
        </div>

        <h2 class="section-title">Aggregated Vendor Listings Matched</h2>
        <table>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Product Name Matched</th>
              <th>Base Price</th>
              <th>Discount</th>
              <th>Delivery</th>
              <th>Effective Cost</th>
              <th>Rating</th>
              <th>Warranty</th>
            </tr>
          </thead>
          <tbody>
            ${listings.map(v => {
              const effPrice = Math.round(v.price - (v.price * v.discount / 100) + v.deliveryCost);
              return `
                <tr>
                  <td><strong>${v.vendorName}</strong></td>
                  <td>${v.productName}</td>
                  <td>₹${v.price.toLocaleString()}</td>
                  <td>-${v.discount}%</td>
                  <td>₹${v.deliveryCost}</td>
                  <td><strong>₹${effPrice.toLocaleString()}</strong></td>
                  <td>★ ${v.rating.toFixed(1)}</td>
                  <td><small>${v.warranty}</small></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <h2 class="section-title">Product Quality Indices (Scores 0-10)</h2>
        <div class="grid">
          <div class="bento-card">
            <p class="metric">Overall Quality Index</p>
            <p class="value">${isNew ? recommendation.qualityScores?.overall : (recommendation.overallQualityScore || 'N/A')}</p>
          </div>
          <div class="bento-card">
            <p class="metric">Value For Money</p>
            <p class="value">${isNew ? recommendation.qualityScores?.valueForMoney : (recommendation.valueForMoneyScore || 'N/A')}</p>
          </div>
          <div class="bento-card">
            <p class="metric">Build Quality & Craft</p>
            <p class="value">${isNew ? recommendation.qualityScores?.buildQuality : (recommendation.buildQualityScore || 'N/A')}</p>
          </div>
          <div class="bento-card">
            <p class="metric">Brand Reputation Score</p>
            <p class="value">${isNew ? recommendation.qualityScores?.durability : (recommendation.brandTrustScore || 'N/A')}</p>
          </div>
        </div>

        <div style="margin-top: 20px;" class="bento-card">
          <p class="metric">Durability Assessment</p>
          <p style="font-size: 14px; font-weight: bold; margin: 5px 0;">${isNew ? `Performance rating: ${recommendation.qualityScores?.performance || 'N/A'}, Design rating: ${recommendation.qualityScores?.design || 'N/A'}` : (recommendation.durabilityEstimate || 'High resilience')}</p>
        </div>

        <div class="grid" style="margin-top: 25px;">
          <div>
            <h3 style="color: #065f46; font-size: 14px; margin-bottom: 8px;">Pros / Market Advantages</h3>
            <ul style="padding-left: 20px; font-size: 13px;">
              ${recommendation.pros?.map((p: string) => `<li>${p}</li>`).join('')}
            </ul>
          </div>
          <div>
            <h3 style="color: #991b1b; font-size: 14px; margin-bottom: 8px;">Cons / Evaluation Criteria</h3>
            <ul style="padding-left: 20px; font-size: 13px;">
              ${recommendation.cons?.map((c: string) => `<li>${c}</li>`).join('')}
            </ul>
          </div>
        </div>

        ${!isNew && recommendation.buyingFaq && recommendation.buyingFaq.length > 0 ? `
        <h2 class="section-title">Smart Buying Assistant FAQ</h2>
        ${recommendation.buyingFaq.map((faq: any) => `
          <div class="faq-q">Q: ${faq.question}</div>
          <div class="faq-a">A: ${faq.answer}</div>
        `).join('')}
        ` : ''}

        <h2 class="section-title">Cheaper / Premium / Trending Alternatives</h2>
        <table>
          <thead>
            <tr>
              <th>Alternative Item</th>
              <th>Estimated Cost</th>
              <th>Classification</th>
              <th>Platform</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            ${recommendation.similarProducts?.map((alt: any) => `
              <tr>
                <td>${alt.name}</td>
                <td>₹${(alt.price || 0).toLocaleString()}</td>
                <td><span class="badge ${alt.type === 'cheaper' ? 'badge-pro' : 'badge-con'}">${alt.type.toUpperCase()}</span></td>
                <td>${alt.platform}</td>
                <td>★ ${alt.rating}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${recommendation.visuallySimilar && recommendation.visuallySimilar.length > 0 ? `
        <h2 class="section-title">Visually Similar Matches</h2>
        <table>
          <thead>
            <tr>
              <th>Product Variant</th>
              <th>Price</th>
              <th>Match %</th>
              <th>Platform</th>
              <th>Color</th>
              <th>Relation Details</th>
            </tr>
          </thead>
          <tbody>
            ${recommendation.visuallySimilar.map((vis: any) => `
              <tr>
                <td>${vis.name}</td>
                <td>₹${(vis.price || 0).toLocaleString()}</td>
                <td><strong>${vis.matchPercentage}% Match</strong></td>
                <td>${vis.platform}</td>
                <td>${vis.color}</td>
                <td><small>${vis.relation}</small></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}

        <hr style="margin-top: 40px; border: 0; border-top: 1px solid #cbd5e1;" />
        <p style="text-align: center; font-size: 11px; color: #94a3b8; font-family: monospace;">
          Universal AI Price Comparison Shopping Agent • Portfolio Capstone Graduation System Project
        </p>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `AI_Shopping_Assistant_Report_${searchQuery.toLowerCase().replace(/\s+/g, '_')}.html`;
    link.click();
    triggerToast("Report generated! Open the downloaded file to print or save as PDF.", "success");
  };

  // Seed customized new products in admin dashboard
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminStatus(null);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(adminProduct)
      });
      const data = await safeParseResponse(res);

      triggerToast("Reference catalog product added successfully!", "success");
      setAdminProduct({ name: '', category: 'Clothing', brand: '', basePrice: 1500 });
      fetchCatalog();
    } catch (err: any) {
      setAdminStatus(`Error: ${err.message}`);
    }
  };

  // Seed customized vendor listing in admin dashboard
  const handleAddListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminStatus(null);
    try {
      const selectedProd = catalogProducts.find(p => p.id === adminListing.productId);
      if (!selectedProd) {
        throw new Error("Please select or add a reference catalog product first.");
      }

      const res = await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...adminListing,
          productName: selectedProd.name
        })
      });
      const data = await safeParseResponse(res);

      triggerToast(`Successfully seeded listing for ${selectedProd.name} at ${adminListing.vendorName}`, "success");
      setAdminListing({
        productId: catalogProducts[0]?.id || '',
        vendorName: 'Amazon',
        price: 1200,
        discount: 15,
        rating: 4.4,
        deliveryCost: 50,
        warranty: 'Returnable within 10 days',
        availability: true
      });
    } catch (err: any) {
      setAdminStatus(`Error: ${err.message}`);
    }
  };

  // Quick chips search trigger
  const handleTrendingClick = (term: string) => {
    handleSearch(undefined, term);
  };

  // Client side sorting and filtering
  const filteredListings = listings.filter(item => {
    if (filterBrand && !item.productName.toLowerCase().includes(filterBrand.toLowerCase())) {
      return false;
    }
    if (filterPlatform && item.vendorName.toLowerCase() !== filterPlatform.toLowerCase()) {
      return false;
    }
    const effPrice = Math.round(item.price - (item.price * item.discount / 100) + item.deliveryCost);
    if (filterMaxPrice && effPrice > Number(filterMaxPrice)) {
      return false;
    }
    if (filterMinRating && item.rating < filterMinRating) {
      return false;
    }
    return true;
  });

  const sortedListings = [...filteredListings].sort((a, b) => {
    if (sortBy === 'price') {
      const effectiveA = a.price - (a.price * a.discount / 100) + a.deliveryCost;
      const effectiveB = b.price - (b.price * b.discount / 100) + b.deliveryCost;
      return effectiveA - effectiveB;
    }
    if (sortBy === 'rating') {
      return b.rating - a.rating;
    }
    if (sortBy === 'discount') {
      return b.discount - a.discount;
    }
    return 0;
  });

  // Render Login / Registration if not logged in
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-indigo-100">
        {/* Simple visual top header */}
        <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 rounded-xl text-white">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900 tracking-tight">Universal AI Shopping Assistant</h1>
                <p className="text-xs text-slate-500 font-medium font-sans">Compare prices across all categories & upload images</p>
              </div>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Project Sandbox Mode
            </div>
          </div>
        </header>

        {/* Authentication Modal Card */}
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="bg-white border border-slate-150 rounded-2xl w-full max-w-md p-8 shadow-xl">
            <div className="text-center mb-6">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-3xs font-extrabold rounded-full tracking-wider uppercase">Authentication Gate</span>
              <h2 className="font-extrabold text-slate-800 text-lg mt-2">
                {authMode === 'login' ? "Access Shopping Assistant" : "Create Evaluator Account"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">Credentials stored inside lightweight JSON document structures.</p>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-2xs rounded-xl mb-4 flex items-center gap-2">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-3xs font-extrabold text-slate-500 uppercase tracking-widest mb-1">Full Name</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><UserIcon className="w-4 h-4" /></span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Ramesh Kumar"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-3xs font-extrabold text-slate-500 uppercase tracking-widest mb-1">Email Address</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Mail className="w-4 h-4" /></span>
                  <input
                    type="email"
                    required
                    placeholder="evaluator@college.edu"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-3xs font-extrabold text-slate-500 uppercase tracking-widest mb-1">Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Lock className="w-4 h-4" /></span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Credentials...</span>
                  </>
                ) : (
                  <>
                    {authMode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    <span>{authMode === 'login' ? "Login to Dashboard" : "Register Academic Profile"}</span>
                  </>
                )}
              </button>
            </form>

            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-slate-150"></div>
              <span className="flex-shrink mx-3 text-4xs font-bold text-slate-400 uppercase tracking-wider">Evaluation Quick Entry</span>
              <div className="flex-grow border-t border-slate-150"></div>
            </div>

            <button
              onClick={handleGuestLogin}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Login as Guest Student (No Sign Up)</span>
            </button>

            <div className="text-center mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-xs text-indigo-600 hover:underline font-bold"
              >
                {authMode === 'login' ? "New evaluator? Create an academic record" : "Already registered? Sign in"}
              </button>
            </div>
          </div>
        </div>

        <footer className="bg-white border-t border-slate-150 py-4 text-center text-xs text-slate-400 font-mono">
          Final-Year Engineering Project Sandbox • Authenticated Security Framework
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-indigo-150">
      
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 animate-slide-up border ${
          toast.type === 'success' 
            ? 'bg-emerald-900 border-emerald-800 text-white' 
            : 'bg-rose-950 border-rose-900 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-rose-400" />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Main Top Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 py-4 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-3xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base text-slate-900 tracking-tight">Universal AI Shopping Assistant</h1>
                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 text-5xs font-extrabold rounded-full tracking-widest uppercase">Graduation Release</span>
              </div>
              <p className="text-3xs text-slate-400 font-sans font-medium">Multimodal pricing comparisons and quality recommendations powered by Google Gemini</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'search' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              <span>Visual Search & Compare</span>
            </button>
            <button
              onClick={() => { setActiveTab('favorites'); fetchFavorites(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'favorites' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>Saved Favorites ({favorites.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab('history'); fetchHistory(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'history' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <HistoryIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Audit Records</span>
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'admin' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Seeder Panel</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'profile' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Profile & SRS</span>
            </button>
          </nav>

          {/* User Signout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden lg:block">
              <p className="text-xs font-bold text-slate-800">{user?.name || "User"}</p>
              <p className="text-4xs text-slate-400 font-mono">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* TAB 1: SEARCH & PRODUCT COMPARISON */}
        {activeTab === 'search' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* SEARCH CONTROLS & SIDE PANEL */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Multimodal Search Controller */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h3 className="font-extrabold text-slate-900 text-sm mb-1 flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-indigo-600" />
                  <span>Universal Shopping Core</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">Input any category product name, or drop a picture to run Gemini Visual pricing intelligence.</p>

                {/* DRAG AND DROP IMAGE UPLOADER */}
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                    isDragging 
                      ? 'border-indigo-600 bg-indigo-50/50' 
                      : imagePreview 
                        ? 'border-slate-300 bg-slate-50/20' 
                        : 'border-slate-200 hover:border-indigo-400 bg-slate-50/40'
                  }`}
                >
                  {imagePreview ? (
                    <div className="relative group">
                      <img 
                        src={imagePreview} 
                        alt="Product Attachment" 
                        className="h-32 mx-auto rounded-lg object-contain bg-white border shadow-3xs"
                        referrerPolicy="no-referrer"
                      />
                      
                      {searchLoading && (
                        <div className="absolute inset-0 bg-slate-900/40 rounded-lg flex items-center justify-center overflow-hidden">
                          {/* Laser Scanner Barcode effect */}
                          <div className="w-full h-1 bg-indigo-500 absolute top-0 animate-scanner shadow-[0_0_10px_#4f46e5]"></div>
                          <div className="text-white text-3xs font-bold uppercase tracking-widest bg-slate-900/80 px-2 py-1 rounded">Scanning...</div>
                        </div>
                      )}

                      <div className="mt-2 text-3xs text-slate-500 font-mono truncate">{imageFileName}</div>
                      <button 
                        type="button"
                        onClick={clearImage}
                        disabled={searchLoading}
                        className="mt-1.5 px-2 py-1 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 text-3xs font-semibold rounded-lg transition-colors"
                      >
                        Clear Image
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full w-10 h-10 mx-auto flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <label className="cursor-pointer text-xs font-bold text-indigo-600 hover:underline">
                          Upload product image
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                            className="hidden" 
                          />
                        </label>
                        <p className="text-4xs text-slate-400 font-semibold mt-0.5">Drag & drop here (Clothing, gadgets, bags...)</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* TEXT INPUT SEARCH */}
                <form onSubmit={(e) => handleSearch(e)} className="space-y-3 mt-4">
                  <div>
                    <label className="block text-4xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Or Describe / Name Product</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Best smartwatch with AMOLED or Nike Air Max"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-3 pr-10 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium bg-slate-50/20"
                      />
                      <button
                        type="submit"
                        disabled={searchLoading}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 disabled:opacity-50"
                      >
                        {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={searchLoading}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-55"
                  >
                    {searchLoading ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        <span>Aggregating pricing options...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                        <span>{imagePreview ? "Run Multimodal Vision Search" : "Compare Prices with Gemini"}</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Trending quick links */}
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h4 className="text-4xs font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    <span>Popular Sandbox Queries</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Luxury perfume for men",
                      "Gaming laptop under 80000",
                      "White sneakers for women",
                      "Smartwatch with AMOLED"
                    ].map((term) => (
                      <button
                        key={term}
                        onClick={() => handleTrendingClick(term)}
                        disabled={searchLoading}
                        className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-3xs font-medium transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* PROJECT OVERVIEW / DETAILS */}
              <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-white/10 rounded-lg text-amber-300">
                    <Award className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs tracking-wider uppercase">Project Architecture</h4>
                </div>
                <p className="text-xs text-indigo-200 leading-relaxed font-sans">
                  Developed for final-year evaluators. Utilizes <strong>Gemini Vision API</strong> to process consumer images, identifies brand patterns, and dynamically compiles listings from Amazon, Flipkart, Myntra, Ajio, Nykaa, etc., delivering rich quality evaluations instantly.
                </p>
                <div className="mt-4 pt-4 border-t border-indigo-850/65 flex items-center justify-between text-4xs text-indigo-300 font-mono">
                  <span>Gemini Model: 3.5 Flash</span>
                  <span>Document Collections Seeding</span>
                </div>
              </div>
            </div>

            {/* RESULTS VIEW */}
            <div className="lg:col-span-2 space-y-6">
              
              {!searchPerformed && !searchLoading && (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center">
                  <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
                    <Camera className="w-8 h-8" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-base">Awaiting Product query</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Upload a clothing dress, watch, gadget, or item image or type any search query to pull complete multi-vendor comparative indices!
                  </p>
                </div>
              )}

              {searchLoading && (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">Processing Multimodal Decision Matrix</h3>
                    <p className="text-xs text-slate-400 mt-1 font-sans">Gemini is evaluating attributes, fetching seeded marketplace price indices, and building recommendations...</p>
                  </div>
                </div>
              )}

              {searchPerformed && !searchLoading && (
                <>
                  {/* IMAGE ANALYSIS SUMMARY VIEW */}
                  {imageAnalysis && (
                    <div className="bg-white border border-indigo-150 rounded-2xl shadow-sm p-6 bg-indigo-50/10">
                      <h4 className="text-3xs font-extrabold text-indigo-600 uppercase tracking-widest mb-3">Gemini Vision Image Recognition Summary</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="bg-white border rounded-xl p-3 shadow-3xs">
                          <span className="text-4xs font-bold text-slate-400 uppercase tracking-widest">Product Identified</span>
                          <p className="font-extrabold text-slate-800 text-xs truncate mt-0.5">{imageAnalysis.productName}</p>
                        </div>
                        <div className="bg-white border rounded-xl p-3 shadow-3xs">
                          <span className="text-4xs font-bold text-slate-400 uppercase tracking-widest">Brand</span>
                          <p className="font-extrabold text-slate-800 text-xs truncate mt-0.5">{imageAnalysis.brand}</p>
                        </div>
                        <div className="bg-white border rounded-xl p-3 shadow-3xs">
                          <span className="text-4xs font-bold text-slate-400 uppercase tracking-widest">Category</span>
                          <p className="font-extrabold text-indigo-600 text-xs truncate mt-0.5">{imageAnalysis.productCategory}</p>
                        </div>
                        <div className="bg-white border rounded-xl p-3 shadow-3xs">
                          <span className="text-4xs font-bold text-slate-400 uppercase tracking-widest">Primary Color</span>
                          <p className="font-extrabold text-slate-800 text-xs truncate mt-0.5">{imageAnalysis.primaryColor}</p>
                        </div>
                        <div className="bg-white border rounded-xl p-3 shadow-3xs">
                          <span className="text-4xs font-bold text-slate-400 uppercase tracking-widest">Material & Style</span>
                          <p className="font-extrabold text-slate-800 text-xs truncate mt-0.5">{imageAnalysis.material} | {imageAnalysis.style}</p>
                        </div>
                        <div className="bg-white border rounded-xl p-3 shadow-3xs">
                          <span className="text-4xs font-bold text-slate-400 uppercase tracking-widest">Estimated Value</span>
                          <p className="font-extrabold text-slate-800 text-xs truncate mt-0.5">{imageAnalysis.estimatedPriceRange}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VENDOR TABLE & SORTING MATRIX */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">Aggregated Multi-Vendor Deals</h3>
                        <p className="text-3xs text-slate-500 font-sans">Matched {listings.length} online retailer offers for &ldquo;{searchQuery}&rdquo;</p>
                      </div>

                      {/* Sorting and Filter Toggles */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className={`px-3 py-1 text-3xs font-extrabold rounded-lg border transition-all flex items-center gap-1.5 ${
                            showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <Filter className="w-3 h-3" />
                          <span>Filters {showFilters ? "On" : "Off"}</span>
                        </button>

                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                          <span className="text-4xs text-slate-400 px-1 font-bold uppercase tracking-widest">Sort:</span>
                          <button
                            onClick={() => setSortBy('price')}
                            className={`px-2 py-0.5 text-3xs font-semibold rounded ${
                              sortBy === 'price' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500'
                            }`}
                          >
                            Price
                          </button>
                          <button
                            onClick={() => setSortBy('rating')}
                            className={`px-2 py-0.5 text-3xs font-semibold rounded ${
                              sortBy === 'rating' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500'
                            }`}
                          >
                            Rating
                          </button>
                          <button
                            onClick={() => setSortBy('discount')}
                            className={`px-2 py-0.5 text-3xs font-semibold rounded ${
                              sortBy === 'discount' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500'
                            }`}
                          >
                            Discount
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Filter panel */}
                    {showFilters && (
                      <div className="bg-slate-50/70 border-b border-slate-150 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-3xs">
                        <div>
                          <label className="block text-slate-400 font-bold uppercase mb-1">Max Price (₹)</label>
                          <input 
                            type="number" 
                            placeholder="e.g. 1500" 
                            value={filterMaxPrice}
                            onChange={(e) => setFilterMaxPrice(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded p-1"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 font-bold uppercase mb-1">Filter Brand Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Nike" 
                            value={filterBrand}
                            onChange={(e) => setFilterBrand(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded p-1"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 font-bold uppercase mb-1">Retailer Platform</label>
                          <select 
                            value={filterPlatform}
                            onChange={(e) => setFilterPlatform(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded p-1"
                          >
                            <option value="">All Retailers</option>
                            <option value="Amazon">Amazon</option>
                            <option value="Flipkart">Flipkart</option>
                            <option value="Myntra">Myntra</option>
                            <option value="Ajio">Ajio</option>
                            <option value="Nykaa">Nykaa</option>
                            <option value="Croma">Croma</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 font-bold uppercase mb-1">Min Star Rating</label>
                          <select 
                            value={filterMinRating}
                            onChange={(e) => setFilterMinRating(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded p-1"
                          >
                            <option value="0">All Ratings</option>
                            <option value="4">★ 4.0 & above</option>
                            <option value="4.5">★ 4.5 & above</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {sortedListings.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No listings match your filter parameters. Modify your filter parameters.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/20 text-slate-400 font-bold uppercase tracking-wider text-3xs">
                              <th className="px-6 py-3">Vendor / Retailer</th>
                              <th className="px-6 py-3">Product Specifications</th>
                              <th className="px-6 py-3 text-right">Base Price</th>
                              <th className="px-6 py-3 text-center">Offer</th>
                              <th className="px-6 py-3 text-right">Net Price</th>
                              <th className="px-6 py-3 text-center">Reviews</th>
                              <th className="px-6 py-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sortedListings.map((v) => {
                              const effPrice = Math.round(v.price - (v.price * v.discount / 100) + v.deliveryCost);
                              return (
                                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-3.5 font-extrabold text-slate-900">{v.vendorName}</td>
                                  <td className="px-6 py-3.5 font-medium text-slate-700">
                                    <div>{v.productName}</div>
                                    <div className="text-4xs text-slate-400 font-mono mt-0.5">{v.warranty}</div>
                                  </td>
                                  <td className="px-6 py-3.5 text-right text-slate-400">₹{v.price.toLocaleString()}</td>
                                  <td className="px-6 py-3.5 text-center">
                                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-3xs font-bold rounded-full">
                                      -{v.discount}%
                                    </span>
                                  </td>
                                  <td className="px-6 py-3.5 text-right font-black text-indigo-700">
                                    ₹{effPrice.toLocaleString()}
                                    {v.deliveryCost > 0 && (
                                      <div className="text-4xs text-slate-400 font-normal">+₹{v.deliveryCost} delivery</div>
                                    )}
                                  </td>
                                  <td className="px-6 py-3.5 text-center">
                                    <div className="font-extrabold text-amber-600">★ {v.rating.toFixed(1)}</div>
                                    {v.reviewsCount && (
                                      <div className="text-4xs text-slate-400 font-mono mt-0.5">{v.reviewsCount} global votes</div>
                                    )}
                                  </td>
                                  <td className="px-6 py-3.5 text-center">
                                    <div className="flex items-center gap-1.5 justify-center">
                                      {v.productUrl && (
                                        <a 
                                          href={v.productUrl} 
                                          target="_blank" 
                                          rel="noreferrer"
                                          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200"
                                          title="Open Vendor URL"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      )}
                                      <button
                                        onClick={() => handleAddFavorite(v)}
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-150"
                                        title="Add to Saved Favorites"
                                      >
                                        <Heart className="w-3 h-3 fill-rose-600" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* GOOGLE GEMINI INTELLIGENT RECOMMENDATION AREA */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-indigo-50/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-3xs">
                          <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-sm">Gemini AI Unified Assessment Report</h3>
                          <p className="text-4xs text-slate-400 font-mono uppercase tracking-widest mt-0.5">Advanced Shopping Prompt-Engineered Model</p>
                        </div>
                      </div>
                      
                      {recommendation && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={downloadComparisonReport}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-3xs font-extrabold flex items-center gap-1.5 transition-all shadow-3xs"
                          >
                            <FileDown className="w-3 h-3" />
                            <span>Download Report (PDF/Print)</span>
                          </button>
                          
                          <button
                            onClick={() => setShowChatPanel(!showChatPanel)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-3xs font-extrabold flex items-center gap-1.5 transition-all shadow-3xs"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>{showChatPanel ? "Hide Console" : "Ask Follow-up Questions"}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      {recommendLoading && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-3">
                          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                          <p className="text-xs text-slate-400">Gemini is parsing pricing matrices, weighting ratings parameters, and generating insights...</p>
                        </div>
                      )}

                      {recommendError && (
                        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                          <XCircle className="w-4 h-4 flex-shrink-0" />
                          <span>Error requesting AI engine: {recommendError}</span>
                        </div>
                      )}

                      {!recommendLoading && !recommendation && !recommendError && (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          AI recommendation was not generated. Run a query to trigger Gemini analyzer.
                        </div>
                      )}

                      {recommendation && (
                        <div className="space-y-6">
                          {recommendation.product ? (
                            // BRAND NEW SHOPGENIE AI SCHEMA RENDERER
                            <div className="space-y-6">
                              {/* Title Banner */}
                              <div className="bg-slate-900 text-white rounded-xl p-5 shadow-md border border-slate-800 relative overflow-hidden">
                                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-6 translate-x-6">
                                  <Sparkles className="w-40 h-40" />
                                </div>
                                <div className="relative z-10">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 bg-indigo-600 text-white text-5xs font-extrabold rounded-full uppercase tracking-wider">ShopGenie AI Report</span>
                                    <span className="text-4xs font-mono text-slate-300">Confidence: {recommendation.confidenceScore || '95%'}</span>
                                  </div>
                                  <h3 className="font-extrabold text-white text-lg mt-2 tracking-tight">{recommendation.product.name}</h3>
                                  <p className="text-xs text-slate-300 mt-1 font-medium">
                                    {recommendation.product.brand} &bull; {recommendation.product.model} &bull; {recommendation.product.category} ({recommendation.product.subcategory})
                                  </p>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 font-mono">
                                    <div><strong className="text-white">Color:</strong> {recommendation.product.color}</div>
                                    <div><strong className="text-white">Material:</strong> {recommendation.product.material}</div>
                                    <div><strong className="text-white">Style:</strong> {recommendation.product.style}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Description & Overview */}
                              <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-3xs">
                                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                  <Info className="w-4 h-4 text-indigo-500" />
                                  <span>Product Overview & Features</span>
                                </h4>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                  {recommendation.product.description}
                                </p>
                              </div>

                              {/* Price Range Estimates */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-center">
                                  <span className="text-5xs font-extrabold text-slate-400 uppercase tracking-widest block">Min Market Price</span>
                                  <span className="text-base font-black text-slate-700 block mt-1">{recommendation.pricing.minimumPrice}</span>
                                </div>
                                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-center">
                                  <span className="text-5xs font-extrabold text-indigo-600 uppercase tracking-widest block">Average Selling Price</span>
                                  <span className="text-lg font-black text-indigo-700 block mt-0.5">{recommendation.pricing.averagePrice}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-center">
                                  <span className="text-5xs font-extrabold text-slate-400 uppercase tracking-widest block">Max Market Price</span>
                                  <span className="text-base font-black text-slate-700 block mt-1">{recommendation.pricing.maximumPrice}</span>
                                </div>
                              </div>

                              {/* Platform Comparison Matrix */}
                              <div>
                                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                                  <Layers className="w-4 h-4 text-indigo-500" />
                                  <span>Dynamic Multi-Platform Comparison</span>
                                </h4>
                                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                                        <th className="p-3">Platform</th>
                                        <th className="p-3">Price</th>
                                        <th className="p-3">Rating</th>
                                        <th className="p-3">Discount</th>
                                        <th className="p-3">Delivery</th>
                                        <th className="p-3">Availability</th>
                                        <th className="p-3">Seller Trust</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-150">
                                      {recommendation.comparison?.map((comp: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors font-medium">
                                          <td className="p-3 font-extrabold text-slate-800">{comp.platform}</td>
                                          <td className="p-3 font-black text-indigo-700">{comp.price}</td>
                                          <td className="p-3 text-amber-600">★ {comp.rating}</td>
                                          <td className="p-3 text-emerald-600">-{comp.discount}</td>
                                          <td className="p-3 text-slate-500 font-mono text-3xs">{comp.delivery}</td>
                                          <td className="p-3">
                                            <span className={`px-2 py-0.5 text-4xs font-bold rounded-full ${
                                              comp.availability?.toLowerCase().includes('in stock') || comp.availability?.toLowerCase().includes('left')
                                                ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                              {comp.availability}
                                            </span>
                                          </td>
                                          <td className="p-3 text-indigo-600 font-bold font-mono text-3xs">{comp.sellerTrust}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Quality Analysis Scores */}
                              <div>
                                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                                  <Award className="w-4 h-4 text-indigo-500" />
                                  <span>Product Quality Diagnostics (Scale 0-10)</span>
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
                                  {Object.entries(recommendation.qualityScores || {}).map(([key, value]) => {
                                    const labels: Record<string, string> = {
                                      overall: 'Overall',
                                      buildQuality: 'Build Quality',
                                      design: 'Design & Craft',
                                      performance: 'Performance',
                                      durability: 'Durability',
                                      valueForMoney: 'Value / Money',
                                      customerSatisfaction: 'Satisfaction'
                                    };
                                    return (
                                      <div key={key} className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-center shadow-4xs">
                                        <span className="text-5xs font-bold text-slate-400 uppercase tracking-wider block">{labels[key] || key}</span>
                                        <span className="text-base font-black text-slate-800 block mt-1">{value as string}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Pros and Cons */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-xl">
                                  <h5 className="text-xs font-bold text-emerald-800 mb-2.5 flex items-center gap-1.5">
                                    <span className="p-1 bg-emerald-100 text-emerald-800 rounded text-4xs uppercase tracking-wider font-extrabold">Pros</span>
                                    <span>Core Advantages</span>
                                  </h5>
                                  <ul className="space-y-1.5">
                                    {recommendation.pros?.map((pro: string, idx: number) => (
                                      <li key={idx} className="text-2xs text-slate-600 pl-4 relative before:content-['+'] before:absolute before:left-0 before:text-emerald-600 before:font-black">
                                        {pro}
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="bg-rose-50/30 border border-rose-100 p-4 rounded-xl">
                                  <h5 className="text-xs font-bold text-rose-800 mb-2.5 flex items-center gap-1.5">
                                    <span className="p-1 bg-rose-100 text-rose-800 rounded text-4xs uppercase tracking-wider font-extrabold">Cons</span>
                                    <span>Limitations / Risks</span>
                                  </h5>
                                  <ul className="space-y-1.5">
                                    {recommendation.cons?.map((con: string, idx: number) => (
                                      <li key={idx} className="text-2xs text-slate-600 pl-4 relative before:content-['-'] before:absolute before:left-0 before:text-rose-500 before:font-black">
                                        {con}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              {/* Buying Recommendations FAQ Banner */}
                              <div className="bg-gradient-to-r from-indigo-50/50 to-slate-50/50 border border-indigo-100 rounded-xl p-5 shadow-3xs">
                                <h4 className="text-xs font-extrabold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                  <span>ShopGenie Purchase Recommendation & Buying Guide</span>
                                </h4>
                                <div className="space-y-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-indigo-100/50 rounded-lg">
                                    <div>
                                      <span className="text-5xs font-extrabold text-slate-400 uppercase block tracking-wider">Final Buying Verdict</span>
                                      <span className="text-xs font-black text-indigo-700">{recommendation.recommendations?.buyDecision}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                      <div className="bg-slate-50 px-3 py-1.5 rounded border border-slate-150">
                                        <span className="text-5xs font-bold text-slate-400 block tracking-wider uppercase">Best Source</span>
                                        <span className="text-3xs font-extrabold text-slate-700">{recommendation.recommendations?.bestPlatform}</span>
                                      </div>
                                      <div className="bg-slate-50 px-3 py-1.5 rounded border border-slate-150">
                                        <span className="text-5xs font-bold text-slate-400 block tracking-wider uppercase">Cheapest</span>
                                        <span className="text-3xs font-extrabold text-slate-700">{recommendation.recommendations?.cheapestPlatform}</span>
                                      </div>
                                      <div className="bg-slate-50 px-3 py-1.5 rounded border border-slate-150">
                                        <span className="text-5xs font-bold text-slate-400 block tracking-wider uppercase">Top Rated</span>
                                        <span className="text-3xs font-extrabold text-slate-700">{recommendation.recommendations?.highestRatedPlatform}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-5xs font-extrabold text-slate-400 uppercase tracking-widest block">Comprehensive Rationale</span>
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                      {recommendation.recommendations?.reason}
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    <div className="p-3 bg-white rounded border border-slate-150">
                                      <span className="text-5xs font-bold text-slate-400 uppercase block tracking-wider">Budget-Friendly Alternative</span>
                                      <span className="text-2xs font-extrabold text-slate-700 block mt-1">{recommendation.recommendations?.budgetAlternative}</span>
                                    </div>
                                    <div className="p-3 bg-white rounded border border-slate-150">
                                      <span className="text-5xs font-bold text-slate-400 uppercase block tracking-wider">Premium Grade Upgrade</span>
                                      <span className="text-2xs font-extrabold text-slate-700 block mt-1">{recommendation.recommendations?.premiumAlternative}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // LEGACY BACKWARD COMPATIBLE SCHEMAS
                            <div className="space-y-6">
                              {/* Recommended product highlight card */}
                              <div className="bg-gradient-to-r from-slate-50 to-indigo-50/20 border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                <div>
                                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-5xs font-extrabold rounded-full tracking-widest uppercase">Value & Rating recommendation</span>
                                  <h4 className="font-extrabold text-slate-900 text-base mt-1.5">{recommendation.recommendedProduct}</h4>
                                  <p className="text-xs text-slate-500 mt-0.5">Top-valued matching vendor: <strong className="text-slate-800 font-extrabold">{recommendation.recommendedVendor}</strong></p>
                                  <div className="text-3xs text-slate-400 font-semibold mt-1">Fallback alternative: {recommendation.alternative}</div>
                                </div>
                                <div className="text-right">
                                  <p className="text-4xs font-bold text-slate-400 uppercase tracking-widest">Effective Cost</p>
                                  <p className="font-black text-indigo-700 text-xl">₹{(recommendation.recommendedPrice || 0).toLocaleString()}</p>
                                </div>
                              </div>

                              {/* QUALITY SCORE CARDS BENTO GRID */}
                              <div className="space-y-3">
                                <h5 className="text-xs font-bold text-slate-900">AI Quality Analysis Indices (Scale 0-10)</h5>
                                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                                  <div className="bg-slate-50/80 border rounded-xl p-3 text-center shadow-4xs">
                                    <span className="text-5xs font-bold text-slate-400 uppercase block tracking-wider">Overall</span>
                                    <span className="text-base font-black text-slate-800 block mt-1">{recommendation.overallQualityScore || '9.0'}</span>
                                  </div>
                                  <div className="bg-slate-50/80 border rounded-xl p-3 text-center shadow-4xs">
                                    <span className="text-5xs font-bold text-slate-400 uppercase block tracking-wider">Value/Money</span>
                                    <span className="text-base font-black text-slate-800 block mt-1">{recommendation.valueForMoneyScore || '8.8'}</span>
                                  </div>
                                  <div className="bg-slate-50/80 border rounded-xl p-3 text-center shadow-4xs">
                                    <span className="text-5xs font-bold text-slate-400 uppercase block tracking-wider">Build/Specs</span>
                                    <span className="text-base font-black text-slate-800 block mt-1">{recommendation.buildQualityScore || '9.2'}</span>
                                  </div>
                                  <div className="bg-slate-50/80 border rounded-xl p-3 text-center shadow-4xs">
                                    <span className="text-5xs font-bold text-slate-400 uppercase block tracking-wider">Popularity</span>
                                    <span className="text-base font-black text-slate-800 block mt-1">{recommendation.popularityScore || '9.0'}</span>
                                  </div>
                                  <div className="bg-slate-50/80 border rounded-xl p-3 text-center shadow-4xs">
                                    <span className="text-5xs font-bold text-slate-400 uppercase block tracking-wider">Brand Trust</span>
                                    <span className="text-base font-black text-indigo-600 block mt-1">{recommendation.brandTrustScore || '9.1'}</span>
                                  </div>
                                  <div className="bg-slate-50/80 border rounded-xl p-3 text-center shadow-4xs">
                                    <span className="text-5xs font-bold text-slate-400 uppercase block tracking-wider">Satisfaction</span>
                                    <span className="text-base font-black text-slate-800 block mt-1">{recommendation.customerSatisfactionScore || '9.3'}</span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                                    <strong className="text-slate-700 block text-3xs font-bold uppercase tracking-wider mb-0.5">Estimated Durability Profile</strong>
                                    <span className="text-slate-600 font-medium">{recommendation.durabilityEstimate}</span>
                                  </div>
                                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                                    <strong className="text-slate-700 block text-3xs font-bold uppercase tracking-wider mb-0.5">Best Target Consumer / Use Case</strong>
                                    <span className="text-slate-600 font-medium">{recommendation.bestUseCases}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Reasons list */}
                              {recommendation.reasoning && recommendation.reasoning.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    <span>Critical Price & Value Parameters Analyzed</span>
                                  </h5>
                                  <ul className="space-y-1.5">
                                    {recommendation.reasoning.map((reason: string, i: number) => (
                                      <li key={i} className="text-xs text-slate-600 pl-5 relative before:content-['•'] before:absolute before:left-1 before:text-indigo-500 before:font-bold">
                                        {reason}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Pros and Cons Split Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-emerald-50/40 border border-emerald-100/50 p-4 rounded-xl">
                                  <h5 className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
                                    <span className="p-1 bg-emerald-100 text-emerald-800 rounded text-4xs uppercase tracking-wider font-extrabold">Pros</span>
                                    <span>Core Advantages</span>
                                  </h5>
                                  <ul className="space-y-1">
                                    {recommendation.pros?.map((pro: string, i: number) => (
                                      <li key={i} className="text-2xs text-slate-600 pl-3.5 relative before:content-['+'] before:absolute before:left-0 before:text-emerald-600 before:font-bold">
                                        {pro}
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="bg-rose-50/40 border border-rose-100/50 p-4 rounded-xl">
                                  <h5 className="text-xs font-bold text-rose-800 mb-2 flex items-center gap-1.5">
                                    <span className="p-1 bg-rose-100 text-rose-800 rounded text-4xs uppercase tracking-wider font-extrabold">Cons</span>
                                    <span>Critical Limitations</span>
                                  </h5>
                                  <ul className="space-y-1">
                                    {recommendation.cons?.map((con: string, i: number) => (
                                      <li key={i} className="text-2xs text-slate-600 pl-3.5 relative before:content-['-'] before:absolute before:left-0 before:text-rose-500 before:font-bold">
                                        {con}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              {/* SMART BUYING RECOMMENDER: FAQ */}
                              <div className="border-t pt-4 space-y-3">
                                <h5 className="text-xs font-bold text-slate-900">Smart Buying Recommendation FAQ</h5>
                                <div className="space-y-3">
                                  {recommendation.buyingFaq?.map((faq: any, i: number) => (
                                    <div key={i} className="bg-slate-50/80 border rounded-xl p-3 shadow-4xs">
                                      <p className="text-3xs font-extrabold text-indigo-700 block uppercase tracking-wider">Question: {faq.question}</p>
                                      <p className="text-2xs font-semibold text-slate-700 mt-1">Answer: {faq.answer}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* SIMILAR AND ALTERNATIVE RECOMMENDATIONS */}
                              <div className="border-t pt-4 space-y-3">
                                <h5 className="text-xs font-bold text-slate-900">Alternative Product Recommendations</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  {recommendation.similarProducts?.map((item: any, i: number) => (
                                    <div key={i} className="bg-slate-50/60 border rounded-xl p-3 text-xs shadow-4xs relative overflow-hidden">
                                      <span className={`absolute top-0 right-0 px-2 py-0.5 text-4xs font-bold uppercase tracking-wider text-white rounded-bl-lg ${
                                        item.type === 'cheaper' ? 'bg-emerald-600' : item.type === 'premium' ? 'bg-indigo-600' : 'bg-amber-600'
                                      }`}>
                                        {item.type}
                                      </span>
                                      <h6 className="font-extrabold text-slate-800 pr-12 truncate">{item.name}</h6>
                                      <p className="text-indigo-700 font-extrabold mt-1 text-xs">₹{(item.price || 0).toLocaleString()}</p>
                                      <div className="flex items-center justify-between text-4xs text-slate-400 font-mono mt-2">
                                        <span>Platform: {item.platform}</span>
                                        <span>★ {item.rating}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* VISUALLY SIMILAR SEARCH RESULTS */}
                          {recommendation.visuallySimilar && recommendation.visuallySimilar.length > 0 && (
                            <div className="border-t pt-4 space-y-3">
                              <h5 className="text-xs font-bold text-slate-900">Gemini Vision Visual Similarity Matches</h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {recommendation.visuallySimilar.map((item: any, i: number) => (
                                  <div key={i} className="bg-slate-50/60 border rounded-xl p-3 text-xs shadow-4xs flex items-center justify-between">
                                    <div>
                                      <h6 className="font-extrabold text-slate-800">{item.name}</h6>
                                      <p className="text-indigo-700 font-extrabold text-xs mt-0.5">₹{(item.price || 0).toLocaleString()} • <span className="text-slate-400 font-medium">Color: {item.color}</span></p>
                                      <span className="text-4xs text-slate-400 font-mono block mt-1">Found on {item.platform} &bull; Details: {item.relation}</span>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-150 text-2xs font-extrabold rounded-full">
                                        {item.matchPercentage}% Match
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* USER RATINGS, REVIEWS & OPINIONS FEEDBACK */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
                    <div className="border-b pb-4">
                      <h3 className="font-extrabold text-slate-900 text-sm">Product Reviews & Student Feedback</h3>
                      <p className="text-3xs text-slate-400 font-sans mt-0.5">Submit your rating and comments to save evaluations persistently inside our Mongo structures.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Form: Add rating */}
                      <div className="md:col-span-1 space-y-4">
                        <h4 className="text-xs font-extrabold text-slate-800">Add Your Evaluation</h4>
                        <form onSubmit={handleAddReview} className="space-y-3">
                          <div>
                            <label className="block text-4xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Star Rating</label>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((val) => (
                                <button
                                  type="button"
                                  key={val}
                                  onClick={() => setReviewRating(val)}
                                  className="text-amber-400 focus:outline-none"
                                >
                                  <Star className={`w-5 h-5 ${val <= reviewRating ? 'fill-amber-400' : 'text-slate-200'}`} />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-4xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Your Comments</label>
                            <textarea
                              rows={3}
                              required
                              placeholder="e.g. Price is highly dynamic, Myntra coupon can discount it further..."
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                            ></textarea>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                          >
                            Submit Academic Feedback
                          </button>
                        </form>
                      </div>

                      {/* Display ratings list */}
                      <div className="md:col-span-2 space-y-4">
                        <h4 className="text-xs font-extrabold text-slate-800">Evaluator Activity Comments ({currentProductReviews.length})</h4>
                        {reviewsLoading ? (
                          <div className="text-center py-6 text-slate-400 text-xs">Loading ratings...</div>
                        ) : currentProductReviews.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 text-2xs font-semibold bg-slate-50/50 rounded-xl border border-slate-150">
                            No student evaluations submitted for this product yet. Be the first to leave feedback!
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                            {currentProductReviews.map((rev) => (
                              <div key={rev.id} className="p-3 bg-slate-50 border rounded-xl text-2xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-slate-800">{rev.userName}</span>
                                  <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                                    <span>{rev.rating}</span>
                                  </div>
                                </div>
                                <p className="text-slate-600 font-medium">{rev.comment}</p>
                                <span className="text-4xs text-slate-400 block mt-1 font-mono">{new Date(rev.timestamp).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* CHAT / FOLLOW UP DIALOG CONSOLE */}
                  {showChatPanel && recommendation && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
                      <div className="px-6 py-4 border-b border-slate-200 bg-indigo-900 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-indigo-200" />
                          <div>
                            <h3 className="font-bold text-xs uppercase tracking-wider">Ask Follow-up Questions</h3>
                            <p className="text-4xs text-indigo-200">Chat with Google Gemini on comparison variables</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowChatPanel(false)}
                          className="text-indigo-200 hover:text-white text-xs font-bold"
                        >
                          Close Chat
                        </button>
                      </div>

                      {/* Chat messages */}
                      <div className="p-6 space-y-4 max-h-72 overflow-y-auto bg-slate-50/50">
                        {chatMessages.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-md p-3.5 rounded-2xl text-xs ${
                              msg.sender === 'user'
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-white border border-slate-200 text-slate-700 shadow-3xs rounded-bl-none'
                            }`}>
                              <p className="leading-relaxed font-medium">{msg.text}</p>
                              <p className="text-4xs text-right opacity-60 mt-1">{msg.timestamp}</p>
                            </div>
                          </div>
                        ))}
                        {chatLoading && (
                          <div className="flex justify-start">
                            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl rounded-bl-none shadow-3xs text-xs flex items-center gap-2 text-slate-500">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                              <span>Gemini thinking...</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Chat Form */}
                      <form onSubmit={handleSendChat} className="p-4 border-t border-slate-200 bg-white flex gap-2">
                        <input
                          type="text"
                          required
                          disabled={chatLoading}
                          placeholder="e.g. Which of these platforms is offering the fastest delivery?"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          className="flex-grow px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={chatLoading}
                          className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 1.5: SAVED FAVORITES LIST */}
        {activeTab === 'favorites' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                <span>My Saved Favorites & Bookmarked Offers</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">Bookmarked vendor deals are stored in user-specific schema maps. Ideal for tracking price dips and active listings over time.</p>
            </div>

            {favoritesLoading ? (
              <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" /></div>
            ) : favorites.length === 0 ? (
              <div className="bg-white border border-slate-150 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center">
                <Heart className="w-8 h-8 text-slate-300 mb-3" />
                <h4 className="font-bold text-slate-700 text-sm">No Saved Favorites</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">Bookmark vendor price points by clicking the heart icon on any matched list of comparative vendors!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {favorites.map((fav) => (
                  <div key={fav.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4 hover:border-indigo-300 transition-all relative">
                    <button
                      onClick={() => handleRemoveFavorite(fav.id)}
                      className="absolute top-4 right-4 p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg"
                      title="Remove Favorite"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>

                    <div>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-4xs font-bold uppercase rounded tracking-wider">{fav.vendorName}</span>
                      <h4 className="font-extrabold text-slate-800 text-sm mt-2 pr-8">{fav.productName}</h4>
                      <p className="text-indigo-700 font-extrabold text-base mt-1">₹{fav.price.toLocaleString()}</p>
                      {fav.discount > 0 && <span className="text-4xs text-emerald-600 font-bold">Save {fav.discount}% off MSRP</span>}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t text-3xs text-slate-400">
                      <span>★ {fav.rating.toFixed(1)} Rating</span>
                      {fav.productUrl && (
                        <a 
                          href={fav.productUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline"
                        >
                          <span>Visit Retailer</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AUDIT & HISTORY ARCHIVES */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-indigo-600" />
                <span>Evaluation Audit Logs</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">Previous product price evaluations generated by users are automatically saved to our document database collections.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Search History Records */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-150 bg-slate-50/50">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Search Keywords History</h4>
                </div>
                {historySearches.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No searches performed yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                    {historySearches.map((rec) => (
                      <div key={rec.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {rec.imageAnalysis?.imageBase64 ? (
                            <img 
                              src={`data:image/jpeg;base64,${rec.imageAnalysis.imageBase64}`}
                              alt="Vision input" 
                              className="w-10 h-10 object-cover rounded-lg border bg-white shadow-4xs"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="p-2 bg-slate-100 rounded-lg text-slate-400"><Search className="w-4 h-4" /></div>
                          )}
                          <div>
                            <p className="font-bold text-slate-800 text-xs">&ldquo;{rec.query}&rdquo;</p>
                            <p className="text-4xs text-slate-400 mt-0.5">{new Date(rec.timestamp).toLocaleString()}</p>
                            {rec.imageAnalysis && (
                              <span className="inline-block mt-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-5xs font-bold rounded">
                                Gemini Vision Identified
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-3xs font-semibold rounded-full">
                            {rec.vendorCount} vendors
                          </span>
                          <button
                            onClick={() => {
                              setActiveTab('search');
                              handleSearch(undefined, rec.query);
                            }}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Rerun search"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stored Recommendations Records */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-150 bg-indigo-50/35">
                  <h4 className="font-bold text-xs text-indigo-900 uppercase tracking-wider">AI Recommendation Records</h4>
                </div>
                {historyRecommendations.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No recommendations recorded yet. Run query comparisons to generate.</div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                    {historyRecommendations.map((rec) => (
                      <div key={rec.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {rec.imageBase64 && (
                              <img 
                                src={`data:image/jpeg;base64,${rec.imageBase64}`}
                                alt="Rec Input" 
                                className="w-10 h-10 object-cover rounded-lg border bg-white shadow-4xs"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div>
                              <span className="text-4xs text-indigo-600 font-bold uppercase tracking-wider">Query: {rec.query}</span>
                              <h5 className="font-bold text-slate-900 text-xs mt-1">Recommended: {rec.recommendation.recommendedProduct}</h5>
                              <p className="text-2xs text-slate-500">Vendor: <strong className="text-slate-700">{rec.recommendation.recommendedVendor}</strong> &bull; Effective price: ₹{rec.recommendation.recommendedPrice.toLocaleString()}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setActiveTab('search');
                              setSearchQuery(rec.query);
                              setRecommendation(rec.recommendation);
                              setSearchPerformed(true);
                              handleSearch(undefined, rec.query);
                            }}
                            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-3xs font-bold transition-all flex items-center gap-1"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-4xs text-slate-400 mt-2 font-mono">{new Date(rec.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: ADMIN CONSOLE */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                <span>Admin Sandbox / Mock Database Seeder</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">Allows student evaluators and mentors to inject custom product models and vendor details. See how Gemini parses warranty configurations or chooses alternatives instantly.</p>
            </div>

            {adminStatus && (
              <div className="p-3 bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-xl">
                {adminStatus}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Form 1: Add Reference Product to Catalog */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>1. Seed Reference Catalog Product</span>
                </h4>

                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div>
                    <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Product Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Adidas Stan Smith Sneakers"
                      value={adminProduct.name}
                      onChange={(e) => setAdminProduct(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                      <select
                        value={adminProduct.category}
                        onChange={(e) => setAdminProduct(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="Clothing">Clothing</option>
                        <option value="Shoes">Shoes</option>
                        <option value="Watches">Watches</option>
                        <option value="Mobiles">Mobiles</option>
                        <option value="Cosmetics">Cosmetics</option>
                        <option value="Furniture">Furniture</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Brand</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Adidas"
                        value={adminProduct.brand}
                        onChange={(e) => setAdminProduct(prev => ({ ...prev, brand: e.target.value }))}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Base Catalog Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={adminProduct.basePrice}
                      onChange={(e) => setAdminProduct(prev => ({ ...prev, basePrice: Number(e.target.value) }))}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-3xs transition-colors"
                  >
                    Register Product Catalog Entry
                  </button>
                </form>
              </div>

              {/* Form 2: Register Vendor Listing */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>2. Register Vendor Marketplace Price Point</span>
                </h4>

                <form onSubmit={handleAddListing} className="space-y-4">
                  <div>
                    <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Target Product</label>
                    <select
                      value={adminListing.productId}
                      onChange={(e) => setAdminListing(prev => ({ ...prev, productId: e.target.value }))}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    >
                      {catalogProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.brand})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Vendor Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Amazon, Flipkart, Myntra, Ajio"
                        value={adminListing.vendorName}
                        onChange={(e) => setAdminListing(prev => ({ ...prev, vendorName: e.target.value }))}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Vendor Price (₹)</label>
                      <input
                        type="number"
                        required
                        value={adminListing.price}
                        onChange={(e) => setAdminListing(prev => ({ ...prev, price: Number(e.target.value) }))}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Discount (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={adminListing.discount}
                        onChange={(e) => setAdminListing(prev => ({ ...prev, discount: Number(e.target.value) }))}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Rating</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="5"
                        value={adminListing.rating}
                        onChange={(e) => setAdminListing(prev => ({ ...prev, rating: Number(e.target.value) }))}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Delivery (₹)</label>
                      <input
                        type="number"
                        value={adminListing.deliveryCost}
                        onChange={(e) => setAdminListing(prev => ({ ...prev, deliveryCost: Number(e.target.value) }))}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Warranty Info</label>
                      <input
                        type="text"
                        value={adminListing.warranty}
                        onChange={(e) => setAdminListing(prev => ({ ...prev, warranty: e.target.value }))}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-3xs font-bold text-slate-500 uppercase tracking-wider mb-1">Stock Availability</label>
                      <select
                        value={adminListing.availability ? 'yes' : 'no'}
                        onChange={(e) => setAdminListing(prev => ({ ...prev, availability: e.target.value === 'yes' }))}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="yes">In Stock</option>
                        <option value="no">Out of Stock</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-3xs transition-colors"
                  >
                    Seed Vendor Price Point
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: PROFILE & SRS DOCUMENTATION */}
        {activeTab === 'profile' && (
          <div className="space-y-8 animate-fade-in">
            {/* User Statistics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider">Authenticated Profile</h4>
                  <p className="font-extrabold text-slate-900 text-sm">{user?.name || "Student Demo"}</p>
                  <p className="text-4xs text-slate-400 font-mono">{user?.email}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider">Total Evaluated Queries</h4>
                  <p className="font-extrabold text-slate-900 text-lg">{stats?.totalSearches ?? historySearches.length} Queries</p>
                  <p className="text-4xs text-slate-400 font-mono">Processed across sandbox collections</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider">Gemini Decision Matrices</h4>
                  <p className="font-extrabold text-slate-900 text-lg">{stats?.totalRecommendations ?? historyRecommendations.length} Reports</p>
                  <p className="text-4xs text-slate-400 font-mono">Recorded in Mongo DB collections</p>
                </div>
              </div>
            </div>

            {/* SRS Documentation View */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Capstone Project Software Requirements Specification (SRS)</h3>
              </div>
              
              <div className="p-6 prose prose-slate max-w-none text-xs space-y-6">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm border-b pb-1 mb-2">1. Functional Requirements Matrix</h4>
                  <ul className="list-disc pl-5 space-y-2 text-slate-600">
                    <li><strong>Universal Product Search:</strong> Enables natural language querying across all consumer categories (Clothing, Electronics, Books, Toys).</li>
                    <li><strong>Image-Based Search:</strong> Uses Gemini Vision to perform attributes extraction (brand, primary color, material, styling).</li>
                    <li><strong>Multi-Vendor Parsing:</strong> Compiles and displays price tables from Flipkart, Amazon, Myntra, Ajio, Nykaa, etc.</li>
                    <li><strong>AI Quality Scoring & Recommender:</strong> Weights margins, warranty, rating, and returns dynamically to score value.</li>
                    <li><strong>Printable Audit Reports:</strong> One-click compilation of clean HTML reports saving comparisons to PDF.</li>
                    <li><strong>Student Evaluations:</strong> Add star reviews and comments to product models persistently.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-sm border-b pb-1 mb-2">2. Database Schema (MongoDB Collection Mapping)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="font-bold text-indigo-700 text-4xs uppercase block">Users</span>
                      <p className="text-5xs text-slate-500 mt-1">Fields: id, name, email, passwordHash, createdAt</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="font-bold text-indigo-700 text-4xs uppercase block">Vendor Deals</span>
                      <p className="text-5xs text-slate-500 mt-1">Fields: id, productId, price, discount, rating, deliveryCost</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="font-bold text-indigo-700 text-4xs uppercase block">Saved Favorites</span>
                      <p className="text-5xs text-slate-500 mt-1">Fields: id, userId, productName, vendorName, rating, productUrl</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="font-bold text-indigo-700 text-4xs uppercase block">Product reviews</span>
                      <p className="text-5xs text-slate-500 mt-1">Fields: id, userId, userName, rating, comment, timestamp</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-sm border-b pb-1 mb-2">3. Future System Scope & Roadmaps (Feature 12)</h4>
                  <ul className="list-decimal pl-5 space-y-1.5 text-slate-600">
                    <li><strong>Real-time API Web Scrapers:</strong> Scaffolding node cron jobs to actively scrape Amazon/Flipkart listings instead of static seeding.</li>
                    <li><strong>Interactive Barcode Scanner:</strong> Access mobile cameras inside frame permissions to scan product UPC codes.</li>
                    <li><strong>Multi-Currency Support:</strong> Convert INR (₹) to USD ($) or EUR (€) on-the-fly using open exchange rate API endpoints.</li>
                    <li><strong>Deep Learning Personalization:</strong> Recommend products based on historical saved favorites clusters.</li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-slate-400">
                  <div className="flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Project configured with robust client-side storage replication.</span>
                  </div>
                  <span>Academic Grading Release 2.0</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 font-mono">
        © 2026 Universal AI Shopping Assistant Project &bull; Capstone CS Graduation Portfolio
      </footer>
    </div>
  );
}
