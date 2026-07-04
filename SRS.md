# Software Requirements Specification (SRS)
## Project: AI Price Comparison Agent

---

### 1. Introduction

#### 1.1 Purpose
This Software Requirements Specification (SRS) document defines the comprehensive functional, non-functional, database, and system architecture requirements for the **AI Price Comparison Agent**. This system acts as an intelligent shopping assistant that aggregates, compares, and explains product choices across multiple vendors using advanced natural language understanding and Google Gemini.

#### 1.2 Scope
The AI Price Comparison Agent is a full-stack, responsive web application. It addresses the friction of manual product comparison by providing a centralized hub where users can enter natural language shopping queries (e.g., *"Best headphones under ₹5,000 for gaming"*), see structured pricing from virtualized mock vendors, and receive deep, multi-dimensional AI recommendations analyzing value-for-money, warranty, availability, delivery, and alternatives.

#### 1.3 Intended Audience
This document is prepared for academic evaluators, software engineers, database administrators, and QA teams involved in the development and evaluation of this final-year capstone project.

---

### 2. General Description

#### 2.1 Product Perspective
The system is designed as a standalone three-tier application:
*   **Frontend (Presentation Layer):** Responsive SPA built with React 19, TypeScript, Tailwind CSS, and Lucide Icons.
*   **Backend (Application Layer):** Full-stack Express server acting as an API gateway, session controller, and Google Gemini SDK orchestrator.
*   **Database (Data Layer):** Fast document-based data layer (using JSON-based persistent storage representing the requested MongoDB collections: Users, Products, Vendors, Search History, and AI Recommendation History) to track records across application restarts.

#### 2.2 System Functions
1.  **User Authentication:** Registration, secure password login, and persistent JWT-based sessions.
2.  **Product Search & Price Extraction:** Natural language parser and structured query matching.
3.  **Vendor Aggregation Engine:** Comparison matrices displaying Price, Vendor, Discount, Rating, Delivery Cost, Warranty, and Availability.
4.  **AI Recommendation Agent:** Integration with `gemini-3.5-flash` using custom prompt engineering to weigh user constraints and deliver explanatory choices, pros/cons list, and fallback alternatives.
5.  **Interactive Conversation:** Interactive chat enabling users to ask follow-up questions about recommended products.
6.  **Search & Recommendation History:** Archiving previous decisions for user auditing.
7.  **Admin Operations Panel:** Managing the vendor product lists, catalog entries, and platform parameters.

#### 2.3 User Classes and Characteristics
*   **General Consumers (End Users):** Seek unbiased advice, optimal deals, and natural language query support.
*   **Platform Administrators:** Monitor search metrics, mock vendor data feeds, and analyze system-wide recommendations.

---

### 3. Functional Requirements

#### 3.1 Module 1: User Identity and Access Management
*   **FR-1.1:** System shall allow new users to register with Name, Email, and Password.
*   **FR-1.2:** System shall verify credentials during Login and issue secure tokens.
*   **FR-1.3:** System shall store profile data securely and allow users to view their session statistics on a Profile tab.

#### 3.2 Module 2: Multi-Vendor Aggregation and Comparison
*   **FR-2.1:** System shall process keyword searches (e.g., "iPhone 15") and natural language queries (e.g., "Best phone under 50000").
*   **FR-2.2:** System shall fetch and merge matches across registered vendors (e.g., "Amazon", "Flipkart", "Croma", "Reliance Digital").
*   **FR-2.3:** System shall support client-side sorting of the vendor matrix by lowest price, highest rating, and largest discount percentage.

#### 3.3 Module 3: Intelligent AI Recommendation (Google Gemini)
*   **FR-3.1:** System shall use a professional structured prompt template to supply context to `gemini-3.5-flash`.
*   **FR-3.2:** The AI agent shall generate a structured recommendation covering:
    *   **Recommended Option:** The direct best vendor and item.
    *   **Key Reasoning:** Direct bullet points justifying why it stands out.
    *   **Pros and Cons:** Structured trade-offs for the top recommendations.
    *   **Suggested Alternatives:** Secondary recommendation if the first is out of stock.
*   **FR-3.3:** System shall enable follow-up chat, maintaining conversation history context on the specific recommendation.

#### 3.4 Module 4: History Auditing
*   **FR-4.1:** System shall automatically archive search records and AI recommendations into database collections.
*   **FR-4.2:** System shall display a reverse-chronological list of previous comparisons on the History page.

---

### 4. Database Schema Design (MongoDB Collections Representation)

#### 4.1 Users Collection
```json
{
  "_id": "ObjectId",
  "name": "String",
  "email": "String (Unique)",
  "passwordHash": "String",
  "createdAt": "Date"
}
```

#### 4.2 Products Collection
```json
{
  "_id": "ObjectId",
  "name": "String",
  "category": "String",
  "brand": "String",
  "basePrice": "Number",
  "specs": "Object (Key-Value pairs)"
}
```

#### 4.3 Vendors Collection (Product Listings)
```json
{
  "_id": "ObjectId",
  "productId": "ObjectId",
  "productName": "String",
  "vendorName": "String",
  "price": "Number",
  "discount": "Number (Percentage)",
  "rating": "Number (1.0 to 5.0)",
  "deliveryCost": "Number",
  "warranty": "String (e.g. '1 Year Manufacturer')",
  "availability": "Boolean",
  "specs": "Object"
}
```

#### 4.4 Search History Collection
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "query": "String",
  "timestamp": "Date"
}
```

#### 4.5 AI Recommendation History Collection
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "query": "String",
  "recommendation": {
    "recommendedVendor": "String",
    "recommendedPrice": "Number",
    "reasoning": ["String"],
    "pros": ["String"],
    "cons": ["String"],
    "alternative": "String"
  },
  "timestamp": "Date"
}
```

---

### 5. API Interface Contract (Spring Boot Spec Equivalent in Node/Express)

*   `POST /api/register`
    *   **Description:** Creates a new user profile.
    *   **Payload:** `{ "name": "...", "email": "...", "password": "..." }`
    *   **Response:** `{ "success": true, "token": "...", "user": { "name": "...", "email": "..." } }`

*   `POST /api/login`
    *   **Description:** Authenticating a user and issuing an access token.
    *   **Payload:** `{ "email": "...", "password": "..." }`
    *   **Response:** `{ "success": true, "token": "...", "user": { "name": "...", "email": "..." } }`

*   `GET /api/products`
    *   **Description:** Retrieves a list of available reference catalog products.
    *   **Response:** `[ { "id": "...", "name": "...", "category": "..." } ]`

*   `GET /api/compare?query=xxx`
    *   **Description:** Queries and extracts matching vendor listings for the search term.
    *   **Response:** `{ "query": "...", "vendors": [ { "vendorName": "...", "price": 0, "discount": 10, ... } ] }`

*   `POST /api/recommend`
    *   **Description:** Sends vendor listings to Gemini to get a structured recommendation.
    *   **Payload:** `{ "query": "...", "vendors": [ ... ] }`
    *   **Response:** `{ "recommendedVendor": "...", "reasoning": "...", "pros": [], "cons": [], "alternative": "..." }`

*   `GET /api/history`
    *   **Description:** Retrieves historical search list for the authenticated user.
    *   **Response:** `[ { "id": "...", "query": "...", "timestamp": "...", "recommendation": { ... } } ]`

---

### 6. Prompt Engineering Architecture

The system wraps the target comparison dataset inside an isolated markdown container and provides structured reasoning constraints. 

```text
You are an expert shopping assistant.
Analyze the following product options across different vendors for the query: "{{QUERY}}"

Product Comparison Data:
{{MARKDOWN_VENDOR_TABLE}}

Analyze options using:
1. Total Cost (Price minus Discount, plus Delivery Cost)
2. Rating and Customer Feedback
3. Warranty coverage
4. Availability constraints

Generate a JSON response conforming strictly to the following Schema:
{
  "recommendedVendor": "Name of Vendor",
  "recommendedProduct": "Name of the Product",
  "recommendedPrice": "Number (effective price)",
  "reasoning": ["point 1", "point 2"],
  "pros": ["pro 1", "pro 2"],
  "cons": ["con 1", "con 2"],
  "alternative": "A solid secondary alternative option if first is out of stock"
}
```

---

### 7. Non-Functional Requirements

*   **NFR-7.1 Usability:** Mobile-responsive interface conforming to clean typography principles (Inter, Outfit display fonts, dark/light slate theme).
*   **NFR-7.2 Robustness:** Complete error catching on AI API rate limits or network disruptions, reverting gracefully to local comparison filters.
*   **NFR-7.3 Portability:** Standard Docker deployment instructions providing consistency across developers and target environments.
